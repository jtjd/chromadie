BEGIN;

-- Provider-neutral read projection. Legacy Supabase paths remain valid during
-- the migration window; R2 assets expose only their immutable public key after
-- promotion. `ever_public` is deliberately not reversed by unequip.
CREATE OR REPLACE FUNCTION public.profile_media_public_reference(
  p_asset_id uuid,
  p_storage_path text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
BEGIN
  IF p_asset_id IS NOT NULL THEN
    SELECT * INTO v_asset FROM public.profile_media_assets WHERE id = p_asset_id;
  ELSIF p_storage_path IS NOT NULL THEN
    SELECT * INTO v_asset FROM public.profile_media_assets WHERE storage_path = p_storage_path LIMIT 1;
  END IF;

  IF FOUND AND v_asset.storage_provider = 'r2' THEN
    IF v_asset.status <> 'active'
       OR v_asset.delivery_status <> 'ready'
       OR v_asset.ever_public IS NOT TRUE
       OR NULLIF(v_asset.r2_public_key, '') IS NULL THEN
      RETURN NULL;
    END IF;
    RETURN jsonb_build_object(
      'asset_id', v_asset.id,
      'storage_provider', 'r2',
      'r2_public_key', v_asset.r2_public_key,
      'mime_type', v_asset.mime_type,
      'byte_size', v_asset.byte_size
    );
  END IF;

  IF FOUND AND v_asset.storage_provider = 'supabase' AND v_asset.storage_path IS NOT NULL THEN
    RETURN jsonb_build_object(
      'asset_id', v_asset.id,
      'storage_provider', 'supabase',
      'storage_path', v_asset.storage_path,
      'mime_type', v_asset.mime_type,
      'byte_size', v_asset.byte_size
    );
  END IF;

  IF NULLIF(btrim(p_storage_path), '') IS NOT NULL THEN
    RETURN jsonb_build_object('storage_provider', 'supabase', 'storage_path', p_storage_path);
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_media_playlist_with_references(
  p_playlist jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'tracks', COALESCE((
      SELECT jsonb_agg(
        track || CASE
          WHEN public.profile_media_public_reference(
            CASE WHEN track->>'asset_id' ~* '^[0-9a-f-]{36}$' THEN (track->>'asset_id')::uuid END,
            track->>'path'
          ) IS NULL THEN '{}'::jsonb
          ELSE jsonb_build_object(
            'media_reference', public.profile_media_public_reference(
              CASE WHEN track->>'asset_id' ~* '^[0-9a-f-]{36}$' THEN (track->>'asset_id')::uuid END,
              track->>'path'
            )
          )
        END
        ORDER BY CASE
          WHEN track->>'order' ~ '^-?[0-9]{1,9}$' THEN (track->>'order')::integer
          ELSE 0
        END
      )
      FROM jsonb_array_elements(COALESCE(p_playlist->'tracks', '[]'::jsonb)) track
    ), '[]'::jsonb),
    'shuffle', COALESCE((p_playlist->>'shuffle')::boolean, false),
    'loop', COALESCE((p_playlist->>'loop')::boolean, true),
    'autoplay', COALESCE((p_playlist->>'autoplay')::boolean, false),
    'volume', COALESCE((p_playlist->>'volume')::numeric, 0.75),
    'controls', COALESCE((p_playlist->>'controls')::boolean, true)
  );
$function$;

CREATE OR REPLACE FUNCTION public.profile_media_expression_projection(
  p_record public.profile_configurations,
  p_is_staff boolean,
  p_rich_access boolean,
  p_public boolean
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'avatar_path', p_record.avatar_path,
    'background_path', p_record.background_path,
    'avatar_asset_id', p_record.avatar_asset_id,
    'background_asset_id', p_record.background_asset_id,
    'spotify_type', p_record.spotify_type,
    'spotify_id', p_record.spotify_id,
    'audio_path', CASE WHEN p_is_staff THEN p_record.audio_path ELSE NULL END,
    'audio_asset_id', CASE WHEN p_is_staff THEN p_record.audio_asset_id ELSE NULL END,
    'background_video_path', CASE WHEN p_rich_access OR NOT p_public THEN p_record.background_video_path ELSE NULL END,
    'background_video_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.background_video_asset_id ELSE NULL END,
    'banner_path', CASE WHEN p_rich_access OR NOT p_public THEN p_record.banner_path ELSE NULL END,
    'banner_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.banner_asset_id ELSE NULL END,
    'cursor_path', CASE WHEN p_rich_access OR NOT p_public THEN p_record.cursor_path ELSE NULL END,
    'cursor_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.cursor_asset_id ELSE NULL END,
    'pointer_cursor_path', CASE WHEN p_rich_access OR NOT p_public THEN p_record.pointer_cursor_path ELSE NULL END,
    'pointer_cursor_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.pointer_cursor_asset_id ELSE NULL END,
    'audio_playlist', CASE WHEN p_rich_access OR NOT p_public
      THEN public.profile_media_playlist_with_references(p_record.audio_playlist)
      ELSE '{"tracks":[],"shuffle":false,"loop":true,"autoplay":false,"volume":0.75,"controls":true}'::jsonb
    END,
    'media_references', jsonb_build_object(
      'avatar', public.profile_media_public_reference(p_record.avatar_asset_id, p_record.avatar_path),
      'background', public.profile_media_public_reference(p_record.background_asset_id, p_record.background_path),
      'audio', CASE WHEN p_is_staff THEN public.profile_media_public_reference(p_record.audio_asset_id, p_record.audio_path) ELSE NULL END,
      'background_video', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.background_video_asset_id, p_record.background_video_path) ELSE NULL END,
      'banner', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.banner_asset_id, p_record.banner_path) ELSE NULL END,
      'cursor', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.cursor_asset_id, p_record.cursor_path) ELSE NULL END,
      'pointer_cursor', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.pointer_cursor_asset_id, p_record.pointer_cursor_path) ELSE NULL END
    )
  );
$function$;

-- The V2 projections are the main application contract. Keep the older reads
-- aligned because server-rendered metadata and compatibility surfaces still
-- consume them during the staged rollout.
CREATE OR REPLACE FUNCTION public.get_my_profile_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_record public.profile_configurations%ROWTYPE;
  v_default jsonb;
  v_signature_color text;
  v_is_staff boolean := false;
  v_expression jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT mood_color, COALESCE(is_staff, false) INTO v_signature_color, v_is_staff FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile not found'); END IF;
  v_default := public.profile_default_configuration(v_signature_color);
  INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
  VALUES (v_user_id, v_default, v_default) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  v_expression := public.profile_media_expression_projection(v_record, v_is_staff, true, false);
  RETURN jsonb_build_object(
    'success', true,
    'version', v_record.config_version,
    'draft', v_record.draft_config || v_expression,
    'published', v_record.published_config || v_expression,
    'updated_at', v_record.updated_at,
    'published_at', v_record.published_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_configuration(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_record public.profile_configurations%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_config jsonb;
  v_default jsonb;
  v_rich_access boolean := false;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = p_user_id;
  v_config := COALESCE(v_record.published_config, public.profile_default_configuration(v_profile.mood_color));
  v_default := public.profile_default_configuration(v_profile.mood_color);
  v_rich_access := public.profile_rich_media_access(p_user_id);
  IF COALESCE(v_config->>'templateKey', '') = 'atelier' AND NOT v_rich_access THEN
    v_config := v_config || jsonb_build_object(
      'templateKey', 'signal',
      'layoutVariant', v_default->'layoutVariant',
      'modules', v_default->'modules'
    );
  END IF;
  RETURN v_config || public.profile_media_expression_projection(
    v_record,
    COALESCE(v_profile.is_staff, false),
    v_rich_access,
    true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_configuration_v2_with_expression(
  p_configuration jsonb,
  p_expression jsonb
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_set(
    COALESCE(p_configuration, '{}'::jsonb),
    '{base}',
    COALESCE(p_configuration->'base', '{}'::jsonb) || COALESCE(p_expression, '{}'::jsonb),
    true
  ) || COALESCE(p_expression, '{}'::jsonb);
$function$;

CREATE OR REPLACE FUNCTION public.get_my_profile_configuration_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_record public.profile_configurations%ROWTYPE;
  v_is_staff boolean := false;
  v_expression jsonb;
  v_draft jsonb;
  v_published jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile not found'); END IF;
  SELECT COALESCE(is_staff, false) INTO v_is_staff FROM public.profiles WHERE id = v_user_id;
  v_expression := public.profile_media_expression_projection(v_record, v_is_staff, true, false);
  v_draft := public.profile_configuration_v2_with_expression(COALESCE(v_record.draft_config_v2, public.profile_configuration_v2_from_v1(v_record.draft_config)), v_expression);
  v_published := public.profile_configuration_v2_with_expression(COALESCE(v_record.published_config_v2, public.profile_configuration_v2_from_v1(v_record.published_config)), v_expression);
  RETURN jsonb_build_object('success', true, 'version', 2, 'draft', v_draft, 'published', v_published, 'updated_at', v_record.updated_at, 'published_at', v_record.published_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_configuration_v2(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_record public.profile_configurations%ROWTYPE;
  v_expression jsonb;
  v_profile public.profiles%ROWTYPE;
  v_rich_access boolean := false;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = p_user_id;
  v_rich_access := public.profile_rich_media_access(p_user_id);
  v_expression := public.profile_media_expression_projection(v_record, COALESCE(v_profile.is_staff, false), v_rich_access, true);
  RETURN jsonb_build_object(
    'success', true,
    'version', 2,
    'draft', NULL,
    'published', public.profile_configuration_v2_with_expression(
      COALESCE(v_record.published_config_v2, public.profile_configuration_v2_from_v1(COALESCE(v_record.published_config, public.profile_default_configuration(v_profile.mood_color)))),
      v_expression
    ),
    'updated_at', v_record.updated_at,
    'published_at', v_record.published_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.select_my_profile_expression_assets(
  p_avatar_id uuid DEFAULT NULL,
  p_background_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_avatar public.profile_media_assets%ROWTYPE;
  v_background public.profile_media_assets%ROWTYPE;
  v_updated_at timestamptz;
  v_profile public.profiles%ROWTYPE;
  v_record public.profile_configurations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  IF p_avatar_id IS NOT NULL THEN
    SELECT * INTO v_avatar FROM public.profile_media_assets WHERE id = p_avatar_id AND user_id = v_user_id AND kind = 'avatar' AND status = 'active' AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That avatar is not available.'; END IF;
  END IF;
  IF p_background_id IS NOT NULL THEN
    SELECT * INTO v_background FROM public.profile_media_assets WHERE id = p_background_id AND user_id = v_user_id AND kind = 'background' AND status = 'active' AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That background is not available.'; END IF;
  END IF;

  UPDATE public.profile_configurations
  SET avatar_asset_id = p_avatar_id,
      background_asset_id = p_background_id,
      avatar_path = CASE WHEN v_avatar.storage_provider = 'supabase' THEN v_avatar.storage_path ELSE NULL END,
      background_path = CASE WHEN v_background.storage_provider = 'supabase' THEN v_background.storage_path ELSE NULL END,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.'; END IF;

  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'avatar_path', v_record.avatar_path,
    'background_path', v_record.background_path,
    'avatar_asset_id', v_record.avatar_asset_id,
    'background_asset_id', v_record.background_asset_id,
    'media_references', (public.profile_media_expression_projection(v_record, COALESCE(v_profile.is_staff, false), true, false)->'media_references'),
    'updated_at', v_updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.profile_media_public_reference(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_media_playlist_with_references(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_media_expression_projection(public.profile_configurations, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.select_my_profile_expression_assets(uuid, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.select_my_profile_expression_assets(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_configuration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_configuration_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration_v2(uuid) TO anon, authenticated;

COMMIT;
