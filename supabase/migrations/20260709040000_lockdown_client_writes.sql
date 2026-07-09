-- Phase 1 launch hardening:
-- Remove direct client write access to gameplay tables.
-- All state changes must go through SECURITY DEFINER RPCs.

-- Profiles: keep reads intact for now, but remove all direct mutation paths.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.profiles
FROM anon, authenticated;

-- Scores: only roll_die() should be able to write leaderboard rows.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.scores
FROM anon, authenticated;

-- Inventory: only purchase/reward RPCs should be able to grant items.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.inventory
FROM anon, authenticated;

-- Rival graph: follow/unfollow must go through toggle_follow().
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.user_follows
FROM anon, authenticated;

-- Achievement ownership is written only by server-side gameplay RPCs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.user_achievements
FROM anon, authenticated;

-- Internal/static tables should not be mutable from the browser either.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.achievements
FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.meta
FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.shop_items
FROM anon, authenticated;

-- Prevent future tables/functions/sequences from inheriting public write grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON SEQUENCES FROM anon, authenticated;
