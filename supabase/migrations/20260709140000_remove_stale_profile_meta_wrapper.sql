-- Cleanup:
-- Remove the stale two-argument compatibility wrapper for profile metadata.
-- The app only calls the single-argument mood color RPC now.

DROP FUNCTION IF EXISTS public.update_profile_meta(text, text);
