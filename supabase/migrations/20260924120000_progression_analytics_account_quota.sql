BEGIN;

-- The browser may report aggregate progression events, but one authenticated
-- account cannot inflate the shared staff dashboard without bound.
CREATE TABLE IF NOT EXISTS public.progression_analytics_user_daily_limit (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  event_count integer NOT NULL CHECK (event_count BETWEEN 1 AND 500),
  PRIMARY KEY (user_id, event_date)
);

CREATE INDEX IF NOT EXISTS progression_analytics_user_daily_limit_date_idx
  ON public.progression_analytics_user_daily_limit (event_date);

ALTER TABLE public.progression_analytics_user_daily_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.progression_analytics_user_daily_limit FROM PUBLIC, anon, authenticated, service_role;

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

  DELETE FROM public.profile_insight_visitor_daily
  WHERE insight_date < public.game_utc_date() - 90;

  DELETE FROM public.progression_analytics_daily
  WHERE event_date < public.game_utc_date() - 90;

  DELETE FROM public.progression_analytics_user_daily_limit
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
  v_surface text := lower(left(btrim(COALESCE(p_surface, '')), 48));
  v_account_mode text := lower(left(btrim(COALESCE(p_account_mode, '')), 48));
  v_rollout_stage text := lower(left(btrim(COALESCE(p_rollout_stage, '')), 48));
  v_track text := lower(left(btrim(COALESCE(p_track, '')), 48));
  v_count integer;
  v_user_id uuid := auth.uid();
  v_event_date date := public.game_utc_date();
  v_user_event_count integer;
BEGIN
  IF auth.role() NOT IN ('authenticated', 'service_role')
     OR (auth.role() = 'authenticated' AND v_user_id IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'authenticated_only');
  END IF;

  IF v_event_name NOT IN (
    'progression_viewed',
    'progression_roll_completed',
    'progression_goal_viewed',
    'progression_unlock_seen',
    'progression_unlock_presented',
    'progression_reward_previewed',
    'progression_reward_equipped',
    'progression_unlock_acknowledged',
    'progression_milestone_completed',
    'progression_cta_used',
    'progression_weekly_focus_viewed',
    'progression_weekly_focus_completed',
    'progression_share_started',
    'progression_claim_started'
  ) THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'invalid_event');
  END IF;

  IF v_account_mode NOT IN ('', 'authenticated')
    OR v_surface NOT IN ('', 'studio', 'progression', 'dedicated-roll', 'root-roll', 'roll')
    OR v_rollout_stage NOT IN ('', 'off', 'staff', 'internal', 'cohort', 'all')
    OR v_track NOT IN ('', 'rank', 'ritual', 'discovery')
  THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'invalid_dimensions');
  END IF;

  IF auth.role() = 'authenticated' THEN
    -- The primary-key conflict serializes concurrent writes for this account
    -- and UTC day; the conditional update makes the cap race-safe.
    INSERT INTO public.progression_analytics_user_daily_limit (user_id, event_date, event_count)
    VALUES (v_user_id, v_event_date, 1)
    ON CONFLICT (user_id, event_date) DO UPDATE
      SET event_count = public.progression_analytics_user_daily_limit.event_count + 1
      WHERE public.progression_analytics_user_daily_limit.event_count < 500
    RETURNING event_count INTO v_user_event_count;

    IF v_user_event_count IS NULL THEN
      RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'rate_limited');
    END IF;
  END IF;

  -- Retention is owned by the scheduled cleanup boundary. Never make an
  -- analytics write perform a table-wide delete on the gameplay hot path.
  INSERT INTO public.progression_analytics_daily (
    event_date, event_name, surface, account_mode, rollout_stage, track, event_count
  ) VALUES (
    v_event_date, v_event_name, v_surface, v_account_mode, v_rollout_stage, v_track, 1
  )
  ON CONFLICT (event_date, event_name, surface, account_mode, rollout_stage, track)
  DO UPDATE SET event_count = LEAST(public.progression_analytics_daily.event_count + 1, 1000000)
  RETURNING event_count INTO v_count;

  RETURN jsonb_build_object('success', true, 'recorded', true, 'count', v_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_progression_event(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_progression_event(text, text, text, text, text) TO authenticated, service_role;

COMMIT;
