\set ON_ERROR_STOP on
BEGIN;

CREATE FUNCTION pg_temp.assert_profile_bootstrap(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF;
END;
$$;

-- Exercise the real auth trigger, without manually provisioning configuration.
INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('22000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'studio-bootstrap@example.test', '{"username":"studio_bootstrap"}', now(), now());

SELECT set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_profile_bootstrap(
  public.get_my_profile()->>'username' = 'studio_bootstrap', 'Account hydration failed');
SELECT pg_temp.assert_profile_bootstrap(
  (public.get_my_profile_configuration_v2()->>'success')::boolean,
  'New account has no writable Studio configuration');
SELECT pg_temp.assert_profile_bootstrap(
  (public.save_profile_configuration_v2(
    public.get_my_profile_configuration_v2()->'draft',
    (public.get_my_profile_configuration_v2()->>'updated_at')::timestamptz
  )->>'success')::boolean, 'First V2 draft save failed');
RESET ROLE;
SELECT pg_temp.assert_profile_bootstrap(
  (SELECT count(*) = 1 FROM public.profile_configurations
   WHERE user_id = '22000000-0000-4000-8000-000000000001'),
  'Bootstrap produced duplicate configuration rows');
SELECT pg_temp.assert_profile_bootstrap(
  NOT has_function_privilege('anon', 'public.get_my_profile_configuration_v2()', 'EXECUTE'),
  'Owner configuration exposed to anonymous visitors');
ROLLBACK;
