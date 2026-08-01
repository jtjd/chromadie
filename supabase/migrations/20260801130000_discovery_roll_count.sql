-- Add the public daily-roll aggregate used by the homepage activity summary.
-- This is an aggregate only: it does not expose profile ids or private fields.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_discovery(
  p_surface text DEFAULT 'today',
  p_rarity text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_page integer DEFAULT 0,
  p_limit integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT public.get_public_discovery_base(
      p_surface,
      p_rarity,
      p_query,
      p_page,
      p_limit
    ) AS payload
  ),
  projected AS (
    SELECT
      base.payload,
      entries.item,
      entries.item_order,
      p.id AS profile_id,
      p.display_name,
      p.bio,
      p.mood_color,
      c.avatar_path
    FROM base
    LEFT JOIN LATERAL jsonb_array_elements(
      COALESCE(base.payload->'items', '[]'::jsonb)
    ) WITH ORDINALITY AS entries(item, item_order) ON true
    LEFT JOIN public.profiles p
      ON p.username_key = lower(entries.item->>'username')
    LEFT JOIN public.profile_configurations c
      ON c.user_id = p.id
  ),
  rebuilt AS (
    SELECT
      payload,
      COALESCE(
        jsonb_agg(
          item || jsonb_build_object(
            'displayName', left(display_name, 40),
            'bio', left(bio, 160),
            'profileAccent', CASE
              WHEN mood_color ~ '^#[0-9A-Fa-f]{6}$' THEN upper(mood_color)
              ELSE NULL
            END,
            'avatarPath', CASE
              WHEN avatar_path = 'avatars/' || profile_id::text || '/avatar.webp' THEN avatar_path
              ELSE NULL
            END
          ) ORDER BY item_order
        ) FILTER (WHERE item IS NOT NULL),
        '[]'::jsonb
      ) AS items
    FROM projected
    GROUP BY payload
  ),
  stats AS (
    SELECT count(*) AS today_roll_count
    FROM public.scores s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.roll_date = public.game_utc_date()
  )
  SELECT jsonb_set(
    jsonb_set(payload, '{items}', items, true),
    '{todayRollCount}',
    to_jsonb(stats.today_roll_count),
    true
  )
  FROM rebuilt
  CROSS JOIN stats;
$function$;

COMMENT ON FUNCTION public.get_public_discovery(text, text, text, integer, integer) IS
  'Bounded public discovery projection with a minimal profile preview and public daily roll count.';

REVOKE ALL ON FUNCTION public.get_public_discovery(text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_discovery(text, text, text, integer, integer) TO anon, authenticated;

COMMIT;
