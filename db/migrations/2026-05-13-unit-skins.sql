-- =============================================================================
-- Migration : Système de skins par unité (T1/T2) + packs
-- =============================================================================
-- Date : 2026-05-13
-- Auteur : Claude (déléguée par Romain)
--
-- À EXÉCUTER dans le dashboard Supabase (SQL Editor → New query → Run).
-- Idempotent : peut être re-lancé sans casser l'existant.
--
-- Ce que ça fait :
-- 1. Étend re_shop_items pour distinguer skin de team_color / skin d'unité / pack
-- 2. Ajoute re_profiles.equipped_skins (mapping {unit_type: skin_id})
-- 3. Met à jour re_buy_item pour gérer les packs (insère tous les sous-items)
-- 4. Crée re_equip_unit_skin (RPC pour équiper/déséquiper)
-- 5. Seed 10 skins individuels + 3 packs
--
-- Conventions de seed (UUID stables, faciles à référencer) :
--   00000000-0001-{unitN}-{tierN}-000000000001
--   - unitN : 0001 light / 0002 heavy / 0003 swarmer / 0004 sniper / 0005 air
--   - tierN : 0001 T1 / 0002 T2
--   00000000-0002-{packN}-0000-000000000001 (packs)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Schéma
-- -----------------------------------------------------------------------------

-- Élargit la contrainte type pour accepter les nouvelles valeurs
-- (originale : CHECK (type = 'team_color') — trop restrictive)
ALTER TABLE re_shop_items
  DROP CONSTRAINT IF EXISTS re_shop_items_type_check;
ALTER TABLE re_shop_items
  ADD CONSTRAINT re_shop_items_type_check
  CHECK (type IN ('team_color', 'unit_skin', 'skin_pack'));

ALTER TABLE re_shop_items
  ADD COLUMN IF NOT EXISTS unit_type     TEXT,
  ADD COLUMN IF NOT EXISTS tier          INT,
  ADD COLUMN IF NOT EXISTS is_pack       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_skin_ids UUID[];

-- Contrainte : un skin d'unité doit avoir unit_type ET tier
ALTER TABLE re_shop_items
  DROP CONSTRAINT IF EXISTS re_shop_items_unit_skin_check;
ALTER TABLE re_shop_items
  ADD CONSTRAINT re_shop_items_unit_skin_check CHECK (
    (unit_type IS NULL AND tier IS NULL)
    OR (unit_type IN ('light','heavy','swarmer','sniper','air') AND tier IN (1, 2))
  );

ALTER TABLE re_profiles
  ADD COLUMN IF NOT EXISTS equipped_skins JSONB DEFAULT '{}'::jsonb;


-- -----------------------------------------------------------------------------
-- 2. RPC re_buy_item (mis à jour pour gérer les packs)
-- -----------------------------------------------------------------------------
-- Note : remplace le RPC existant. Les anciennes signatures (achat unitaire)
-- continuent de fonctionner, on ajoute juste la branche is_pack.

CREATE OR REPLACE FUNCTION re_buy_item(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_item    RECORD;
  v_profile RECORD;
  v_sub_id  UUID;
  v_added   INT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_item FROM re_shop_items WHERE id = p_item_id AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'item_not_found');
  END IF;

  SELECT * INTO v_profile FROM re_profiles WHERE id = v_user_id FOR UPDATE;
  IF v_profile.currency < v_item.price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_currency');
  END IF;

  -- Cas pack : insérer tous les sub-items pas encore possédés
  IF v_item.is_pack AND v_item.pack_skin_ids IS NOT NULL THEN
    -- Vérifier qu'au moins un sub-item n'est pas déjà possédé
    IF NOT EXISTS (
      SELECT 1 FROM unnest(v_item.pack_skin_ids) AS sub_id
      WHERE NOT EXISTS (
        SELECT 1 FROM re_user_inventory
        WHERE user_id = v_user_id AND item_id = sub_id
      )
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'all_items_already_owned');
    END IF;

    UPDATE re_profiles SET currency = currency - v_item.price WHERE id = v_user_id;

    FOR v_sub_id IN SELECT unnest(v_item.pack_skin_ids)
    LOOP
      INSERT INTO re_user_inventory (user_id, item_id)
      VALUES (v_user_id, v_sub_id)
      ON CONFLICT (user_id, item_id) DO NOTHING;
      GET DIAGNOSTICS v_added = ROW_COUNT;
    END LOOP;

    -- Marquer le pack lui-même comme acheté (pour ne pas le re-vendre)
    INSERT INTO re_user_inventory (user_id, item_id)
    VALUES (v_user_id, p_item_id)
    ON CONFLICT (user_id, item_id) DO NOTHING;

    RETURN jsonb_build_object('ok', true, 'is_pack', true,
                              'sub_ids', v_item.pack_skin_ids);
  END IF;

  -- Cas item simple : vérifier non-possédé et insérer
  IF EXISTS (SELECT 1 FROM re_user_inventory WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_owned');
  END IF;

  UPDATE re_profiles SET currency = currency - v_item.price WHERE id = v_user_id;
  INSERT INTO re_user_inventory (user_id, item_id) VALUES (v_user_id, p_item_id);

  RETURN jsonb_build_object('ok', true, 'is_pack', false);
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. RPC re_equip_unit_skin
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION re_equip_unit_skin(
  p_unit_type TEXT,
  p_skin_id   UUID DEFAULT NULL  -- NULL = déséquiper l'unité
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

  IF p_unit_type NOT IN ('light','heavy','swarmer','sniper','air') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_unit_type');
  END IF;

  -- Déséquiper : supprimer la clé du JSONB
  IF p_skin_id IS NULL THEN
    UPDATE re_profiles
       SET equipped_skins = equipped_skins - p_unit_type,
           updated_at = NOW()
     WHERE id = v_user_id;
    RETURN jsonb_build_object('ok', true, 'equipped', null);
  END IF;

  -- Valider l'item
  SELECT * INTO v_item FROM re_shop_items WHERE id = p_skin_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'skin_not_found');
  END IF;
  IF v_item.unit_type IS NULL OR v_item.unit_type != p_unit_type THEN
    RETURN jsonb_build_object('ok', false, 'error', 'skin_unit_mismatch');
  END IF;

  -- Vérifier possession
  IF NOT EXISTS (
    SELECT 1 FROM re_user_inventory WHERE user_id = v_user_id AND item_id = p_skin_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owned');
  END IF;

  -- Équiper
  UPDATE re_profiles
     SET equipped_skins = equipped_skins
                          || jsonb_build_object(p_unit_type, p_skin_id::text),
         updated_at = NOW()
   WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'equipped', p_skin_id);
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. Seed : 10 skins individuels (5 unités × 2 tiers)
-- -----------------------------------------------------------------------------
-- hex_color / hex_color_dark gardés pour preview UI (swatch boutique).
-- Le PNG réel est trouvé par convention : /08-art-direction/sprites/unit-{unit_type}-player-t{tier}.png

INSERT INTO re_shop_items
  (id, type, name, rarity, hex_color, hex_color_dark, price, sort_order, is_active, unit_type, tier)
VALUES
  -- ⭐ Tier 1 — Steel (Rare, 500 💰)
  ('00000000-0001-0001-0001-000000000001'::uuid, 'unit_skin', 'Light — Steel',    'rare', '#4A7BA8', '#1E3A5F', 500,  201, true, 'light',   1),
  ('00000000-0001-0002-0001-000000000001'::uuid, 'unit_skin', 'Heavy — Steel',    'rare', '#4A7BA8', '#1E3A5F', 500,  211, true, 'heavy',   1),
  ('00000000-0001-0003-0001-000000000001'::uuid, 'unit_skin', 'Swarmer — Steel',  'rare', '#4A7BA8', '#1E3A5F', 500,  221, true, 'swarmer', 1),
  ('00000000-0001-0004-0001-000000000001'::uuid, 'unit_skin', 'Sniper — Steel',   'rare', '#4A7BA8', '#1E3A5F', 500,  231, true, 'sniper',  1),
  ('00000000-0001-0005-0001-000000000001'::uuid, 'unit_skin', 'Air — Steel',      'rare', '#4A7BA8', '#1E3A5F', 500,  241, true, 'air',     1),
  -- ⭐⭐ Tier 2 — Royal Blue (Epic, 2000 💰)
  ('00000000-0001-0001-0002-000000000001'::uuid, 'unit_skin', 'Light — Royal Blue',    'epic', '#1E3A8A', '#0D1D3A', 2000, 202, true, 'light',   2),
  ('00000000-0001-0002-0002-000000000001'::uuid, 'unit_skin', 'Heavy — Royal Blue',    'epic', '#1E3A8A', '#0D1D3A', 2000, 212, true, 'heavy',   2),
  ('00000000-0001-0003-0002-000000000001'::uuid, 'unit_skin', 'Swarmer — Royal Blue',  'epic', '#1E3A8A', '#0D1D3A', 2000, 222, true, 'swarmer', 2),
  ('00000000-0001-0004-0002-000000000001'::uuid, 'unit_skin', 'Sniper — Royal Blue',   'epic', '#1E3A8A', '#0D1D3A', 2000, 232, true, 'sniper',  2),
  ('00000000-0001-0005-0002-000000000001'::uuid, 'unit_skin', 'Air — Royal Blue',      'epic', '#1E3A8A', '#0D1D3A', 2000, 242, true, 'air',     2)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 5. Seed : 3 packs (référencent les UUID des skins individuels)
-- -----------------------------------------------------------------------------
-- Pricing : 10% remise par rapport à l'achat individuel
--   Pack T1 : 5 × 500 = 2500 → 2250 (-10%)
--   Pack T2 : 5 × 2000 = 10000 → 9000 (-10%)
--   Full Set : 5 × 500 + 5 × 2000 = 12500 → 10000 (-20%)

INSERT INTO re_shop_items
  (id, type, name, rarity, hex_color, hex_color_dark, price, sort_order, is_active, is_pack, pack_skin_ids)
VALUES
  ('00000000-0002-0001-0000-000000000001'::uuid, 'skin_pack',
   'Pack Steel — Toutes les unités (T1)', 'rare',
   '#4A7BA8', '#1E3A5F', 2250, 301, true, true,
   ARRAY[
     '00000000-0001-0001-0001-000000000001'::uuid,
     '00000000-0001-0002-0001-000000000001'::uuid,
     '00000000-0001-0003-0001-000000000001'::uuid,
     '00000000-0001-0004-0001-000000000001'::uuid,
     '00000000-0001-0005-0001-000000000001'::uuid
   ]),
  ('00000000-0002-0002-0000-000000000001'::uuid, 'skin_pack',
   'Pack Royal Blue — Toutes les unités (T2)', 'epic',
   '#1E3A8A', '#0D1D3A', 9000, 302, true, true,
   ARRAY[
     '00000000-0001-0001-0002-000000000001'::uuid,
     '00000000-0001-0002-0002-000000000001'::uuid,
     '00000000-0001-0003-0002-000000000001'::uuid,
     '00000000-0001-0004-0002-000000000001'::uuid,
     '00000000-0001-0005-0002-000000000001'::uuid
   ]),
  ('00000000-0002-0003-0000-000000000001'::uuid, 'skin_pack',
   'Pack Full Set — Tout T1 + T2 (-20%)', 'legendary',
   '#FBBF24', '#92400E', 10000, 303, true, true,
   ARRAY[
     '00000000-0001-0001-0001-000000000001'::uuid, '00000000-0001-0001-0002-000000000001'::uuid,
     '00000000-0001-0002-0001-000000000001'::uuid, '00000000-0001-0002-0002-000000000001'::uuid,
     '00000000-0001-0003-0001-000000000001'::uuid, '00000000-0001-0003-0002-000000000001'::uuid,
     '00000000-0001-0004-0001-000000000001'::uuid, '00000000-0001-0004-0002-000000000001'::uuid,
     '00000000-0001-0005-0001-000000000001'::uuid, '00000000-0001-0005-0002-000000000001'::uuid
   ])
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 6. Vérification
-- -----------------------------------------------------------------------------
SELECT 'Skins individuels'  AS section, COUNT(*) AS count FROM re_shop_items WHERE type = 'unit_skin'
UNION ALL
SELECT 'Packs'              AS section, COUNT(*) FROM re_shop_items WHERE type = 'skin_pack'
UNION ALL
SELECT 'Team colors legacy' AS section, COUNT(*) FROM re_shop_items WHERE type = 'team_color';
