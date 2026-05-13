// Pont entre Supabase et game.js (qui est en script classique non-module)
// Expose window.RE_AUTH avec session, profile, skin, methods de save game results, etc.
import { supabase, getProfile, getCurrentSkin, getEquippedSkinTiers } from "/lib/supabase.js";

const RE_AUTH = {
  ready: false,
  session: null,
  profile: null,
  skin: null,           // { hex_color, hex_color_dark } ou null (couleur d'équipe legacy — tint UI)
  equippedSkins: {},    // { light: 1, heavy: 2, ... } — tier équipé par unité (override sprite)

  async refresh() {
    const { data: { session } } = await supabase.auth.getSession();
    this.session = session;
    if (session) {
      this.profile = await getProfile();
      this.skin = await getCurrentSkin();
      this.equippedSkins = await getEquippedSkinTiers();
    } else {
      this.profile = null;
      this.skin = null;
      this.equippedSkins = {};
    }
    this.ready = true;
    // Notifie game.js que les données auth sont prêtes / changées
    window.dispatchEvent(new CustomEvent("re-auth-changed", { detail: { ...this } }));
  },

  async signOut() {
    await supabase.auth.signOut();
    location.href = "/auth/login.html";
  },

  // Appelé par game.js à la fin d'une partie. Envoie tout d'un coup.
  async finishGame(payload) {
    if (!this.session) return { ok: false, error: "not_authenticated" };
    const { data, error } = await supabase.rpc("re_finish_game", {
      p_difficulty:    payload.difficulty,
      p_result:        payload.result,
      p_duration:      Math.floor(payload.duration || 0),
      p_units_killed:  payload.unitsKilled || 0,
      p_units_lost:    payload.unitsLost || 0,
      p_damage_dealt:  Math.floor(payload.damageDealt || 0),
      p_damage_taken:  Math.floor(payload.damageTaken || 0),
      p_turrets_built: payload.turretsBuilt || 0,
      p_lightning_used:payload.lightningUsed || 0,
      p_mode:          payload.mode === "mp" ? "mp" : "solo",
      p_lobby_id:      payload.lobbyId || null,
    });
    if (error || !data?.ok) return { ok: false, error: error?.message || data?.error };
    // Met à jour le solde local
    if (this.profile) this.profile.currency += data.reward;
    return { ok: true, reward: data.reward, resultId: data.result_id, eloDelta: data.elo_delta || 0, mode: data.mode };
  },
};

window.RE_AUTH = RE_AUTH;
await RE_AUTH.refresh();

supabase.auth.onAuthStateChange(() => RE_AUTH.refresh());
