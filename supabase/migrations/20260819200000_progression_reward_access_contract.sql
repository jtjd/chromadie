-- Make progression rewards actual earned unlocks.
--
-- The profile-expression catalog still has a generous free baseline, but the
-- items named by the progression journey must change access state when the
-- journey is introduced.  Inventory remains the server-authoritative proof
-- of an earned expression; equip_item() already enforces that boundary for
-- non-free rows.
BEGIN;

UPDATE public.shop_items AS item
SET access_tier = 'earned',
    cost = 0,
    entitlement_key = NULL
WHERE item.catalog_status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.progression_milestones AS milestone
    WHERE milestone.reward_item_key = item.item_key
  );

-- Preserve any expression a player had equipped while the catalog was
-- temporarily universal-free.  This is a compatibility backfill only; new
-- unlocks still arrive through grant_progression_milestones().
INSERT INTO public.inventory (user_id, item_key, quantity)
SELECT profile_row.id, item.item_key, 1
FROM public.profiles AS profile_row
JOIN LATERAL jsonb_each_text(COALESCE(profile_row.equipped_cosmetics, '{}'::jsonb)) AS equipped(slot, item_key)
  ON true
JOIN public.shop_items AS item
  ON item.item_key = equipped.item_key
WHERE item.catalog_status = 'active'
  AND item.access_tier = 'earned'
  AND EXISTS (
    SELECT 1
    FROM public.progression_milestones AS milestone
    WHERE milestone.reward_item_key = item.item_key
  )
ON CONFLICT (user_id, item_key) DO NOTHING;

-- Atelier remains an explicit Plus expression surface.  It is not part of
-- the progression journey and must not be made earned by a future catalog
-- reset that touches all expression slots.
UPDATE public.shop_items
SET access_tier = 'premium',
    cost = 0,
    entitlement_key = 'chromadie_plus'
WHERE item_key IN ('name_prism_atelier', 'bg_prism_atmosphere')
  AND catalog_status = 'active';

DO $verification$
DECLARE
  v_invalid_rewards text;
  v_atelier_count bigint;
  v_free_baseline_count bigint;
BEGIN
  SELECT string_agg(m.reward_item_key, ', ' ORDER BY m.reward_item_key)
  INTO v_invalid_rewards
  FROM public.progression_milestones AS m
  LEFT JOIN public.shop_items AS item ON item.item_key = m.reward_item_key
  WHERE item.item_key IS NULL
     OR item.catalog_status <> 'active'
     OR item.access_tier <> 'earned'
     OR item.cost <> 0
     OR item.entitlement_key IS NOT NULL;

  IF v_invalid_rewards IS NOT NULL THEN
    RAISE EXCEPTION 'Progression rewards must be active earned items: %', v_invalid_rewards;
  END IF;

  SELECT count(*)
  INTO v_atelier_count
  FROM public.shop_items
  WHERE item_key IN ('name_prism_atelier', 'bg_prism_atmosphere')
    AND catalog_status = 'active'
    AND access_tier = 'premium'
    AND entitlement_key = 'chromadie_plus';

  IF v_atelier_count <> 2 THEN
    RAISE EXCEPTION 'Expected both active Atelier expressions to remain Plus-only, found %', v_atelier_count;
  END IF;

  SELECT count(*)
  INTO v_free_baseline_count
  FROM public.shop_items AS item
  WHERE item.catalog_status = 'active'
    AND item.access_tier = 'free'
    AND NOT EXISTS (
      SELECT 1
      FROM public.progression_milestones AS milestone
      WHERE milestone.reward_item_key = item.item_key
    );

  IF v_free_baseline_count = 0 THEN
    RAISE EXCEPTION 'The expression catalog must retain a free baseline';
  END IF;
END;
$verification$;

COMMIT;
