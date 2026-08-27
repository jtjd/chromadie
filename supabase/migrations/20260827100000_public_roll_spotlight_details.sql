-- Public homepage spotlight details.
--
-- Keep the existing discovery projection and its one-request browser contract,
-- then enrich only today's first ranked result with the authoritative v6
-- contributors and percentile presentation. No score details are stored on
-- the compact score history table, and no private account fields are exposed.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_discovery_spotlight(
  p_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH settings AS (
    SELECT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 12) AS result_limit
  ),
  base AS (
    SELECT
      public.get_public_discovery(
        'today',
        NULL,
        NULL,
        0,
        settings.result_limit
      ) AS payload
    FROM settings
  ),
  expanded AS (
    SELECT
      base.payload,
      entries.item,
      entries.item_order
    FROM base
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(base.payload->'items', '[]'::jsonb)
    ) WITH ORDINALITY AS entries(item, item_order)
  ),
  enriched AS (
    SELECT
      expanded.payload,
      expanded.item_order,
      expanded.item || CASE
        WHEN expanded.item_order = 1
          AND expanded.item->>'hexCode' ~ '^#[0-9A-Fa-f]{6}$'
        THEN jsonb_build_object(
          'contributors', COALESCE(scored.details->'contributors', '[]'::jsonb),
          'percentile', percentile.details->'percentile',
          'totalRollers', percentile.details->'total_rollers'
        )
        ELSE '{}'::jsonb
      END AS item
    FROM expanded
    LEFT JOIN LATERAL (
      SELECT public.calculate_roll_v6(
        get_byte(decode(substr(expanded.item->>'hexCode', 2, 6), 'hex'), 0),
        get_byte(decode(substr(expanded.item->>'hexCode', 2, 6), 'hex'), 1),
        get_byte(decode(substr(expanded.item->>'hexCode', 2, 6), 'hex'), 2)
      ) AS details
      WHERE expanded.item_order = 1
        AND expanded.item->>'hexCode' ~ '^#[0-9A-Fa-f]{6}$'
    ) AS scored ON true
    LEFT JOIN LATERAL (
      SELECT public.get_score_percentile((expanded.item->>'score')::bigint) AS details
      WHERE expanded.item_order = 1
        AND expanded.item->>'score' ~ '^[0-9]+$'
    ) AS percentile ON true
  ),
  rebuilt AS (
    SELECT
      payload,
      COALESCE(
        jsonb_agg(item ORDER BY item_order),
        '[]'::jsonb
      ) AS items
    FROM enriched
    GROUP BY payload
  )
  SELECT jsonb_set(
    base.payload,
    '{items}',
    COALESCE(rebuilt.items, '[]'::jsonb),
    true
  )
  FROM base
  LEFT JOIN rebuilt ON rebuilt.payload = base.payload;
$function$;

COMMENT ON FUNCTION public.get_public_discovery_spotlight(integer) IS
  'Bounded public today discovery with authoritative v6 contributor details and percentile on the top result.';

REVOKE ALL ON FUNCTION public.get_public_discovery_spotlight(integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_discovery_spotlight(integer) TO anon, authenticated;

COMMIT;
