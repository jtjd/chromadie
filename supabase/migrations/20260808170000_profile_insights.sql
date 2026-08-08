-- Phase 9 continuation: privacy-conscious, owner-opt-in profile insights.
-- Store only daily aggregate counts. No viewer, IP, timestamp, or event row is
-- retained, and browser roles can reach the data only through bounded RPCs.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

ALTER TABLE public.profile_social_settings
  ADD COLUMN IF NOT EXISTS profile_insights_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.profile_view_daily (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  view_date date NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, view_date),
  CONSTRAINT profile_view_daily_count_check CHECK (view_count BETWEEN 0 AND 1000000)
);

CREATE INDEX IF NOT EXISTS profile_view_daily_profile_date_idx
  ON public.profile_view_daily (profile_id, view_date DESC);

ALTER TABLE public.profile_view_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_view_daily FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_view_daily TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_profile_view_daily()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.profile_view_daily
  WHERE view_date < public.game_utc_date() - 90;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_profile_view_daily() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_profile_view_daily() TO service_role;

CREATE OR REPLACE FUNCTION public.record_public_profile_view(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username text := lower(btrim(COALESCE(p_username, '')));
  v_profile_id uuid;
  v_enabled boolean := false;
  v_viewer_id uuid := auth.uid();
  v_today date := public.game_utc_date();
BEGIN
  IF v_username !~ '^[a-z0-9_]{1,20}$' THEN
    RETURN jsonb_build_object('success', true, 'recorded', false);
  END IF;

  SELECT p.id
  INTO v_profile_id
  FROM public.profiles p
  WHERE lower(p.username) = v_username
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'recorded', false);
  END IF;

  SELECT COALESCE(s.profile_insights_enabled, false)
  INTO v_enabled
  FROM public.profile_social_settings s
  WHERE s.user_id = v_profile_id;
  v_enabled := COALESCE(v_enabled, false);

  IF NOT v_enabled OR v_viewer_id = v_profile_id THEN
    RETURN jsonb_build_object('success', true, 'recorded', false);
  END IF;

  PERFORM public.cleanup_profile_view_daily();

  INSERT INTO public.profile_view_daily (profile_id, view_date, view_count)
  VALUES (v_profile_id, v_today, 1)
  ON CONFLICT (profile_id, view_date) DO UPDATE
  SET view_count = LEAST(public.profile_view_daily.view_count + 1, 1000000);

  RETURN jsonb_build_object('success', true, 'recorded', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_public_profile_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_public_profile_view(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile_insights(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_enabled boolean := false;
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 30), 7), 90);
  v_daily jsonb := '[]'::jsonb;
  v_total_views integer := 0;
  v_active_days integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT COALESCE(s.profile_insights_enabled, false)
  INTO v_enabled
  FROM public.profile_social_settings s
  WHERE s.user_id = v_user_id;
  v_enabled := COALESCE(v_enabled, false);

  IF v_enabled THEN
    SELECT
      COALESCE(sum(d.view_count), 0)::integer,
      count(*)::integer,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('date', d.view_date::text, 'views', d.view_count)
          ORDER BY d.view_date
        ),
        '[]'::jsonb
      )
    INTO v_total_views, v_active_days, v_daily
    FROM public.profile_view_daily d
    WHERE d.profile_id = v_user_id
      AND d.view_date >= public.game_utc_date() - v_days + 1
      AND d.view_date <= public.game_utc_date();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'enabled', v_enabled,
    'windowDays', v_days,
    'totalViews', v_total_views,
    'activeDays', v_active_days,
    'daily', v_daily
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_insights(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_insights(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_profile_insights_settings(p_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'settings', 20, 3600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settings updates are temporarily limited.');
  END IF;

  INSERT INTO public.profile_social_settings (user_id, profile_insights_enabled, updated_at)
  VALUES (v_user_id, COALESCE(p_enabled, false), now())
  ON CONFLICT (user_id) DO UPDATE
  SET profile_insights_enabled = EXCLUDED.profile_insights_enabled,
      updated_at = now();

  RETURN public.get_my_profile_insights(30);
END;
$function$;

REVOKE ALL ON FUNCTION public.update_my_profile_insights_settings(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile_insights_settings(boolean) TO authenticated;

DO $$
DECLARE
  v_job_id integer;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'chromadie_cleanup_profile_view_daily'
    LIMIT 1;

    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    PERFORM cron.schedule(
      'chromadie_cleanup_profile_view_daily',
      '15 3 * * *',
      'SELECT public.cleanup_profile_view_daily()'
    );
  END IF;
END
$$;

COMMIT;
