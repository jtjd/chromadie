-- Keep the dedicated progression destination from colliding with a public username.
BEGIN;

INSERT INTO public.reserved_usernames (username_key, category, reason, release_policy)
VALUES ('progression', 'route', 'Hard-reserved identity.', 'never')
ON CONFLICT (username_key) DO UPDATE
SET category = EXCLUDED.category,
    reason = EXCLUDED.reason,
    release_policy = EXCLUDED.release_policy,
    enabled = true;

COMMIT;
