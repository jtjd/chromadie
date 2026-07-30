-- Staff-only alpha profile audio. This is intentionally separate from the
-- general expression RPC so future paid access can replace the eligibility
-- check without changing avatar, background, or Spotify contracts.

BEGIN;

ALTER TABLE public.profile_configurations
  ADD COLUMN IF NOT EXISTS audio_path text;

COMMENT ON COLUMN public.profile_configurations.audio_path IS
  'Optional staff-alpha profile audio object path; public profiles expose it only while the owner is staff.';

ALTER TABLE public.profile_configurations
  DROP CONSTRAINT IF EXISTS profile_configurations_audio_path_check;

ALTER TABLE public.profile_configurations
  ADD CONSTRAINT profile_configurations_audio_path_check CHECK (
    audio_path IS NULL
    OR audio_path ~ '^profile_audio/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/profile[.]mp3$'
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_audio',
  'profile_audio',
  true,
  1048576,
  ARRAY['audio/mpeg']::text[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public staff profile audio read" ON storage.objects;
CREATE POLICY "Public staff profile audio read"
  ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile_audio');

DROP POLICY IF EXISTS "Staff can upload profile audio" ON storage.objects;
CREATE POLICY "Staff can upload profile audio"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile_audio'
    AND name = auth.uid()::text || '/profile.mp3'
    AND COALESCE(metadata->>'mimetype', '') = 'audio/mpeg'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_staff = true
    )
  );

DROP POLICY IF EXISTS "Staff can replace profile audio" ON storage.objects;
CREATE POLICY "Staff can replace profile audio"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile_audio'
    AND name = auth.uid()::text || '/profile.mp3'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_staff = true
    )
  )
  WITH CHECK (
    bucket_id = 'profile_audio'
    AND name = auth.uid()::text || '/profile.mp3'
    AND COALESCE(metadata->>'mimetype', '') = 'audio/mpeg'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_staff = true
    )
  );

DROP POLICY IF EXISTS "Staff can delete profile audio" ON storage.objects;
CREATE POLICY "Staff can delete profile audio"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile_audio'
    AND name = auth.uid()::text || '/profile.mp3'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_staff = true
    )
  );

CREATE OR REPLACE FUNCTION public.update_my_profile_audio(p_audio_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_audio_path text := NULLIF(btrim(p_audio_path), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND is_staff = true
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Profile audio is currently available to staff accounts only.';
  END IF;

  IF v_audio_path IS NOT NULL
     AND v_audio_path <> 'profile_audio/' || v_user_id::text || '/profile.mp3' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That profile audio path is not valid.';
  END IF;

  IF v_audio_path IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'profile_audio'
      AND name = v_user_id::text || '/profile.mp3'
      AND COALESCE(metadata->>'mimetype', '') = 'audio/mpeg'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The profile audio file was not found.';
  END IF;

  UPDATE public.profile_configurations
  SET audio_path = v_audio_path,
      updated_at = now()
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'audio_path', v_audio_path
  );
END;
$function$;

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
  v_is_staff boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT mood_color, is_staff
  INTO v_signature_color, v_is_staff
  FROM public.profiles
  WHERE id = v_user_id;
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
    'spotify_id', v_record.spotify_id,
    'audio_path', CASE WHEN v_is_staff THEN v_record.audio_path ELSE NULL END
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
      'spotify_id', c.spotify_id,
      'audio_path', CASE WHEN p.is_staff THEN c.audio_path ELSE NULL END
    )
  FROM public.profiles p
  LEFT JOIN public.profile_configurations c ON c.user_id = p.id
  WHERE p.id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public.update_my_profile_audio(text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_my_profile_audio(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_profile_expression_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE (bucket_id = 'avatars' AND name = OLD.id::text || '/avatar.webp')
     OR (bucket_id = 'backgrounds' AND name = OLD.id::text || '/background.webp')
     OR (bucket_id = 'profile_audio' AND name = OLD.id::text || '/profile.mp3');
  RETURN OLD;
END;
$function$;

COMMIT;
