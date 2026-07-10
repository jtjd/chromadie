-- Store shared challenge links as expiring records.
-- Challenges are resolved by opaque ID; score/hex remain display data.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_username text,
  target_score bigint NOT NULL CHECK (target_score >= 0),
  target_hex text NOT NULL CHECK (target_hex ~ '^#[0-9A-F]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  CONSTRAINT challenges_sender_username_check
    CHECK (sender_username IS NULL OR sender_username ~ '^[A-Za-z0-9_]{3,20}$')
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.challenges FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS challenges_expires_at_idx
  ON public.challenges (expires_at);

CREATE INDEX IF NOT EXISTS challenges_sender_user_id_idx
  ON public.challenges (sender_user_id);

CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges() RETURNS void
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $$
  DELETE FROM public.challenges
  WHERE expires_at < now();
$$;

DO $$
DECLARE
  v_job_id integer;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'chromadie_cleanup_expired_challenges'
    LIMIT 1;

    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    PERFORM cron.schedule(
      'chromadie_cleanup_expired_challenges',
      '30 3 * * *',
      'SELECT public.cleanup_expired_challenges()'
    );
  END IF;
END
$$;
