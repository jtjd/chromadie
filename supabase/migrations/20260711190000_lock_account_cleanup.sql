-- Serialize account deletion with gameplay and wallet mutations.
-- A second session that starts after this lock is acquired will observe the
-- missing profile and cannot write new account state during cleanup.

CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_deleted integer := 0;
  v_scores_deleted integer := 0;
  v_inventory_deleted integer := 0;
  v_following_deleted integer := 0;
  v_followers_deleted integer := 0;
  v_achievements_deleted integer := 0;
  v_challenges_deleted integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing user id');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  DELETE FROM public.challenges WHERE sender_user_id = p_user_id;
  GET DIAGNOSTICS v_challenges_deleted = ROW_COUNT;
  DELETE FROM public.user_follows WHERE follower_id = p_user_id;
  GET DIAGNOSTICS v_following_deleted = ROW_COUNT;
  DELETE FROM public.user_follows WHERE followee_id = p_user_id;
  GET DIAGNOSTICS v_followers_deleted = ROW_COUNT;
  DELETE FROM public.user_achievements WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_achievements_deleted = ROW_COUNT;

  UPDATE public.inventory SET quantity = 1
  WHERE user_id = p_user_id AND quantity > 1;
  DELETE FROM public.inventory WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_inventory_deleted = ROW_COUNT;
  DELETE FROM public.scores WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_scores_deleted = ROW_COUNT;
  DELETE FROM public.profiles WHERE id = p_user_id;
  GET DIAGNOSTICS v_profile_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'profile_deleted', v_profile_deleted > 0,
    'scores_deleted', v_scores_deleted,
    'inventory_deleted', v_inventory_deleted,
    'following_deleted', v_following_deleted,
    'followers_deleted', v_followers_deleted,
    'achievements_deleted', v_achievements_deleted,
    'challenges_deleted', v_challenges_deleted,
    'missing_profile', v_profile_deleted = 0
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;
