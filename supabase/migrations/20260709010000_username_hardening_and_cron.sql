-- Production hardening for launch:
-- - Enforce username format in the database.
-- - Restore automated weekly COTW rotation.
-- - Restore automated stale-score cleanup.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_username_format_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_format_check
      CHECK (username ~ '^[A-Za-z0-9_]{3,20}$');
  END IF;
END
$$;

DO $$
DECLARE
  v_job_id integer;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'cron_update_cotw'
    LIMIT 1;

    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'chromadie_update_cotw'
    LIMIT 1;

    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'chromadie_cleanup_old_scores'
    LIMIT 1;

    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    PERFORM cron.schedule(
      'chromadie_update_cotw',
      '0 0 * * 1',
      'SELECT public.update_cotw()'
    );

    PERFORM cron.schedule(
      'chromadie_cleanup_old_scores',
      '15 3 * * *',
      'SELECT public.cleanup_old_scores()'
    );

    PERFORM public.update_cotw();
  END IF;
END
$$;
