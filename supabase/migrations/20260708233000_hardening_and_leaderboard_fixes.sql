-- Hardening and leaderboard corrections after the live-schema re-baseline.
--
-- Goals:
-- 1. Remove the obsolete zero-arg roll_die overload so there is one canonical RPC.
-- 2. Lock down destructive/internal helper functions that should not be callable by clients.
-- 3. Add period-best leaderboard views for weekly/monthly "best single roll" semantics.

-- Remove the legacy roll RPC entrypoint. The app uses roll_die(p_is_reroll boolean).
DROP FUNCTION IF EXISTS public.roll_die();

-- cleanup_old_scores is operational infrastructure, not a public RPC surface.
REVOKE ALL ON FUNCTION public.cleanup_old_scores() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_scores() FROM authenticated;

-- Internal helpers should not be directly executable by clients.
REVOKE ALL ON FUNCTION public.update_cotw() FROM anon;
REVOKE ALL ON FUNCTION public.update_cotw() FROM authenticated;
REVOKE ALL ON FUNCTION public.update_lifetime_ep() FROM anon;
REVOKE ALL ON FUNCTION public.update_lifetime_ep() FROM authenticated;
REVOKE ALL ON FUNCTION public.update_streak() FROM anon;
REVOKE ALL ON FUNCTION public.update_streak() FROM authenticated;

-- Weekly/monthly leaderboards should rank each player's best single roll in the period.
CREATE OR REPLACE VIEW public.weekly_best_leaderboard_view
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  s.hex_code,
  s.score,
  s.rarity,
  s.roll_date,
  p.username,
  p.current_streak,
  p.equipped_cosmetics,
  p.equipped_badges
FROM public.scores s
JOIN public.profiles p ON p.id = s.user_id
WHERE s.roll_date >= date_trunc('week', CURRENT_DATE::timestamp)::date
ORDER BY s.user_id, s.score DESC, s.roll_date DESC, s.created_at DESC;

ALTER VIEW public.weekly_best_leaderboard_view OWNER TO postgres;
GRANT SELECT ON TABLE public.weekly_best_leaderboard_view TO anon;
GRANT SELECT ON TABLE public.weekly_best_leaderboard_view TO authenticated;
GRANT SELECT ON TABLE public.weekly_best_leaderboard_view TO service_role;

CREATE OR REPLACE VIEW public.monthly_best_leaderboard_view
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  s.hex_code,
  s.score,
  s.rarity,
  s.roll_date,
  p.username,
  p.current_streak,
  p.equipped_cosmetics,
  p.equipped_badges
FROM public.scores s
JOIN public.profiles p ON p.id = s.user_id
WHERE s.roll_date >= date_trunc('month', CURRENT_DATE::timestamp)::date
ORDER BY s.user_id, s.score DESC, s.roll_date DESC, s.created_at DESC;

ALTER VIEW public.monthly_best_leaderboard_view OWNER TO postgres;
GRANT SELECT ON TABLE public.monthly_best_leaderboard_view TO anon;
GRANT SELECT ON TABLE public.monthly_best_leaderboard_view TO authenticated;
GRANT SELECT ON TABLE public.monthly_best_leaderboard_view TO service_role;
