-- Phase 14: bounded profile expression media and Spotify configuration.
-- The profile configuration table remains private; public readers receive
-- only the four intentional expression fields through its existing RPCs.

BEGIN;

ALTER TABLE public.profile_configurations
  ADD COLUMN IF NOT EXISTS avatar_path text,
  ADD COLUMN IF NOT EXISTS background_path text,
  ADD COLUMN IF NOT EXISTS spotify_type text,
  ADD COLUMN IF NOT EXISTS spotify_id text;

COMMENT ON COLUMN public.profile_configurations.avatar_path IS
  'Public profile avatar object path, limited to the owning user and avatar.webp.';
COMMENT ON COLUMN public.profile_configurations.background_path IS
  'Public profile background object path, limited to the owning user and background.webp.';
COMMENT ON COLUMN public.profile_configurations.spotify_type IS
  'Validated public Spotify entity type: track, playlist, or album.';
COMMENT ON COLUMN public.profile_configurations.spotify_id IS
  'Validated public Spotify entity identifier; provider URLs are never stored.';

ALTER TABLE public.profile_configurations
  DROP CONSTRAINT IF EXISTS profile_configurations_avatar_path_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_background_path_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_spotify_type_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_spotify_id_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_spotify_pair_check;

ALTER TABLE public.profile_configurations
  ADD CONSTRAINT profile_configurations_avatar_path_check CHECK (
    avatar_path IS NULL
    OR avatar_path ~ '^avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar[.]webp$'
  ),
  ADD CONSTRAINT profile_configurations_background_path_check CHECK (
    background_path IS NULL
    OR background_path ~ '^backgrounds/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/background[.]webp$'
  ),
  ADD CONSTRAINT profile_configurations_spotify_type_check CHECK (
    spotify_type IS NULL OR spotify_type IN ('track', 'playlist', 'album')
  ),
  ADD CONSTRAINT profile_configurations_spotify_id_check CHECK (
    spotify_id IS NULL OR spotify_id ~ '^[A-Za-z0-9]{22}$'
  ),
  ADD CONSTRAINT profile_configurations_spotify_pair_check CHECK (
    (spotify_type IS NULL) = (spotify_id IS NULL)
  );

-- Storage buckets enforce the input size and MIME boundary in addition to the
-- client-side conversion to WebP. The object path policies below are the
-- ownership boundary; bucket names are included in stored profile paths so
-- they cannot be confused across media types.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/webp']::text[]),
  ('backgrounds', 'backgrounds', true, 10485760, ARRAY['image/webp']::text[])
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public profile expression media read" ON storage.objects;
CREATE POLICY "Public profile expression media read"
  ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('avatars', 'backgrounds'));

DROP POLICY IF EXISTS "Owners can upload profile expression media" ON storage.objects;
CREATE POLICY "Owners can upload profile expression media"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'backgrounds')
    AND (
      (bucket_id = 'avatars' AND name = auth.uid()::text || '/avatar.webp')
      OR (bucket_id = 'backgrounds' AND name = auth.uid()::text || '/background.webp')
    )
    AND COALESCE(metadata->>'mimetype', '') = 'image/webp'
  );

DROP POLICY IF EXISTS "Owners can replace profile expression media" ON storage.objects;
CREATE POLICY "Owners can replace profile expression media"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    (bucket_id = 'avatars' AND name = auth.uid()::text || '/avatar.webp')
    OR (bucket_id = 'backgrounds' AND name = auth.uid()::text || '/background.webp')
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'backgrounds')
    AND (
      (bucket_id = 'avatars' AND name = auth.uid()::text || '/avatar.webp')
      OR (bucket_id = 'backgrounds' AND name = auth.uid()::text || '/background.webp')
    )
    AND COALESCE(metadata->>'mimetype', '') = 'image/webp'
  );

DROP POLICY IF EXISTS "Owners can delete profile expression media" ON storage.objects;
CREATE POLICY "Owners can delete profile expression media"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    (bucket_id = 'avatars' AND name = auth.uid()::text || '/avatar.webp')
    OR (bucket_id = 'backgrounds' AND name = auth.uid()::text || '/background.webp')
  );

-- The RPC is the only browser write boundary for the profile references. It
-- derives ownership from auth.uid(), validates the exact object paths, parses
-- the provider URL, and stores only bounded Spotify type/id values.
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
     AND v_avatar_path <> 'avatars/' || v_user_id::text || '/avatar.webp' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That profile expression is not valid.';
  END IF;

  IF v_background_path IS NOT NULL
     AND v_background_path <> 'backgrounds/' || v_user_id::text || '/background.webp' THEN
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

  SELECT mood_color INTO v_signature_color
  FROM public.profiles
  WHERE id = v_user_id;
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

-- Owner reads include the media fields in both representations so existing
-- draft persistence cannot accidentally erase the current public expression.
CREATE OR REPLACE FUNCTION public.get_my_profile_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_signature_color text;
  v_default jsonb;
  v_record public.profile_configurations%ROWTYPE;
  v_expression jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT mood_color INTO v_signature_color FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_default := public.profile_default_configuration(v_signature_color);
  INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
  VALUES (v_user_id, v_default, v_default)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_record
  FROM public.profile_configurations
  WHERE user_id = v_user_id;

  v_expression := jsonb_build_object(
    'avatar_path', v_record.avatar_path,
    'background_path', v_record.background_path,
    'spotify_type', v_record.spotify_type,
    'spotify_id', v_record.spotify_id
  );

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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT COALESCE(c.published_config, public.profile_default_configuration(p.mood_color))
    || jsonb_build_object(
      'avatar_path', c.avatar_path,
      'background_path', c.background_path,
      'spotify_type', c.spotify_type,
      'spotify_id', c.spotify_id
    )
  FROM public.profiles p
  LEFT JOIN public.profile_configurations c ON c.user_id = p.id
  WHERE p.id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public.update_my_profile_expression(text, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_my_profile_expression(text, text, text) TO authenticated;

-- Storage objects are deleted by the same profile deletion boundary used by
-- the account cleanup Edge Function. This also covers direct profile deletes
-- performed by trusted maintenance paths.
CREATE OR REPLACE FUNCTION public.delete_profile_expression_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- Supabase's storage trigger blocks ad-hoc SQL deletes. This transaction-
  -- local flag is set only inside this exact profile cleanup boundary.
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE (bucket_id = 'avatars' AND name = OLD.id::text || '/avatar.webp')
     OR (bucket_id = 'backgrounds' AND name = OLD.id::text || '/background.webp');
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS profile_expression_media_cleanup ON public.profiles;
CREATE TRIGGER profile_expression_media_cleanup
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_profile_expression_media();

REVOKE ALL ON FUNCTION public.delete_profile_expression_media() FROM PUBLIC, anon, authenticated;

COMMIT;
