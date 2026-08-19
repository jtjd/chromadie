-- Consent-gated, aggregate-only measurement for the progression journey.
-- No raw event rows, account ids, scores, HEX values, or timestamps are kept.
BEGIN;

CREATE TABLE IF NOT EXISTS public.progression_analytics_daily (
  event_date date NOT NULL DEFAULT public.game_utc_date(),
  event_name text NOT NULL,
  surface text NOT NULL DEFAULT '',
  account_mode text NOT NULL DEFAULT '',
  rollout_stage text NOT NULL DEFAULT '',
  track text NOT NULL DEFAULT '',
  event_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (event_date, event_name, surface, account_mode, rollout_stage, track),
  CONSTRAINT progression_analytics_daily_event_name_check CHECK (
    event_name IN (
      'progression_viewed',
      'progression_roll_completed',
      'progression_unlock_seen',
      'progression_weekly_focus_viewed',
      'progression_weekly_focus_completed',
      'progression_share_started',
      'progression_claim_started'
    )
  ),
  CONSTRAINT progression_analytics_daily_surface_check CHECK (
    surface IN ('', 'studio', 'dedicated-roll', 'root-roll', 'roll')
  ),
  CONSTRAINT progression_analytics_daily_account_mode_check CHECK (account_mode IN ('', 'guest', 'authenticated')),
  CONSTRAINT progression_analytics_daily_rollout_check CHECK (rollout_stage IN ('', 'off', 'staff', 'internal', 'cohort', 'all')),
  CONSTRAINT progression_analytics_daily_track_check CHECK (track IN ('', 'rank', 'ritual', 'discovery')),
  CONSTRAINT progression_analytics_daily_count_check CHECK (event_count BETWEEN 0 AND 1000000)
);

CREATE INDEX IF NOT EXISTS progression_analytics_daily_date_idx
  ON public.progression_analytics_daily (event_date DESC, event_name);

ALTER TABLE public.progression_analytics_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.progression_analytics_daily FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.progression_analytics_daily TO service_role;

-- Keep the existing profile-insights cleanup boundary authoritative for all
-- bounded daily aggregates. The scheduled job already runs once per day.
CREATE OR REPLACE FUNCTION public.cleanup_profile_view_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.profile_view_daily
  WHERE view_date < public.game_utc_date() - 90;

  DELETE FROM public.profile_insight_daily
  WHERE insight_date < public.game_utc_date() - 90;

  DELETE FROM public.progression_analytics_daily
  WHERE event_date < public.game_utc_date() - 90;
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_profile_view_daily() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_profile_view_daily() TO service_role;

CREATE OR REPLACE FUNCTION public.record_progression_event(
  p_event_name text,
  p_surface text DEFAULT '',
  p_account_mode text DEFAULT '',
  p_rollout_stage text DEFAULT '',
  p_track text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_name text := lower(btrim(COALESCE(p_event_name, '')));
  v_surface text := left(btrim(COALESCE(p_surface, '')), 48);
  v_account_mode text := lower(left(btrim(COALESCE(p_account_mode, '')), 48));
  v_rollout_stage text := lower(left(btrim(COALESCE(p_rollout_stage, '')), 48));
  v_track text := lower(left(btrim(COALESCE(p_track, '')), 48));
  v_count integer;
BEGIN
  IF v_event_name NOT IN (
    'progression_viewed',
    'progression_roll_completed',
    'progression_unlock_seen',
    'progression_weekly_focus_viewed',
    'progression_weekly_focus_completed',
    'progression_share_started',
    'progression_claim_started'
  ) THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'invalid_event');
  END IF;

  IF v_account_mode NOT IN ('', 'guest', 'authenticated')
    OR v_surface NOT IN ('', 'studio', 'dedicated-roll', 'root-roll', 'roll')
    OR v_rollout_stage NOT IN ('', 'off', 'staff', 'internal', 'cohort', 'all')
    OR v_track NOT IN ('', 'rank', 'ritual', 'discovery')
    OR (v_event_name = 'progression_unlock_seen' AND v_track = '')
  THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'invalid_dimensions');
  END IF;

  PERFORM public.cleanup_profile_view_daily();

  INSERT INTO public.progression_analytics_daily (
    event_date, event_name, surface, account_mode, rollout_stage, track, event_count
  ) VALUES (
    public.game_utc_date(), v_event_name, v_surface, v_account_mode, v_rollout_stage, v_track, 1
  )
  ON CONFLICT (event_date, event_name, surface, account_mode, rollout_stage, track)
  DO UPDATE SET event_count = LEAST(public.progression_analytics_daily.event_count + 1, 1000000)
  RETURNING event_count INTO v_count;

  RETURN jsonb_build_object('success', true, 'recorded', true, 'count', v_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_progression_event(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_progression_event(text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_progression_analytics(p_days integer DEFAULT 30)
RETURNS TABLE (
  event_date date,
  event_name text,
  surface text,
  account_mode text,
  rollout_stage text,
  track text,
  event_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer := LEAST(90, GREATEST(1, COALESCE(p_days, 30)));
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND COALESCE(is_staff, false)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT d.event_date, d.event_name, d.surface, d.account_mode,
    d.rollout_stage, d.track, d.event_count
  FROM public.progression_analytics_daily d
  WHERE d.event_date >= public.game_utc_date() - v_days + 1
    AND d.event_date <= public.game_utc_date()
  ORDER BY d.event_date DESC, d.event_name, d.surface, d.account_mode, d.rollout_stage, d.track;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_progression_analytics(integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_progression_analytics(integer) TO authenticated, service_role;

COMMIT;
