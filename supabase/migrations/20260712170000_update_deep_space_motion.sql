-- Make the live Deep Space catalog entry use the moving layered star field.
UPDATE public.shop_items
SET css_value = 'background-color: #010208; background-image: radial-gradient(circle at 7% 14%, #fff 0 1px, transparent 1.8px), radial-gradient(circle at 18% 68%, rgba(151,210,255,0.9) 0 1.3px, transparent 2.2px), radial-gradient(circle at 29% 31%, rgba(255,255,255,0.72) 0 0.7px, transparent 1.5px), radial-gradient(circle at 41% 83%, rgba(190,166,255,0.82) 0 1px, transparent 2px), radial-gradient(circle at 52% 11%, rgba(255,255,255,0.88) 0 1.2px, transparent 2.1px), radial-gradient(circle at 61% 57%, rgba(112,191,255,0.78) 0 0.8px, transparent 1.7px), radial-gradient(circle at 73% 26%, #fff 0 1.4px, transparent 2.4px), radial-gradient(circle at 84% 76%, rgba(208,226,255,0.76) 0 0.9px, transparent 1.8px), radial-gradient(circle at 94% 43%, rgba(164,129,255,0.86) 0 1.2px, transparent 2.2px), radial-gradient(circle at 12% 91%, rgba(255,255,255,0.62) 0 0.7px, transparent 1.4px), radial-gradient(circle at 36% 54%, rgba(135,215,255,0.7) 0 0.6px, transparent 1.4px), radial-gradient(circle at 67% 92%, rgba(255,255,255,0.7) 0 0.8px, transparent 1.6px), radial-gradient(ellipse at 62% 38%, rgba(38,55,112,0.42), transparent 48%), radial-gradient(ellipse at center, #101634 0%, #03040d 56%, #000 100%); background-size: 100% 100%; background-repeat: no-repeat; animation: deepSpaceTwinkle 6.2s ease-in-out infinite;',
    description = 'An irregular field of varied stars visibly drifts and glimmers through deep space.'
WHERE item_key = 'bg_deep_space';

UPDATE public.meta
SET value = '2026-07-12T17:00:00Z'
WHERE key = 'shop_version';
