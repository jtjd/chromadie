-- Dashboard parity: reusable owner-scoped avatar/background assets.
-- The profile configuration still stores only the selected public object path;
-- this table is a private owner library and never becomes public profile data.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('avatar', 'background')),
  storage_path text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '' CHECK (char_length(label) <= 80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_media_assets_user_kind_created_idx
  ON public.profile_media_assets (user_id, kind, created_at DESC);

ALTER TABLE public.profile_media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their profile media assets" ON public.profile_media_assets;
CREATE POLICY "Owners can read their profile media assets"
  ON public.profile_media_assets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.profile_media_assets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profile_media_assets TO authenticated;

ALTER TABLE public.profile_configurations
  DROP CONSTRAINT IF EXISTS profile_configurations_avatar_path_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_background_path_check;

ALTER TABLE public.profile_configurations
  ADD CONSTRAINT profile_configurations_avatar_path_check CHECK (
    avatar_path IS NULL
    OR avatar_path ~ '^avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(avatar|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'
  ),
  ADD CONSTRAINT profile_configurations_background_path_check CHECK (
    background_path IS NULL
    OR background_path ~ '^backgrounds/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(background|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'
  );

-- Existing public reads remain unchanged. Uploads are still owner-shaped,
-- but now accept one generated UUID filename in addition to the legacy slot.
DROP POLICY IF EXISTS "Owners can upload profile expression media" ON storage.objects;
CREATE POLICY "Owners can upload profile expression media"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'backgrounds')
    AND (
      (bucket_id = 'avatars' AND name ~ ('^' || auth.uid()::text || '/(avatar|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'))
      OR (bucket_id = 'backgrounds' AND name ~ ('^' || auth.uid()::text || '/(background|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'))
    )
    AND COALESCE(metadata->>'mimetype', '') = 'image/webp'
  );

DROP POLICY IF EXISTS "Owners can replace profile expression media" ON storage.objects;
CREATE POLICY "Owners can replace profile expression media"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    (bucket_id = 'avatars' AND name ~ ('^' || auth.uid()::text || '/(avatar|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'))
    OR (bucket_id = 'backgrounds' AND name ~ ('^' || auth.uid()::text || '/(background|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'))
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'backgrounds')
    AND (
      (bucket_id = 'avatars' AND name ~ ('^' || auth.uid()::text || '/(avatar|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'))
      OR (bucket_id = 'backgrounds' AND name ~ ('^' || auth.uid()::text || '/(background|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'))
    )
    AND COALESCE(metadata->>'mimetype', '') = 'image/webp'
  );

DROP POLICY IF EXISTS "Owners can delete profile expression media" ON storage.objects;
CREATE POLICY "Owners can delete profile expression media"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    (bucket_id = 'avatars' AND name ~ ('^' || auth.uid()::text || '/(avatar|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'))
    OR (bucket_id = 'backgrounds' AND name ~ ('^' || auth.uid()::text || '/(background|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]webp$'))
  );

-- Keep the existing expression RPC authoritative while allowing only assets
-- that this same owner has registered in the private library.
CREATE OR REPLACE FUNCTION public.update_my_profile_expression(
  p_avatar_path text,
  p_background_path text,
  p_spotify_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_avatar_path text := NULLIF(btrim(p_avatar_path), '');
  v_background_path text := NULLIF(btrim(p_background_path), '');
  v_spotify_url text := NULLIF(btrim(p_spotify_url), '');
  v_spotify_match text[];
  v_spotify_type text;
  v_spotify_id text;
  v_signature_color text;
  v_default jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile not found';
  END IF;

  IF v_avatar_path IS NOT NULL
     AND v_avatar_path <> 'avatars/' || v_user_id::text || '/avatar.webp'
     AND NOT EXISTS (
       SELECT 1 FROM public.profile_media_assets
       WHERE user_id = v_user_id AND kind = 'avatar' AND storage_path = v_avatar_path
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That profile expression is not valid.';
  END IF;

  IF v_background_path IS NOT NULL
     AND v_background_path <> 'backgrounds/' || v_user_id::text || '/background.webp'
     AND NOT EXISTS (
       SELECT 1 FROM public.profile_media_assets
       WHERE user_id = v_user_id AND kind = 'background' AND storage_path = v_background_path
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That profile expression is not valid.';
  END IF;

  IF v_spotify_url IS NOT NULL THEN
    v_spotify_match := regexp_match(
      v_spotify_url,
      '^https://open[.]spotify[.]com/(track|playlist|album)/([A-Za-z0-9]{22})/?([?][^#[:space:]]*)?$'
    );
    IF v_spotify_match IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That Spotify URL is not supported.';
    END IF;
    v_spotify_type := v_spotify_match[1];
    v_spotify_id := v_spotify_match[2];
  END IF;

  SELECT mood_color INTO v_signature_color FROM public.profiles WHERE id = v_user_id;
  v_default := public.profile_default_configuration(v_signature_color);

  INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
  VALUES (v_user_id, v_default, v_default)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.profile_configurations
  SET avatar_path = v_avatar_path,
      background_path = v_background_path,
      spotify_type = v_spotify_type,
      spotify_id = v_spotify_id,
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'avatar_path', v_avatar_path,
    'background_path', v_background_path,
    'spotify_type', v_spotify_type,
    'spotify_id', v_spotify_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_my_profile_media_asset(
  p_kind text,
  p_asset_id uuid,
  p_label text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_kind text := NULLIF(lower(btrim(p_kind)), '');
  v_bucket text;
  v_path text;
  v_label text := left(COALESCE(btrim(p_label), ''), 80);
  v_object storage.objects%ROWTYPE;
  v_asset public.profile_media_assets%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;
  IF v_kind NOT IN ('avatar', 'background') OR p_asset_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That media asset is not valid.';
  END IF;

  v_bucket := CASE WHEN v_kind = 'avatar' THEN 'avatars' ELSE 'backgrounds' END;
  v_path := v_user_id::text || '/' || p_asset_id::text || '.webp';

  SELECT * INTO v_object
  FROM storage.objects
  WHERE bucket_id = v_bucket AND name = v_path;
  IF NOT FOUND OR COALESCE(v_object.metadata->>'mimetype', '') <> 'image/webp' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Upload the processed WebP before registering it.';
  END IF;

  INSERT INTO public.profile_media_assets (user_id, kind, storage_path, label)
  VALUES (v_user_id, v_kind, v_bucket || '/' || v_path, v_label)
  ON CONFLICT (storage_path) DO UPDATE
    SET label = EXCLUDED.label
  RETURNING * INTO v_asset;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_asset.id,
    'kind', v_asset.kind,
    'storage_path', v_asset.storage_path,
    'label', v_asset.label,
    'created_at', v_asset.created_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_my_profile_media_asset(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_asset public.profile_media_assets%ROWTYPE;
  v_reference_column text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  SELECT * INTO v_asset
  FROM public.profile_media_assets
  WHERE id = p_asset_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Media asset not found.');
  END IF;

  v_reference_column := CASE WHEN v_asset.kind = 'avatar' THEN 'avatar_path' ELSE 'background_path' END;
  UPDATE public.profile_configurations
  SET avatar_path = CASE WHEN v_asset.kind = 'avatar' AND avatar_path = v_asset.storage_path THEN NULL ELSE avatar_path END,
      background_path = CASE WHEN v_asset.kind = 'background' AND background_path = v_asset.storage_path THEN NULL ELSE background_path END,
      updated_at = now()
  WHERE user_id = v_user_id;

  DELETE FROM storage.objects
  WHERE bucket_id = CASE WHEN v_asset.kind = 'avatar' THEN 'avatars' ELSE 'backgrounds' END
    AND name = split_part(v_asset.storage_path, '/', 2) || '/' || split_part(v_asset.storage_path, '/', 3);
  DELETE FROM public.profile_media_assets WHERE id = v_asset.id;

  RETURN jsonb_build_object('success', true, 'storage_path', v_asset.storage_path, 'cleared_reference', v_reference_column);
END;
$function$;

REVOKE ALL ON FUNCTION public.register_my_profile_media_asset(text, uuid, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.delete_my_profile_media_asset(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.register_my_profile_media_asset(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_profile_media_asset(uuid) TO authenticated;

COMMENT ON TABLE public.profile_media_assets IS
  'Private owner-scoped reusable avatar/background assets; public profiles expose only the selected path through profile configuration.';

COMMIT;
