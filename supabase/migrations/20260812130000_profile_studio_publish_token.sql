-- Keep the atomic Profile Studio publish token inside the database
-- transaction. Converting the save RPC's JSON timestamp back into a
-- timestamptz can lose the exact optimistic-concurrency token in production.

BEGIN;

CREATE OR REPLACE FUNCTION public.publish_profile_studio_v2(
  p_draft jsonb,
  p_display_name text,
  p_bio text,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_save jsonb;
  v_identity jsonb;
  v_publish jsonb;
  v_updated_at timestamptz;
  v_error_code text;
  v_error_message text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  BEGIN
    v_save := public.save_profile_configuration_v2(p_draft, p_expected_updated_at);
    IF coalesce((v_save->>'success')::boolean, false) IS NOT TRUE THEN
      v_error_code := v_save->>'code';
      v_error_message := coalesce(v_save->>'error', 'The profile configuration could not be saved.');
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = v_error_message;
    END IF;

    v_identity := public.update_my_profile_identity(p_display_name, p_bio);

    -- The save function holds the configuration row lock for this outer
    -- transaction. Read the exact database value instead of round-tripping
    -- a JSON timestamp through text before the publish step.
    SELECT updated_at
    INTO v_updated_at
    FROM public.profile_configurations
    WHERE user_id = v_user_id
    FOR UPDATE;

    v_publish := public.publish_profile_configuration_v2(v_updated_at);
    IF coalesce((v_publish->>'success')::boolean, false) IS NOT TRUE THEN
      v_error_code := v_publish->>'code';
      v_error_message := coalesce(v_publish->>'error', 'The profile configuration could not be published.');
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = v_error_message;
    END IF;

    SELECT updated_at
    INTO v_updated_at
    FROM public.profile_configurations
    WHERE user_id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', coalesce(v_error_code, CASE WHEN SQLSTATE = '40001' THEN 'conflict' ELSE NULL END),
      'error', coalesce(v_error_message, SQLERRM)
    );
  END;

  RETURN jsonb_build_object(
    'success', true,
    'version', 2,
    'draft', v_publish->'draft',
    'published', v_publish->'published',
    'updated_at', v_updated_at,
    'published_at', v_publish->'published_at',
    'identity', v_identity
  );
END;
$function$;

COMMENT ON FUNCTION public.publish_profile_studio_v2(jsonb, text, text, timestamptz) IS
  'Atomic Profile Studio boundary with an in-transaction optimistic-concurrency token.';

COMMIT;
