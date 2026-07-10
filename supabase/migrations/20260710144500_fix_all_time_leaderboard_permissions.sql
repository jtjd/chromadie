-- Remove the ungranted lifetime_ep column from the all-time leaderboard view.
--
-- The browser role can read the leaderboard-safe profile columns, but not the
-- full profiles table. Keeping the view on safe columns preserves the tightened
-- profile lockdown while restoring leaderboard reads.

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
  s.roll_date
FROM public.scores s
JOIN public.profiles p ON p.id = s.user_id
ORDER BY s.user_id, s.score DESC, s.roll_date DESC, s.created_at DESC;

ALTER VIEW public.all_time_leaderboard_view OWNER TO postgres;
GRANT SELECT ON TABLE public.all_time_leaderboard_view TO anon;
GRANT SELECT ON TABLE public.all_time_leaderboard_view TO authenticated;
GRANT SELECT ON TABLE public.all_time_leaderboard_view TO service_role;
