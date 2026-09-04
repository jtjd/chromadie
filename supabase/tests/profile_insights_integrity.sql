\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.insight_assert(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PROFILE INSIGHT ASSERTION FAILED: %', message;
  END IF;
END;
$$;

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
VALUES (
  '20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
  'insights-database@example.test', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"insightsdb"}'::jsonb,
  now(), now(), false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (
  id, username, created_at, current_streak, longest_streak,
  lifetime_ep, total_rolls, equipped_cosmetics
)
VALUES (
  '20000000-0000-0000-0000-000000000003', 'insightsdb', now(), 0, 0, 0, 0, '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

INSERT INTO public.profile_social_settings (user_id, profile_insights_enabled, updated_at)
VALUES ('20000000-0000-0000-0000-000000000003', true, now())
ON CONFLICT (user_id) DO UPDATE
SET profile_insights_enabled = true, updated_at = now();

-- Give the fixture a published interaction surface.  The helper must consult
-- this record rather than accepting syntactically valid keys from a caller.
INSERT INTO public.profile_configurations (
  user_id, draft_config, published_config, published_config_v2, published_at
)
VALUES (
  '20000000-0000-0000-0000-000000000003',
  jsonb_build_object('version', 1, 'links', '[]'::jsonb, 'content', jsonb_build_object('version', 2), 'widgets', '[]'::jsonb),
  jsonb_build_object('version', 1, 'links', '[]'::jsonb, 'content', jsonb_build_object('version', 2), 'widgets', '[]'::jsonb),
  jsonb_build_object(
    'version', 2,
    'links', jsonb_build_array(
      jsonb_build_object('key', 'portfolio', 'label', 'Portfolio', 'url', 'https://example.com/portfolio', 'visible', true, 'order', 0),
      jsonb_build_object('key', 'github', 'label', 'GitHub', 'url', 'https://example.com/github', 'visible', true, 'order', 1),
      jsonb_build_object('key', 'contact', 'label', 'Contact', 'url', 'https://example.com/contact', 'visible', true, 'order', 2)
    ),
    'content', jsonb_build_object(
      'version', 2,
      'about', jsonb_build_object('visible', true, 'markdown', '[Site](https://example.com)'),
      'projects', jsonb_build_array(
        jsonb_build_object('title', 'One', 'url', 'https://example.com/one', 'visible', true, 'order', 0),
        jsonb_build_object('title', 'Two', 'url', 'https://example.com/two', 'visible', true, 'order', 1),
        jsonb_build_object('title', 'Three', 'url', 'https://example.com/three', 'visible', true, 'order', 2),
        jsonb_build_object('title', 'Four', 'url', 'https://example.com/four', 'visible', true, 'order', 3),
        jsonb_build_object('title', 'Five', 'url', 'https://example.com/five', 'visible', true, 'order', 4)
      )
    ),
    'widgets', jsonb_build_array(
      jsonb_build_object('provider', 'github', 'type', 'user', 'id', 'chromadie', 'visible', true, 'order', 0)
    )
  ),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  published_config_v2 = EXCLUDED.published_config_v2,
  published_config = EXCLUDED.published_config,
  draft_config = EXCLUDED.draft_config,
  published_at = EXCLUDED.published_at;

DELETE FROM public.profile_insight_visitor_daily
WHERE profile_id = '20000000-0000-0000-0000-000000000003';
DELETE FROM public.profile_insight_daily
WHERE profile_id = '20000000-0000-0000-0000-000000000003';
DELETE FROM public.profile_view_daily
WHERE profile_id = '20000000-0000-0000-0000-000000000003';

SELECT pg_temp.insight_assert(
  (public.record_profile_insight_from_edge(
    'insightsdb', 'view', '', 'desktop', 'US', 'example.com', repeat('a', 64), NULL
  )->>'recorded')::boolean,
  'the first edge-derived profile view must record'
);
SELECT pg_temp.insight_assert(
  NOT (public.record_profile_insight_from_edge(
    'insightsdb', 'view', '', 'desktop', 'US', 'example.com', repeat('a', 64), NULL
  )->>'recorded')::boolean,
  'a repeated visitor/day/profile view must be suppressed'
);
SELECT pg_temp.insight_assert(
  (SELECT view_count = 1 FROM public.profile_view_daily
   WHERE profile_id = '20000000-0000-0000-0000-000000000003'
     AND view_date = public.game_utc_date()),
  'suppressed views must not inflate the legacy daily total'
);
SELECT pg_temp.insight_assert(
  (public.record_profile_insight_from_edge(
    'insightsdb', 'click', 'project-0', 'desktop', 'US', 'example.com', repeat('a', 64), NULL
  )->>'recorded')::boolean,
  'a distinct click entry may record once for the same visitor/day'
);
SELECT pg_temp.insight_assert(
  (SELECT count(*) = 8
   FROM unnest(ARRAY['portfolio', 'github', 'contact', 'project-0', 'project-1', 'project-2', 'widget-github', 'about']) AS target(entry_key)
   CROSS JOIN LATERAL (SELECT public.record_profile_insight_from_edge(
     'insightsdb', 'click', target.entry_key, 'desktop', 'US', 'example.com', repeat('c', 64), NULL
   ) AS payload) result
   WHERE (result.payload->>'recorded')::boolean),
  'one visitor may record every valid published link, project, widget, and About link'
);
SELECT pg_temp.insight_assert(
  (public.record_profile_insight_from_edge(
    'insightsdb', 'click', 'not-published', 'desktop', 'US', 'example.com', repeat('d', 64), NULL
  )->>'reason') = 'invalid_entry',
  'fabricated entry keys must be rejected before suppression or aggregation'
);
SELECT pg_temp.insight_assert(
  NOT (public.record_profile_insight_from_edge(
    'insightsdb', 'view', '', 'desktop', 'US', 'example.com', repeat('b', 64),
    '20000000-0000-0000-0000-000000000003'
  )->>'recorded')::boolean,
  'a verified owner view must be excluded even through the service boundary'
);
SELECT pg_temp.insight_assert(
  NOT (public.record_profile_insight_from_edge(
    'insightsdb', 'view', '', 'desktop', 'US', 'example.com', 'not-a-digest', NULL
  )->>'recorded')::boolean,
  'malformed digests must not reach the aggregate'
);

ROLLBACK;
