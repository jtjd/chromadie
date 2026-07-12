-- Server-enforced username moderation.
-- The client may mirror this list for friendly validation, but the database
-- remains the source of truth for signup/profile writes.

CREATE TABLE IF NOT EXISTS public.username_blocklist (
  term text PRIMARY KEY,
  reason text NOT NULL DEFAULT 'inappropriate',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_blocklist_term_check CHECK (term ~ '^[a-z0-9]+$' AND length(term) >= 4)
);

REVOKE ALL ON TABLE public.username_blocklist FROM anon, authenticated;
GRANT SELECT ON TABLE public.username_blocklist TO service_role;

INSERT INTO public.username_blocklist (term, reason)
VALUES
  ('asshole', 'insult'),
  ('bastard', 'insult'),
  ('bitch', 'insult'),
  ('cocksuck', 'sexual profanity'),
  ('cunt', 'sexual profanity'),
  ('dickhead', 'insult'),
  ('faggot', 'slur'),
  ('fuck', 'profanity'),
  ('motherfuck', 'profanity'),
  ('nazi', 'hate reference'),
  ('nigger', 'slur'),
  ('piss', 'profanity'),
  ('retard', 'slur'),
  ('shit', 'profanity'),
  ('slut', 'sexual insult'),
  ('whore', 'sexual insult')
ON CONFLICT (term) DO NOTHING;

CREATE OR REPLACE FUNCTION public.normalize_username_for_moderation(p_username text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT translate(
    lower(regexp_replace(coalesce(p_username, ''), '[^a-zA-Z0-9]', '', 'g')),
    '013457',
    'oieast'
  );
$$;

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
      AND (
        public.normalize_username_for_moderation(p_username) = b.term
        OR (
          length(b.term) >= 5
          AND public.normalize_username_for_moderation(p_username) LIKE '%' || b.term || '%'
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_allowed(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_username_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.username IS NOT NULL AND NOT public.is_username_allowed(NEW.username) THEN
    RAISE EXCEPTION 'Username is not available.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_username_moderation ON public.profiles;
CREATE TRIGGER profiles_username_moderation
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_username_moderation();
