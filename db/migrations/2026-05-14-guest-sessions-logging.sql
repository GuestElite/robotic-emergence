-- =============================================================================
-- Logs des invités (joueurs sans compte connecté)
-- =============================================================================
-- Date : 2026-05-14
-- Auteur : Claude (déléguée par Romain)
--
-- Objectif : permettre aux invités de logger leurs parties dans
-- re_game_results pour les visualiser dans l'admin. Un guest_username stable
-- est généré côté client (localStorage) au format "invite######" et envoyé
-- à chaque fin de partie via un RPC dédié anonyme.

ALTER TABLE re_game_results
  ADD COLUMN IF NOT EXISTS guest_username text;

CREATE INDEX IF NOT EXISTS idx_re_game_results_guest_username
  ON re_game_results(guest_username)
  WHERE guest_username IS NOT NULL;

-- RPC dédié invités : aucune currency, aucune mission, aucun ELO.
-- Juste un log de session pour visibilité admin.
CREATE OR REPLACE FUNCTION public.re_finish_game_guest(
  p_guest_username text,
  p_difficulty text,
  p_result text,
  p_duration integer,
  p_units_killed integer,
  p_units_lost integer,
  p_damage_dealt integer,
  p_damage_taken integer,
  p_turrets_built integer,
  p_lightning_used integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_name text := trim(coalesce(p_guest_username, ''));
begin
  -- Garde-fou : pseudo invité obligatoire et raisonnable.
  if v_name = '' or length(v_name) > 64 then
    return jsonb_build_object('ok', false, 'error', 'invalid_guest_username');
  end if;
  if p_result not in ('win', 'lose') then
    return jsonb_build_object('ok', false, 'error', 'invalid_result');
  end if;

  insert into re_game_results (
    user_id, guest_username, difficulty, result, duration,
    units_killed, units_lost, damage_dealt, damage_taken,
    turrets_built, lightning_used, currency_earned, mode, elo_delta
  ) values (
    null, v_name, p_difficulty, p_result, p_duration,
    greatest(0, p_units_killed), greatest(0, p_units_lost),
    greatest(0, p_damage_dealt), greatest(0, p_damage_taken),
    greatest(0, p_turrets_built), greatest(0, p_lightning_used),
    0, 'solo', 0
  ) returning id into v_id;

  return jsonb_build_object('ok', true, 'result_id', v_id);
end;
$function$;

GRANT EXECUTE ON FUNCTION public.re_finish_game_guest(
  text, text, text, integer, integer, integer, integer, integer, integer, integer
) TO anon, authenticated;
