-- Phase 5: durable public profile story events and a bounded lifetime
-- condition collection projection. This observes canonical profile/roll writes;
-- it does not decide scores, rewards, eligibility, or achievements.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_events_key_check CHECK (event_key ~ '^[A-Za-z0-9:_-]{1,160}$'),
  CONSTRAINT profile_events_type_check CHECK (event_type IN ('profile_created', 'roll')),
  CONSTRAINT profile_events_payload_check CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT profile_events_user_key_unique UNIQUE (user_id, event_key)
);

CREATE INDEX IF NOT EXISTS profile_events_user_occurred_idx
  ON public.profile_events (user_id, occurred_at DESC, id DESC);

ALTER TABLE public.profile_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_events TO service_role;

DROP POLICY IF EXISTS "Owners can read profile events" ON public.profile_events;
CREATE POLICY "Owners can read profile events"
  ON public.profile_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_profile_created_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  INSERT INTO public.profile_events (user_id, event_key, event_type, occurred_at, payload)
  VALUES (
    NEW.id,
    'profile:' || NEW.id::text,
    'profile_created',
    NEW.created_at,
    '{}'::jsonb
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_profile_roll_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  INSERT INTO public.profile_events (user_id, event_key, event_type, occurred_at, payload)
  VALUES (
    NEW.user_id,
    'roll:' || NEW.id::text,
    'roll',
    NEW.created_at,
    jsonb_build_object(
      'hex', NEW.hex_code,
      'score', NEW.score,
      'rarity', NEW.rarity,
      'conditionIds', NEW.condition_ids,
      'traits', NEW.traits,
      'identity', NEW.identity
    )
  )
  ON CONFLICT (user_id, event_key) DO UPDATE
  SET occurred_at = EXCLUDED.occurred_at,
      payload = EXCLUDED.payload;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profile_created_story_event ON public.profiles;
CREATE TRIGGER profile_created_story_event
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.record_profile_created_event();

DROP TRIGGER IF EXISTS profile_roll_story_event ON public.scores;
CREATE TRIGGER profile_roll_story_event
  AFTER INSERT OR UPDATE OF hex_code, score, rarity, condition_ids, traits, identity ON public.scores
  FOR EACH ROW
  EXECUTE FUNCTION public.record_profile_roll_event();

-- Backfill only public-safe event payloads. The source rows remain canonical;
-- this is an idempotent additive history projection for existing profiles.
INSERT INTO public.profile_events (user_id, event_key, event_type, occurred_at, payload)
SELECT p.id, 'profile:' || p.id::text, 'profile_created', p.created_at, '{}'::jsonb
FROM public.profiles p
ON CONFLICT (user_id, event_key) DO NOTHING;

INSERT INTO public.profile_events (user_id, event_key, event_type, occurred_at, payload)
SELECT
  s.user_id,
  'roll:' || s.id::text,
  'roll',
  s.created_at,
  jsonb_build_object(
    'hex', s.hex_code,
    'score', s.score,
    'rarity', s.rarity,
    'conditionIds', s.condition_ids,
    'traits', s.traits,
    'identity', s.identity
  )
FROM public.scores s
ON CONFLICT (user_id, event_key) DO UPDATE
SET occurred_at = EXCLUDED.occurred_at,
    payload = EXCLUDED.payload;

CREATE OR REPLACE FUNCTION public.get_public_profile_story(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
WITH timeline_rows AS (
  SELECT e.id, e.event_type, e.occurred_at, e.payload
  FROM public.profile_events e
  WHERE e.user_id = p_user_id
  ORDER BY e.occurred_at DESC, e.id DESC
  LIMIT 40
), timeline AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'eventType', event_type,
        'occurredAt', occurred_at,
        'payload', payload
      )
      ORDER BY occurred_at DESC, id DESC
    ),
    '[]'::jsonb
  ) AS items
  FROM timeline_rows
), collection_rows AS (
  SELECT
    condition_value AS condition_id,
    count(*) AS roll_count,
    min(s.roll_date) AS first_seen,
    max(s.roll_date) AS last_seen
  FROM public.scores s
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
      WHEN jsonb_typeof(s.condition_ids) = 'array' THEN s.condition_ids
      ELSE '[]'::jsonb
    END
  ) AS condition_values(condition_value)
  WHERE s.user_id = p_user_id
  GROUP BY condition_value
  ORDER BY roll_count DESC, last_seen DESC, condition_id
  LIMIT 30
), collection AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.condition_id,
        'name', COALESCE(a.name, c.condition_id),
        'icon', COALESCE(a.icon, '✦'),
        'rarity', COALESCE(a.rarity, 'Common'),
        'count', c.roll_count,
        'firstSeen', c.first_seen,
        'lastSeen', c.last_seen
      )
      ORDER BY c.roll_count DESC, c.last_seen DESC, c.condition_id
    ),
    '[]'::jsonb
  ) AS items
  FROM collection_rows c
  LEFT JOIN public.achievements a ON a.id = c.condition_id
)
SELECT jsonb_build_object(
  'timeline', timeline.items,
  'collection', collection.items
)
FROM public.profiles p, timeline, collection
WHERE p.id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public.record_profile_created_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_profile_roll_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_story(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_story(uuid) TO anon, authenticated;

COMMIT;
