-- Competitor parity M12: privacy-safe insight dimensions and moderated social depth.
--
-- This migration is additive. Browser roles continue to use bounded RPCs only;
-- aggregate/event tables remain service-owned behind RLS. No viewer identity,
-- IP address, raw user agent, exact timestamp, or complete referrer is stored.

BEGIN;

ALTER TABLE public.profile_social_settings
  ADD COLUMN IF NOT EXISTS profile_views_visible boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.profile_insight_daily (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  insight_date date NOT NULL,
  metric text NOT NULL,
  entry_key text NOT NULL DEFAULT '',
  device_class text NOT NULL DEFAULT 'unknown',
  country_code text NOT NULL DEFAULT 'ZZ',
  referrer_host text NOT NULL DEFAULT 'direct',
  event_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (
    profile_id,
    insight_date,
    metric,
    entry_key,
    device_class,
    country_code,
    referrer_host
  ),
  CONSTRAINT profile_insight_metric_check CHECK (metric IN ('view', 'click')),
  CONSTRAINT profile_insight_entry_key_check CHECK (
    (metric = 'view' AND entry_key = '')
    OR (metric = 'click' AND entry_key ~ '^[a-z0-9][a-z0-9_-]{0,31}$')
  ),
  CONSTRAINT profile_insight_device_check CHECK (device_class IN ('mobile', 'tablet', 'desktop', 'unknown')),
  CONSTRAINT profile_insight_country_check CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT profile_insight_referrer_check CHECK (
    referrer_host ~ '^(direct|[a-z0-9][a-z0-9.-]{0,78}[a-z0-9])$'
  ),
  CONSTRAINT profile_insight_count_check CHECK (event_count BETWEEN 0 AND 1000000)
);

CREATE INDEX IF NOT EXISTS profile_insight_daily_profile_date_idx
  ON public.profile_insight_daily (profile_id, insight_date DESC, metric);

CREATE INDEX IF NOT EXISTS profile_insight_daily_click_key_idx
  ON public.profile_insight_daily (profile_id, metric, entry_key, insight_date DESC);

ALTER TABLE public.profile_insight_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_insight_daily FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_insight_daily TO service_role;

-- Backfill the existing view aggregate into the dimensional table using an
-- explicit unknown/direct bucket. Future records update both tables so old
-- clients and new insight readers remain compatible during rollout.
INSERT INTO public.profile_insight_daily (
  profile_id, insight_date, metric, entry_key, device_class,
  country_code, referrer_host, event_count
)
SELECT profile_id, view_date, 'view', '', 'unknown', 'ZZ', 'direct', view_count
FROM public.profile_view_daily
ON CONFLICT (
  profile_id, insight_date, metric, entry_key, device_class,
  country_code, referrer_host
) DO UPDATE SET event_count = GREATEST(
  public.profile_insight_daily.event_count,
  EXCLUDED.event_count
);

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
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_profile_view_daily() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_profile_view_daily() TO service_role;

CREATE OR REPLACE FUNCTION public.record_profile_insight(
  p_username text,
  p_metric text,
  p_entry_key text,
  p_device_class text,
  p_country_code text,
  p_referrer_host text
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
  v_profile_id uuid;
  v_viewer_id uuid := auth.uid();
  v_today date := public.game_utc_date();
  v_existing_count integer;
  v_dimension_count integer;
BEGIN
  IF v_username !~ '^[a-z0-9_]{1,20}$' OR v_metric NOT IN ('view', 'click') THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'invalid_event');
  END IF;

  IF v_metric = 'view' THEN
    v_entry_key := '';
  ELSIF v_entry_key !~ '^[a-z0-9][a-z0-9_-]{0,31}$' THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'invalid_entry');
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

  IF v_viewer_id = v_profile_id THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'owner_view');
  END IF;

  IF NOT COALESCE((
    SELECT s.profile_insights_enabled
    FROM public.profile_social_settings s
    WHERE s.user_id = v_profile_id
  ), false) THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'insights_disabled');
  END IF;

  -- Keep one profile/day below a bounded dimensional cardinality even if a
  -- caller sends many fabricated dimension combinations.
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

  PERFORM public.cleanup_profile_view_daily();

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

CREATE OR REPLACE FUNCTION public.record_public_profile_view(p_username text)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.record_profile_insight(
    p_username, 'view', '', 'unknown', 'ZZ', 'direct'
  );
$function$;

REVOKE ALL ON FUNCTION public.record_profile_insight(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_insight(text, text, text, text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.record_public_profile_view(text) FROM PUBLIC, anon, authenticated;
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
  v_today date := public.game_utc_date();
  v_start date;
  v_prior_start date;
  v_total_views integer := 0;
  v_total_clicks integer := 0;
  v_prior_views integer := 0;
  v_prior_clicks integer := 0;
  v_active_days integer := 0;
  v_daily jsonb := '[]'::jsonb;
  v_devices jsonb := '[]'::jsonb;
  v_countries jsonb := '[]'::jsonb;
  v_referrers jsonb := '[]'::jsonb;
  v_top_clicks jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT COALESCE(s.profile_insights_enabled, false)
  INTO v_enabled
  FROM public.profile_social_settings s
  WHERE s.user_id = v_user_id;

  v_start := v_today - v_days + 1;
  v_prior_start := v_today - (v_days * 2) + 1;

  IF v_enabled THEN
    SELECT
      COALESCE(sum(d.event_count) FILTER (WHERE d.metric = 'view' AND d.insight_date >= v_start), 0)::integer,
      COALESCE(sum(d.event_count) FILTER (WHERE d.metric = 'click' AND d.insight_date >= v_start), 0)::integer,
      COALESCE(sum(d.event_count) FILTER (WHERE d.metric = 'view' AND d.insight_date < v_start), 0)::integer,
      COALESCE(sum(d.event_count) FILTER (WHERE d.metric = 'click' AND d.insight_date < v_start), 0)::integer
    INTO v_total_views, v_total_clicks, v_prior_views, v_prior_clicks
    FROM public.profile_insight_daily d
    WHERE d.profile_id = v_user_id
      AND d.insight_date BETWEEN v_prior_start AND v_today;

    SELECT count(*) INTO v_active_days
    FROM (
      SELECT d.insight_date
      FROM public.profile_insight_daily d
      WHERE d.profile_id = v_user_id
        AND d.metric = 'view'
        AND d.insight_date BETWEEN v_start AND v_today
        AND d.event_count > 0
      GROUP BY d.insight_date
    ) active;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', day::text,
      'views', COALESCE(v.views, 0),
      'clicks', COALESCE(v.clicks, 0)
    ) ORDER BY day), '[]'::jsonb)
    INTO v_daily
    FROM generate_series(v_start, v_today, interval '1 day') days(day)
    LEFT JOIN LATERAL (
      SELECT
        sum(d.event_count) FILTER (WHERE d.metric = 'view')::integer AS views,
        sum(d.event_count) FILTER (WHERE d.metric = 'click')::integer AS clicks
      FROM public.profile_insight_daily d
      WHERE d.profile_id = v_user_id AND d.insight_date = day
    ) v ON true;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('device', device_class, 'count', total) ORDER BY total DESC, device_class), '[]'::jsonb)
    INTO v_devices
    FROM (
      SELECT d.device_class, sum(d.event_count)::integer AS total
      FROM public.profile_insight_daily d
      WHERE d.profile_id = v_user_id AND d.insight_date BETWEEN v_start AND v_today
      GROUP BY d.device_class
      ORDER BY total DESC, d.device_class
      LIMIT 5
    ) device_rows;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country_code, 'count', total) ORDER BY total DESC, country_code), '[]'::jsonb)
    INTO v_countries
    FROM (
      SELECT d.country_code, sum(d.event_count)::integer AS total
      FROM public.profile_insight_daily d
      WHERE d.profile_id = v_user_id AND d.insight_date BETWEEN v_start AND v_today
      GROUP BY d.country_code
      ORDER BY total DESC, d.country_code
      LIMIT 10
    ) country_rows;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('host', referrer_host, 'count', total) ORDER BY total DESC, referrer_host), '[]'::jsonb)
    INTO v_referrers
    FROM (
      SELECT d.referrer_host, sum(d.event_count)::integer AS total
      FROM public.profile_insight_daily d
      WHERE d.profile_id = v_user_id AND d.insight_date BETWEEN v_start AND v_today
      GROUP BY d.referrer_host
      ORDER BY total DESC, d.referrer_host
      LIMIT 10
    ) referrer_rows;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('entryKey', entry_key, 'clicks', total) ORDER BY total DESC, entry_key), '[]'::jsonb)
    INTO v_top_clicks
    FROM (
      SELECT d.entry_key, sum(d.event_count)::integer AS total
      FROM public.profile_insight_daily d
      WHERE d.profile_id = v_user_id
        AND d.metric = 'click'
        AND d.insight_date BETWEEN v_start AND v_today
      GROUP BY d.entry_key
      ORDER BY total DESC, d.entry_key
      LIMIT 20
    ) click_rows;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'enabled', v_enabled,
    'windowDays', v_days,
    'totalViews', v_total_views,
    'totalClicks', v_total_clicks,
    'activeDays', v_active_days,
    'daily', v_daily,
    'devices', v_devices,
    'countries', v_countries,
    'referrers', v_referrers,
    'topClicks', v_top_clicks,
    'comparison', jsonb_build_object(
      'views', jsonb_build_object('current', v_total_views, 'previous', v_prior_views),
      'clicks', jsonb_build_object('current', v_total_clicks, 'previous', v_prior_clicks)
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_insights(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_insights(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_profile_view_visibility(p_visible boolean)
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
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'settings', 20, 3600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settings updates are temporarily limited.');
  END IF;
  INSERT INTO public.profile_social_settings (user_id, profile_views_visible, updated_at)
  VALUES (v_user_id, COALESCE(p_visible, true), now())
  ON CONFLICT (user_id) DO UPDATE
  SET profile_views_visible = EXCLUDED.profile_views_visible, updated_at = now();
  RETURN public.get_my_profile_social_settings();
END;
$function$;

REVOKE ALL ON FUNCTION public.update_my_profile_view_visibility(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile_view_visibility(boolean) TO authenticated;

CREATE TABLE IF NOT EXISTS public.profile_guestbook_replies (
  reply_key uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  entry_key uuid NOT NULL REFERENCES public.profile_guestbook_entries(entry_key) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_guestbook_reply_status_check CHECK (status IN ('visible', 'hidden', 'removed')),
  CONSTRAINT profile_guestbook_reply_body_check CHECK (
    char_length(btrim(body)) BETWEEN 1 AND 240
    AND body !~ '[[:cntrl:]]'
    AND body !~* '(https?://|www[.]|[[:alnum:]_-]+[.][[:alpha:]]{2,})'
  )
);

CREATE INDEX IF NOT EXISTS profile_guestbook_replies_entry_idx
  ON public.profile_guestbook_replies (entry_key, status, created_at ASC, reply_key ASC);

CREATE INDEX IF NOT EXISTS profile_guestbook_replies_profile_idx
  ON public.profile_guestbook_replies (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.profile_guestbook_likes (
  liker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_key uuid NOT NULL REFERENCES public.profile_guestbook_entries(entry_key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (liker_id, entry_key)
);

CREATE INDEX IF NOT EXISTS profile_guestbook_likes_entry_idx
  ON public.profile_guestbook_likes (entry_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.profile_guestbook_pins (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_key uuid NOT NULL REFERENCES public.profile_guestbook_entries(entry_key) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, entry_key)
);

CREATE INDEX IF NOT EXISTS profile_guestbook_pins_profile_idx
  ON public.profile_guestbook_pins (profile_id, pinned_at DESC);

ALTER TABLE public.profile_reports
  ADD COLUMN IF NOT EXISTS reply_key uuid REFERENCES public.profile_guestbook_replies(reply_key) ON DELETE SET NULL;

ALTER TABLE public.profile_reports
  DROP CONSTRAINT IF EXISTS profile_reports_target_check;
ALTER TABLE public.profile_reports
  ADD CONSTRAINT profile_reports_target_check CHECK (NOT (entry_key IS NOT NULL AND reply_key IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS profile_reports_reply_unique
  ON public.profile_reports (reporter_id, target_profile_id, reply_key, reason)
  WHERE reply_key IS NOT NULL;

ALTER TABLE public.profile_guestbook_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_guestbook_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_guestbook_pins ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profile_guestbook_replies,
  public.profile_guestbook_likes,
  public.profile_guestbook_pins
FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_guestbook_replies,
  public.profile_guestbook_likes,
  public.profile_guestbook_pins
TO service_role;

CREATE TABLE IF NOT EXISTS public.profile_notifications (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_key uuid REFERENCES public.profile_guestbook_entries(entry_key) ON DELETE CASCADE,
  reply_key uuid REFERENCES public.profile_guestbook_replies(reply_key) ON DELETE CASCADE,
  event_key text NOT NULL,
  aggregate_key text NOT NULL,
  event_count integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_notification_type_check CHECK (
    notification_type IN ('favorite', 'reaction', 'guestbook', 'reply', 'guestbook_like', 'reward')
  ),
  CONSTRAINT profile_notification_event_key_check CHECK (event_key ~ '^[a-z0-9:_-]{1,160}$'),
  CONSTRAINT profile_notification_aggregate_key_check CHECK (aggregate_key ~ '^[a-z0-9:_-]{1,160}$'),
  CONSTRAINT profile_notification_count_check CHECK (event_count BETWEEN 1 AND 1000),
  CONSTRAINT profile_notification_payload_check CHECK (jsonb_typeof(payload) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_notifications_event_unique
  ON public.profile_notifications (user_id, event_key);

CREATE INDEX IF NOT EXISTS profile_notifications_user_updated_idx
  ON public.profile_notifications (user_id, updated_at DESC, id DESC);

ALTER TABLE public.profile_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_notifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.queue_profile_notification(
  p_user_id uuid,
  p_type text,
  p_actor_id uuid,
  p_profile_id uuid,
  p_entry_key uuid,
  p_reply_key uuid,
  p_event_key text,
  p_aggregate_key text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_now timestamptz := now();
  v_event_key text := left(lower(btrim(coalesce(p_event_key, ''))), 160);
  v_aggregate_key text := left(lower(btrim(coalesce(p_aggregate_key, ''))), 160);
BEGIN
  IF p_user_id IS NULL
     OR p_type NOT IN ('favorite', 'reaction', 'guestbook', 'reply', 'guestbook_like', 'reward')
     OR v_event_key !~ '^[a-z0-9:_-]{1,160}$'
     OR v_aggregate_key !~ '^[a-z0-9:_-]{1,160}$'
     OR p_user_id = p_actor_id THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || v_aggregate_key), 9381);

  IF EXISTS (
    SELECT 1 FROM public.profile_notifications n
    WHERE n.user_id = p_user_id AND n.event_key = v_event_key
  ) THEN
    RETURN;
  END IF;

  SELECT n.id INTO v_existing_id
  FROM public.profile_notifications n
  WHERE n.user_id = p_user_id
    AND n.aggregate_key = v_aggregate_key
    AND n.updated_at >= v_now - interval '1 day'
  ORDER BY n.updated_at DESC, n.id DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.profile_notifications
    SET event_count = LEAST(event_count + 1, 1000),
        actor_id = p_actor_id,
        profile_id = COALESCE(p_profile_id, profile_id),
        entry_key = COALESCE(p_entry_key, entry_key),
        reply_key = COALESCE(p_reply_key, reply_key),
        payload = CASE WHEN jsonb_typeof(p_payload) = 'object' THEN p_payload ELSE '{}'::jsonb END,
        read_at = NULL,
        updated_at = v_now
    WHERE id = v_existing_id;
    RETURN;
  END IF;

  INSERT INTO public.profile_notifications (
    user_id, notification_type, actor_id, profile_id, entry_key, reply_key,
    event_key, aggregate_key, payload, created_at, updated_at
  ) VALUES (
    p_user_id, p_type, p_actor_id, p_profile_id, p_entry_key, p_reply_key,
    v_event_key, v_aggregate_key,
    CASE WHEN jsonb_typeof(p_payload) = 'object' THEN p_payload ELSE '{}'::jsonb END,
    v_now, v_now
  ) ON CONFLICT (user_id, event_key) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.queue_profile_notification(uuid, text, uuid, uuid, uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_profile_notifications(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50);
  v_notifications jsonb;
  v_unread integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT count(*)::integer INTO v_unread
  FROM public.profile_notifications n
  WHERE n.user_id = v_user_id AND n.read_at IS NULL;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', n.id,
    'type', n.notification_type,
    'actor', actor.username,
    'eventCount', n.event_count,
    'payload', n.payload,
    'entryKey', n.entry_key,
    'replyKey', n.reply_key,
    'readAt', n.read_at,
    'createdAt', n.created_at,
    'updatedAt', n.updated_at
  ) ORDER BY n.updated_at DESC, n.id DESC), '[]'::jsonb)
  INTO v_notifications
  FROM (
    SELECT n.*
    FROM public.profile_notifications n
    WHERE n.user_id = v_user_id
    ORDER BY n.updated_at DESC, n.id DESC
    LIMIT v_limit
  ) n
  LEFT JOIN public.profiles actor ON actor.id = n.actor_id;

  RETURN jsonb_build_object(
    'success', true,
    'unreadCount', v_unread,
    'notifications', v_notifications
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_my_profile_notifications_read(p_notification_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_notification_ids IS NULL THEN
    UPDATE public.profile_notifications
    SET read_at = COALESCE(read_at, now()), updated_at = updated_at
    WHERE user_id = v_user_id AND read_at IS NULL;
  ELSE
    UPDATE public.profile_notifications
    SET read_at = COALESCE(read_at, now()), updated_at = updated_at
    WHERE user_id = v_user_id
      AND id = ANY(p_notification_ids[1:50])
      AND read_at IS NULL;
  END IF;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_notifications(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_my_profile_notifications_read(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_notifications(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_profile_notifications_read(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_progression_milestone_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_milestone record;
BEGIN
  SELECT m.id, m.name, m.description, m.reward_item_key, i.name AS reward_name
  INTO v_milestone
  FROM public.progression_milestones m
  LEFT JOIN public.shop_items i ON i.item_key = m.reward_item_key
  WHERE m.id = NEW.milestone_id;

  PERFORM public.queue_profile_notification(
    NEW.user_id,
    'reward',
    NULL,
    NEW.user_id,
    NULL,
    NULL,
    'reward:milestone:' || NEW.milestone_id,
    'reward:milestone:' || NEW.milestone_id,
    jsonb_build_object(
      'rewardKind', 'progression_milestone',
      'milestoneId', NEW.milestone_id,
      'name', COALESCE(v_milestone.name, NEW.milestone_id),
      'description', COALESCE(v_milestone.description, ''),
      'rewardName', COALESCE(v_milestone.reward_name, v_milestone.reward_item_key, '')
    )
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_achievement_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_achievement record;
BEGIN
  SELECT a.id, a.name, a.description, a.icon
  INTO v_achievement
  FROM public.achievements a
  WHERE a.id = NEW.achievement_id;

  PERFORM public.queue_profile_notification(
    NEW.user_id,
    'reward',
    NULL,
    NEW.user_id,
    NULL,
    NULL,
    'reward:achievement:' || NEW.achievement_id,
    'reward:achievement:' || NEW.achievement_id,
    jsonb_build_object(
      'rewardKind', 'achievement',
      'achievementId', NEW.achievement_id,
      'name', COALESCE(v_achievement.name, NEW.achievement_id),
      'description', COALESCE(v_achievement.description, ''),
      'icon', COALESCE(v_achievement.icon, '✦')
    )
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profile_progression_notification ON public.user_progression_milestones;
CREATE TRIGGER profile_progression_notification
  AFTER INSERT ON public.user_progression_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_progression_milestone_unlock();

DROP TRIGGER IF EXISTS profile_achievement_notification ON public.user_achievements;
CREATE TRIGGER profile_achievement_notification
  AFTER INSERT ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_achievement_unlock();

REVOKE ALL ON FUNCTION public.notify_progression_milestone_unlock() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notify_achievement_unlock() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_profile_social_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings public.profile_social_settings;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_settings
  FROM public.profile_social_settings
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'settings', jsonb_build_object(
      'interactionsEnabled', COALESCE(v_settings.interactions_enabled, true),
      'guestbookEnabled', COALESCE(v_settings.guestbook_enabled, true),
      'activityVisible', COALESCE(v_settings.activity_visible, true),
      'discoverable', COALESCE(v_settings.discoverable, true),
      'socialSummaryVisible', COALESCE(v_settings.social_summary_visible, true),
      'profileViewsVisible', COALESCE(v_settings.profile_views_visible, true)
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_social(
  p_user_id uuid,
  p_sort text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_viewer_id uuid := auth.uid();
  v_settings public.profile_social_settings;
  v_blocked boolean := false;
  v_guestbook jsonb;
  v_summary_visible boolean;
  v_views_visible boolean;
  v_sort text := CASE lower(btrim(coalesce(p_sort, '')))
    WHEN 'popular' THEN 'popular'
    WHEN 'oldest' THEN 'oldest'
    ELSE 'newest'
  END;
  v_public_views integer := 0;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT * INTO v_settings
  FROM public.profile_social_settings
  WHERE user_id = p_user_id;

  v_summary_visible := COALESCE(v_settings.social_summary_visible, true);
  v_views_visible := COALESCE(v_settings.profile_views_visible, true);

  IF v_viewer_id IS NOT NULL AND v_viewer_id <> p_user_id THEN
    v_blocked := public.is_profile_blocked(v_viewer_id, p_user_id);
  END IF;

  IF v_views_visible THEN
    SELECT COALESCE(sum(view_count), 0)::integer INTO v_public_views
    FROM public.profile_view_daily
    WHERE profile_id = p_user_id;
  END IF;

  IF v_blocked THEN
    RETURN jsonb_build_object(
      'success', true,
      'blocked', true,
      'interactionsEnabled', false,
      'guestbookEnabled', false,
      'activityVisible', false,
      'socialSummaryVisible', false,
      'profileViewsVisible', false,
      'publicViewCount', 0,
      'favoriteCount', 0,
      'reactionCounts', jsonb_build_object('spark', 0, 'glow', 0, 'cheer', 0),
      'viewerFavorited', false,
      'viewerReactions', '[]'::jsonb,
      'guestbook', '[]'::jsonb
    );
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'entryKey', e.entry_key,
      'author', author.username,
      'body', e.body,
      'createdAt', e.created_at,
      'canDelete', v_viewer_id IS NOT NULL
        AND (e.author_id = v_viewer_id OR p_user_id = v_viewer_id),
      'isPinned', e.is_pinned,
      'likeCount', CASE WHEN v_summary_visible THEN e.like_count ELSE 0 END,
      'viewerLiked', v_viewer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profile_guestbook_likes l
        WHERE l.liker_id = v_viewer_id AND l.entry_key = e.entry_key
      ),
      'replies', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'replyKey', r.reply_key,
          'author', reply_author.username,
          'body', r.body,
          'createdAt', r.created_at,
          'canDelete', v_viewer_id IS NOT NULL
            AND (r.author_id = v_viewer_id OR p_user_id = v_viewer_id)
        ) ORDER BY r.created_at ASC, r.reply_key ASC)
        FROM (
          SELECT r.*
          FROM public.profile_guestbook_replies r
          WHERE r.entry_key = e.entry_key
            AND r.status = 'visible'
            AND NOT public.is_profile_blocked(r.author_id, p_user_id)
          ORDER BY r.created_at ASC, r.reply_key ASC
          LIMIT 5
        ) r
        JOIN public.profiles reply_author ON reply_author.id = r.author_id
      ), '[]'::jsonb)
    )
    ORDER BY e.is_pinned DESC,
      CASE WHEN v_sort = 'popular' THEN e.like_count ELSE 0 END DESC,
      CASE WHEN v_sort = 'oldest' THEN e.created_at ELSE NULL END ASC,
      CASE WHEN v_sort <> 'oldest' THEN e.created_at ELSE NULL END DESC,
      e.entry_key DESC
  ), '[]'::jsonb)
  INTO v_guestbook
  FROM (
    SELECT
      e.*,
      EXISTS (
        SELECT 1 FROM public.profile_guestbook_pins pin
        WHERE pin.profile_id = p_user_id AND pin.entry_key = e.entry_key
      ) AS is_pinned,
      (SELECT count(*)::integer FROM public.profile_guestbook_likes l WHERE l.entry_key = e.entry_key) AS like_count
    FROM public.profile_guestbook_entries e
    WHERE e.profile_id = p_user_id
      AND e.status = 'visible'
      AND NOT public.is_profile_blocked(e.author_id, p_user_id)
    ORDER BY
      CASE WHEN EXISTS (
        SELECT 1 FROM public.profile_guestbook_pins pin
        WHERE pin.profile_id = p_user_id AND pin.entry_key = e.entry_key
      ) THEN 1 ELSE 0 END DESC,
      CASE WHEN v_sort = 'popular' THEN (
        SELECT count(*) FROM public.profile_guestbook_likes l WHERE l.entry_key = e.entry_key
      ) ELSE 0 END DESC,
      CASE WHEN v_sort = 'oldest' THEN e.created_at ELSE NULL END ASC,
      CASE WHEN v_sort <> 'oldest' THEN e.created_at ELSE NULL END DESC,
      e.entry_key DESC
    LIMIT 20
  ) e
  JOIN public.profiles author ON author.id = e.author_id;

  RETURN jsonb_build_object(
    'success', true,
    'blocked', false,
    'interactionsEnabled', COALESCE(v_settings.interactions_enabled, true),
    'guestbookEnabled', COALESCE(v_settings.guestbook_enabled, true),
    'activityVisible', COALESCE(v_settings.activity_visible, true),
    'socialSummaryVisible', v_summary_visible,
    'profileViewsVisible', v_views_visible,
    'publicViewCount', v_public_views,
    'favoriteCount', CASE WHEN v_summary_visible THEN (
      SELECT count(*)::integer FROM public.profile_favorites f WHERE f.profile_id = p_user_id
    ) ELSE 0 END,
    'reactionCounts', CASE WHEN v_summary_visible THEN jsonb_build_object(
      'spark', (SELECT count(*)::integer FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'spark'),
      'glow', (SELECT count(*)::integer FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'glow'),
      'cheer', (SELECT count(*)::integer FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'cheer')
    ) ELSE jsonb_build_object('spark', 0, 'glow', 0, 'cheer', 0) END,
    'viewerFavorited', v_viewer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profile_favorites f
      WHERE f.favoriter_id = v_viewer_id AND f.profile_id = p_user_id
    ),
    'viewerReactions', COALESCE((
      SELECT jsonb_agg(r.reaction_type ORDER BY r.reaction_type)
      FROM public.profile_reactions r
      WHERE r.reactor_id = v_viewer_id AND r.profile_id = p_user_id
    ), '[]'::jsonb),
    'guestbook', v_guestbook
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_social(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.get_public_profile_social(p_user_id, 'newest');
$function$;

REVOKE ALL ON FUNCTION public.get_public_profile_social(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_social(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_social(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_social(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_profile_guestbook_reply(
  p_entry_key uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry public.profile_guestbook_entries;
  v_body text := btrim(coalesce(p_body, ''));
  v_reply_key uuid;
  v_created_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_entry_key IS NULL OR char_length(v_body) < 1 OR char_length(v_body) > 240
     OR v_body ~ '[[:cntrl:]]'
     OR v_body ~* '(https?://|www[.]|[[:alnum:]_-]+[.][[:alpha:]]{2,})' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Replies must be 1–240 characters, plain text, and contain no links.');
  END IF;

  SELECT * INTO v_entry
  FROM public.profile_guestbook_entries e
  WHERE e.entry_key = p_entry_key AND e.status = 'visible';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook note not found.');
  END IF;
  IF v_entry.author_id = v_user_id OR v_entry.profile_id = v_user_id THEN
    -- Owners and note authors may reply, as may other authenticated visitors;
    -- this branch only prevents self-notification below.
    NULL;
  END IF;
  IF public.is_profile_blocked(v_user_id, v_entry.profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;
  IF NOT COALESCE((
    SELECT s.guestbook_enabled AND s.interactions_enabled
    FROM public.profile_social_settings s
    WHERE s.user_id = v_entry.profile_id
  ), true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is not accepting guestbook replies.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'guestbook', 10, 600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook replies are temporarily limited.');
  END IF;

  INSERT INTO public.profile_guestbook_replies (entry_key, profile_id, author_id, body)
  VALUES (v_entry.entry_key, v_entry.profile_id, v_user_id, v_body)
  RETURNING reply_key, created_at INTO v_reply_key, v_created_at;

  PERFORM public.queue_profile_notification(
    v_entry.profile_id,
    'reply',
    v_user_id,
    v_entry.profile_id,
    v_entry.entry_key,
    v_reply_key,
    'reply:' || v_reply_key::text,
    'reply:' || v_entry.entry_key::text,
    jsonb_build_object('bodyPreview', left(v_body, 80))
  );
  IF v_entry.author_id <> v_entry.profile_id THEN
    PERFORM public.queue_profile_notification(
      v_entry.author_id,
      'reply',
      v_user_id,
      v_entry.profile_id,
      v_entry.entry_key,
      v_reply_key,
      'reply:author:' || v_reply_key::text,
      'reply:author:' || v_entry.entry_key::text,
      jsonb_build_object('bodyPreview', left(v_body, 80))
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reply', jsonb_build_object(
      'replyKey', v_reply_key,
      'author', (SELECT username FROM public.profiles WHERE id = v_user_id),
      'body', v_body,
      'createdAt', v_created_at,
      'canDelete', true
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_profile_guestbook_reply(p_reply_key uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  DELETE FROM public.profile_guestbook_replies r
  WHERE r.reply_key = p_reply_key
    AND (r.author_id = v_user_id OR r.profile_id = v_user_id);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object(
    'success', v_deleted > 0,
    'deleted', v_deleted > 0,
    'error', CASE WHEN v_deleted = 0 THEN 'Reply not found or not owned.' ELSE NULL END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_profile_guestbook_like(p_entry_key uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry public.profile_guestbook_entries;
  v_existing boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT * INTO v_entry
  FROM public.profile_guestbook_entries e
  WHERE e.entry_key = p_entry_key AND e.status = 'visible';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook note not found.');
  END IF;
  IF public.is_profile_blocked(v_user_id, v_entry.profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;
  IF NOT COALESCE((
    SELECT s.interactions_enabled
    FROM public.profile_social_settings s
    WHERE s.user_id = v_entry.profile_id
  ), true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile has disabled social interactions.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_guestbook_likes l
    WHERE l.liker_id = v_user_id AND l.entry_key = p_entry_key
  ) INTO v_existing;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'reaction', 60, 600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook reactions are temporarily limited.');
  END IF;

  IF v_existing THEN
    DELETE FROM public.profile_guestbook_likes
    WHERE liker_id = v_user_id AND entry_key = p_entry_key;
    RETURN jsonb_build_object('success', true, 'action', 'removed');
  END IF;

  INSERT INTO public.profile_guestbook_likes (liker_id, entry_key)
  VALUES (v_user_id, p_entry_key);
  PERFORM public.queue_profile_notification(
    v_entry.author_id,
    'guestbook_like',
    v_user_id,
    v_entry.profile_id,
    v_entry.entry_key,
    NULL,
    'guestbook_like:' || v_user_id::text || ':' || v_entry.entry_key::text,
    'guestbook_like:' || v_entry.entry_key::text,
    '{}'::jsonb
  );
  IF v_entry.author_id <> v_entry.profile_id THEN
    PERFORM public.queue_profile_notification(
      v_entry.profile_id,
      'guestbook_like',
      v_user_id,
      v_entry.profile_id,
      v_entry.entry_key,
      NULL,
      'guestbook_like:owner:' || v_user_id::text || ':' || v_entry.entry_key::text,
      'guestbook_like:owner:' || v_entry.entry_key::text,
      '{}'::jsonb
    );
  END IF;
  RETURN jsonb_build_object('success', true, 'action', 'added');
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_profile_guestbook_pin(p_entry_key uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_existing boolean;
  v_pin_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT e.profile_id INTO v_profile_id
  FROM public.profile_guestbook_entries e
  WHERE e.entry_key = p_entry_key AND e.status = 'visible';
  IF v_profile_id IS NULL OR v_profile_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the profile owner can pin notes.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_guestbook_pins p
    WHERE p.profile_id = v_user_id AND p.entry_key = p_entry_key
  ) INTO v_existing;
  IF v_existing THEN
    DELETE FROM public.profile_guestbook_pins
    WHERE profile_id = v_user_id AND entry_key = p_entry_key;
    RETURN jsonb_build_object('success', true, 'action', 'unpinned');
  END IF;

  SELECT count(*)::integer INTO v_pin_count
  FROM public.profile_guestbook_pins p
  WHERE p.profile_id = v_user_id;
  IF v_pin_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can pin up to 3 guestbook notes.');
  END IF;

  INSERT INTO public.profile_guestbook_pins (profile_id, entry_key)
  VALUES (v_user_id, p_entry_key);
  RETURN jsonb_build_object('success', true, 'action', 'pinned');
END;
$function$;

REVOKE ALL ON FUNCTION public.create_profile_guestbook_reply(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_profile_guestbook_reply(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_profile_guestbook_like(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_profile_guestbook_pin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_guestbook_reply(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_guestbook_reply(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_profile_guestbook_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_profile_guestbook_pin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_profile_favorite(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing boolean;
  v_enabled boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot favorite yourself');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF public.is_profile_blocked(v_user_id, p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;

  SELECT COALESCE(s.interactions_enabled, true)
  INTO v_enabled
  FROM public.profile_social_settings s
  WHERE s.user_id = p_profile_id;
  SELECT EXISTS (
    SELECT 1 FROM public.profile_favorites f
    WHERE f.favoriter_id = v_user_id AND f.profile_id = p_profile_id
  ) INTO v_existing;

  IF NOT v_existing AND NOT v_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile has disabled social interactions.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'follow', 30, 600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Favorite changes are temporarily limited.');
  END IF;

  IF v_existing THEN
    DELETE FROM public.profile_favorites
    WHERE favoriter_id = v_user_id AND profile_id = p_profile_id;
    RETURN jsonb_build_object('success', true, 'action', 'unfavorited');
  END IF;

  INSERT INTO public.profile_favorites (favoriter_id, profile_id)
  VALUES (v_user_id, p_profile_id);
  PERFORM public.queue_profile_notification(
    p_profile_id,
    'favorite',
    v_user_id,
    p_profile_id,
    NULL,
    NULL,
    'favorite:' || v_user_id::text || ':' || p_profile_id::text,
    'favorite:' || p_profile_id::text,
    '{}'::jsonb
  );
  RETURN jsonb_build_object('success', true, 'action', 'favorited');
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_profile_reaction(
  p_profile_id uuid,
  p_reaction_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot react to yourself');
  END IF;
  IF p_reaction_type NOT IN ('spark', 'glow', 'cheer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown reaction');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF public.is_profile_blocked(v_user_id, p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;
  IF NOT COALESCE((
    SELECT s.interactions_enabled FROM public.profile_social_settings s WHERE s.user_id = p_profile_id
  ), true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile has disabled social interactions.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'reaction', 60, 600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reaction changes are temporarily limited.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_reactions r
    WHERE r.reactor_id = v_user_id
      AND r.profile_id = p_profile_id
      AND r.reaction_type = p_reaction_type
  ) INTO v_existing;

  IF v_existing THEN
    DELETE FROM public.profile_reactions
    WHERE reactor_id = v_user_id AND profile_id = p_profile_id AND reaction_type = p_reaction_type;
    RETURN jsonb_build_object('success', true, 'action', 'removed', 'reaction', p_reaction_type);
  END IF;

  INSERT INTO public.profile_reactions (reactor_id, profile_id, reaction_type)
  VALUES (v_user_id, p_profile_id, p_reaction_type);
  PERFORM public.queue_profile_notification(
    p_profile_id,
    'reaction',
    v_user_id,
    p_profile_id,
    NULL,
    NULL,
    'reaction:' || v_user_id::text || ':' || p_profile_id::text || ':' || p_reaction_type,
    'reaction:' || p_profile_id::text || ':' || p_reaction_type,
    jsonb_build_object('reaction', p_reaction_type)
  );
  RETURN jsonb_build_object('success', true, 'action', 'added', 'reaction', p_reaction_type);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_profile_guestbook_entry(
  p_profile_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_entry_key uuid;
  v_created_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot leave a note on your own profile.');
  END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 240
     OR v_body ~ '[[:cntrl:]]'
     OR v_body ~* '(https?://|www[.]|[[:alnum:]_-]+[.][[:alpha:]]{2,})' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notes must be 1–240 characters, plain text, and contain no links.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF public.is_profile_blocked(v_user_id, p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;
  IF NOT COALESCE((
    SELECT s.guestbook_enabled AND s.interactions_enabled
    FROM public.profile_social_settings s WHERE s.user_id = p_profile_id
  ), true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is not accepting guestbook notes.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'guestbook', 5, 600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook notes are temporarily limited.');
  END IF;

  INSERT INTO public.profile_guestbook_entries (author_id, profile_id, body)
  VALUES (v_user_id, p_profile_id, v_body)
  RETURNING entry_key, created_at INTO v_entry_key, v_created_at;

  PERFORM public.queue_profile_notification(
    p_profile_id,
    'guestbook',
    v_user_id,
    p_profile_id,
    v_entry_key,
    NULL,
    'guestbook:' || v_entry_key::text,
    'guestbook:' || p_profile_id::text,
    jsonb_build_object('bodyPreview', left(v_body, 80))
  );

  RETURN jsonb_build_object(
    'success', true,
    'entry', jsonb_build_object(
      'entryKey', v_entry_key,
      'author', (SELECT username FROM public.profiles WHERE id = v_user_id),
      'body', v_body,
      'createdAt', v_created_at,
      'canDelete', true
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.toggle_profile_favorite(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_profile_reaction(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_profile_guestbook_entry(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_profile_favorite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_profile_reaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_guestbook_entry(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.report_profile_social_content(
  p_target_profile_id uuid,
  p_entry_key uuid,
  p_reply_key uuid,
  p_reason text,
  p_details text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason text := lower(trim(coalesce(p_reason, '')));
  v_details text := btrim(coalesce(p_details, ''));
  v_existing boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_target_profile_id IS NULL OR p_target_profile_id = v_user_id
     OR (p_entry_key IS NOT NULL AND p_reply_key IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid report target');
  END IF;
  IF v_reason NOT IN ('spam', 'harassment', 'hate', 'sexual', 'impersonation', 'other') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid report reason');
  END IF;
  IF char_length(v_details) > 500 OR v_details ~ '[[:cntrl:]]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report details are limited to 500 plain-text characters.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF p_entry_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profile_guestbook_entries e
    WHERE e.entry_key = p_entry_key AND e.profile_id = p_target_profile_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook note not found');
  END IF;
  IF p_reply_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profile_guestbook_replies r
    WHERE r.reply_key = p_reply_key AND r.profile_id = p_target_profile_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook reply not found');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_reports r
    WHERE r.reporter_id = v_user_id
      AND r.target_profile_id = p_target_profile_id
      AND r.entry_key IS NOT DISTINCT FROM p_entry_key
      AND r.reply_key IS NOT DISTINCT FROM p_reply_key
      AND r.reason = v_reason
  ) INTO v_existing;
  IF v_existing THEN
    RETURN jsonb_build_object('success', true, 'action', 'already_reported');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'report', 5, 86400) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reports are temporarily limited.');
  END IF;

  INSERT INTO public.profile_reports (
    reporter_id, target_profile_id, entry_key, reply_key, reason, details
  ) VALUES (
    v_user_id, p_target_profile_id, p_entry_key, p_reply_key, v_reason, v_details
  );
  RETURN jsonb_build_object('success', true, 'action', 'reported');
END;
$function$;

CREATE OR REPLACE FUNCTION public.report_profile_social_content(
  p_target_profile_id uuid,
  p_entry_key uuid DEFAULT NULL,
  p_reason text DEFAULT 'other',
  p_details text DEFAULT ''
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.report_profile_social_content(
    p_target_profile_id, p_entry_key, NULL::uuid, p_reason, p_details
  );
$function$;

REVOKE ALL ON FUNCTION public.report_profile_social_content(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_profile_social_content(uuid, uuid, uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.report_profile_social_content(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_profile_social_content(uuid, uuid, text, text) TO authenticated;

COMMIT;
