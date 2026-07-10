UPDATE public.shop_items
SET css_type = 'class',
    css_value = 'frame-streak-30',
    description = 'Unlocked at a 30-day streak. A breathing emerald milestone frame.'
WHERE item_key = 'frame_30_day';

UPDATE public.shop_items
SET css_type = 'class',
    css_value = 'frame-streak-100',
    description = 'Unlocked at a 100-day streak. A bright gold frame with a constant shine.'
WHERE item_key = 'frame_100_day';

UPDATE public.shop_items
SET css_type = 'class',
    css_value = 'frame-streak-365',
    description = 'Unlocked at a 365-day streak. A prismatic anniversary frame with a full aura.'
WHERE item_key = 'frame_365_day';

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-07-09T21:30:00Z')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
