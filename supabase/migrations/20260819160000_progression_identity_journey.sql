-- Expand the server-published progression track into a durable identity journey.
-- Rank progression, achievement creation, scoring, and roll eligibility remain
-- owned by the existing authoritative roll transaction.
BEGIN;

ALTER TABLE public.progression_milestones
  ADD COLUMN IF NOT EXISTS track text NOT NULL DEFAULT 'rank',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS achievement_id text REFERENCES public.achievements(id) ON DELETE RESTRICT;

ALTER TABLE public.progression_milestones
  DROP CONSTRAINT IF EXISTS progression_milestones_metric_check,
  DROP CONSTRAINT IF EXISTS progression_milestones_threshold_check,
  DROP CONSTRAINT IF EXISTS progression_milestones_track_check,
  DROP CONSTRAINT IF EXISTS progression_milestones_prerequisite_check;

ALTER TABLE public.progression_milestones
  ADD CONSTRAINT progression_milestones_metric_check
    CHECK (metric IN ('lifetime_ep', 'achievement')),
  ADD CONSTRAINT progression_milestones_threshold_check
    CHECK (threshold >= 0),
  ADD CONSTRAINT progression_milestones_track_check
    CHECK (track IN ('rank', 'ritual', 'discovery')),
  ADD CONSTRAINT progression_milestones_prerequisite_check
    CHECK (
      (metric = 'lifetime_ep' AND threshold > 0 AND achievement_id IS NULL)
      OR
      (metric = 'achievement' AND threshold = 0 AND achievement_id IS NOT NULL)
    );

UPDATE public.progression_milestones
SET track = 'rank',
    sort_order = CASE id
      WHEN 'rank_silver' THEN 10
      WHEN 'rank_gold' THEN 20
      WHEN 'rank_platinum' THEN 30
      WHEN 'rank_diamond' THEN 40
      WHEN 'rank_chroma' THEN 50
      ELSE sort_order
    END
WHERE metric = 'lifetime_ep';

INSERT INTO public.progression_milestones (
  id, name, description, metric, threshold, reward_item_key,
  track, sort_order, achievement_id
)
VALUES
  ('journey_first_roll', 'First color', 'Make your first color part of your identity.', 'achievement', 0, 'name_font_silkscreen', 'ritual', 10, 'first_roll'),
  ('journey_roll_10', 'A rhythm begins', 'Roll ten colors and give your profile a softer voice.', 'achievement', 0, 'name_material_velvet_ink', 'ritual', 20, 'roll_10'),
  ('journey_streak_7', 'Week of color', 'Keep a seven-day streak and reveal the name cleanly.', 'achievement', 0, 'name_motion_haunt_reveal', 'ritual', 30, 'streak_7'),
  ('journey_roll_50', 'Weathered palette', 'Roll fifty colors and open a quiet atmosphere.', 'achievement', 0, 'profile_atmosphere_snowfall', 'ritual', 40, 'roll_50'),
  ('journey_streak_30', 'A month in motion', 'Keep a thirty-day streak and mark the edge of your profile.', 'achievement', 0, 'border_signal', 'ritual', 50, 'streak_30'),
  ('journey_roll_100', 'A hundred colors', 'Roll one hundred colors and frame the identity you built.', 'achievement', 0, 'profile_layout_framed', 'ritual', 60, 'roll_100'),
  ('journey_roll_365', 'A year remembered', 'Roll 365 colors and let the profile carry a distant light.', 'achievement', 0, 'profile_atmosphere_lumen_flare', 'ritual', 70, 'roll_365'),
  ('journey_rarity_rare', 'First signal', 'Discover a Rare color and lift the portrait from the surface.', 'achievement', 0, 'avatar_effect_3d_parallax', 'discovery', 10, 'rarity_rare'),
  ('journey_rarity_epic', 'Spectrum found', 'Discover an Epic color and let the name travel through color.', 'achievement', 0, 'name_motion_haunt_rainbow', 'discovery', 20, 'rarity_epic'),
  ('journey_rarity_anomaly', 'Afterglow', 'Find an Anomaly and give the name an electric core.', 'achievement', 0, 'name_material_neon_tube', 'discovery', 30, 'rarity_anomaly'),
  ('journey_mythic', 'Instrument readout', 'Touch Mythic rarity and surround the portrait with a signal.', 'achievement', 0, 'avatar_effect_cyber_hud', 'discovery', 40, 'mythic_roll'),
  ('journey_palindrome', 'A color reflected', 'Discover a palindrome and let the atmosphere refract it.', 'achievement', 0, 'profile_atmosphere_glass_caustics', 'discovery', 50, 'roll_palindrome')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metric = EXCLUDED.metric,
  threshold = EXCLUDED.threshold,
  reward_item_key = EXCLUDED.reward_item_key,
  track = EXCLUDED.track,
  sort_order = EXCLUDED.sort_order,
  achievement_id = EXCLUDED.achievement_id;

DO $verification$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(m.reward_item_key, ', ' ORDER BY m.reward_item_key)
  INTO v_missing
  FROM public.progression_milestones m
  JOIN public.shop_items i ON i.item_key = m.reward_item_key
  WHERE m.id LIKE 'journey_%'
    AND i.catalog_status <> 'active';

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Progression journey rewards must be active catalog items: %', v_missing;
  END IF;
END;
$verification$;

-- Backfill both the durable milestone history and the existing inventory
-- ownership without changing quantities or duplicating rows.
INSERT INTO public.user_progression_milestones (user_id, milestone_id)
SELECT p.id, m.id
FROM public.profiles p
JOIN public.progression_milestones m ON (
  (m.metric = 'lifetime_ep' AND COALESCE(p.lifetime_ep, 0) >= m.threshold)
  OR
  (m.metric = 'achievement' AND EXISTS (
    SELECT 1
    FROM public.user_achievements ua
    WHERE ua.user_id = p.id
      AND ua.achievement_id = m.achievement_id
  ))
)
ON CONFLICT (user_id, milestone_id) DO NOTHING;

INSERT INTO public.inventory (user_id, item_key, quantity)
SELECT p.id, m.reward_item_key, 1
FROM public.profiles p
JOIN public.progression_milestones m ON (
  (m.metric = 'lifetime_ep' AND COALESCE(p.lifetime_ep, 0) >= m.threshold)
  OR
  (m.metric = 'achievement' AND EXISTS (
    SELECT 1
    FROM public.user_achievements ua
    WHERE ua.user_id = p.id
      AND ua.achievement_id = m.achievement_id
  ))
)
ON CONFLICT (user_id, item_key) DO NOTHING;

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

  RETURN jsonb_build_object(
    'success', true,
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
        'unlocked_at', u.unlocked_at,
        'unlocked', (u.milestone_id IS NOT NULL),
        'progress', CASE
          WHEN m.metric = 'lifetime_ep' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_lifetime_ep, 0), m.threshold),
            'target', m.threshold,
            'unit', 'EP'
          )
          WHEN m.achievement_id IN ('first_roll', 'roll_10', 'roll_50', 'roll_100', 'roll_365') THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_total_rolls, 0), CASE m.achievement_id
              WHEN 'first_roll' THEN 1
              WHEN 'roll_10' THEN 10
              WHEN 'roll_50' THEN 50
              WHEN 'roll_100' THEN 100
              WHEN 'roll_365' THEN 365
            END),
            'target', CASE m.achievement_id
              WHEN 'first_roll' THEN 1
              WHEN 'roll_10' THEN 10
              WHEN 'roll_50' THEN 50
              WHEN 'roll_100' THEN 100
              WHEN 'roll_365' THEN 365
            END,
            'unit', 'rolls'
          )
          WHEN m.achievement_id IN ('streak_7', 'streak_30') THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_current_streak, 0), CASE m.achievement_id WHEN 'streak_7' THEN 7 WHEN 'streak_30' THEN 30 END),
            'target', CASE m.achievement_id WHEN 'streak_7' THEN 7 WHEN 'streak_30' THEN 30 END,
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
          m.achievement_id, m.sort_order, u.unlocked_at,
          i.item_key, i.name AS reward_name, i.slot
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
GRANT EXECUTE ON FUNCTION public.get_my_progression() TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_progression() FROM PUBLIC, anon, service_role;

-- Expose only a bounded, public-safe proof of progression. The private
-- milestone ledger and EP balance remain owner-only.
CREATE OR REPLACE FUNCTION public.get_public_profile_story(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
WITH timeline_rows AS (
  SELECT e.id, e.event_type, e.occurred_at, e.payload
  FROM public.profile_events e
  WHERE e.user_id = p_user_id
    AND (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true))
  ORDER BY e.occurred_at DESC, e.id DESC
  LIMIT 40
), timeline AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'eventType', event_type,
        'occurredAt', occurred_at,
        'payload', payload
      ) ORDER BY occurred_at DESC, id DESC
    ), '[]'::jsonb
  ) AS items
  FROM timeline_rows
), collection_rows AS (
  SELECT condition_value AS condition_id, count(*) AS roll_count,
    min(s.roll_date) AS first_seen, max(s.roll_date) AS last_seen
  FROM public.scores s
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(s.condition_ids) = 'array' THEN s.condition_ids ELSE '[]'::jsonb END
  ) AS condition_values(condition_value)
  WHERE s.user_id = p_user_id
    AND (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true))
  GROUP BY condition_value
  ORDER BY roll_count DESC, last_seen DESC, condition_id
  LIMIT 30
), collection AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.condition_id,
    'name', COALESCE(a.name, c.condition_id),
    'icon', COALESCE(a.icon, '✦'),
    'rarity', COALESCE(a.rarity, 'Common'),
    'count', c.roll_count,
    'firstSeen', c.first_seen,
    'lastSeen', c.last_seen
  ) ORDER BY c.roll_count DESC, c.last_seen DESC, c.condition_id), '[]'::jsonb) AS items
  FROM collection_rows c
  LEFT JOIN public.achievements a ON a.id = c.condition_id
), progression_proof AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'name', m.name,
    'description', m.description,
    'track', m.track,
    'unlockedAt', u.unlocked_at,
    'reward', jsonb_build_object('name', i.name, 'slot', i.slot)
  ) ORDER BY u.unlocked_at DESC, m.id ASC), '[]'::jsonb) AS items
  FROM (
    SELECT u.milestone_id, u.unlocked_at
    FROM public.user_progression_milestones u
    WHERE u.user_id = p_user_id
      AND (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true))
    ORDER BY u.unlocked_at DESC, u.milestone_id ASC
    LIMIT 2
  ) u
  JOIN public.progression_milestones m ON m.id = u.milestone_id
  JOIN public.shop_items i ON i.item_key = m.reward_item_key
  WHERE i.catalog_status = 'active'
)
SELECT jsonb_build_object(
  'timeline', timeline.items,
  'collection', collection.items,
  'progression_proof', jsonb_build_object('recent_unlocks', progression_proof.items)
)
FROM public.profiles p, timeline, collection, progression_proof
WHERE p.id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public.get_public_profile_story(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_story(uuid) TO anon, authenticated;

COMMIT;
