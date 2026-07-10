-- Fix the all-time leaderboard so it is derived from actual score history.
--
-- The previous version depended on profiles.best_roll_score, which can remain
-- null on older or partially migrated accounts. Building the view from scores
-- ensures every real roll can contribute to the leaderboard.

DROP VIEW IF EXISTS public.all_time_leaderboard_view;

CREATE VIEW public.all_time_leaderboard_view
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  p.username,
  p.current_streak,
  p.equipped_cosmetics,
  p.equipped_badges,
  s.score,
  s.hex_code,
  s.rarity,
  p.lifetime_ep
FROM public.scores s
JOIN public.profiles p ON p.id = s.user_id
ORDER BY s.user_id, s.score DESC, s.roll_date DESC, s.created_at DESC;

ALTER VIEW public.all_time_leaderboard_view OWNER TO postgres;
GRANT SELECT ON TABLE public.all_time_leaderboard_view TO anon;
GRANT SELECT ON TABLE public.all_time_leaderboard_view TO authenticated;
GRANT SELECT ON TABLE public.all_time_leaderboard_view TO service_role;
