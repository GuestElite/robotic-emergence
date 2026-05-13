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
  const { data } = await supabase
    .from("re_profiles")
    .select("id, username, is_admin, currency, current_skin_id")
    .eq("id", session.user.id)
    .single();
  return data;
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
