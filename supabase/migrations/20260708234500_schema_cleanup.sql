-- Schema reconciliation cleanup after live-schema rebaseline.
--
-- This migration removes duplicated indexes/policies and aligns the user-linked
-- foreign keys with the cascade behavior described by the app's data model.

-- Keep a single canonical roll-date leaderboard index and the unique daily roll constraint.
DROP INDEX IF EXISTS public.scores_roll_date_score_idx;
DROP INDEX IF EXISTS public.scores_user_date_idx;

-- Restore the intended cascade behavior for auth-managed user records.
ALTER TABLE ONLY public.inventory
  DROP CONSTRAINT IF EXISTS inventory_user_id_fkey,
  ADD CONSTRAINT inventory_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.scores
  DROP CONSTRAINT IF EXISTS scores_user_id_fkey,
  ADD CONSTRAINT scores_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remove redundant policies left behind by direct SQL edits.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Scores are viewable by everyone." ON public.scores;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;

-- The app writes through SECURITY DEFINER RPCs, so these direct-write policies
-- are unnecessary attack surface.
DROP POLICY IF EXISTS "Users can insert own scores" ON public.scores;
DROP POLICY IF EXISTS "Users can insert own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can delete follows" ON public.user_follows;

-- Admin maintenance RPCs stay available for direct Supabase / SQL use, not the browser app.
REVOKE ALL ON FUNCTION public.admin_bump_shop_version() FROM anon;
REVOKE ALL ON FUNCTION public.admin_bump_shop_version() FROM authenticated;
REVOKE ALL ON FUNCTION public.admin_randomize_cotw() FROM anon;
REVOKE ALL ON FUNCTION public.admin_randomize_cotw() FROM authenticated;
REVOKE ALL ON FUNCTION public.admin_trigger_cotw_test() FROM anon;
REVOKE ALL ON FUNCTION public.admin_trigger_cotw_test() FROM authenticated;
