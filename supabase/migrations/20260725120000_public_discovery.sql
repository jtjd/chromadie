-- Phase 6: bounded public discovery projections.
--
-- Discovery is a read-only projection of existing public profile and
-- authoritative roll data. It deliberately returns usernames instead of
-- internal profile ids so every result can be followed through the public
-- /u/<username> route without widening the browser data contract.

BEGIN;

CREATE INDEX IF NOT EXISTS profiles_created_at_id_idx
  ON public.profiles (created_at DESC, id);

CREATE INDEX IF NOT EXISTS profiles_best_roll_score_idx
  ON public.profiles (best_roll_score DESC NULLS LAST, id);

CREATE INDEX IF NOT EXISTS scores_user_score_roll_date_idx
  ON public.scores (user_id, score DESC, roll_date DESC, created_at DESC, id);

CREATE OR REPLACE FUNCTION public.get_public_discovery(
  p_surface text DEFAULT 'today',
  p_rarity text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_page integer DEFAULT 0,
  p_limit integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_surface text := lower(trim(coalesce(p_surface, 'today')));
  v_rarity text := nullif(trim(coalesce(p_rarity, '')), '');
  v_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
  v_page integer;
  v_limit integer;
  v_offset integer;
  v_items jsonb;
  v_has_more boolean;
BEGIN
  IF v_surface NOT IN ('today', 'weekly', 'monthly', 'all_time', 'recent', 'rising', 'new', 'random') THEN
    v_surface := 'today';
  END IF;

  IF v_rarity NOT IN ('Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic') THEN
    v_rarity := NULL;
  END IF;

  IF v_query IS NOT NULL AND v_query !~ '^[a-z0-9_]{1,20}$' THEN
    v_query := NULL;
  END IF;

  v_page := LEAST(GREATEST(coalesce(p_page, 0), 0), 20);
  v_limit := LEAST(GREATEST(coalesce(p_limit, 12), 1), 12);
  v_offset := v_page * v_limit;

  WITH
  today_rows AS (
    SELECT
      'today'::text AS surface,
      p.id AS user_id,
      p.username,
      p.username_key,
      s.hex_code,
      s.score,
      s.rarity,
      s.roll_date,
      s.identity,
      p.current_streak,
      p.total_rolls,
      p.lifetime_ep,
      p.equipped_cosmetics,
      p.equipped_badges,
      p.is_staff,
      p.created_at AS profile_created_at,
      rank() OVER (ORDER BY s.score DESC) AS rank_value,
      s.score AS sort_score,
      s.roll_date AS sort_date,
      p.created_at AS sort_created,
      NULL::text AS random_key
    FROM public.scores s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.roll_date = public.game_utc_date()
  ),
  weekly_candidates AS (
    SELECT
      s.user_id,
      p.username,
      p.username_key,
      s.hex_code,
      s.score,
      s.rarity,
      s.roll_date,
      s.identity,
      p.current_streak,
      p.total_rolls,
      p.lifetime_ep,
      p.equipped_cosmetics,
      p.equipped_badges,
      p.is_staff,
      p.created_at AS profile_created_at,
      row_number() OVER (
        PARTITION BY s.user_id
        ORDER BY s.score DESC, s.roll_date DESC, s.created_at DESC, s.id
      ) AS pick
    FROM public.scores s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.roll_date >= date_trunc('week', public.game_utc_date()::timestamp)::date
  ),
  weekly_rows AS (
    SELECT
      'weekly'::text AS surface,
      c.user_id,
      c.username,
      c.username_key,
      c.hex_code,
      c.score,
      c.rarity,
      c.roll_date,
      c.identity,
      c.current_streak,
      c.total_rolls,
      c.lifetime_ep,
      c.equipped_cosmetics,
      c.equipped_badges,
      c.is_staff,
      c.profile_created_at,
      rank() OVER (ORDER BY c.score DESC) AS rank_value,
      c.score AS sort_score,
      c.roll_date AS sort_date,
      c.profile_created_at AS sort_created,
      NULL::text AS random_key
    FROM weekly_candidates c
    WHERE c.pick = 1
  ),
  monthly_candidates AS (
    SELECT
      s.user_id,
      p.username,
      p.username_key,
      s.hex_code,
      s.score,
      s.rarity,
      s.roll_date,
      s.identity,
      p.current_streak,
      p.total_rolls,
      p.lifetime_ep,
      p.equipped_cosmetics,
      p.equipped_badges,
      p.is_staff,
      p.created_at AS profile_created_at,
      row_number() OVER (
        PARTITION BY s.user_id
        ORDER BY s.score DESC, s.roll_date DESC, s.created_at DESC, s.id
      ) AS pick
    FROM public.scores s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.roll_date >= date_trunc('month', public.game_utc_date()::timestamp)::date
  ),
  monthly_rows AS (
    SELECT
      'monthly'::text AS surface,
      c.user_id,
      c.username,
      c.username_key,
      c.hex_code,
      c.score,
      c.rarity,
      c.roll_date,
      c.identity,
      c.current_streak,
      c.total_rolls,
      c.lifetime_ep,
      c.equipped_cosmetics,
      c.equipped_badges,
      c.is_staff,
      c.profile_created_at,
      rank() OVER (ORDER BY c.score DESC) AS rank_value,
      c.score AS sort_score,
      c.roll_date AS sort_date,
      c.profile_created_at AS sort_created,
      NULL::text AS random_key
    FROM monthly_candidates c
    WHERE c.pick = 1
  ),
  all_time_rows AS (
    SELECT
      'all_time'::text AS surface,
      a.user_id,
      a.username,
      p.username_key,
      a.hex_code,
      a.score,
      a.rarity,
      a.roll_date,
      a.identity,
      p.current_streak,
      p.total_rolls,
      p.lifetime_ep,
      p.equipped_cosmetics,
      p.equipped_badges,
      p.is_staff,
      p.created_at AS profile_created_at,
      a.rank AS rank_value,
      a.score AS sort_score,
      a.roll_date AS sort_date,
      p.created_at AS sort_created,
      NULL::text AS random_key
    FROM public.all_time_leaderboard_view a
    JOIN public.profiles p ON p.id = a.user_id
  ),
  recent_rows AS (
    SELECT
      'recent'::text AS surface,
      p.id AS user_id,
      p.username,
      p.username_key,
      s.hex_code,
      s.score,
      s.rarity,
      s.roll_date,
      s.identity,
      p.current_streak,
      p.total_rolls,
      p.lifetime_ep,
      p.equipped_cosmetics,
      p.equipped_badges,
      p.is_staff,
      p.created_at AS profile_created_at,
      rank() OVER (ORDER BY s.score DESC) AS rank_value,
      s.score AS sort_score,
      s.roll_date AS sort_date,
      p.created_at AS sort_created,
      NULL::text AS random_key
    FROM public.scores s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.roll_date >= public.game_utc_date() - 30
      AND s.rarity IN ('Rare', 'Epic', 'Anomaly', 'Mythic')
  ),
  rising_candidates AS (
    SELECT DISTINCT ON (s.user_id)
      s.user_id,
      p.username,
      p.username_key,
      s.hex_code,
      s.score,
      s.rarity,
      s.roll_date,
      s.identity,
      p.current_streak,
      p.total_rolls,
      p.lifetime_ep,
      p.equipped_cosmetics,
      p.equipped_badges,
      p.is_staff,
      p.created_at AS profile_created_at
    FROM public.scores s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.roll_date >= public.game_utc_date() - 6
    ORDER BY s.user_id, s.score DESC, s.roll_date DESC, s.created_at DESC, s.id
  ),
  rising_rows AS (
    SELECT
      'rising'::text AS surface,
      c.user_id,
      c.username,
      c.username_key,
      c.hex_code,
      c.score,
      c.rarity,
      c.roll_date,
      c.identity,
      c.current_streak,
      c.total_rolls,
      c.lifetime_ep,
      c.equipped_cosmetics,
      c.equipped_badges,
      c.is_staff,
      c.profile_created_at,
      rank() OVER (ORDER BY c.current_streak DESC, c.score DESC, c.roll_date DESC) AS rank_value,
      c.score AS sort_score,
      c.roll_date AS sort_date,
      c.profile_created_at AS sort_created,
      NULL::text AS random_key
    FROM rising_candidates c
  ),
  new_rows AS (
    SELECT
      'new'::text AS surface,
      p.id AS user_id,
      p.username,
      p.username_key,
      p.best_roll_hex AS hex_code,
      p.best_roll_score AS score,
      p.best_roll_rarity AS rarity,
      NULL::date AS roll_date,
      ''::text AS identity,
      p.current_streak,
      p.total_rolls,
      p.lifetime_ep,
      p.equipped_cosmetics,
      p.equipped_badges,
      p.is_staff,
      p.created_at AS profile_created_at,
      NULL::bigint AS rank_value,
      coalesce(p.best_roll_score, 0) AS sort_score,
      NULL::date AS sort_date,
      p.created_at AS sort_created,
      NULL::text AS random_key
    FROM public.profiles p
  ),
  random_rows AS (
    SELECT
      'random'::text AS surface,
      p.id AS user_id,
      p.username,
      p.username_key,
      p.best_roll_hex AS hex_code,
      p.best_roll_score AS score,
      p.best_roll_rarity AS rarity,
      NULL::date AS roll_date,
      ''::text AS identity,
      p.current_streak,
      p.total_rolls,
      p.lifetime_ep,
      p.equipped_cosmetics,
      p.equipped_badges,
      p.is_staff,
      p.created_at AS profile_created_at,
      NULL::bigint AS rank_value,
      coalesce(p.best_roll_score, 0) AS sort_score,
      NULL::date AS sort_date,
      p.created_at AS sort_created,
      md5(p.id::text || public.game_utc_date()::text) AS random_key
    FROM public.profiles p
  ),
  source_rows AS (
    SELECT * FROM today_rows
    UNION ALL SELECT * FROM weekly_rows
    UNION ALL SELECT * FROM monthly_rows
    UNION ALL SELECT * FROM all_time_rows
    UNION ALL SELECT * FROM recent_rows
    UNION ALL SELECT * FROM rising_rows
    UNION ALL SELECT * FROM new_rows
    UNION ALL SELECT * FROM random_rows
  ),
  filtered_rows AS (
    SELECT s.*
    FROM source_rows s
    WHERE s.surface = v_surface
      AND (v_query IS NULL OR s.username_key LIKE v_query || '%')
      AND (v_rarity IS NULL OR s.rarity = v_rarity)
  ),
  page_rows AS MATERIALIZED (
    SELECT f.*
    FROM filtered_rows f
    ORDER BY
      CASE WHEN v_surface = 'random' THEN f.random_key END ASC NULLS LAST,
      CASE WHEN v_surface = 'new' THEN f.sort_created END DESC NULLS LAST,
      CASE WHEN v_surface = 'rising' THEN f.current_streak END DESC NULLS LAST,
      f.sort_score DESC NULLS LAST,
      f.sort_date DESC NULLS LAST,
      f.sort_created DESC NULLS LAST,
      f.user_id ASC
    OFFSET v_offset
    LIMIT v_limit + 1
  ),
  numbered_rows AS (
    SELECT p.*, row_number() OVER () AS page_position
    FROM page_rows p
  )
  SELECT
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'username', n.username,
          'hexCode', n.hex_code,
          'score', n.score,
          'rarity', n.rarity,
          'rollDate', n.roll_date,
          'identity', n.identity,
          'currentStreak', n.current_streak,
          'totalRolls', n.total_rolls,
          'lifetimeEp', n.lifetime_ep,
          'equippedCosmetics', coalesce(n.equipped_cosmetics, '{}'::jsonb),
          'equippedBadges', coalesce(n.equipped_badges, '[]'::jsonb),
          'isStaff', n.is_staff,
          'rank', n.rank_value,
          'profileCreatedAt', n.profile_created_at,
          'kind', CASE
            WHEN v_surface IN ('today', 'weekly', 'monthly', 'all_time', 'recent', 'rising') THEN 'roll'
            ELSE 'profile'
          END
        ) ORDER BY n.page_position
      ) FILTER (WHERE n.page_position <= v_limit),
      '[]'::jsonb
    ),
    count(*) > v_limit
  INTO v_items, v_has_more
  FROM numbered_rows n;

  RETURN jsonb_build_object(
    'surface', v_surface,
    'page', v_page,
    'limit', v_limit,
    'hasMore', coalesce(v_has_more, false),
    'items', coalesce(v_items, '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_discovery(text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_discovery(text, text, text, integer, integer) TO anon, authenticated;

COMMIT;
