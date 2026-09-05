-- Owner-only, bounded projections for the complete Progression record.
-- Existing profile_events remain the durable source; this migration adds no
-- storage, scoring, reward, or roll-authority behavior.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_profile_history(
  p_before_occurred_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 40
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := LEAST(40, GREATEST(1, COALESCE(p_limit, 40)));
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'authentication_required');
  END IF;

  IF (p_before_occurred_at IS NULL) <> (p_before_id IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cursor');
  END IF;

  WITH candidates AS (
    SELECT e.id, e.event_type, e.occurred_at, e.payload
    FROM public.profile_events AS e
    WHERE e.user_id = v_user_id
      AND (
        p_before_occurred_at IS NULL
        OR (e.occurred_at, e.id) < (p_before_occurred_at, p_before_id)
      )
    ORDER BY e.occurred_at DESC, e.id DESC
    LIMIT v_limit + 1
  ),
  page_rows AS (
    SELECT *
    FROM candidates
    ORDER BY occurred_at DESC, id DESC
    LIMIT v_limit
  ),
  page_items AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'eventType', event_type,
        'occurredAt', occurred_at,
        'hex', CASE WHEN payload->>'hex' ~ '^#[0-9A-Fa-f]{6}$' THEN upper(payload->>'hex') ELSE NULL END,
        'score', CASE WHEN payload->>'score' ~ '^[0-9]{1,19}$' THEN payload->>'score' ELSE NULL END,
        'rarity', left(COALESCE(payload->>'rarity', ''), 32),
        'identity', left(COALESCE(payload->>'identity', ''), 120),
        'conditionCount', CASE
          WHEN jsonb_typeof(payload->'conditionIds') = 'array' THEN jsonb_array_length(payload->'conditionIds')
          ELSE 0
        END
      ) ORDER BY occurred_at DESC, id DESC
    ), '[]'::jsonb) AS items
    FROM page_rows
  ),
  cursor_row AS (
    SELECT occurred_at, id
    FROM page_rows
    ORDER BY occurred_at ASC, id ASC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'success', true,
    'items', page_items.items,
    'hasMore', (SELECT count(*) FROM candidates) > v_limit,
    'nextCursor', CASE
      WHEN (SELECT count(*) FROM candidates) > v_limit THEN (
        SELECT jsonb_build_object('occurredAt', occurred_at, 'id', id) FROM cursor_row
      )
      ELSE NULL
    END
  )
  INTO v_result
  FROM page_items;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_condition_collection()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
WITH owner AS (
  SELECT auth.uid() AS user_id
),
condition_rows AS (
  SELECT
    condition_value AS condition_id,
    e.occurred_at
  FROM public.profile_events AS e
  CROSS JOIN owner AS o
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
      WHEN jsonb_typeof(e.payload->'conditionIds') = 'array' THEN e.payload->'conditionIds'
      ELSE '[]'::jsonb
    END
  ) AS condition_values(condition_value)
  WHERE o.user_id IS NOT NULL
    AND e.user_id = o.user_id
    AND e.event_type = 'roll'
    AND condition_value ~ '^[a-z0-9][a-z0-9_-]{0,127}$'
),
grouped AS (
  SELECT
    condition_id,
    count(*)::integer AS roll_count,
    min(occurred_at) AS first_seen,
    max(occurred_at) AS last_seen
  FROM condition_rows
  GROUP BY condition_id
  ORDER BY roll_count DESC, last_seen DESC, condition_id ASC
  LIMIT 512
),
items AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', condition_id,
    'count', roll_count,
    'firstSeen', first_seen,
    'lastSeen', last_seen
  ) ORDER BY roll_count DESC, last_seen DESC, condition_id ASC), '[]'::jsonb) AS value
  FROM grouped
)
SELECT CASE
  WHEN (SELECT user_id FROM owner) IS NULL THEN
    jsonb_build_object('success', false, 'error', 'authentication_required')
  ELSE jsonb_build_object(
    'success', true,
    'items', items.value
  )
END
FROM items;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_history(timestamptz, uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_condition_collection() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_history(timestamptz, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_condition_collection() TO authenticated;

COMMIT;
