-- Retire the procedural atmosphere presets. The authored video plates are the
-- quality floor for this slot; removed products are deleted rather than kept
-- as inactive catalog baggage so the shop only presents finished work.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_atmosphere_renderer_check;

-- Remove equipped and owned references first because inventory.item_key is
-- intentionally ON DELETE RESTRICT. No replacement item is granted here.
UPDATE public.profiles
SET equipped_cosmetics = COALESCE(equipped_cosmetics, '{}'::jsonb) - 'profile_atmosphere'
WHERE equipped_cosmetics ->> 'profile_atmosphere' IN (
  'profile_atmosphere_signal_garden',
  'profile_atmosphere_aurora_veil',
  'profile_atmosphere_emberfall',
  'profile_atmosphere_paper_archive',
  'profile_atmosphere_prism_lens',
  'profile_atmosphere_lunar_tide',
  'profile_atmosphere_color_memory'
);

DELETE FROM public.inventory
WHERE item_key IN (
  'profile_atmosphere_signal_garden',
  'profile_atmosphere_aurora_veil',
  'profile_atmosphere_emberfall',
  'profile_atmosphere_paper_archive',
  'profile_atmosphere_prism_lens',
  'profile_atmosphere_lunar_tide',
  'profile_atmosphere_color_memory'
);

DELETE FROM public.shop_items
WHERE item_key IN (
  'profile_atmosphere_signal_garden',
  'profile_atmosphere_aurora_veil',
  'profile_atmosphere_emberfall',
  'profile_atmosphere_paper_archive',
  'profile_atmosphere_prism_lens',
  'profile_atmosphere_lunar_tide',
  'profile_atmosphere_color_memory'
);

ALTER TABLE public.shop_items
  ADD CONSTRAINT shop_items_atmosphere_renderer_check CHECK (
    slot <> 'profile_atmosphere'
    OR css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall')
  );

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-08-04T22:30:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE active_count bigint; atmosphere_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 119 THEN RAISE EXCEPTION 'Expected 119 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO atmosphere_count FROM public.shop_items WHERE slot = 'profile_atmosphere' AND catalog_status = 'active';
  IF atmosphere_count <> 5 THEN RAISE EXCEPTION 'Expected 5 active Profile Atmosphere rows, found %', atmosphere_count; END IF;
END;
$verification$;

COMMIT;
