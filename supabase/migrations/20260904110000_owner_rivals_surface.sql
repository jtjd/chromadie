-- Restore the authenticated Rivals surface without widening public discovery.
-- The owner receives at most the five rows already present in user_follows;
-- blocked profiles retain only the id required to remove that relationship.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_rivals()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
WITH owner AS (
  SELECT auth.uid() AS user_id
),
follow_rows AS (
  SELECT f.followee_id
  FROM owner AS o
  JOIN public.user_follows AS f ON f.follower_id = o.user_id
  WHERE o.user_id IS NOT NULL
  ORDER BY f.created_at ASC, f.followee_id ASC
  LIMIT 5
),
rival_rows AS (
  SELECT
    f.followee_id,
    p.username,
    p.username_key,
    p.display_name,
    p.current_streak,
    p.mood_color,
    public.is_profile_blocked(o.user_id, f.followee_id) AS blocked,
    COALESCE(settings.activity_visible, true) AS activity_visible,
    roll.hex_code,
    roll.score,
    roll.rarity,
    roll.identity,
    roll.roll_date
  FROM owner AS o
  JOIN follow_rows AS f ON true
  JOIN public.profiles AS p ON p.id = f.followee_id
  LEFT JOIN public.profile_social_settings AS settings ON settings.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT s.hex_code, s.score, s.rarity, s.identity, s.roll_date
    FROM public.scores AS s
    WHERE s.user_id = p.id
      AND s.roll_date = public.game_utc_date()
      AND COALESCE(settings.activity_visible, true)
      AND NOT public.is_profile_blocked(o.user_id, p.id)
    ORDER BY s.score DESC, s.id DESC
    LIMIT 1
  ) AS roll ON true
),
items AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'userId', followee_id,
    'inaccessible', blocked,
    'username', CASE WHEN blocked THEN NULL ELSE username END,
    'displayName', CASE WHEN blocked THEN NULL ELSE display_name END,
    'currentStreak', CASE WHEN blocked THEN 0 ELSE current_streak END,
    'profileAccent', CASE WHEN blocked THEN NULL ELSE mood_color END,
    'todayRoll', CASE
      WHEN blocked OR NOT activity_visible OR score IS NULL THEN NULL
      ELSE jsonb_build_object(
        'hexCode', hex_code,
        'score', score,
        'rarity', rarity,
        'identity', left(COALESCE(identity, ''), 120),
        'rollDate', roll_date
      )
    END
  ) ORDER BY
    CASE WHEN blocked OR score IS NULL THEN 1 ELSE 0 END ASC,
    CASE WHEN NOT blocked THEN score ELSE NULL END DESC NULLS LAST,
    CASE WHEN blocked THEN '' ELSE username_key END ASC,
    followee_id ASC
  ), '[]'::jsonb) AS value
  FROM rival_rows
)
SELECT CASE
  WHEN (SELECT user_id FROM owner) IS NULL THEN
    jsonb_build_object('success', false, 'error', 'authentication_required')
  ELSE jsonb_build_object('success', true, 'items', items.value)
END
FROM items;
$function$;

-- Existing relationships must remain removable after a block. New follows
-- still pass the same target, block, interaction, rate-limit, and five-rival
-- checks as before.
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_following boolean;
  v_follow_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_target_id IS NULL OR v_user_id = p_target_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot follow yourself');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9342);

  SELECT EXISTS(
    SELECT 1 FROM public.user_follows
    WHERE follower_id = v_user_id AND followee_id = p_target_id
  ) INTO v_is_following;

  IF v_is_following THEN
    DELETE FROM public.user_follows
    WHERE follower_id = v_user_id AND followee_id = p_target_id;
    RETURN json_build_object('success', true, 'action', 'unfollowed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_id) THEN
    RETURN json_build_object('success', false, 'error', 'Player not found');
  END IF;
  IF public.is_profile_blocked(v_user_id, p_target_id) THEN
    RETURN json_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;
  IF NOT COALESCE((
    SELECT s.interactions_enabled FROM public.profile_social_settings AS s
    WHERE s.user_id = p_target_id
  ), true) THEN
    RETURN json_build_object('success', false, 'error', 'This profile has disabled social interactions.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'favorite', 30, 600) THEN
    RETURN json_build_object('success', false, 'error', 'Rival changes are temporarily limited.');
  END IF;

  SELECT count(*) INTO v_follow_count
  FROM public.user_follows
  WHERE follower_id = v_user_id;
  IF v_follow_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Maximum of 5 rivals reached.');
  END IF;

  INSERT INTO public.user_follows (follower_id, followee_id)
  VALUES (v_user_id, p_target_id);
  RETURN json_build_object('success', true, 'action', 'followed');
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_rivals() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.toggle_follow(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_rivals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid) TO authenticated;

COMMIT;
