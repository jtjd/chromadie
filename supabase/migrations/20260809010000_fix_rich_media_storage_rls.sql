-- Fix the rich-media Storage INSERT policy after profile_media_assets gained a
-- metadata column. The unqualified metadata reference in the original policy
-- resolved to the staged asset row instead of storage.objects.metadata, and
-- its path comparison prefixed the owner's UUID twice. Valid uploads were
-- rejected before the finalize RPC could verify them; the same path mismatch
-- also prevented Storage replacement/deletion of an active asset.

BEGIN;

DROP POLICY IF EXISTS "Owners can stage rich profile media" ON storage.objects;
CREATE POLICY "Owners can stage rich profile media"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid()
        AND a.status = 'staged'
        AND a.storage_path = 'profile_media/' || name
        AND COALESCE(storage.objects.metadata->>'mimetype', '') = a.mime_type
    )
  );

DROP POLICY IF EXISTS "Owners can replace rich profile media" ON storage.objects;
CREATE POLICY "Owners can replace rich profile media"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid()
        AND a.storage_path = 'profile_media/' || name
    )
  )
  WITH CHECK (
    bucket_id = 'profile_media'
    AND COALESCE(storage.objects.metadata->>'mimetype', '') IN ('video/mp4', 'video/webm', 'audio/mpeg', 'image/webp')
  );

DROP POLICY IF EXISTS "Owners can delete rich profile media" ON storage.objects;
CREATE POLICY "Owners can delete rich profile media"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid()
        AND a.storage_path = 'profile_media/' || name
    )
  );

COMMIT;
