// Client Supabase partagé (chargé via ESM CDN — pas de bundler nécessaire)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ltwohptcyiqebwlpiuyw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7milbMuwFBLuJXuAbBGaww_FPXavbdn";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "re-auth",
  },
});

// Helpers fréquemment utilisés
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  // Tentative avec equipped_skins (post-migration unit-skins).
  let { data, error } = await supabase
    .from("re_profiles")
    .select("id, username, is_admin, currency, current_skin_id, equipped_skins")
    .eq("id", session.user.id)
    .single();
  // Fallback si la colonne equipped_skins n'existe pas encore (migration SQL pas exécutée).
  // Code Postgres 42703 = "undefined_column".
  if (error?.code === "42703" || (error && /equipped_skins/i.test(error.message || ""))) {
    const fallback = await supabase
      .from("re_profiles")
      .select("id, username, is_admin, currency, current_skin_id")
      .eq("id", session.user.id)
      .single();
    return fallback.data || null;
  }
  return data || null;
}

export async function getCurrentSkin() {
  const profile = await getProfile();
  if (!profile?.current_skin_id) return null;
  const { data } = await supabase
    .from("re_shop_items")
    .select("id, name, hex_color, hex_color_dark, rarity")
    .eq("id", profile.current_skin_id)
    .single();
  return data;
}

// Résout les UUID d'equipped_skins en mapping { unit_type: tier } pour game.js.
// Renvoie un objet vide si aucun skin équipé ou si la migration SQL n'est pas faite.
export async function getEquippedSkinTiers() {
  const profile = await getProfile();
  if (!profile?.equipped_skins) return {};
  const ids = Object.values(profile.equipped_skins).filter(Boolean);
  if (ids.length === 0) return {};
  // Le select inclut unit_type/tier qui sont ajoutées par la migration. Si
  // les colonnes n'existent pas, on retourne silencieusement {} sans planter.
  const { data, error } = await supabase
    .from("re_shop_items")
    .select("id, unit_type, tier")
    .in("id", ids);
  if (error || !data) return {};
  const result = {};
  for (const skin of data) {
    if (skin.unit_type && skin.tier) result[skin.unit_type] = skin.tier;
  }
  return result;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function requireSession(redirectTo = "/auth/login.html") {
  const session = await getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}
