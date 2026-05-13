// Multijoueur PvP host-authoritative pour Émergence.
// Flow par codes de salon explicites :
//   - Le host appelle createLobby() -> reçoit un code à 6 caractères
//   - Le guest appelle joinByCode(code) -> rejoint le salon
//   - Chaque joueur appelle setReady(true) quand il est prêt
//   - Quand les deux sont prêts, le statut bascule à "playing" et la partie démarre
//
// API exposée sur window.RE_MP :
//   init()                                  -> Promise<profile|null>
//   createLobby({biome, difficulty})        -> Promise<{lobbyId, code, role:'host', biome, difficulty, seed} | {error}>
//   joinByCode(code)                        -> Promise<{lobbyId, code, role:'guest', host_username, biome, difficulty, seed} | {error}>
//   setReady(ready: boolean)                -> Promise<{hostReady, guestReady, bothReady} | {error}>
//   leave()                                 -> Promise<void>
//   sendInput(action) / sendSnapshot(snap) / sendGameOver(winnerSide)
//   reportFinish(winnerSide)
//   on{Input,Snapshot,GameOver,OpponentLeave,LobbyUpdate,Start}(cb) -> unsubscribe
//   state                                   -> lecture seule

import { supabase, getProfile } from "/lib/supabase.js";

const listeners = {
  input: new Set(),
  snapshot: new Set(),
  gameOver: new Set(),
  opponentLeave: new Set(),
  lobbyUpdate: new Set(),     // changements de re_lobbies (guest joins, ready flags…)
  start: new Set(),            // les 2 joueurs prêts → partie démarre
  chat: new Set(),             // message texte reçu via broadcast
  emote: new Set(),            // emote rapide reçue via broadcast
};

const state = {
  lobbyId: null,
  code: null,
  role: null,                  // "host" | "guest"
  opponent: null,              // { id, username }
  status: "idle",              // idle | waiting | playing | finished | abandoned
  hostReady: false,
  guestReady: false,
  biome: "desert",
  difficulty: "normal",
  seed: 0,
  channel: null,
  pgSub: null,                 // postgres_changes sur la ligne re_lobbies courante
  pollTimer: null,             // fallback poll DB
  startFired: false,           // garde-fou pour ne pas démarrer 2x
  me: null,                    // profil courant
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

function applyLobbyRow(row) {
  if (!row) return;
  const oldStatus = state.status;
  state.lobbyId = row.id || state.lobbyId;
  state.code = row.code || state.code;
  state.status = row.status || state.status;
  state.hostReady = !!row.host_ready;
  state.guestReady = !!row.guest_ready;
  if (row.seed != null) state.seed = Number(row.seed);
  if (row.biome) state.biome = row.biome;
  if (row.difficulty) state.difficulty = row.difficulty;

  // Met à jour l'adversaire selon mon rôle
  if (state.role === "host") {
    state.opponent = row.guest_id
      ? { id: row.guest_id, username: row.guest_username }
      : null;
  } else if (state.role === "guest") {
    state.opponent = { id: row.host_id, username: row.host_username };
  }

  notify("lobbyUpdate", {
    status: state.status,
    hostReady: state.hostReady,
    guestReady: state.guestReady,
    opponent: state.opponent,
    code: state.code,
  });

  if (state.status === "playing" && !state.startFired) {
    state.startFired = true;
    notify("start", {
      seed: state.seed,
      biome: state.biome,
      difficulty: state.difficulty,
      opponent: state.opponent,
    });
  }
  // Si le lobby a été abandonné (par exemple par l'autre joueur) et que je
  // n'étais pas encore en jeu, j'informe l'UI pour qu'elle redirige.
  if ((state.status === "abandoned" || state.status === "finished") && oldStatus !== state.status) {
    notify("opponentLeave", { reason: state.status });
  }
}

async function createLobby({ biome = "desert", difficulty = "normal", visibility = "public" } = {}) {
  await init();
  if (!state.me) return { error: "not_authenticated" };

  const { data, error } = await supabase.rpc("re_create_lobby", {
    p_biome: biome,
    p_difficulty: difficulty,
    p_visibility: visibility,
  });
  if (error) {
    console.error("[RE_MP] re_create_lobby", error);
    return { error: error.message || "rpc_failed" };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "no_lobby_returned" };

  state.lobbyId = row.lobby_id;
  state.code = row.code;
  state.role = "host";
  state.opponent = null;
  state.status = "waiting";
  state.visibility = row.visibility || visibility;
  state.hostReady = false;
  state.guestReady = false;
  state.startFired = false;
  state.seed = Number(row.seed);
  state.biome = row.biome;
  state.difficulty = row.difficulty;

  await setupChannel();
  subscribeLobbyRow();

  return {
    lobbyId: state.lobbyId,
    code: state.code,
    role: "host",
    biome: state.biome,
    difficulty: state.difficulty,
    seed: state.seed,
    visibility: state.visibility,
  };
}

// Retourne la liste des salons publics waiting + parties en cours pour le navigateur.
async function listActiveLobbies() {
  await init();
  if (!state.me) return { error: "not_authenticated" };
  const { data, error } = await supabase.rpc("re_list_active_lobbies");
  if (error) return { error: error.message || "rpc_failed" };
  return { lobbies: data || [] };
}

async function joinByCode(code) {
  await init();
  if (!state.me) return { error: "not_authenticated" };
  if (!code || typeof code !== "string") return { error: "invalid_code" };

  const { data, error } = await supabase.rpc("re_join_lobby_by_code", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) {
    const msg = error.message || "rpc_failed";
    return { error: msg };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "lobby_not_found" };

  state.lobbyId = row.lobby_id;
  state.code = row.code;
  state.role = "guest";
  state.opponent = { id: row.host_id, username: row.host_username };
  state.status = row.status || "waiting";
  state.hostReady = !!row.host_ready;
  state.guestReady = !!row.guest_ready;
  state.startFired = state.status === "playing";
  state.seed = Number(row.seed);
  state.biome = row.biome;
  state.difficulty = row.difficulty;

  await setupChannel();
  subscribeLobbyRow();

  return {
    lobbyId: state.lobbyId,
    code: state.code,
    role: "guest",
    host_username: row.host_username,
    biome: state.biome,
    difficulty: state.difficulty,
    seed: state.seed,
    status: state.status,
  };
}

async function setReady(ready) {
  if (!state.lobbyId) return { error: "no_lobby" };
  const { data, error } = await supabase.rpc("re_set_ready", {
    p_lobby_id: state.lobbyId,
    p_ready: !!ready,
  });
  if (error) {
    console.error("[RE_MP] re_set_ready", error);
    return { error: error.message || "rpc_failed" };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (row) {
    state.hostReady = !!row.host_ready;
    state.guestReady = !!row.guest_ready;
    if (row.status) state.status = row.status;
    return { hostReady: state.hostReady, guestReady: state.guestReady, bothReady: !!row.both_ready, status: state.status };
  }
  return { hostReady: state.hostReady, guestReady: state.guestReady, bothReady: false };
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
  ch.on("broadcast", { event: "chat" },     ({ payload }) => notify("chat", payload));
  ch.on("broadcast", { event: "emote" },    ({ payload }) => notify("emote", payload));
  ch.on("broadcast", { event: "hello" },    ({ payload }) => {
    // ping de présence : utile pour que le host sache que le guest est connecté
    if (state.role === "host" && payload?.from === "guest") {
      ch.send({ type: "broadcast", event: "hello", payload: { from: "host", username: state.me?.username || null } });
    }
  });
  ch.on("presence", { event: "leave" }, ({ key }) => {
    if (state.opponent && key === state.opponent.id) {
      notify("opponentLeave", { id: key, reason: "presence_leave" });
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

// Souscrit aux changements de la ligne re_lobbies courante + poll fallback.
// On déclenche `lobbyUpdate` à chaque update (pour rafraîchir l'UI ready/opponent)
// et `start` quand status === 'playing'.
function subscribeLobbyRow() {
  if (state.pgSub) {
    try { supabase.removeChannel(state.pgSub); } catch {}
    state.pgSub = null;
  }
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  const sub = supabase.channel(`re-lobby-row-${state.lobbyId}`)
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "re_lobbies", filter: `id=eq.${state.lobbyId}` },
      ({ new: row }) => applyLobbyRow(row))
    .subscribe();
  state.pgSub = sub;

  // Fallback poll (toutes les 2 s) : tape la DB pour récupérer la ligne courante.
  state.pollTimer = setInterval(async () => {
    if (!state.lobbyId) return;
    try {
      const { data } = await supabase
        .from("re_lobbies")
        .select("id,code,status,host_id,guest_id,host_username,guest_username,seed,biome,difficulty,host_ready,guest_ready")
        .eq("id", state.lobbyId)
        .maybeSingle();
      if (data) applyLobbyRow(data);
      if (state.status === "playing" || state.status === "abandoned" || state.status === "finished") {
        // dans tous ces cas on peut arrêter le poll
        if (state.pollTimer && state.status !== "playing") {
          clearInterval(state.pollTimer); state.pollTimer = null;
        }
      }
    } catch {}
  }, 2000);
}

async function leave() {
  if (state.lobbyId && state.status !== "finished") {
    try { await supabase.rpc("re_cancel_lobby", { p_lobby_id: state.lobbyId }); }
    catch (err) { console.warn("[RE_MP] cancel_lobby failed", err); }
  }
  if (state.channel) { try { await supabase.removeChannel(state.channel); } catch {} }
  if (state.pgSub)  { try { await supabase.removeChannel(state.pgSub); } catch {} }
  if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  Object.assign(state, {
    channel: null, pgSub: null,
    lobbyId: null, code: null, role: null,
    opponent: null, status: "idle",
    hostReady: false, guestReady: false, startFired: false,
  });
}

function sendInput(action) {
  if (!state.channel) return;
  state.channel.send({ type: "broadcast", event: "input", payload: { ...action, from: state.role } });
}

function sendSnapshot(snap) {
  if (!state.channel) return;
  state.channel.send({ type: "broadcast", event: "snapshot", payload: snap });
}

function sendGameOver(winnerSide, extras = {}) {
  if (!state.channel) return;
  state.channel.send({ type: "broadcast", event: "gameover", payload: { winnerSide, ...extras } });
}

// Envoie un message texte sur le canal du salon. Le payload inclut le pseudo
// pour qu'on n'ait pas à le résoudre côté receveur, et un id local pour
// dédupliquer (échos locaux).
function sendChat(text) {
  if (!state.channel) return;
  const trimmed = (text || "").toString().slice(0, 240);
  if (!trimmed.trim()) return;
  state.channel.send({
    type: "broadcast",
    event: "chat",
    payload: {
      text: trimmed,
      username: state.me?.username || "anonyme",
      from: state.role,
      ts: Date.now(),
      id: `${state.me?.id || "x"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
  // Diffuse aussi vers soi-même (broadcast a self:false)
  notify("chat", {
    text: trimmed,
    username: state.me?.username || "anonyme",
    from: state.role,
    ts: Date.now(),
    self: true,
  });
}

async function reportFinish(winnerSide) {
  if (!state.lobbyId) return;
  try {
    await supabase.rpc("re_finish_lobby", { p_lobby_id: state.lobbyId, p_winner_side: winnerSide });
  } catch (err) { console.warn("[RE_MP] finish_lobby failed", err); }
  state.status = "finished";
}

// Abandonne la partie courante. Le RPC marque le lobby finished avec l'AUTRE
// comme vainqueur ; on diffuse aussi un gameover sur le channel pour que le
// peer voit l'écran de fin immédiatement.
async function surrender() {
  if (!state.lobbyId) return { error: "no_lobby" };
  try {
    const { data, error } = await supabase.rpc("re_surrender_lobby", { p_lobby_id: state.lobbyId });
    if (error) return { error: error.message || "rpc_failed" };
    const row = Array.isArray(data) ? data[0] : data;
    const winnerSide = row?.winner_side === "host" ? "player" : "enemy";
    // Diffuse aux autres (host/guest/spectateurs)
    if (state.channel) {
      state.channel.send({ type: "broadcast", event: "gameover", payload: { winnerSide, reason: "surrender", from: state.role } });
    }
    return { winnerSide };
  } catch (err) {
    return { error: err?.message || "failed" };
  }
}

// Rejoint un lobby en tant que spectateur — pas d'écriture côté DB, juste un
// abonnement au channel broadcast pour recevoir snapshots/chat/emotes.
async function joinAsSpectator(lobbyId, opts = {}) {
  await init();
  if (!lobbyId) return { error: "no_lobby_id" };
  // Récupère les meta du lobby via la liste publique (RLS-safe)
  let meta = opts.meta || null;
  if (!meta) {
    const { data, error } = await supabase.rpc("re_list_active_lobbies");
    if (error) return { error: error.message };
    meta = (data || []).find((l) => l.lobby_id === lobbyId) || null;
  }
  if (!meta) return { error: "lobby_not_found" };
  if (meta.status !== "playing") return { error: "not_playing" };

  state.lobbyId = lobbyId;
  state.code = meta.code || null;
  state.role = "spectator";
  state.opponent = null;
  state.status = "playing";
  state.hostReady = true;
  state.guestReady = true;
  state.startFired = true;
  state.seed = Number(meta.seed) || 0;
  state.biome = meta.biome || "desert";
  state.difficulty = meta.difficulty || "normal";

  await setupChannel();
  return {
    lobbyId,
    role: "spectator",
    biome: state.biome,
    difficulty: state.difficulty,
    seed: state.seed,
    host_username: meta.host_username,
    guest_username: meta.guest_username,
  };
}

function sendEmote(emoteId) {
  if (!state.channel || !emoteId) return;
  const payload = {
    emote: String(emoteId).slice(0, 16),
    username: state.me?.username || "anonyme",
    from: state.role,
    ts: Date.now(),
  };
  state.channel.send({ type: "broadcast", event: "emote", payload });
  notify("emote", { ...payload, self: true });
}

function on(event, cb) { listeners[event]?.add(cb); return () => listeners[event]?.delete(cb); }

const RE_MP = {
  state,
  init,
  createLobby,
  joinByCode,
  joinAsSpectator,
  setReady,
  listActiveLobbies,
  surrender,
  leave,
  sendInput,
  sendSnapshot,
  sendGameOver,
  sendChat,
  sendEmote,
  reportFinish,
  onInput:         (cb) => on("input", cb),
  onSnapshot:      (cb) => on("snapshot", cb),
  onGameOver:      (cb) => on("gameOver", cb),
  onOpponentLeave: (cb) => on("opponentLeave", cb),
  onLobbyUpdate:   (cb) => on("lobbyUpdate", cb),
  onStart:         (cb) => on("start", cb),
  onChat:          (cb) => on("chat", cb),
  onEmote:         (cb) => on("emote", cb),
};

window.RE_MP = RE_MP;
window.dispatchEvent(new CustomEvent("re-mp-ready"));
