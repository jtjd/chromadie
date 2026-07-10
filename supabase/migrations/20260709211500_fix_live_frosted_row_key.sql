UPDATE public.shop_items
SET css_value = 'background: linear-gradient(90deg, rgba(195, 226, 255, 0.28), rgba(255,255,255,0.16), rgba(195, 226, 255, 0.28)); border: 1px solid rgba(230,245,255,0.58); box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 18px rgba(190,220,255,0.18), 0 12px 28px rgba(120,150,190,0.2), 0 0 0 1px rgba(210,235,255,0.18); backdrop-filter: blur(14px);',
    cost = 2500000,
    rarity = 'Epic',
    description = 'A bright frosted glass row with icy highlights and soft blur.'
WHERE item_key = 'lb_frosted';

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-07-09T21:15:00Z')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
