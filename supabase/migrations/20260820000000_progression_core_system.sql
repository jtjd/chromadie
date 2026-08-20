-- Progression core system.
--
-- This is the final additive migration for the progression authority slice.
-- The authored milestone manifest remains the single source of truth. Profile
-- counters, durable achievements, inventory, and the owner-only RPC boundary
-- remain the sources of authority for eligibility and acquisition.
BEGIN;

-- ---------------------------------------------------------------------------
-- Manifest metadata and authored pacing
-- ---------------------------------------------------------------------------

ALTER TABLE public.progression_milestones
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS expected_rolls bigint,
  ADD COLUMN IF NOT EXISTS pace_band text NOT NULL DEFAULT 'days';

ALTER TABLE public.progression_milestones
  DROP CONSTRAINT IF EXISTS progression_milestones_progress_source_check,
  DROP CONSTRAINT IF EXISTS progression_milestones_prerequisite_check,
  DROP CONSTRAINT IF EXISTS progression_milestones_expected_rolls_check,
  DROP CONSTRAINT IF EXISTS progression_milestones_pace_band_check;

-- progress_source is deliberately authoritative. achievement_id is retained
-- as the durable condition/achievement reference, but it is not required for
-- numeric counters such as the 730- and 1,095-roll capstones.
UPDATE public.progression_milestones
SET progress_source = 'lifetime_ep',
    progress_target = threshold,
    published = true,
    expected_rolls = NULL,
    pace_band = CASE
      WHEN threshold <= 2500000 THEN 'months'
      ELSE 'years'
    END
WHERE metric = 'lifetime_ep';

UPDATE public.progression_milestones
SET progress_source = CASE
      WHEN achievement_id IN ('first_roll', 'roll_10', 'roll_50', 'roll_100', 'roll_365') THEN 'total_rolls'
      WHEN achievement_id IN ('streak_7', 'streak_14', 'streak_30', 'streak_100') THEN 'longest_streak'
      ELSE progress_source
    END,
    progress_target = CASE achievement_id
      WHEN 'first_roll' THEN 1
      WHEN 'roll_10' THEN 10
      WHEN 'streak_7' THEN 7
      WHEN 'roll_50' THEN 50
      WHEN 'streak_14' THEN 14
      WHEN 'streak_30' THEN 30
      WHEN 'roll_100' THEN 100
      WHEN 'streak_100' THEN 100
      WHEN 'roll_365' THEN 365
      ELSE progress_target
    END,
    published = true,
    expected_rolls = NULL,
    pace_band = CASE
      WHEN achievement_id IN ('first_roll', 'roll_10', 'streak_7', 'streak_14', 'streak_30', 'roll_50', 'roll_100') THEN 'days'
      WHEN achievement_id = 'streak_100' THEN 'months'
      WHEN achievement_id = 'roll_365' THEN 'years'
      ELSE pace_band
    END,
    sort_order = CASE achievement_id
      WHEN 'first_roll' THEN 10
      WHEN 'streak_7' THEN 20
      WHEN 'roll_10' THEN 30
      WHEN 'streak_14' THEN 40
      WHEN 'streak_30' THEN 50
      WHEN 'roll_50' THEN 60
      WHEN 'roll_100' THEN 70
      WHEN 'streak_100' THEN 80
      WHEN 'roll_365' THEN 90
      ELSE sort_order
    END
WHERE track = 'ritual';

-- Discovery is ordered by the deterministic roll model rather than by the
-- order in which the conditions happened to be authored. Mythic is more
-- common than Anomaly in the current model, so it intentionally precedes it.
UPDATE public.progression_milestones
SET progress_source = 'achievement',
    progress_target = NULL,
    published = true,
    expected_rolls = CASE achievement_id
      WHEN 'rarity_rare' THEN 6
      WHEN 'roll_prime' THEN 6
      WHEN 'rarity_epic' THEN 7
      WHEN 'high_contrast' THEN 10
      WHEN 'mythic_roll' THEN 852
      WHEN 'rarity_anomaly' THEN 2191
      WHEN 'roll_palindrome' THEN 4096
      WHEN 'greyscale' THEN 65536
      ELSE expected_rolls
    END,
    pace_band = CASE achievement_id
      WHEN 'rarity_rare' THEN 'days'
      WHEN 'roll_prime' THEN 'days'
      WHEN 'rarity_epic' THEN 'days'
      WHEN 'high_contrast' THEN 'days'
      WHEN 'mythic_roll' THEN 'years'
      WHEN 'rarity_anomaly' THEN 'years'
      WHEN 'roll_palindrome' THEN 'years'
      WHEN 'greyscale' THEN 'legacy'
      ELSE pace_band
    END,
    sort_order = CASE achievement_id
      WHEN 'rarity_rare' THEN 10
      WHEN 'roll_prime' THEN 20
      WHEN 'rarity_epic' THEN 30
      WHEN 'high_contrast' THEN 40
      WHEN 'mythic_roll' THEN 50
      WHEN 'rarity_anomaly' THEN 60
      WHEN 'roll_palindrome' THEN 70
      WHEN 'greyscale' THEN 90
      ELSE sort_order
    END
WHERE track = 'discovery';

-- Greyscale remains a valid historical achievement and reward, but is not a
-- published future goal: its observed expected wait is roughly 179 years.
UPDATE public.progression_milestones
SET published = false,
    pace_band = 'legacy',
    expected_rolls = 65536,
    sort_order = 90
WHERE id = 'journey_greyscale';

-- The deterministic Ritual lane is paced by actual days of use. These
-- capstones extend the identity story past the first year without adding a
-- second daily chore system.
INSERT INTO public.progression_milestones (
  id, name, description, metric, threshold, reward_item_key,
  track, sort_order, achievement_id, progress_source, progress_target,
  published, expected_rolls, pace_band
)
VALUES
  (
    'journey_roll_730',
    'Two years remembered',
    'Roll 730 colors and let the profile carry its accumulated palette.',
    'achievement', 0, 'cursor_trail_color_memory',
    'ritual', 100, NULL, 'total_rolls', 730,
    true, NULL, 'years'
  ),
  (
    'journey_roll_1095',
    'Three years in color',
    'Roll 1,095 colors and mark the profile as a long-lived identity.',
    'achievement', 0, 'border_chroma',
    'ritual', 110, NULL, 'total_rolls', 1095,
    true, NULL, 'years'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metric = EXCLUDED.metric,
  threshold = EXCLUDED.threshold,
  reward_item_key = EXCLUDED.reward_item_key,
  track = EXCLUDED.track,
  sort_order = EXCLUDED.sort_order,
  achievement_id = EXCLUDED.achievement_id,
  progress_source = EXCLUDED.progress_source,
  progress_target = EXCLUDED.progress_target,
  published = EXCLUDED.published,
  expected_rolls = EXCLUDED.expected_rolls,
  pace_band = EXCLUDED.pace_band;

ALTER TABLE public.progression_milestones
  ADD CONSTRAINT progression_milestones_prerequisite_check
  CHECK (
    (metric = 'lifetime_ep'
      AND threshold > 0
      AND achievement_id IS NULL
      AND progress_source = 'lifetime_ep'
      AND progress_target = threshold)
    OR
    (metric = 'achievement'
      AND threshold = 0
      AND (
        (progress_source = 'achievement' AND achievement_id IS NOT NULL AND progress_target IS NULL)
        OR
        (progress_source IN ('total_rolls', 'longest_streak') AND progress_target > 0)
      ))
  ),
  ADD CONSTRAINT progression_milestones_progress_source_check
  CHECK (
    progress_source IN ('lifetime_ep', 'total_rolls', 'longest_streak', 'achievement')
    AND (progress_target IS NULL OR progress_target > 0)
  ),
  ADD CONSTRAINT progression_milestones_expected_rolls_check
  CHECK (expected_rolls IS NULL OR expected_rolls > 0),
  ADD CONSTRAINT progression_milestones_pace_band_check
  CHECK (pace_band IN ('days', 'weeks', 'months', 'years', 'legacy'));

-- ---------------------------------------------------------------------------
-- Earned catalog contract and compatibility preservation
-- ---------------------------------------------------------------------------

-- These two items were previously part of the free catalog. Preserve an
-- equipped configuration before making them earned capstone rewards.
INSERT INTO public.inventory (user_id, item_key, quantity)
SELECT p.id, item.item_key, 1
FROM public.profiles AS p
CROSS JOIN LATERAL jsonb_each_text(COALESCE(p.equipped_cosmetics, '{}'::jsonb)) AS equipped(slot, item_key)
JOIN public.shop_items AS item ON item.item_key = equipped.item_key
WHERE item.item_key IN ('cursor_trail_color_memory', 'border_chroma')
  AND item.catalog_status = 'active'
ON CONFLICT (user_id, item_key) DO NOTHING;

UPDATE public.shop_items
SET access_tier = 'earned',
    cost = 0,
    entitlement_key = NULL
WHERE item_key IN ('cursor_trail_color_memory', 'border_chroma')
  AND catalog_status = 'active';

DO $reward_verification$
DECLARE
  v_invalid text;
BEGIN
  SELECT string_agg(m.id || ' -> ' || COALESCE(i.item_key, '<missing>'), ', ' ORDER BY m.id)
  INTO v_invalid
  FROM public.progression_milestones AS m
  LEFT JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
  WHERE i.item_key IS NULL
     OR i.catalog_status <> 'active'
     OR i.access_tier <> 'earned'
     OR i.cost <> 0
     OR i.entitlement_key IS NOT NULL
     OR i.css_type <> 'renderer'
     OR i.slot IN ('consumable', 'title')
     OR COALESCE(i.css_value, '') = '';

  IF v_invalid IS NOT NULL THEN
    RAISE EXCEPTION 'Progression rewards must remain active earned renderer items: %', v_invalid;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.shop_items
    WHERE catalog_status = 'active'
      AND access_tier = 'free'
      AND slot IN (
        'name_font', 'name_material', 'name_motion', 'profile_border',
        'cursor_trail', 'avatar_effect', 'profile_layout',
        'profile_atmosphere', 'profile_motion'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.progression_milestones AS m
        WHERE m.reward_item_key = shop_items.item_key
      )
  ) THEN
    RAISE EXCEPTION 'The expression catalog must retain a free baseline';
  END IF;
END;
$reward_verification$;

-- ---------------------------------------------------------------------------
-- Durable ledger provenance and presentation state
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_progression_milestones
  ADD COLUMN IF NOT EXISTS unlock_source text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS presented_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

-- Rows written by earlier progression migrations are historical grants. They
-- must not open a celebratory queue when this contract is deployed.
UPDATE public.user_progression_milestones
SET unlock_source = 'historical_backfill',
    acknowledged_at = COALESCE(acknowledged_at, unlocked_at)
WHERE unlock_source = 'live';

ALTER TABLE public.user_progression_milestones
  DROP CONSTRAINT IF EXISTS user_progression_milestones_unlock_source_check,
  DROP CONSTRAINT IF EXISTS user_progression_milestones_presentation_order_check;

ALTER TABLE public.user_progression_milestones
  ADD CONSTRAINT user_progression_milestones_unlock_source_check
    CHECK (unlock_source IN ('live', 'historical_backfill')),
  ADD CONSTRAINT user_progression_milestones_presentation_order_check
    CHECK (
      (presented_at IS NULL OR presented_at >= unlocked_at)
      AND (acknowledged_at IS NULL OR acknowledged_at >= unlocked_at)
    );

CREATE INDEX IF NOT EXISTS user_progression_milestones_pending_idx
  ON public.user_progression_milestones (user_id, acknowledged_at, unlocked_at DESC, milestone_id);

-- A reward promise is immutable once it has been granted. Published status,
-- pacing, and copy may evolve, but remapping an already-earned milestone
-- would make historical inventory and the manifest disagree.
CREATE OR REPLACE FUNCTION public.prevent_progression_reward_remap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.reward_item_key IS DISTINCT FROM NEW.reward_item_key
     AND EXISTS (
       SELECT 1
       FROM public.user_progression_milestones AS u
       WHERE u.milestone_id = OLD.id
     ) THEN
    RAISE EXCEPTION 'Progression reward mapping is immutable after a grant: %', OLD.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_progression_milestone_reward()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_item public.shop_items%ROWTYPE;
BEGIN
  SELECT * INTO v_item
  FROM public.shop_items
  WHERE item_key = NEW.reward_item_key;

  IF NOT FOUND
     OR v_item.catalog_status <> 'active'
     OR v_item.access_tier <> 'earned'
     OR v_item.cost <> 0
     OR v_item.entitlement_key IS NOT NULL
     OR v_item.css_type <> 'renderer'
     OR v_item.slot IN ('consumable', 'title')
     OR COALESCE(v_item.css_value, '') = '' THEN
    RAISE EXCEPTION 'Progression milestone % references an invalid earned reward: %', NEW.id, NEW.reward_item_key;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_progression_catalog_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.progression_milestones AS m
    WHERE m.reward_item_key = NEW.item_key
  ) AND (
    NEW.catalog_status <> 'active'
    OR NEW.access_tier <> 'earned'
    OR NEW.cost <> 0
    OR NEW.entitlement_key IS NOT NULL
    OR NEW.css_type <> 'renderer'
    OR NEW.slot IN ('consumable', 'title')
    OR COALESCE(NEW.css_value, '') = ''
  ) THEN
    RAISE EXCEPTION 'Catalog item % is a progression reward and must remain active, earned, zero-cost, and renderer-backed', NEW.item_key;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS progression_milestone_reward_immutable ON public.progression_milestones;
CREATE TRIGGER progression_milestone_reward_immutable
  BEFORE UPDATE OF reward_item_key ON public.progression_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_progression_reward_remap();

DROP TRIGGER IF EXISTS progression_milestone_reward_contract ON public.progression_milestones;
CREATE TRIGGER progression_milestone_reward_contract
  BEFORE INSERT OR UPDATE OF reward_item_key, published ON public.progression_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_progression_milestone_reward();

DROP TRIGGER IF EXISTS progression_catalog_reward_contract ON public.shop_items;
CREATE TRIGGER progression_catalog_reward_contract
  BEFORE INSERT OR UPDATE OF catalog_status, access_tier, cost, entitlement_key, css_type, css_value, slot
  ON public.shop_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_progression_catalog_item();

-- These functions are trigger-only implementation details. Trigger execution
-- does not require browser callers to retain EXECUTE on the function, so keep
-- them out of the public RPC surface as well as the table/RPC boundaries below.
REVOKE ALL ON FUNCTION public.prevent_progression_reward_remap() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_progression_milestone_reward() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_progression_catalog_item() FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Historical reconciliation and live roll grants
-- ---------------------------------------------------------------------------

-- The profile notification trigger predates historical reconciliation and
-- fires for every ledger INSERT. Historical ownership must not look like a
-- new reward to the owner, while live grants continue through the existing
-- notification queue.
CREATE OR REPLACE FUNCTION public.notify_progression_milestone_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_milestone record;
BEGIN
  IF NEW.unlock_source = 'historical_backfill' THEN
    RETURN NEW;
  END IF;

  SELECT m.id, m.name, m.description, m.reward_item_key, i.name AS reward_name
  INTO v_milestone
  FROM public.progression_milestones AS m
  LEFT JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
  WHERE m.id = NEW.milestone_id;

  PERFORM public.queue_profile_notification(
    NEW.user_id,
    'reward',
    NULL,
    NEW.user_id,
    NULL,
    NULL,
    'reward:milestone:' || NEW.milestone_id,
    'reward:milestone:' || NEW.milestone_id,
    jsonb_build_object(
      'rewardKind', 'progression_milestone',
      'milestoneId', NEW.milestone_id,
      'name', COALESCE(v_milestone.name, NEW.milestone_id),
      'description', COALESCE(v_milestone.description, ''),
      'rewardName', COALESCE(v_milestone.reward_name, v_milestone.reward_item_key, '')
    )
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_progression_milestone_unlock() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reconcile_progression_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_milestone record;
  v_eligible boolean;
  v_unlocked_at timestamptz;
  v_inserted integer := 0;
  v_repaired integer := 0;
BEGIN
  -- The migration backfill runs without JWT claims, while operational callers
  -- must use the service role. Keep this check in the function itself so a
  -- privileged SQL context cannot turn a forged request claim into a browser
  -- reconciliation path if EXECUTE grants are ever changed later.
  IF COALESCE(auth.role(), '') NOT IN ('', 'service_role') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'service_only');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'missing_user');
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
  END IF;

  -- Include unpublished milestones here so a retired goal remains a durable
  -- historical fact. It is omitted from the published journey read below.
  FOR v_milestone IN
    SELECT m.id, m.reward_item_key, m.progress_source, m.progress_target, m.achievement_id
    FROM public.progression_milestones AS m
    JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
    WHERE i.catalog_status = 'active'
    ORDER BY m.track, m.sort_order, m.id
  LOOP
    v_eligible := CASE v_milestone.progress_source
      WHEN 'lifetime_ep' THEN COALESCE(v_profile.lifetime_ep, 0) >= v_milestone.progress_target
      WHEN 'total_rolls' THEN COALESCE(v_profile.total_rolls, 0) >= v_milestone.progress_target
      WHEN 'longest_streak' THEN COALESCE(v_profile.longest_streak, 0) >= v_milestone.progress_target
      WHEN 'achievement' THEN EXISTS (
        SELECT 1
        FROM public.user_achievements AS ua
        WHERE ua.user_id = p_user_id
          AND ua.achievement_id = v_milestone.achievement_id
      )
      ELSE false
    END;

    IF NOT v_eligible THEN
      CONTINUE;
    END IF;

    v_unlocked_at := NULL;

    IF v_milestone.progress_source = 'achievement' THEN
      SELECT MIN(ua.unlocked_at)
      INTO v_unlocked_at
      FROM public.user_achievements AS ua
      WHERE ua.user_id = p_user_id
        AND ua.achievement_id = v_milestone.achievement_id;
    ELSIF v_milestone.progress_source = 'longest_streak' THEN
      -- Ritual streak goals retain their achievement id even though the
      -- monotonic longest_streak counter is the authoritative eligibility
      -- fact. Reuse that durable achievement timestamp when available.
      SELECT MIN(ua.unlocked_at)
      INTO v_unlocked_at
      FROM public.user_achievements AS ua
      WHERE ua.user_id = p_user_id
        AND ua.achievement_id = v_milestone.achievement_id;
    ELSIF v_milestone.progress_source = 'total_rolls' THEN
      -- Profile events are the best available historical timestamp for a
      -- counter milestone. Retention may remove older events, so fall back to
      -- account creation rather than fabricating a current-time unlock.
      SELECT pe.occurred_at
      INTO v_unlocked_at
      FROM public.profile_events AS pe
      WHERE pe.user_id = p_user_id
        AND pe.event_type = 'roll'
      ORDER BY pe.occurred_at ASC, pe.id ASC
      OFFSET GREATEST(v_milestone.progress_target - 1, 0)
      LIMIT 1;
    END IF;

    v_unlocked_at := LEAST(
      COALESCE(v_unlocked_at, v_profile.created_at, now()),
      now()
    );

    INSERT INTO public.user_progression_milestones (
      user_id, milestone_id, unlocked_at, unlock_source, acknowledged_at
    )
    VALUES (
      p_user_id, v_milestone.id, v_unlocked_at, 'historical_backfill', v_unlocked_at
    )
    ON CONFLICT (user_id, milestone_id) DO NOTHING;

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    ELSE
      -- Reruns repair a missing inventory row without changing live provenance
      -- or opening a second presentation event.
      UPDATE public.user_progression_milestones
      SET unlocked_at = LEAST(unlocked_at, v_unlocked_at),
          acknowledged_at = CASE
            WHEN unlock_source = 'historical_backfill'
              THEN COALESCE(acknowledged_at, v_unlocked_at)
            ELSE acknowledged_at
          END
      WHERE user_id = p_user_id
        AND milestone_id = v_milestone.id;
    END IF;

    INSERT INTO public.inventory (user_id, item_key, quantity)
    VALUES (p_user_id, v_milestone.reward_item_key, 1)
    ON CONFLICT (user_id, item_key) DO UPDATE
      SET quantity = GREATEST(public.inventory.quantity, 1);
    v_repaired := v_repaired + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'historical_grants', v_inserted,
    'inventory_repaired', v_repaired
  );
END;
$function$;

-- Reconcile every existing account after the function exists. This is
-- deterministic and safe to replay; it never decrements inventory.
DO $historical_backfill$
DECLARE
  v_profile record;
BEGIN
  FOR v_profile IN SELECT id FROM public.profiles ORDER BY id LOOP
    PERFORM public.reconcile_progression_account(v_profile.id);
  END LOOP;
END;
$historical_backfill$;

CREATE OR REPLACE FUNCTION public.grant_progression_milestones(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lifetime_ep bigint;
  v_total_rolls bigint;
  v_longest_streak integer;
  v_milestone record;
  v_inserted_id text;
  v_new jsonb := '[]'::jsonb;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RETURN v_new;
  END IF;

  SELECT lifetime_ep, total_rolls, longest_streak
  INTO v_lifetime_ep, v_total_rolls, v_longest_streak
  FROM public.profiles
  WHERE id = p_user_id;

  FOR v_milestone IN
    SELECT
      m.id, m.name, m.description, m.threshold, m.track, m.metric,
      m.achievement_id, m.sort_order, m.progress_source, m.progress_target,
      m.published, m.expected_rolls, m.pace_band,
      i.item_key, i.name AS reward_name, i.slot
    FROM public.progression_milestones AS m
    JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
    WHERE m.published
      AND i.catalog_status = 'active'
      AND CASE m.progress_source
        WHEN 'lifetime_ep' THEN COALESCE(v_lifetime_ep, 0) >= m.progress_target
        WHEN 'total_rolls' THEN COALESCE(v_total_rolls, 0) >= m.progress_target
        WHEN 'longest_streak' THEN COALESCE(v_longest_streak, 0) >= m.progress_target
        WHEN 'achievement' THEN EXISTS (
          SELECT 1
          FROM public.user_achievements AS ua
          WHERE ua.user_id = p_user_id
            AND ua.achievement_id = m.achievement_id
        )
        ELSE false
      END
    ORDER BY m.track, m.sort_order, m.id
  LOOP
    v_inserted_id := NULL;

    INSERT INTO public.user_progression_milestones (user_id, milestone_id, unlock_source)
    VALUES (p_user_id, v_milestone.id, 'live')
    ON CONFLICT (user_id, milestone_id) DO NOTHING
    RETURNING milestone_id INTO v_inserted_id;

    -- Always repair inventory, including when the ledger row already exists.
    INSERT INTO public.inventory (user_id, item_key, quantity)
    VALUES (p_user_id, v_milestone.item_key, 1)
    ON CONFLICT (user_id, item_key) DO UPDATE
      SET quantity = GREATEST(public.inventory.quantity, 1);

    IF v_inserted_id IS NOT NULL THEN
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'id', v_milestone.id,
        'name', v_milestone.name,
        'description', v_milestone.description,
        'threshold', v_milestone.threshold,
        'track', v_milestone.track,
        'metric', v_milestone.metric,
        'achievement_id', v_milestone.achievement_id,
        'sort_order', v_milestone.sort_order,
        'progress_source', v_milestone.progress_source,
        'progress_target', v_milestone.progress_target,
        'published', v_milestone.published,
        'expected_rolls', v_milestone.expected_rolls,
        'pace_band', v_milestone.pace_band,
        'unlock_source', 'live',
        'reward', jsonb_build_object(
          'item_key', v_milestone.item_key,
          'name', v_milestone.reward_name,
          'slot', v_milestone.slot
        )
      ));
    END IF;
  END LOOP;

  RETURN v_new;
END;
$function$;

-- Granting remains an internal part of the authoritative roll transaction.
REVOKE ALL ON FUNCTION public.grant_progression_milestones(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reconcile_progression_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_progression_account(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Owner read and presentation boundaries
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_progression()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_lifetime_ep bigint;
  v_total_rolls bigint;
  v_current_streak integer;
  v_longest_streak integer;
  v_week_start date := date_trunc('week', public.game_utc_date())::date;
  v_today date := public.game_utc_date();
  v_cotw text;
  v_cotw_hex text;
  v_weekly_complete boolean := false;
  v_ritual_published boolean := false;
  v_discovery_published boolean := false;
  v_journey_state text := 'empty';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT lifetime_ep, total_rolls, current_streak, longest_streak
  INTO v_lifetime_ep, v_total_rolls, v_current_streak, v_longest_streak
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT value INTO v_cotw FROM public.meta WHERE key = 'cotw_target';
  IF v_cotw ~ '^([0-9]{1,3}),([0-9]{1,3}),([0-9]{1,3})$' THEN
    v_cotw_hex := upper(
      '#' || lpad(to_hex(split_part(v_cotw, ',', 1)::integer), 2, '0')
      || lpad(to_hex(split_part(v_cotw, ',', 2)::integer), 2, '0')
      || lpad(to_hex(split_part(v_cotw, ',', 3)::integer), 2, '0')
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.scores AS s
    WHERE s.user_id = v_user_id
      AND s.roll_date BETWEEN v_week_start AND v_today
      AND COALESCE(s.condition_ids, '[]'::jsonb) ? 'cotw_hit'
  ) INTO v_weekly_complete;

  SELECT EXISTS (
    SELECT 1 FROM public.progression_milestones AS m
    WHERE m.track = 'ritual' AND m.published
  ) INTO v_ritual_published;

  SELECT EXISTS (
    SELECT 1 FROM public.progression_milestones AS m
    WHERE m.track = 'discovery' AND m.published
  ) INTO v_discovery_published;

  v_journey_state := CASE
    WHEN v_ritual_published AND v_discovery_published THEN 'ready'
    WHEN v_ritual_published OR v_discovery_published THEN 'partial'
    ELSE 'empty'
  END;

  RETURN jsonb_build_object(
    'success', true,
    'progression_version', 3,
    'journey_state', v_journey_state,
    'current_ep', COALESCE(v_lifetime_ep, 0),
    'total_rolls', COALESCE(v_total_rolls, 0),
    'current_streak', COALESCE(v_current_streak, 0),
    'longest_streak', COALESCE(v_longest_streak, 0),
    'milestones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'description', m.description,
        'threshold', m.threshold,
        'track', m.track,
        'metric', m.metric,
        'achievement_id', m.achievement_id,
        'sort_order', m.sort_order,
        'progress_source', m.progress_source,
        'progress_target', m.progress_target,
        'published', m.published,
        'expected_rolls', m.expected_rolls,
        'pace_band', m.pace_band,
        'unlocked_at', u.unlocked_at,
        'unlock_source', u.unlock_source,
        'presented_at', u.presented_at,
        'acknowledged_at', u.acknowledged_at,
        'unlocked', (u.milestone_id IS NOT NULL),
        'new', (u.unlock_source = 'live' AND u.acknowledged_at IS NULL),
        'progress', CASE m.progress_source
          WHEN 'lifetime_ep' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_lifetime_ep, 0), m.progress_target),
            'target', m.progress_target,
            'unit', 'EP'
          )
          WHEN 'total_rolls' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_total_rolls, 0), m.progress_target),
            'target', m.progress_target,
            'unit', 'rolls'
          )
          WHEN 'longest_streak' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_longest_streak, 0), m.progress_target),
            'target', m.progress_target,
            'unit', 'days'
          )
          ELSE NULL
        END,
        'reward', jsonb_build_object(
          'item_key', i.item_key,
          'name', i.name,
          'slot', i.slot
        )
      ) ORDER BY m.track, m.sort_order, m.id)
      FROM public.progression_milestones AS m
      JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
      LEFT JOIN public.user_progression_milestones AS u
        ON u.user_id = v_user_id AND u.milestone_id = m.id
      WHERE m.published
        AND i.catalog_status = 'active'
    ), '[]'::jsonb),
    'recent_unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'name', recent.name,
        'description', recent.description,
        'threshold', recent.threshold,
        'track', recent.track,
        'metric', recent.metric,
        'achievement_id', recent.achievement_id,
        'sort_order', recent.sort_order,
        'progress_source', recent.progress_source,
        'progress_target', recent.progress_target,
        'published', recent.published,
        'expected_rolls', recent.expected_rolls,
        'pace_band', recent.pace_band,
        'unlocked_at', recent.unlocked_at,
        'unlock_source', recent.unlock_source,
        'presented_at', recent.presented_at,
        'acknowledged_at', recent.acknowledged_at,
        'unlocked', true,
        'reward', jsonb_build_object(
          'item_key', recent.item_key,
          'name', recent.reward_name,
          'slot', recent.slot
        )
      ) ORDER BY recent.unlocked_at DESC, recent.track, recent.sort_order, recent.id)
      FROM (
        SELECT m.id, m.name, m.description, m.threshold, m.track, m.metric,
          m.achievement_id, m.sort_order, m.progress_source, m.progress_target,
          m.published, m.expected_rolls, m.pace_band,
          u.unlocked_at, u.unlock_source, u.presented_at, u.acknowledged_at,
          i.item_key, i.name AS reward_name, i.slot
        FROM public.user_progression_milestones AS u
        JOIN public.progression_milestones AS m ON m.id = u.milestone_id
        JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
        WHERE u.user_id = v_user_id
          AND i.catalog_status = 'active'
        ORDER BY u.unlocked_at DESC, m.track, m.sort_order, m.id
        LIMIT 8
      ) AS recent
    ), '[]'::jsonb),
    'pending_unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pending.id,
        'name', pending.name,
        'description', pending.description,
        'track', pending.track,
        'sort_order', pending.sort_order,
        'unlocked_at', pending.unlocked_at,
        'unlock_source', pending.unlock_source,
        'reward', jsonb_build_object(
          'item_key', pending.item_key,
          'name', pending.reward_name,
          'slot', pending.slot
        )
      ) ORDER BY pending.unlocked_at ASC, pending.track, pending.sort_order, pending.id)
      FROM (
        SELECT m.id, m.name, m.description, m.track, m.sort_order,
          u.unlocked_at, u.unlock_source, i.item_key,
          i.name AS reward_name, i.slot
        FROM public.user_progression_milestones AS u
        JOIN public.progression_milestones AS m ON m.id = u.milestone_id
        JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
        WHERE u.user_id = v_user_id
          AND m.published
          AND u.unlock_source = 'live'
          AND u.acknowledged_at IS NULL
          AND i.catalog_status = 'active'
        ORDER BY u.unlocked_at ASC, m.track, m.sort_order, m.id
        LIMIT 8
      ) AS pending
    ), '[]'::jsonb),
    'weekly_focus', jsonb_build_object(
      'week_start', v_week_start,
      'target_hex', v_cotw_hex,
      'completed', v_weekly_complete,
      'bonus_ep', 50000
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.present_progression_unlocks(p_milestone_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_ids jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;
  IF p_milestone_ids IS NULL OR cardinality(p_milestone_ids) = 0 OR cardinality(p_milestone_ids) > 32 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_milestone_ids');
  END IF;

  WITH updated AS (
    UPDATE public.user_progression_milestones AS u
    SET presented_at = now()
    WHERE u.user_id = v_user_id
      AND u.milestone_id = ANY(p_milestone_ids)
      AND u.unlock_source = 'live'
      AND u.presented_at IS NULL
      AND u.acknowledged_at IS NULL
    RETURNING u.milestone_id
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(milestone_id) ORDER BY milestone_id), '[]'::jsonb)
  INTO v_ids
  FROM updated;

  RETURN jsonb_build_object(
    'success', true,
    'presented', jsonb_array_length(v_ids),
    'milestone_ids', v_ids
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.acknowledge_progression_unlocks(p_milestone_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_ids jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;
  IF p_milestone_ids IS NULL OR cardinality(p_milestone_ids) = 0 OR cardinality(p_milestone_ids) > 32 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_milestone_ids');
  END IF;

  WITH updated AS (
    UPDATE public.user_progression_milestones AS u
    SET presented_at = COALESCE(u.presented_at, now()),
        acknowledged_at = COALESCE(u.acknowledged_at, now())
    WHERE u.user_id = v_user_id
      AND u.milestone_id = ANY(p_milestone_ids)
      AND u.unlock_source = 'live'
      AND u.acknowledged_at IS NULL
    RETURNING u.milestone_id
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(milestone_id) ORDER BY milestone_id), '[]'::jsonb)
  INTO v_ids
  FROM updated;

  RETURN jsonb_build_object(
    'success', true,
    'acknowledged', jsonb_array_length(v_ids),
    'milestone_ids', v_ids
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_progression() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_progression() TO authenticated;
REVOKE ALL ON FUNCTION public.present_progression_unlocks(text[]) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.present_progression_unlocks(text[]) TO authenticated;
REVOKE ALL ON FUNCTION public.acknowledge_progression_unlocks(text[]) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_progression_unlocks(text[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Aggregate analytics: authenticated client only, no hot-path cleanup
-- ---------------------------------------------------------------------------

ALTER TABLE public.progression_analytics_daily
  DROP CONSTRAINT IF EXISTS progression_analytics_daily_event_name_check;

ALTER TABLE public.progression_analytics_daily
  ADD CONSTRAINT progression_analytics_daily_event_name_check CHECK (
    event_name IN (
      'progression_viewed',
      'progression_roll_completed',
      'progression_goal_viewed',
      'progression_unlock_seen',
      'progression_unlock_presented',
      'progression_reward_previewed',
      'progression_reward_equipped',
      'progression_unlock_acknowledged',
      'progression_milestone_completed',
      'progression_cta_used',
      'progression_weekly_focus_viewed',
      'progression_weekly_focus_completed',
      'progression_share_started',
      'progression_claim_started'
    )
  );

CREATE OR REPLACE FUNCTION public.record_progression_event(
  p_event_name text,
  p_surface text DEFAULT '',
  p_account_mode text DEFAULT '',
  p_rollout_stage text DEFAULT '',
  p_track text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_name text := lower(btrim(COALESCE(p_event_name, '')));
  v_surface text := lower(left(btrim(COALESCE(p_surface, '')), 48));
  v_account_mode text := lower(left(btrim(COALESCE(p_account_mode, '')), 48));
  v_rollout_stage text := lower(left(btrim(COALESCE(p_rollout_stage, '')), 48));
  v_track text := lower(left(btrim(COALESCE(p_track, '')), 48));
  v_count integer;
BEGIN
  IF auth.role() NOT IN ('authenticated', 'service_role')
     OR (auth.role() = 'authenticated' AND auth.uid() IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'authenticated_only');
  END IF;

  IF v_event_name NOT IN (
    'progression_viewed',
    'progression_roll_completed',
    'progression_goal_viewed',
    'progression_unlock_seen',
    'progression_unlock_presented',
    'progression_reward_previewed',
    'progression_reward_equipped',
    'progression_unlock_acknowledged',
    'progression_milestone_completed',
    'progression_cta_used',
    'progression_weekly_focus_viewed',
    'progression_weekly_focus_completed',
    'progression_share_started',
    'progression_claim_started'
  ) THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'invalid_event');
  END IF;

  IF v_account_mode NOT IN ('', 'authenticated')
    OR v_surface NOT IN ('', 'studio', 'progression', 'dedicated-roll', 'root-roll', 'roll')
    OR v_rollout_stage NOT IN ('', 'off', 'staff', 'internal', 'cohort', 'all')
    OR v_track NOT IN ('', 'rank', 'ritual', 'discovery')
  THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'invalid_dimensions');
  END IF;

  -- Retention is owned by the scheduled cleanup boundary. Never make an
  -- analytics write perform a table-wide delete on the gameplay hot path.
  INSERT INTO public.progression_analytics_daily (
    event_date, event_name, surface, account_mode, rollout_stage, track, event_count
  ) VALUES (
    public.game_utc_date(), v_event_name, v_surface, v_account_mode, v_rollout_stage, v_track, 1
  )
  ON CONFLICT (event_date, event_name, surface, account_mode, rollout_stage, track)
  DO UPDATE SET event_count = LEAST(public.progression_analytics_daily.event_count + 1, 1000000)
  RETURNING event_count INTO v_count;

  RETURN jsonb_build_object('success', true, 'recorded', true, 'count', v_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_progression_event(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_progression_event(text, text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Bounded public proof
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_profile_story(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
WITH visibility AS (
  SELECT (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true)) AS allowed
),
timeline_rows AS (
  SELECT e.id, e.event_type, e.occurred_at, e.payload
  FROM public.profile_events AS e, visibility AS v
  WHERE e.user_id = p_user_id AND v.allowed
  ORDER BY e.occurred_at DESC, e.id DESC
  LIMIT 40
),
timeline AS (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'eventType', event_type,
      'occurredAt', occurred_at,
      'payload', payload
    ) ORDER BY occurred_at DESC, id DESC
  ), '[]'::jsonb) AS items
  FROM timeline_rows
),
collection_rows AS (
  SELECT condition_value AS condition_id, count(*) AS roll_count,
    min(s.roll_date) AS first_seen, max(s.roll_date) AS last_seen
  FROM public.scores AS s
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(s.condition_ids) = 'array' THEN s.condition_ids ELSE '[]'::jsonb END
  ) AS condition_values(condition_value)
  CROSS JOIN visibility AS v
  WHERE s.user_id = p_user_id AND v.allowed
  GROUP BY condition_value
  ORDER BY roll_count DESC, last_seen DESC, condition_id
  LIMIT 30
),
collection AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.condition_id,
    'name', COALESCE(a.name, c.condition_id),
    'icon', COALESCE(a.icon, '✦'),
    'rarity', COALESCE(a.rarity, 'Common'),
    'count', c.roll_count,
    'firstSeen', c.first_seen,
    'lastSeen', c.last_seen
  ) ORDER BY c.roll_count DESC, c.last_seen DESC, c.condition_id), '[]'::jsonb) AS items
  FROM collection_rows AS c
  LEFT JOIN public.achievements AS a ON a.id = c.condition_id
),
progression_rows AS (
  SELECT u.milestone_id, u.unlocked_at
  FROM public.user_progression_milestones AS u, visibility AS v
  WHERE u.user_id = p_user_id AND v.allowed
),
progression_proof AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'name', m.name,
    'description', m.description,
    'track', m.track,
    'unlockedAt', u.unlocked_at,
    'reward', jsonb_build_object('name', i.name, 'slot', i.slot)
  ) ORDER BY u.unlocked_at DESC, m.id ASC), '[]'::jsonb) AS items
  FROM (
    SELECT milestone_id, unlocked_at
    FROM progression_rows
    ORDER BY unlocked_at DESC, milestone_id ASC
    LIMIT 2
  ) AS u
  JOIN public.progression_milestones AS m ON m.id = u.milestone_id
  JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
  WHERE m.published AND i.catalog_status = 'active'
),
progression_summary AS (
  SELECT count(*)::integer AS completed_count
  FROM progression_rows AS u
  JOIN public.progression_milestones AS m ON m.id = u.milestone_id
  JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
  WHERE m.published AND i.catalog_status = 'active'
)
SELECT jsonb_build_object(
  'timeline', timeline.items,
  'collection', collection.items,
  'progression_proof', jsonb_build_object(
    'completed_count', progression_summary.completed_count,
    'recent_unlocks', progression_proof.items
  )
)
FROM public.profiles AS p, timeline, collection, progression_proof, progression_summary
WHERE p.id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public.get_public_profile_story(uuid) FROM PUBLIC, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_story(uuid) TO anon, authenticated;

COMMIT;
