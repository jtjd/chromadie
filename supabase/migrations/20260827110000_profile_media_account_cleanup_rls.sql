-- The account-media cleanup queue is service-owned and must not be exposed as
-- an unrestricted public table. Browser roles already have no table grants;
-- the SECURITY DEFINER control-plane RPCs continue to operate as the owner.
BEGIN;

ALTER TABLE public.profile_media_account_cleanup_jobs ENABLE ROW LEVEL SECURITY;

COMMIT;
