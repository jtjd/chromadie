-- Keep direct public-profile access separate from discovery and search-index
-- eligibility. A profile owner may leave the share URL available while opting
-- out of internal discovery and generated sitemap publication.

BEGIN;

CREATE OR REPLACE FUNCTION public.public_profile_identity_projection(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'bio', p.bio,
    'created_at', p.created_at,
    'current_streak', p.current_streak,
    'longest_streak', p.longest_streak,
    'lifetime_ep', p.lifetime_ep,
    'total_rolls', p.total_rolls,
    'equipped_cosmetics', p.equipped_cosmetics,
    'equipped_badges', p.equipped_badges,
    'mood_color', p.mood_color,
    'best_roll_score', p.best_roll_score,
    'best_roll_hex', p.best_roll_hex,
    'best_roll_rarity', p.best_roll_rarity,
    'is_staff', p.is_staff,
    'discoverable', COALESCE((
      SELECT settings.discoverable
      FROM public.profile_social_settings settings
      WHERE settings.user_id = p.id
    ), true)
  )
  FROM public.profiles p
  WHERE p.id = p_user_id;
$function$;

COMMENT ON FUNCTION public.public_profile_identity_projection(uuid) IS
  'Bounded public profile projection. discoverable controls discovery and search indexing only; direct profile routes remain available.';

-- This deliberately exposes only canonical usernames already eligible for
-- public discovery/search. Keyset pagination avoids an unbounded profile scan
-- and has no route through private profile or moderation data.
CREATE OR REPLACE FUNCTION public.get_public_profile_sitemap_page(
  p_after text DEFAULT NULL,
  p_limit integer DEFAULT 1000
)
RETURNS TABLE(username text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_after_key text := NULLIF(lower(btrim(COALESCE(p_after, ''))), '');
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Sitemap page size must be between 1 and 1000.';
  END IF;

  RETURN QUERY
  SELECT p.username
  FROM public.profiles p
  WHERE p.lifetime_ep > 0
    AND COALESCE((
      SELECT settings.discoverable
      FROM public.profile_social_settings settings
      WHERE settings.user_id = p.id
    ), true)
    AND (v_after_key IS NULL OR p.username_key > v_after_key)
  ORDER BY p.username_key ASC
  LIMIT p_limit;
END;
$function$;

COMMENT ON FUNCTION public.get_public_profile_sitemap_page(text, integer) IS
  'Bounded keyset page of discoverable public profile usernames for the generated sitemap.';

REVOKE ALL ON FUNCTION public.public_profile_identity_projection(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_sitemap_page(text, integer) FROM PUBLIC, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_sitemap_page(text, integer) TO anon;

COMMIT;
