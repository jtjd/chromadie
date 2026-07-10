-- Fresh-launch reset.
-- Preserve schema, catalog, and achievements definitions.
-- Remove all user-generated state and test accounts so new signups start from zero.

BEGIN;

TRUNCATE TABLE public.user_follows,
  public.user_achievements,
  public.scores,
  public.inventory,
  public.profiles
RESTART IDENTITY CASCADE;

TRUNCATE TABLE auth.users RESTART IDENTITY CASCADE;

UPDATE public.meta
SET value = NOW()::text
WHERE key = 'shop_version';

COMMIT;
