// Multijoueur PvP host-authoritative pour Émergence.
// Charge Supabase, gère le matchmaking via re_lobbies + RPC re_join_or_create_lobby,
// et expose un canal Realtime (broadcast) pour transporter inputs et snapshots.
//
// API exposée sur window.RE_MP :
//   init()                     -> Promise<void>     : précharge la session
//   joinOrCreate({ biome, difficulty }) -> Promise<{lobbyId, role, opponent, seed, biome, difficulty} | error>
//   waitForOpponent()          -> Promise<{opponent}> : promesse résolue quand un guest rejoint (host)
//   leave()                    -> Promise<void>     : annule la salle d'attente / quitte la partie
//   sendInput(action)          -> void              : envoie un input au peer
//   sendSnapshot(snap)         -> void              : host -> guest, état complet
//   sendGameOver(winnerSide)   -> void              : host -> guest, fin de partie
//   onInput(cb)                : sub aux inputs reçus (utilisé surtout par le host)
//   onSnapshot(cb)             : sub aux snapshots reçus (utilisé par le guest)
//   onGameOver(cb)             : sub aux events fin de partie
//   onOpponentLeave(cb)        : sub à la déconnexion du peer
//   reportFinish(winnerSide)   -> Promise<void>     : marque le lobby finished côté DB
//   state                      : objet en lecture { lobbyId, role, opponent, status, biome, difficulty, seed }

import { supabase, getProfile } from "/lib/supabase.js";

const SOFT_TIMEOUT_MS = 4 * 60 * 1000; // un lobby waiting expire côté UI au bout de 4 min

const listeners = {
  input: new Set(),
  snapshot: new Set(),
  gameOver: new Set(),
  opponentLeave: new Set(),
  paired: new Set(),
};

const state = {
  lobbyId: null,
  role: null,           // "host" | "guest"
  opponent: null,       // { id, username }
  status: "idle",       // idle | waiting | playing | finished | abandoned
  biome: "desert",
  difficulty: "normal",
  seed: 0,
  channel: null,
  pgSub: null,          // subscription postgres_changes pour la salle d'attente
  me: null,             // profil courant
};

function notify(key, payload) {
  for (const cb of listeners[key]) {
    try { cb(payload); } catch (err) { console.error("[RE_MP listener]", err); }
  }
}

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  state.me = await getProfile();
  return state.me;
}

async function joinOrCreate({ biome = "desert", difficulty = "normal" } = {}) {
  await init();
  if (!state.me) {
    return { error: "not_authenticated" };
  }

  const { data, error } = await supabase.rpc("re_join_or_create_lobby", {
    p_biome: biome,
    p_difficulty: difficulty,
  });
  if (error) {
    console.error("[RE_MP] join_or_create error", error);
    return { error: error.message || "rpc_failed" };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "no_lobby_returned" };

  state.lobbyId = row.lobby_id;
  state.role = row.role;
  state.biome = row.biome;
  state.difficulty = row.difficulty;
  state.seed = Number(row.seed);
  state.status = row.status;
  state.opponent = (state.role === "host")
    ? (row.guest_id ? { id: row.guest_id, username: row.guest_username } : null)
    : { id: row.host_id, username: row.host_username };

  await setupChannel();

  // Si on est host et le lobby est encore "waiting", on s'abonne aux changements
  // postgres_changes pour être notifié quand un guest rejoint.
  if (state.role === "host" && state.status === "waiting") {
    subscribeLobbyRow();
  }

  return {
    lobbyId: state.lobbyId,
    role: state.role,
    opponent: state.opponent,
    seed: state.seed,
    biome: state.biome,
    difficulty: state.difficulty,
    status: state.status,
  };
}

async function setupChannel() {
  if (state.channel) {
    try { await supabase.removeChannel(state.channel); } catch {}
    state.channel = null;
  }
  if (!state.lobbyId) return;

  const ch = supabase.channel(`re-lobby-${state.lobbyId}`, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: state.me?.id || crypto.randomUUID() },
    },
  });

  ch.on("broadcast", { event: "input" },    ({ payload }) => notify("input", payload));
  ch.on("broadcast", { event: "snapshot" }, ({ payload }) => notify("snapshot", payload));
  ch.on("broadcast", { event: "gameover" }, ({ payload }) => notify("gameOver", payload));
  ch.on("broadcast", { event: "hello" },    ({ payload }) => {
    // Échange d'identité quand le peer rejoint le channel
    if (state.role === "host" && payload?.from === "guest") {
      // confirme le start
      ch.send({ type: "broadcast", event: "hello", payload: { from: "host", username: state.me?.username || null } });
    }
  });

  ch.on("presence", { event: "leave" }, ({ key }) => {
    if (!state.opponent) return;
    if (key === state.opponent.id) {
      notify("opponentLeave", { id: key });
    }
  });

  await new Promise((resolve) => {
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try { await ch.track({ user_id: state.me?.id, username: state.me?.username, role: state.role }); } catch {}
        if (state.role === "guest") {
          ch.send({ type: "broadcast", event: "hello", payload: { from: "guest", username: state.me?.username || null } });
        }
        resolve();
      }
    });
  });

  state.channel = ch;
}

// Souscrit aux changements de la ligne re_lobbies courante (host : attend un guest)
function subscribeLobbyRow() {
  if (state.pgSub) {
    try { supabase.removeChannel(state.pgSub); } catch {}
    state.pgSub = null;
  }
  const sub = supabase.channel(`re-lobby-row-${state.lobbyId}`)
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "re_lobbies", filter: `id=eq.${state.lobbyId}` },
      ({ new: row }) => {
        if (!row) return;
        if (row.status === "playing" && row.guest_id) {
          state.status = "playing";
          state.opponent = { id: row.guest_id, username: row.guest_username };
          notify("paired", { opponent: state.opponent, seed: Number(row.seed), biome: row.biome, difficulty: row.difficulty });
          // on n'a plus besoin de cette sub
          try { supabase.removeChannel(sub); } catch {}
          state.pgSub = null;
        }
      })
    .subscribe();
  state.pgSub = sub;
}

async function leave() {
  // Annule côté DB
  if (state.lobbyId && state.status !== "finished") {
    try {
      await supabase.rpc("re_cancel_lobby", { p_lobby_id: state.lobbyId });
    } catch (err) {
      console.warn("[RE_MP] cancel_lobby failed", err);
    }
  }
  if (state.channel) {
    try { await supabase.removeChannel(state.channel); } catch {}
  }
  if (state.pgSub) {
    try { await supabase.removeChannel(state.pgSub); } catch {}
  }
  state.channel = null;
  state.pgSub = null;
  state.lobbyId = null;
  state.role = null;
  state.opponent = null;
  state.status = "idle";
}

function sendInput(action) {
  if (!state.channel) return;
  state.channel.send({ type: "broadcast", event: "input", payload: { ...action, from: state.role } });
}

function sendSnapshot(snap) {
  if (!state.channel) return;
  state.channel.send({ type: "broadcast", event: "snapshot", payload: snap });
}

function sendGameOver(winnerSide) {
  if (!state.channel) return;
  state.channel.send({ type: "broadcast", event: "gameover", payload: { winnerSide } });
}

async function reportFinish(winnerSide) {
  if (!state.lobbyId) return;
  try {
    await supabase.rpc("re_finish_lobby", { p_lobby_id: state.lobbyId, p_winner_side: winnerSide });
  } catch (err) {
    console.warn("[RE_MP] finish_lobby failed", err);
  }
  state.status = "finished";
}

function on(event, cb) { listeners[event]?.add(cb); return () => listeners[event]?.delete(cb); }

const RE_MP = {
  state,
  init,
  joinOrCreate,
  leave,
  sendInput,
  sendSnapshot,
  sendGameOver,
  reportFinish,
  onInput:         (cb) => on("input", cb),
  onSnapshot:      (cb) => on("snapshot", cb),
  onGameOver:      (cb) => on("gameOver", cb),
  onOpponentLeave: (cb) => on("opponentLeave", cb),
  onPaired:        (cb) => on("paired", cb),
  SOFT_TIMEOUT_MS,
};

window.RE_MP = RE_MP;
window.dispatchEvent(new CustomEvent("re-mp-ready"));
