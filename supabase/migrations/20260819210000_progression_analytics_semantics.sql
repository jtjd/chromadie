-- Keep progression analytics aggregate-only without doing retention work on
-- every browser event.  Cleanup remains owned by the scheduled maintenance
-- boundary in cleanup_profile_view_daily().
BEGIN;

ALTER TABLE public.progression_analytics_daily
  DROP CONSTRAINT IF EXISTS progression_analytics_daily_event_name_check;

ALTER TABLE public.progression_analytics_daily
  ADD CONSTRAINT progression_analytics_daily_event_name_check CHECK (
    event_name IN (
      'progression_viewed',
      'progression_roll_completed',
      'progression_goal_viewed',
      'progression_unlock_seen',
      'progression_weekly_focus_viewed',
      'progression_weekly_focus_completed',
      'progression_share_started',
      'progression_claim_started'
    )
  );

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
    'progression_goal_viewed',
    'progression_unlock_seen',
    'progression_weekly_focus_viewed',
    'progression_weekly_focus_completed',
    'progression_share_started',
    'progression_claim_started'
  ) THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'invalid_event');
  END IF;

  IF v_account_mode NOT IN ('', 'guest', 'authenticated')
    OR v_surface NOT IN ('', 'studio', 'progression', 'dedicated-roll', 'root-roll', 'roll')
    OR v_rollout_stage NOT IN ('', 'off', 'staff', 'internal', 'cohort', 'all')
    OR v_track NOT IN ('', 'rank', 'ritual', 'discovery')
    OR (v_event_name IN ('progression_goal_viewed', 'progression_unlock_seen') AND v_track = '')
    OR (auth.role() = 'anon' AND v_account_mode NOT IN ('', 'guest'))
    OR (auth.role() = 'authenticated' AND v_account_mode NOT IN ('', 'authenticated'))
  THEN
    RETURN jsonb_build_object('success', false, 'recorded', false, 'reason', 'invalid_dimensions');
  END IF;

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

COMMIT;
