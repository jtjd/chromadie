BEGIN;

-- Different visitor digests use distinct locks, so they must converge on a
-- shared profile/day lock before reading and enforcing the 500-dimension cap.
CREATE OR REPLACE FUNCTION public.record_profile_insight_from_edge(
  p_username text,
  p_metric text,
  p_entry_key text,
  p_device_class text,
  p_country_code text,
  p_referrer_host text,
  p_visitor_digest text,
  p_viewer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_metric text := lower(btrim(coalesce(p_metric, '')));
  v_entry_key text := lower(btrim(coalesce(p_entry_key, '')));
  v_device text := lower(btrim(coalesce(p_device_class, '')));
  v_country text := upper(btrim(coalesce(p_country_code, '')));
  v_referrer text := lower(btrim(coalesce(p_referrer_host, '')));
  v_digest text := lower(btrim(coalesce(p_visitor_digest, '')));
  v_profile_id uuid;
  v_today date := public.game_utc_date();
  v_existing_count integer;
  v_dimension_count integer;
  v_visitor_event_count integer;
  v_inserted boolean := false;
BEGIN
  IF v_username !~ '^[a-z0-9_]{1,20}$' OR v_metric NOT IN ('view', 'click') THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'invalid_event');
  END IF;

  IF v_metric = 'view' THEN
    v_entry_key := '';
  ELSIF v_entry_key !~ '^[a-z0-9][a-z0-9_-]{0,31}$' THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'invalid_entry');
  END IF;

  IF v_digest !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'invalid_visitor');
  END IF;
  IF v_device NOT IN ('mobile', 'tablet', 'desktop') THEN v_device := 'unknown'; END IF;
  IF v_country !~ '^[A-Z]{2}$' THEN v_country := 'ZZ'; END IF;
  IF v_referrer = '' OR v_referrer !~ '^[a-z0-9][a-z0-9.-]{0,78}[a-z0-9]$' THEN
    v_referrer := 'direct';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE lower(p.username) = v_username
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'profile_not_found');
  END IF;
  IF p_viewer_id = v_profile_id THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'owner_view');
  END IF;
  IF NOT COALESCE((
    SELECT s.profile_insights_enabled
    FROM public.profile_social_settings s
    WHERE s.user_id = v_profile_id
  ), false) THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'insights_disabled');
  END IF;

  IF v_metric = 'click'
     AND NOT public.profile_insight_entry_is_published(v_profile_id, v_entry_key) THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'invalid_entry');
  END IF;

  -- Serialize events for one opaque visitor/day before checking the fan-out
  -- ceiling. Without this transaction lock, parallel requests could all read
  -- the same pre-limit count and collectively exceed the abuse boundary.
  PERFORM pg_advisory_xact_lock(hashtext(v_digest), hashtext(v_today::text));

  -- The edge-derived digest limits a source to one hundred distinct
  -- profile/metric/entry events per UTC day, even when it targets many
  -- profiles. An existing key is still allowed through to return an honest
  -- deduplication result instead of turning retries into a side channel.
  SELECT count(*) INTO v_visitor_event_count
  FROM public.profile_insight_visitor_daily d
  WHERE d.visitor_digest = v_digest AND d.insight_date = v_today;
  IF v_visitor_event_count >= 100 AND NOT EXISTS (
    SELECT 1
    FROM public.profile_insight_visitor_daily d
    WHERE d.profile_id = v_profile_id
      AND d.insight_date = v_today
      AND d.metric = v_metric
      AND d.entry_key = v_entry_key
      AND d.visitor_digest = v_digest
  ) THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'visitor_rate_limited');
  END IF;

  INSERT INTO public.profile_insight_visitor_daily (
    profile_id, insight_date, metric, entry_key, visitor_digest
  ) VALUES (
    v_profile_id, v_today, v_metric, v_entry_key, v_digest
  )
  ON CONFLICT DO NOTHING
  RETURNING true INTO v_inserted;

  IF NOT COALESCE(v_inserted, false) THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'already_recorded');
  END IF;

  -- Keep the dimensional aggregate bounded even though dimensions are now
  -- edge-derived. The visitor suppression insert happened first so rejected
  -- dimension combinations cannot be retried indefinitely.
  -- Serialize all dimensions for this profile/day before checking the shared cap.
  -- Visitor locks above only serialize requests from the same opaque source.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'profile-insight-dimensions:' || v_profile_id::text || ':' || v_today::text,
    0
  ));

  SELECT count(*) INTO v_dimension_count
  FROM public.profile_insight_daily d
  WHERE d.profile_id = v_profile_id AND d.insight_date = v_today;
  IF v_dimension_count >= 500 AND NOT EXISTS (
    SELECT 1
    FROM public.profile_insight_daily d
    WHERE d.profile_id = v_profile_id
      AND d.insight_date = v_today
      AND d.metric = v_metric
      AND d.entry_key = v_entry_key
      AND d.device_class = v_device
      AND d.country_code = v_country
      AND d.referrer_host = v_referrer
  ) THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'dimension_limit');
  END IF;

  INSERT INTO public.profile_insight_daily (
    profile_id, insight_date, metric, entry_key, device_class,
    country_code, referrer_host, event_count
  ) VALUES (
    v_profile_id, v_today, v_metric, v_entry_key, v_device,
    v_country, v_referrer, 1
  )
  ON CONFLICT (
    profile_id, insight_date, metric, entry_key, device_class,
    country_code, referrer_host
  ) DO UPDATE
  SET event_count = LEAST(public.profile_insight_daily.event_count + 1, 1000000);

  IF v_metric = 'view' THEN
    INSERT INTO public.profile_view_daily (profile_id, view_date, view_count)
    VALUES (v_profile_id, v_today, 1)
    ON CONFLICT (profile_id, view_date) DO UPDATE
    SET view_count = LEAST(public.profile_view_daily.view_count + 1, 1000000);
  END IF;

  SELECT d.event_count INTO v_existing_count
  FROM public.profile_insight_daily d
  WHERE d.profile_id = v_profile_id
    AND d.insight_date = v_today
    AND d.metric = v_metric
    AND d.entry_key = v_entry_key
    AND d.device_class = v_device
    AND d.country_code = v_country
    AND d.referrer_host = v_referrer;

  RETURN jsonb_build_object('success', true, 'recorded', true, 'count', v_existing_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_profile_insight_from_edge(text, text, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_insight_from_edge(text, text, text, text, text, text, text, uuid) TO service_role;

COMMIT;
