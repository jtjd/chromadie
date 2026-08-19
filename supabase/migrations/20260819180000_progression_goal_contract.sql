-- Progression goal contract hardening.
--
-- Keep the identity journey authored in the milestone catalog, but describe
-- numeric progress in that catalog instead of inferring it from achievement
-- ids in the read function. Condition goals deliberately have no counter.
-- They are either complete or not found yet.
BEGIN;

ALTER TABLE public.progression_milestones
  ADD COLUMN IF NOT EXISTS progress_source text,
  ADD COLUMN IF NOT EXISTS progress_target bigint;

UPDATE public.progression_milestones
SET progress_source = 'lifetime_ep',
    progress_target = threshold
WHERE metric = 'lifetime_ep';

UPDATE public.progression_milestones
SET progress_source = NULL,
    progress_target = NULL
WHERE metric = 'achievement';

-- Replace the first draft's prose with short, scannable goal copy. The
-- catalog remains the source of truth for the labels rendered by the client.
UPDATE public.progression_milestones
SET name = CASE id
    WHEN 'rank_silver' THEN 'Silver'
    WHEN 'rank_gold' THEN 'Gold'
    WHEN 'rank_platinum' THEN 'Platinum'
    WHEN 'rank_diamond' THEN 'Diamond'
    WHEN 'rank_chroma' THEN 'Chroma'
  END,
  description = CASE id
    WHEN 'rank_silver' THEN 'Reach Silver.'
    WHEN 'rank_gold' THEN 'Reach Gold.'
    WHEN 'rank_platinum' THEN 'Reach Platinum.'
    WHEN 'rank_diamond' THEN 'Reach Diamond.'
    WHEN 'rank_chroma' THEN 'Reach Chroma.'
  END
WHERE id IN ('rank_silver', 'rank_gold', 'rank_platinum', 'rank_diamond', 'rank_chroma');

INSERT INTO public.progression_milestones (
  id, name, description, metric, threshold, reward_item_key,
  track, sort_order, achievement_id, progress_source, progress_target
)
VALUES
  ('journey_first_roll', 'First color', 'Roll once.', 'achievement', 0, 'name_font_silkscreen', 'ritual', 10, 'first_roll', 'total_rolls', 1),
  ('journey_roll_10', 'Ten rolls', 'Roll 10 times.', 'achievement', 0, 'name_material_velvet_ink', 'ritual', 20, 'roll_10', 'total_rolls', 10),
  ('journey_streak_7', '7-day streak', 'Keep a 7-day streak.', 'achievement', 0, 'name_motion_haunt_reveal', 'ritual', 30, 'streak_7', 'current_streak', 7),
  ('journey_roll_50', '50 rolls', 'Roll 50 times.', 'achievement', 0, 'profile_atmosphere_snowfall', 'ritual', 40, 'roll_50', 'total_rolls', 50),
  ('journey_streak_14', '14-day streak', 'Keep a 14-day streak.', 'achievement', 0, 'name_motion_haunt_flash', 'ritual', 50, 'streak_14', 'current_streak', 14),
  ('journey_roll_100', '100 rolls', 'Roll 100 times.', 'achievement', 0, 'profile_layout_framed', 'ritual', 60, 'roll_100', 'total_rolls', 100),
  ('journey_streak_30', '30-day streak', 'Keep a 30-day streak.', 'achievement', 0, 'border_signal', 'ritual', 70, 'streak_30', 'current_streak', 30),
  ('journey_roll_365', '365 rolls', 'Roll 365 times.', 'achievement', 0, 'profile_atmosphere_lumen_flare', 'ritual', 80, 'roll_365', 'total_rolls', 365),
  ('journey_streak_100', '100-day streak', 'Keep a 100-day streak.', 'achievement', 0, 'profile_atmosphere_smoke_spiral', 'ritual', 90, 'streak_100', 'current_streak', 100),
  ('journey_rarity_rare', 'Rare color', 'Roll a Rare color.', 'achievement', 0, 'avatar_effect_3d_parallax', 'discovery', 10, 'rarity_rare', NULL, NULL),
  ('journey_high_contrast', 'High contrast', 'Roll a high-contrast color.', 'achievement', 0, 'name_material_blueprint_ink', 'discovery', 20, 'high_contrast', NULL, NULL),
  ('journey_greyscale', 'Greyscale', 'Roll a greyscale color.', 'achievement', 0, 'profile_atmosphere_dust_light', 'discovery', 30, 'greyscale', NULL, NULL),
  ('journey_roll_prime', 'Prime sum', 'Roll a color with a prime RGB sum.', 'achievement', 0, 'name_font_velocity', 'discovery', 40, 'roll_prime', NULL, NULL),
  ('journey_rarity_epic', 'Epic color', 'Roll an Epic color.', 'achievement', 0, 'name_motion_haunt_rainbow', 'discovery', 50, 'rarity_epic', NULL, NULL),
  ('journey_palindrome', 'Palindrome', 'Roll a hex palindrome.', 'achievement', 0, 'profile_atmosphere_glass_caustics', 'discovery', 60, 'roll_palindrome', NULL, NULL),
  ('journey_rarity_anomaly', 'Anomaly color', 'Roll an Anomaly color.', 'achievement', 0, 'name_material_neon_tube', 'discovery', 70, 'rarity_anomaly', NULL, NULL),
  ('journey_mythic', 'Mythic color', 'Roll a Mythic color.', 'achievement', 0, 'avatar_effect_cyber_hud', 'discovery', 80, 'mythic_roll', NULL, NULL)
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
  progress_target = EXCLUDED.progress_target;

UPDATE public.progression_milestones
SET progress_source = CASE achievement_id
    WHEN 'first_roll' THEN 'total_rolls'
    WHEN 'roll_10' THEN 'total_rolls'
    WHEN 'roll_50' THEN 'total_rolls'
    WHEN 'roll_100' THEN 'total_rolls'
    WHEN 'roll_365' THEN 'total_rolls'
    WHEN 'streak_7' THEN 'current_streak'
    WHEN 'streak_14' THEN 'current_streak'
    WHEN 'streak_30' THEN 'current_streak'
    WHEN 'streak_100' THEN 'current_streak'
    ELSE NULL
  END,
  progress_target = CASE achievement_id
    WHEN 'first_roll' THEN 1
    WHEN 'roll_10' THEN 10
    WHEN 'roll_50' THEN 50
    WHEN 'roll_100' THEN 100
    WHEN 'roll_365' THEN 365
    WHEN 'streak_7' THEN 7
    WHEN 'streak_14' THEN 14
    WHEN 'streak_30' THEN 30
    WHEN 'streak_100' THEN 100
    ELSE NULL
  END
WHERE metric = 'achievement';

DO $verification$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(goal.achievement_id, ', ' ORDER BY goal.achievement_id)
  INTO v_missing
  FROM (VALUES
    ('first_roll'), ('roll_10'), ('roll_50'), ('roll_100'), ('roll_365'),
    ('streak_7'), ('streak_14'), ('streak_30'), ('streak_100'),
    ('rarity_rare'), ('high_contrast'), ('greyscale'), ('roll_prime'),
    ('rarity_epic'), ('roll_palindrome'), ('rarity_anomaly'), ('mythic_roll')
  ) AS goal(achievement_id)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.achievements a
    WHERE a.id = goal.achievement_id
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Progression goals reference missing achievements: %', v_missing;
  END IF;

  SELECT string_agg(m.reward_item_key, ', ' ORDER BY m.reward_item_key)
  INTO v_missing
  FROM public.progression_milestones m
  JOIN public.shop_items i ON i.item_key = m.reward_item_key
  WHERE m.track IN ('ritual', 'discovery')
    AND i.catalog_status <> 'active';

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Progression journey rewards must be active catalog items: %', v_missing;
  END IF;
END;
$verification$;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'progression_milestones_progress_source_check'
      AND conrelid = 'public.progression_milestones'::regclass
  ) THEN
    ALTER TABLE public.progression_milestones
      ADD CONSTRAINT progression_milestones_progress_source_check
      CHECK (
        (progress_source IS NULL AND progress_target IS NULL)
        OR (progress_source IN ('lifetime_ep', 'total_rolls', 'current_streak') AND progress_target > 0)
      );
  END IF;
END;
$constraints$;

CREATE OR REPLACE FUNCTION public.grant_progression_milestones(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lifetime_ep bigint;
  v_milestone record;
  v_inserted_id text;
  v_new jsonb := '[]'::jsonb;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RETURN v_new;
  END IF;

  SELECT lifetime_ep INTO v_lifetime_ep
  FROM public.profiles
  WHERE id = p_user_id;

  FOR v_milestone IN
    SELECT
      m.id,
      m.name,
      m.description,
      m.threshold,
      m.track,
      m.metric,
      m.achievement_id,
      m.sort_order,
      m.progress_source,
      m.progress_target,
      i.item_key,
      i.name AS reward_name,
      i.slot
    FROM public.progression_milestones m
    JOIN public.shop_items i ON i.item_key = m.reward_item_key
    WHERE i.catalog_status = 'active'
      AND (
        (m.metric = 'lifetime_ep' AND m.threshold <= COALESCE(v_lifetime_ep, 0))
        OR
        (m.metric = 'achievement' AND EXISTS (
          SELECT 1
          FROM public.user_achievements ua
          WHERE ua.user_id = p_user_id
            AND ua.achievement_id = m.achievement_id
        ))
      )
    ORDER BY m.track ASC, m.sort_order ASC, m.id ASC
  LOOP
    v_inserted_id := NULL;
    INSERT INTO public.user_progression_milestones (user_id, milestone_id)
    VALUES (p_user_id, v_milestone.id)
    ON CONFLICT (user_id, milestone_id) DO NOTHING
    RETURNING milestone_id INTO v_inserted_id;

    IF v_inserted_id IS NOT NULL THEN
      INSERT INTO public.inventory (user_id, item_key, quantity)
      VALUES (p_user_id, v_milestone.item_key, 1)
      ON CONFLICT (user_id, item_key) DO NOTHING;

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

  SELECT lifetime_ep, total_rolls, current_streak
  INTO v_lifetime_ep, v_total_rolls, v_current_streak
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
    FROM public.scores s
    WHERE s.user_id = v_user_id
      AND s.roll_date BETWEEN v_week_start AND v_today
      AND COALESCE(s.condition_ids, '[]'::jsonb) ? 'cotw_hit'
  ) INTO v_weekly_complete;

  SELECT EXISTS (
    SELECT 1
    FROM public.progression_milestones m
    JOIN public.shop_items i ON i.item_key = m.reward_item_key
    WHERE m.track = 'ritual' AND i.catalog_status = 'active'
  ) INTO v_ritual_published;

  SELECT EXISTS (
    SELECT 1
    FROM public.progression_milestones m
    JOIN public.shop_items i ON i.item_key = m.reward_item_key
    WHERE m.track = 'discovery' AND i.catalog_status = 'active'
  ) INTO v_discovery_published;

  v_journey_state := CASE
    WHEN v_ritual_published AND v_discovery_published THEN 'ready'
    WHEN v_ritual_published OR v_discovery_published THEN 'partial'
    ELSE 'empty'
  END;

  RETURN jsonb_build_object(
    'success', true,
    'progression_version', 2,
    'journey_state', v_journey_state,
    'current_ep', COALESCE(v_lifetime_ep, 0),
    'total_rolls', COALESCE(v_total_rolls, 0),
    'current_streak', COALESCE(v_current_streak, 0),
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
        'unlocked_at', u.unlocked_at,
        'unlocked', (u.milestone_id IS NOT NULL),
        'progress', CASE
          WHEN m.progress_source = 'lifetime_ep' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_lifetime_ep, 0), m.progress_target),
            'target', m.progress_target,
            'unit', 'EP'
          )
          WHEN m.progress_source = 'total_rolls' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_total_rolls, 0), m.progress_target),
            'target', m.progress_target,
            'unit', 'rolls'
          )
          WHEN m.progress_source = 'current_streak' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_current_streak, 0), m.progress_target),
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
      ) ORDER BY m.track ASC, m.sort_order ASC, m.id ASC)
      FROM public.progression_milestones m
      JOIN public.shop_items i ON i.item_key = m.reward_item_key
      LEFT JOIN public.user_progression_milestones u
        ON u.user_id = v_user_id AND u.milestone_id = m.id
      WHERE i.catalog_status = 'active'
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
        'unlocked_at', recent.unlocked_at,
        'unlocked', true,
        'reward', jsonb_build_object(
          'item_key', recent.item_key,
          'name', recent.reward_name,
          'slot', recent.slot
        )
      ) ORDER BY recent.unlocked_at DESC, recent.track ASC, recent.sort_order ASC, recent.id ASC)
      FROM (
        SELECT m.id, m.name, m.description, m.threshold, m.track, m.metric,
          m.achievement_id, m.sort_order, m.progress_source, m.progress_target,
          u.unlocked_at, i.item_key, i.name AS reward_name, i.slot
        FROM public.user_progression_milestones u
        JOIN public.progression_milestones m ON m.id = u.milestone_id
        JOIN public.shop_items i ON i.item_key = m.reward_item_key
        WHERE u.user_id = v_user_id
          AND i.catalog_status = 'active'
        ORDER BY u.unlocked_at DESC, m.track ASC, m.sort_order ASC, m.id ASC
        LIMIT 8
      ) recent
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
REVOKE ALL ON FUNCTION public.get_my_progression() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_progression() TO authenticated;

COMMIT;
