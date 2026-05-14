-- =============================================================================
-- Logs des sessions spectateur
-- =============================================================================
-- Date : 2026-05-14
-- Auteur : Claude (déléguée par Romain)
--
-- Objectif : tracer qui regarde des parties MP en mode spectateur, pour
-- combien de temps. Auteur = compte connecté (user_id) ou pseudo invité
-- (guest_username) — au moins un des deux est requis.

CREATE TABLE IF NOT EXISTS re_spectator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES re_profiles(id) ON DELETE SET NULL,
  guest_username text,
  lobby_id uuid REFERENCES re_lobbies(id) ON DELETE SET NULL,
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT re_spectator_sessions_identity_required
    CHECK (user_id IS NOT NULL OR guest_username IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_re_spectator_sessions_created_at
  ON re_spectator_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_re_spectator_sessions_guest_username
  ON re_spectator_sessions (guest_username) WHERE guest_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_re_spectator_sessions_user_id
  ON re_spectator_sessions (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE re_spectator_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "re_spectator_sessions admin read" ON re_spectator_sessions;
CREATE POLICY "re_spectator_sessions admin read"
  ON re_spectator_sessions FOR SELECT
  USING (re_is_admin());

-- RPC dédié : utilisable par anon (invités) et authenticated.
CREATE OR REPLACE FUNCTION public.re_log_spectator_session(
  p_guest_username text,
  p_lobby_id uuid,
  p_duration_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_user uuid := auth.uid();
  v_guest text := trim(coalesce(p_guest_username, ''));
  v_duration int := greatest(0, coalesce(p_duration_seconds, 0));
begin
  -- Identité minimale : si pas connecté, pseudo invité obligatoire.
  if v_user is null and v_guest = '' then
    return jsonb_build_object('ok', false, 'error', 'identity_required');
  end if;
  if length(v_guest) > 64 then
    return jsonb_build_object('ok', false, 'error', 'invalid_guest_username');
  end if;

  insert into re_spectator_sessions (user_id, guest_username, lobby_id, duration_seconds)
  values (
    v_user,
    nullif(v_guest, ''),
    p_lobby_id,
    v_duration
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'session_id', v_id);
end;
$function$;

GRANT EXECUTE ON FUNCTION public.re_log_spectator_session(text, uuid, integer)
  TO anon, authenticated;
