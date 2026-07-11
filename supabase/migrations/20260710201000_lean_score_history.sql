-- Keep the retained score history compact. Roll traits and condition details are
-- deterministic from the hex value and score version, so they are returned at
-- roll time or recalculated by the client rather than stored on every score row.
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS score_version smallint NOT NULL DEFAULT 2;

ALTER TABLE public.scores
  ALTER COLUMN badges SET DEFAULT '[]'::jsonb;

-- Score rows are deliberately short-lived (30 days). All-time rankings must
-- use the durable profile aggregate updated by the roll transaction instead.
DROP VIEW IF EXISTS public.all_time_leaderboard_view;

CREATE VIEW public.all_time_leaderboard_view
WITH (security_invoker = true) AS
SELECT
  p.id AS user_id,
  p.username,
  p.current_streak,
  p.equipped_cosmetics,
  p.equipped_badges,
  p.best_roll_score AS score,
  p.best_roll_hex AS hex_code,
  p.best_roll_rarity AS rarity
FROM public.profiles p
WHERE p.best_roll_score IS NOT NULL;

ALTER VIEW public.all_time_leaderboard_view OWNER TO postgres;
GRANT SELECT ON TABLE public.all_time_leaderboard_view TO anon, authenticated, service_role;
