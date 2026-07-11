-- Replace the automatic Founder title with a permanent Launch Edition badge.
-- Founder remains a manually granted title for meaningful early contributors.

UPDATE public.shop_items
SET description = 'Reserved for people whose early contributions helped shape ChromaDie.',
    collection = 'Project Legacy'
WHERE item_key = 'title_founder';

DROP TRIGGER IF EXISTS grant_launch_founder_title_on_score ON public.scores;
DROP FUNCTION IF EXISTS public.grant_launch_founder_title();

-- Convert recipients of the superseded automatic reward before reserving Founder.
UPDATE public.profiles p
SET equipped_badges = COALESCE(p.equipped_badges, '[]'::jsonb) || '"launch_edition"'::jsonb,
    equipped_cosmetics = COALESCE(p.equipped_cosmetics, '{}'::jsonb) - 'title'
FROM public.inventory i
WHERE i.user_id = p.id
  AND i.item_key = 'title_founder'
  AND NOT (COALESCE(p.equipped_badges, '[]'::jsonb) ? 'launch_edition');

UPDATE public.profiles p
SET equipped_cosmetics = COALESCE(p.equipped_cosmetics, '{}'::jsonb) - 'title'
FROM public.inventory i
WHERE i.user_id = p.id
  AND i.item_key = 'title_founder'
  AND COALESCE(p.equipped_cosmetics, '{}'::jsonb)->>'title' = 'title_founder';

DELETE FROM public.inventory WHERE item_key = 'title_founder';

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
  SELECT value::timestamptz INTO v_launch_at FROM public.meta WHERE key = 'official_launch_at';
  SELECT value::timestamptz INTO v_window_ends_at FROM public.meta WHERE key = 'founder_window_ends_at';

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

DROP TRIGGER IF EXISTS grant_launch_edition_badge_on_score ON public.scores;
CREATE TRIGGER grant_launch_edition_badge_on_score
AFTER INSERT OR UPDATE OF score ON public.scores
FOR EACH ROW
EXECUTE FUNCTION public.grant_launch_edition_badge();

REVOKE ALL ON FUNCTION public.grant_launch_edition_badge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_launch_edition_badge() TO service_role;

-- Preserve the account marker when players change their three pinned achievements.
CREATE OR REPLACE FUNCTION public.equip_badges(p_badge_ids jsonb) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_badge text;
  v_badges jsonb;
  v_has_launch_edition boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_badge_ids IS NULL OR jsonb_typeof(p_badge_ids) <> 'array' OR jsonb_array_length(p_badge_ids) > 3 THEN
    RETURN json_build_object('success', false, 'error', 'Select up to 3 unique achievements.');
  END IF;

  IF (SELECT count(*) FROM jsonb_array_elements_text(p_badge_ids))
     <> (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(p_badge_ids)) THEN
    RETURN json_build_object('success', false, 'error', 'Select up to 3 unique achievements.');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT COALESCE(equipped_badges, '[]'::jsonb) ? 'launch_edition'
  INTO v_has_launch_edition
  FROM public.profiles
  WHERE id = v_user_id;

  FOR v_badge IN SELECT value FROM jsonb_array_elements_text(p_badge_ids)
  LOOP
    IF v_badge = 'launch_edition' OR NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = v_user_id AND achievement_id = v_badge
    ) THEN
      RETURN json_build_object('success', false, 'error', 'You do not own all selected badges.');
    END IF;
  END LOOP;

  v_badges := p_badge_ids;
  IF v_has_launch_edition THEN
    v_badges := v_badges || '"launch_edition"'::jsonb;
  END IF;

  UPDATE public.profiles SET equipped_badges = v_badges WHERE id = v_user_id;
  RETURN json_build_object('success', true, 'badges', v_badges);
END;
$function$;

REVOKE ALL ON FUNCTION public.equip_badges(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equip_badges(jsonb) TO authenticated, service_role;
