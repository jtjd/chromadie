-- Provisional launch-month Founder reward. Window timestamps remain editable in meta.

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
  'Awarded permanently for an authenticated roll during the first launch month.',
  'Launch Legacy'
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

CREATE OR REPLACE FUNCTION public.grant_launch_founder_title()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_launch_at timestamptz;
  v_window_ends_at timestamptz;
  v_granted integer := 0;
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

  INSERT INTO public.inventory (user_id, item_key)
  VALUES (NEW.user_id, 'title_founder')
  ON CONFLICT (user_id, item_key) DO NOTHING;

  GET DIAGNOSTICS v_granted = ROW_COUNT;

  IF v_granted > 0 THEN
    UPDATE public.profiles
    SET equipped_cosmetics = COALESCE(equipped_cosmetics, '{}'::jsonb)
      || CASE
        WHEN COALESCE(equipped_cosmetics, '{}'::jsonb) ? 'title' THEN '{}'::jsonb
        ELSE jsonb_build_object('title', 'title_founder')
      END
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS grant_launch_founder_title_on_score ON public.scores;
CREATE TRIGGER grant_launch_founder_title_on_score
AFTER INSERT OR UPDATE OF score ON public.scores
FOR EACH ROW
EXECUTE FUNCTION public.grant_launch_founder_title();

REVOKE ALL ON FUNCTION public.grant_launch_founder_title() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_launch_founder_title() TO service_role;
