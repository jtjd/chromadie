-- Launch-month badge and separately grantable Founder title. Window timestamps remain editable in meta.

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection
) VALUES (
  'title_founder',
  'Founder Title',
  'title',
  0,
  'text',
  '✦ FOUNDER ✦',
  NULL,
  NULL,
  'Mythic',
  'Reserved for people whose early contributions helped shape ChromaDie.',
  'Project Legacy'
)
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name,
  slot = EXCLUDED.slot,
  cost = EXCLUDED.cost,
  css_type = EXCLUDED.css_type,
  css_value = EXCLUDED.css_value,
  available_from = EXCLUDED.available_from,
  available_until = EXCLUDED.available_until,
  rarity = EXCLUDED.rarity,
  description = EXCLUDED.description,
  collection = EXCLUDED.collection;

INSERT INTO public.meta (key, value) VALUES
  ('official_launch_at', '2026-07-11T00:00:00Z'),
  ('founder_window_ends_at', '2026-08-11T00:00:00Z'),
  ('shop_version', '2026-07-11T16:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.grant_launch_edition_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_launch_at timestamptz;
  v_window_ends_at timestamptz;
BEGIN
  SELECT value::timestamptz
  INTO v_launch_at
  FROM public.meta
  WHERE key = 'official_launch_at';

  SELECT value::timestamptz
  INTO v_window_ends_at
  FROM public.meta
  WHERE key = 'founder_window_ends_at';

  IF v_launch_at IS NULL
     OR v_window_ends_at IS NULL
     OR clock_timestamp() < v_launch_at
     OR clock_timestamp() >= v_window_ends_at THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET equipped_badges = COALESCE(equipped_badges, '[]'::jsonb) || '"launch_edition"'::jsonb
  WHERE id = NEW.user_id
    AND NOT (COALESCE(equipped_badges, '[]'::jsonb) ? 'launch_edition');

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS grant_launch_founder_title_on_score ON public.scores;
CREATE TRIGGER grant_launch_edition_badge_on_score
AFTER INSERT OR UPDATE OF score ON public.scores
FOR EACH ROW
EXECUTE FUNCTION public.grant_launch_edition_badge();

REVOKE ALL ON FUNCTION public.grant_launch_edition_badge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_launch_edition_badge() TO service_role;
