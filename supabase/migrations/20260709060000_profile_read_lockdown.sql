-- Phase 3 launch hardening:
-- Restrict public profile reads to safe columns only.
-- Keep private owner state behind a SECURITY DEFINER RPC.

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;

GRANT SELECT (
  id,
  username,
  current_streak,
  longest_streak,
  equipped_cosmetics,
  equipped_badges,
  mood_color,
  best_roll_score,
  best_roll_hex,
  best_roll_rarity
)
ON TABLE public.profiles
TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_profile();

CREATE OR REPLACE FUNCTION public.get_my_profile() RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile json;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'current_streak', p.current_streak,
    'longest_streak', p.longest_streak,
    'ep_spent', p.ep_spent,
    'lifetime_ep', p.lifetime_ep,
    'equipped_cosmetics', p.equipped_cosmetics,
    'reroll_shards', p.reroll_shards,
    'equipped_badges', p.equipped_badges,
    'mood_color', p.mood_color,
    'best_roll_score', p.best_roll_score,
    'best_roll_hex', p.best_roll_hex,
    'best_roll_rarity', p.best_roll_rarity
  )
  INTO v_profile
  FROM profiles p
  WHERE p.id = v_user_id;

  IF v_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN v_profile;
END;
$$;

GRANT ALL ON FUNCTION public.get_my_profile() TO anon;
GRANT ALL ON FUNCTION public.get_my_profile() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_profile() TO service_role;
