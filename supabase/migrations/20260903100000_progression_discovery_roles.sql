-- Separate intentional progression objectives from stochastic discoveries.
--
-- Rarity, achievement eligibility, reward ownership, and the authoritative
-- roll transaction are unchanged. This migration only gives the manifest a
-- server-authored presentation role and keeps hidden discoveries out of an
-- owner's locked journey read.
BEGIN;

ALTER TABLE public.progression_milestones
  ADD COLUMN IF NOT EXISTS presentation_role text;

UPDATE public.progression_milestones
SET presentation_role = CASE
  WHEN published = false THEN 'historical'
  WHEN track = 'discovery' THEN 'open_discovery'
  ELSE 'objective'
END
WHERE presentation_role IS NULL;

UPDATE public.progression_milestones
SET presentation_role = CASE id
  WHEN 'journey_rarity_rare' THEN 'open_discovery'
  WHEN 'journey_roll_prime' THEN 'open_discovery'
  WHEN 'journey_high_contrast' THEN 'open_discovery'
  WHEN 'journey_rarity_epic' THEN 'open_discovery'
  WHEN 'journey_rarity_anomaly' THEN 'lifetime_discovery'
  WHEN 'journey_palindrome' THEN 'lifetime_discovery'
  WHEN 'journey_mythic' THEN 'hidden_discovery'
  WHEN 'journey_greyscale' THEN 'historical'
  ELSE 'objective'
END
WHERE id IN (
  'journey_rarity_rare', 'journey_roll_prime', 'journey_high_contrast',
  'journey_rarity_epic', 'journey_rarity_anomaly', 'journey_palindrome',
  'journey_mythic', 'journey_greyscale'
);

ALTER TABLE public.progression_milestones
  ALTER COLUMN presentation_role SET DEFAULT 'objective',
  ALTER COLUMN presentation_role SET NOT NULL,
  DROP CONSTRAINT IF EXISTS progression_milestones_presentation_role_check,
  ADD CONSTRAINT progression_milestones_presentation_role_check
    CHECK (presentation_role IN (
      'objective', 'open_discovery', 'lifetime_discovery',
      'hidden_discovery', 'historical'
    ));

-- A stochastic discovery must never silently become the next ordinary
-- objective.  Keep the product distinction enforceable at the data boundary
-- so a future catalog edit cannot reintroduce the rare-goal regression.
ALTER TABLE public.progression_milestones
  DROP CONSTRAINT IF EXISTS progression_milestones_discovery_role_check,
  ADD CONSTRAINT progression_milestones_discovery_role_check
    CHECK (NOT (track = 'discovery' AND presentation_role = 'objective'));

-- Preserve the complete acquisition contract. Hidden discoveries remain
-- eligible for a live grant; their role is returned with the confirmed reward
-- so the unlock queue can reveal the surprise without exposing it beforehand.
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
      m.published, m.expected_rolls, m.pace_band, m.presentation_role,
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
        'presentation_role', v_milestone.presentation_role,
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
    WHERE m.track = 'discovery'
      AND m.published
      AND m.presentation_role <> 'hidden_discovery'
  ) INTO v_discovery_published;

  v_journey_state := CASE
    WHEN v_ritual_published AND v_discovery_published THEN 'ready'
    WHEN v_ritual_published OR v_discovery_published THEN 'partial'
    ELSE 'empty'
  END;

  RETURN jsonb_build_object(
    'success', true,
    'progression_version', 4,
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
        'presentation_role', m.presentation_role,
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
        AND (m.presentation_role <> 'hidden_discovery' OR u.milestone_id IS NOT NULL)
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
        'presentation_role', recent.presentation_role,
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
          m.published, m.expected_rolls, m.pace_band, m.presentation_role,
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
        'presentation_role', pending.presentation_role,
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
          m.presentation_role, u.unlocked_at, u.unlock_source, i.item_key,
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

REVOKE ALL ON FUNCTION public.grant_progression_milestones(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_progression() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_progression() TO authenticated;

COMMIT;
