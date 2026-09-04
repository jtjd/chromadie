-- Server-derived suppression for profile insights.
--
-- The browser can ask the Pages endpoint to record an aggregate event, but it
-- cannot mint the opaque daily visitor digest or call this service-only RPC.
-- No raw IP, user agent, timestamp, or account identifier is retained.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_insight_visitor_daily (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  insight_date date NOT NULL,
  metric text NOT NULL,
  entry_key text NOT NULL DEFAULT '',
  visitor_digest text NOT NULL,
  PRIMARY KEY (profile_id, insight_date, metric, entry_key, visitor_digest),
  CONSTRAINT profile_insight_visitor_metric_check CHECK (metric IN ('view', 'click')),
  CONSTRAINT profile_insight_visitor_entry_key_check CHECK (
    (metric = 'view' AND entry_key = '')
    OR (metric = 'click' AND entry_key ~ '^[a-z0-9][a-z0-9_-]{0,31}$')
  ),
  CONSTRAINT profile_insight_visitor_digest_check CHECK (visitor_digest ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS profile_insight_visitor_daily_digest_date_idx
  ON public.profile_insight_visitor_daily (visitor_digest, insight_date);

ALTER TABLE public.profile_insight_visitor_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_insight_visitor_daily FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_insight_visitor_daily TO service_role;

-- One scheduled cleanup boundary owns every privacy-preserving aggregate and
-- suppression record. Removing this digest after 90 days prevents it from
-- becoming a cross-period visitor identifier.
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
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_profile_view_daily() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_profile_view_daily() TO service_role;

-- Resolve a click key against the published profile surfaces before any
-- suppression row or aggregate is written.  The browser may choose which
-- surface it reports, but it cannot create a new surface by inventing an
-- entry key.  This helper deliberately reads the published configuration
-- under the service boundary; drafts and owner-only fields are never eligible.
CREATE OR REPLACE FUNCTION public.profile_insight_entry_is_published(
  p_profile_id uuid,
  p_entry_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_config jsonb;
  v_links jsonb := '[]'::jsonb;
  v_content jsonb := '{}'::jsonb;
  v_about jsonb := '{}'::jsonb;
  v_widgets jsonb := '[]'::jsonb;
  v_project_order integer;
BEGIN
  IF p_profile_id IS NULL OR p_entry_key IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(c.published_config_v2, c.published_config)
  INTO v_config
  FROM public.profile_configurations AS c
  WHERE c.user_id = p_profile_id;

  IF v_config IS NULL OR jsonb_typeof(v_config) <> 'object' THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(v_config->'links') = 'array' THEN
    v_links := v_config->'links';
  ELSIF jsonb_typeof(v_config->'base'->'links') = 'array' THEN
    v_links := v_config->'base'->'links';
  END IF;

  IF jsonb_typeof(v_config->'content') = 'object' THEN
    v_content := v_config->'content';
  ELSIF jsonb_typeof(v_config->'base'->'content') = 'object' THEN
    v_content := v_config->'base'->'content';
  END IF;

  IF jsonb_typeof(v_config->'widgets') = 'array' THEN
    v_widgets := v_config->'widgets';
  ELSIF jsonb_typeof(v_config->'base'->'widgets') = 'array' THEN
    v_widgets := v_config->'base'->'widgets';
  END IF;

  -- Link layouts report an explicit normalized key.  Older normalized rows
  -- had no key, so retain their bounded order fallback (link-0 … link-5).
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_links) WITH ORDINALITY AS rows(item, position)
    WHERE jsonb_typeof(rows.item) = 'object'
      AND CASE
        WHEN rows.item->>'visible' IN ('true', 'false') THEN (rows.item->>'visible')::boolean
        ELSE true
      END
      AND NULLIF(btrim(rows.item->>'label'), '') IS NOT NULL
      AND btrim(COALESCE(rows.item->>'url', '')) ~ '^https://[^[:space:]<>"'']+$'
      AND (
        rows.item->>'key' = lower(btrim(p_entry_key))
        OR (
          COALESCE(rows.item->>'key', '') = ''
          AND lower(btrim(p_entry_key)) = 'link-' || (
            CASE
              WHEN COALESCE(rows.item->>'order', '') ~ '^[0-9]{1,2}$' THEN rows.item->>'order'
              ELSE (rows.position - 1)::text
            END
          )
        )
      )
  ) THEN
    RETURN true;
  END IF;

  -- Projects use an order-based analytics key.  The public renderer assigns
  -- the same key after normalizing the published content, which avoids
  -- reproducing a client-only hash in the database authority layer.
  IF lower(btrim(p_entry_key)) ~ '^project-[0-9]{1,2}$' THEN
    v_project_order := substring(lower(btrim(p_entry_key)) FROM 9)::integer;
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(v_content->'projects') = 'array' THEN v_content->'projects' ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS rows(item, position)
      WHERE jsonb_typeof(rows.item) = 'object'
        AND CASE
          WHEN rows.item->>'visible' IN ('true', 'false') THEN (rows.item->>'visible')::boolean
          ELSE true
        END
        AND NULLIF(btrim(rows.item->>'title'), '') IS NOT NULL
        AND btrim(COALESCE(rows.item->>'url', '')) ~ '^https://[^[:space:]<>"'']+$'
        AND (
          CASE
            WHEN COALESCE(rows.item->>'order', '') ~ '^[0-9]{1,2}$' THEN (rows.item->>'order')::integer
            ELSE rows.position - 1
          END
        ) = v_project_order
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Provider cards report widget-{provider}.  Embeds do not currently emit a
  -- click event, but accepting their published key keeps the RPC contract
  -- aligned with every provider surface if that interaction is instrumented.
  IF lower(btrim(p_entry_key)) LIKE 'widget-%' THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_widgets) AS rows(item)
      WHERE jsonb_typeof(rows.item) = 'object'
        AND CASE
          WHEN rows.item->>'visible' IN ('true', 'false') THEN (rows.item->>'visible')::boolean
          ELSE true
        END
        AND lower(btrim(rows.item->>'provider')) = substring(lower(btrim(p_entry_key)) FROM 8)
        AND lower(btrim(rows.item->>'provider')) IN ('spotify', 'youtube', 'github', 'twitch', 'lastfm', 'discord')
        AND (
          (lower(btrim(rows.item->>'provider')) = 'spotify'
            AND lower(btrim(rows.item->>'type')) IN ('track', 'playlist', 'album')
            AND rows.item->>'id' ~ '^[A-Za-z0-9]{22}$')
          OR (lower(btrim(rows.item->>'provider')) = 'youtube'
            AND lower(btrim(rows.item->>'type')) = 'video'
            AND rows.item->>'id' ~ '^[A-Za-z0-9_-]{11}$')
          OR (lower(btrim(rows.item->>'provider')) = 'github'
            AND lower(btrim(rows.item->>'type')) = 'user'
            AND rows.item->>'id' ~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$')
          OR (lower(btrim(rows.item->>'provider')) = 'twitch'
            AND lower(btrim(rows.item->>'type')) = 'channel'
            AND rows.item->>'id' ~ '^[A-Za-z0-9_]{4,25}$')
          OR (lower(btrim(rows.item->>'provider')) = 'lastfm'
            AND lower(btrim(rows.item->>'type')) = 'user'
            AND rows.item->>'id' ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$')
          OR (lower(btrim(rows.item->>'provider')) = 'discord'
            AND lower(btrim(rows.item->>'type')) = 'server'
            AND rows.item->>'id' ~ '^[A-Za-z0-9-]{2,32}$')
        )
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- About links are rendered from the sanitized V2 AST.  During the older
  -- markdown rollout the persisted form contains markdown instead, so accept
  -- that form only when it includes an HTTPS markdown link (plain About text
  -- is not a clickable analytics target).
  IF lower(btrim(p_entry_key)) = 'about' THEN
    v_about := CASE WHEN jsonb_typeof(v_content->'about') = 'object' THEN v_content->'about' ELSE '{}'::jsonb END;
    IF (CASE
          WHEN v_about->>'visible' IN ('true', 'false') THEN (v_about->>'visible')::boolean
          ELSE true
        END)
       AND (
         jsonb_path_exists(v_about, '$.** ? (@.type == "link")')
         OR COALESCE(v_about->>'markdown', '') ~ '\[[^]\n]{1,80}\]\(https://[^[:space:]<>"'']+\)'
       ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.profile_insight_entry_is_published(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profile_insight_entry_is_published(uuid, text) TO service_role;

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

-- The pre-edge RPCs are retained for migration compatibility but are no
-- longer browser-callable. All new events must arrive through the Pages
-- control plane above, authenticated with the server secret.
REVOKE ALL ON FUNCTION public.record_profile_insight(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_insight(text, text, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.record_public_profile_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_profile_view(text) TO service_role;
REVOKE ALL ON FUNCTION public.record_profile_insight_from_edge(text, text, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_insight_from_edge(text, text, text, text, text, text, text, uuid) TO service_role;

COMMIT;
