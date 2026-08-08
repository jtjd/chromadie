-- Dashboard parity milestone: bounded alternate profile paths.
-- Aliases are account-owned, database-authoritative, and redirect-only. They
-- never become a second public profile renderer or a second canonical URL.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_aliases (
  alias_key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_aliases_key_check CHECK (
    alias_key = lower(btrim(alias_key))
    AND alias_key ~ '^[a-z0-9_]{1,20}$'
  )
);

COMMENT ON TABLE public.profile_aliases IS
  'Owner-managed alternate profile paths. Each alias resolves to one canonical username profile URL.';
COMMENT ON COLUMN public.profile_aliases.alias_key IS
  'Lowercase ASCII alias used only below the explicit /a/ route namespace.';

CREATE INDEX IF NOT EXISTS profile_aliases_user_created_idx
  ON public.profile_aliases (user_id, created_at, alias_key);

ALTER TABLE public.profile_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profile aliases are RPC-only" ON public.profile_aliases;
CREATE POLICY "Profile aliases are RPC-only"
  ON public.profile_aliases
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.profile_aliases FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_aliases TO service_role;

-- Prevent a later canonical username claim from colliding with an existing
-- alias. The inverse check lives in create_profile_alias().
CREATE OR REPLACE FUNCTION public.prevent_profile_alias_username_collision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profile_aliases
    WHERE alias_key = lower(btrim(NEW.username))
  ) THEN
    RAISE EXCEPTION 'Username is not available.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profile_alias_username_collision ON public.profiles;
CREATE TRIGGER profile_alias_username_collision
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_alias_username_collision();

CREATE OR REPLACE FUNCTION public.get_my_profile_aliases()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'aliases', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'aliases', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'alias', alias_key,
            'path', '/a/' || alias_key,
            'created_at', created_at
          )
          ORDER BY created_at, alias_key
        )
        FROM public.profile_aliases
        WHERE user_id = v_user_id
      ),
      '[]'::jsonb
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_alias(p_alias text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_alias text := lower(btrim(coalesce(p_alias, '')));
  v_result jsonb;
BEGIN
  IF v_alias !~ '^[a-z0-9_]{1,20}$' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'alias', a.alias_key,
    'username', p.username
  )
  INTO v_result
  FROM public.profile_aliases a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.alias_key = v_alias;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_profile_alias(p_alias text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_alias text := nullif(btrim(coalesce(p_alias, '')), '');
  v_key text := lower(v_alias);
  v_existing_user_id uuid;
  v_profile_exists boolean;
  v_alias_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_key IS NULL OR v_key !~ '^[a-z0-9_]{1,20}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Use 1–20 letters, numbers, or underscores.');
  END IF;

  IF NOT public.is_username_allowed(v_alias)
     OR public.is_username_reserved(v_alias) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That word is reserved for a system or route.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_key), 9343);
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9344);

  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id
  ) INTO v_profile_exists;
  IF NOT v_profile_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE username_key = v_key
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That alias is already a canonical username.');
  END IF;

  SELECT user_id
  INTO v_existing_user_id
  FROM public.profile_aliases
  WHERE alias_key = v_key;
  IF v_existing_user_id IS NOT NULL THEN
    IF v_existing_user_id = v_user_id THEN
      RETURN jsonb_build_object('success', true, 'alias', v_key, 'path', '/a/' || v_key);
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'That alias is already in use.');
  END IF;

  SELECT count(*)
  INTO v_alias_count
  FROM public.profile_aliases
  WHERE user_id = v_user_id;
  IF v_alias_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can have up to 3 aliases.');
  END IF;

  BEGIN
    INSERT INTO public.profile_aliases (alias_key, user_id)
    VALUES (v_key, v_user_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'That alias is already in use.');
  END;

  RETURN jsonb_build_object('success', true, 'alias', v_key, 'path', '/a/' || v_key);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_profile_alias(p_alias text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_alias, '')));
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF v_key !~ '^[a-z0-9_]{1,20}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'That alias is not valid.');
  END IF;

  DELETE FROM public.profile_aliases
  WHERE alias_key = v_key AND user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'That alias was not found.');
  END IF;

  RETURN jsonb_build_object('success', true, 'alias', v_key);
END;
$function$;

COMMENT ON FUNCTION public.get_my_profile_aliases() IS
  'Authenticated owner projection for the current account aliases; no direct table reads are granted.';
COMMENT ON FUNCTION public.get_public_profile_alias(text) IS
  'Bounded public alias resolver returning only alias and canonical username.';
COMMENT ON FUNCTION public.create_profile_alias(text) IS
  'Authenticated owner boundary for up to three reserved-name-safe profile aliases.';
COMMENT ON FUNCTION public.delete_profile_alias(text) IS
  'Authenticated owner boundary for deleting one profile alias.';

REVOKE ALL ON FUNCTION public.prevent_profile_alias_username_collision() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_profile_aliases() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_alias(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_profile_alias(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_profile_alias(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_my_profile_aliases() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_alias(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_alias(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_alias(text) TO authenticated;

COMMIT;
