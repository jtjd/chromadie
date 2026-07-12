-- Match all curated terms inside longer normalized usernames. The blocklist
-- is intentionally curated to avoid short-word false positives.

CREATE OR REPLACE FUNCTION public.is_username_allowed(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.username_blocklist b
    WHERE b.enabled
      AND public.normalize_username_for_moderation(p_username) LIKE '%' || b.term || '%'
  );
$$;
