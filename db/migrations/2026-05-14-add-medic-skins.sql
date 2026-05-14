-- =============================================================================
-- Migration : Ajout des skins médic K9 (T1 Steel + T2 Royal Blue)
-- =============================================================================
-- Date : 2026-05-14
-- Auteur : Claude (déléguée par Romain)
--
-- À EXÉCUTER dans le dashboard Supabase (SQL Editor → New query → Run).
-- Idempotent : peut être re-lancé sans casser l'existant.
--
-- Ce que ça fait :
-- 1. Élargit la CHECK constraint re_shop_items_unit_skin_check pour accepter 'medic'
-- 2. Met à jour le RPC re_equip_unit_skin pour autoriser unit_type='medic'
-- 3. Seed 2 skins médic individuels (T1 Steel + T2 Royal Blue)
--
-- Pas de pack ajouté (les packs Steel/Royal/Full Set existants restent à 5 unités
-- pour ne pas casser leur pricing). Les skins médic se vendent à l'unité.
--
-- Convention UUID (suit le pattern de la migration 2026-05-13) :
--   00000000-0001-0006-{tierN}-000000000001  -- 0006 = medic
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Élargit la CHECK constraint pour accepter 'medic'
-- -----------------------------------------------------------------------------

ALTER TABLE re_shop_items
  DROP CONSTRAINT IF EXISTS re_shop_items_unit_skin_check;
ALTER TABLE re_shop_items
  ADD CONSTRAINT re_shop_items_unit_skin_check CHECK (
    (unit_type IS NULL AND tier IS NULL)
    OR (unit_type IN ('light','heavy','swarmer','sniper','air','medic') AND tier IN (1, 2))
  );


-- -----------------------------------------------------------------------------
-- 2. RPC re_equip_unit_skin — autorise unit_type='medic'
-- -----------------------------------------------------------------------------
-- Remplace la version qui rejetait 'medic'. Reste idempotent.

CREATE OR REPLACE FUNCTION re_equip_unit_skin(
  p_unit_type TEXT,
  p_skin_id   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_item    RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_unit_type NOT IN ('light','heavy','swarmer','sniper','air','medic') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_unit_type');
  END IF;

  IF p_skin_id IS NULL THEN
    UPDATE re_profiles
       SET equipped_skins = equipped_skins - p_unit_type,
           updated_at = NOW()
     WHERE id = v_user_id;
    RETURN jsonb_build_object('ok', true, 'equipped', null);
  END IF;

  SELECT * INTO v_item FROM re_shop_items WHERE id = p_skin_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'skin_not_found');
  END IF;
  IF v_item.unit_type IS NULL OR v_item.unit_type != p_unit_type THEN
    RETURN jsonb_build_object('ok', false, 'error', 'skin_unit_mismatch');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM re_user_inventory WHERE user_id = v_user_id AND item_id = p_skin_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owned');
  END IF;

  UPDATE re_profiles
     SET equipped_skins = equipped_skins
                          || jsonb_build_object(p_unit_type, p_skin_id::text),
         updated_at = NOW()
   WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'equipped', p_skin_id);
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. Seed : 2 skins médic (T1 Steel + T2 Royal Blue)
-- -----------------------------------------------------------------------------
-- Pricing aligné avec les autres unités :
--   T1 Steel       = 500 💰  (Rare)
--   T2 Royal Blue  = 2000 💰 (Epic)
-- sort_order : 251/252 pour les placer après les 5 unités existantes (201-242)

INSERT INTO re_shop_items
  (id, type, name, rarity, hex_color, hex_color_dark, price, sort_order, is_active, unit_type, tier)
VALUES
  ('00000000-0001-0006-0001-000000000001'::uuid, 'unit_skin', 'Médic K9 — Steel',      'rare', '#4A7BA8', '#1E3A5F', 500,  251, true, 'medic', 1),
  ('00000000-0001-0006-0002-000000000001'::uuid, 'unit_skin', 'Médic K9 — Royal Blue', 'epic', '#1E3A8A', '#0D1D3A', 2000, 252, true, 'medic', 2)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 4. Vérification
-- -----------------------------------------------------------------------------
SELECT name, rarity, price, unit_type, tier
  FROM re_shop_items
 WHERE unit_type = 'medic'
 ORDER BY tier;
