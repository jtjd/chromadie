-- Production catalog snapshot.
-- This migration intentionally upserts the live catalog and never deletes keys,
-- because inventory rows may reference older or retired cosmetics.
INSERT INTO public.shop_items (item_key, name, slot, cost, css_type, css_value, available_from, available_until, rarity, description, collection) VALUES
('bg_aurora', 'Aurora Background', 'profile_bg', '1500000', 'style', 'background-image: linear-gradient(135deg, #00c6ff, #0072ff); background-size: cover;', NULL, NULL, 'Epic', 'A blue aurora gradient for your profile card.', NULL),
('bg_blood_void', 'Blood Void', 'profile_bg', '3000000', 'style', 'background-image: radial-gradient(circle, #2a0000, #000000);', NULL, NULL, 'Epic', 'A void filled with dark red.', 'Voidwalker'),
('bg_deep_space', 'Deep Space', 'profile_bg', '8000000', 'style', 'background-color: #000000; background-image: radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 3px), radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 4px); background-size: 200px 200px, 150px 150px; background-position: 0 0, 40px 60px;', NULL, NULL, 'Mythic', 'A starry deep space background.', 'Digital Landscape'),
('bg_geo_grid', 'Geometric Grid', 'profile_bg', '1000000', 'style', 'background-color: #050505; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 20px 20px;', NULL, NULL, 'Epic', 'A subtle geometric grid.', 'Digital Landscape'),
('bg_god_rays', 'God Rays', 'profile_bg', '50000000', 'style', 'background-image: conic-gradient(from 0deg, #ffd700, #ff8c00, #ffd700, #ff8c00, #ffd700); background-size: 100% 100%; animation: shine 5s linear infinite;', NULL, NULL, 'Mythic', 'A blinding display of wealth and power.', 'Royal Metals'),
('bg_matrix', 'Matrix Background', 'profile_bg', '2500000', 'style', 'background-color: #001100; background-image: linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, .1) 25%, rgba(0, 255, 0, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .1) 75%, rgba(0, 255, 0, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, .1) 25%, rgba(0, 255, 0, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .1) 75%, rgba(0, 255, 0, .1) 76%, transparent 77%, transparent); background-size: 50px 50px;', NULL, NULL, 'Epic', 'A dark matrix grid with green digital texture.', 'Digital Landscape'),
('bg_mesh_cyan', 'Cyan Mesh', 'profile_bg', '750000', 'style', 'background-image: radial-gradient(at 0% 0%, #00c6ff 0px, transparent 50%), radial-gradient(at 100% 100%, #0072ff 0px, transparent 50%);', NULL, NULL, 'Rare', 'A soft cyan mesh gradient.', 'Digital Landscape'),
('bg_neon_grid', 'Neon Grid', 'profile_bg', '12000000', 'style', 'background-color: #0a0a0d; background-image: linear-gradient(rgba(255,0,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.2) 1px, transparent 1px); background-size: 40px 40px; perspective: 1000px;', NULL, NULL, 'Mythic', 'A retro neon grid.', 'Digital Landscape'),
('bg_ocean_void', 'Ocean Void', 'profile_bg', '3000000', 'style', 'background-image: radial-gradient(circle, #001a2a, #000000);', NULL, NULL, 'Epic', 'A void filled with deep blue.', 'Voidwalker'),
('bg_sunset', 'Sunset Background', 'profile_bg', '1500000', 'style', 'background-image: linear-gradient(135deg, #ff9a9e, #fad0c4); background-size: cover;', NULL, NULL, 'Epic', 'A warm sunset gradient that feels soft and bright.', NULL),
('bg_void', 'Void Background', 'profile_bg', '4500000', 'style', 'background-image: radial-gradient(circle, #1a1a1a, #000000); background-size: cover;', NULL, NULL, 'Mythic', 'A near-black void background with a deep glow.', 'Voidwalker'),
('border_celestial', 'Celestial Border', 'profile_border', '20000000', 'class', 'border-celestial-anim', NULL, NULL, 'Mythic', 'A border fit for the stars.', 'Royal Metals'),
('border_chroma', 'Chroma Border', 'profile_border', '5000000', 'class', 'border-chroma-anim', NULL, NULL, 'Mythic', 'A full card border pulsing with chroma.', 'Chroma'),
('border_crystal', 'Crystal Border', 'profile_border', '6000000', 'class', 'border-crystal-anim', NULL, NULL, 'Mythic', 'A shimmering crystal border.', 'Royal Metals'),
('border_glitch', 'Glitch Border', 'profile_border', '12000000', 'class', 'border-glitch-anim', NULL, NULL, 'Mythic', 'A chaotic RGB glitch border.', 'Digital Landscape'),
('border_gold', 'Gold Border', 'profile_border', '4000000', 'class', 'border-gold-anim', NULL, NULL, 'Mythic', 'A metallic gold card border.', 'Royal Metals'),
('border_neon', 'Neon Border', 'profile_border', '1000000', 'class', 'border-neon-anim', NULL, NULL, 'Epic', 'A sleek neon outline.', 'Digital Landscape'),
('border_prism', 'Prism Border', 'profile_border', '2000000', 'class', 'border-prism-anim', NULL, NULL, 'Epic', 'A soft pastel prism border.', 'Chroma'),
('border_void', 'Void Border', 'profile_border', '8000000', 'class', 'border-void-anim', NULL, NULL, 'Mythic', 'A border that absorbs light.', 'Voidwalker'),
('frame_100_day', 'Iron Will Frame', 'frame', '0', 'class', 'frame-streak-100', NULL, NULL, 'Mythic', 'Unlocked at a 100-day streak. A bright gold frame with a constant shine.', NULL),
('frame_30_day', 'Monthly Grinder Frame', 'frame', '0', 'class', 'frame-streak-30', NULL, NULL, 'Mythic', 'Unlocked at a 30-day streak. A breathing emerald milestone frame.', NULL),
('frame_365_day', 'Annual Frame', 'frame', '0', 'class', 'frame-streak-365', NULL, NULL, 'Mythic', 'Unlocked at a 365-day streak. A prismatic anniversary frame with a full aura.', NULL),
('frame_chroma', 'Chroma Frame', 'frame', '4000000', 'class', 'frame-chroma-anim', NULL, NULL, 'Epic', 'A saturated spectrum edge racing around a dark core.', 'Chroma'),
('frame_corner', 'Corner Accents', 'frame', '250000', 'class', 'frame-corner-accents', NULL, NULL, 'Rare', 'Four luminous corner brackets around your name frame.', 'Geometric'),
('frame_diamond', 'Diamond Frame', 'frame', '10000000', 'class', 'frame-diamond-anim', NULL, NULL, 'Mythic', 'An icy crystal frame with a fast white-blue shimmer.', 'Royal Metals'),
('frame_double', 'Holo Frame', 'frame', '1000000', 'class', 'frame_holo', NULL, NULL, 'Epic', 'An iridescent cyan-magenta frame with a moving holo sweep.', 'Geometric'),
('frame_gold_ring', 'Gold Ring', 'frame', '600000', 'style', 'border: 1px solid #f1c40f; box-shadow: 0 0 16px rgba(241,196,15,0.45);', NULL, NULL, 'Epic', 'A slim gold frame with a warm halo.', 'Royal Metals'),
('frame_neon_cyan', 'Cyan Frame', 'frame', '150000', 'style', 'border: 1px solid #22d3ee; box-shadow: 0 0 12px rgba(34,211,238,0.5);', NULL, NULL, 'Rare', 'A bright cyan frame with a soft electric glow.', NULL),
('frame_neon_pink', 'Pink Frame', 'frame', '150000', 'style', 'border: 1px solid #ff4fd8; box-shadow: 0 0 12px rgba(255,79,216,0.5);', NULL, NULL, 'Rare', 'A hot pink frame with a neon edge light.', NULL),
('frame_platinum', 'Platinum Frame', 'frame', '5000000', 'class', 'frame-platinum-shine', NULL, NULL, 'Mythic', 'A polished silver frame with a cold metallic shimmer.', 'Royal Metals'),
('frame_thin_white', 'Hairline Frame', 'frame', '40000', 'style', 'border: 1px solid rgba(255,255,255,0.35);', NULL, NULL, 'Uncommon', 'A thin white frame for a clean, minimal profile header.', NULL),
('lb_chroma', 'Chroma Row', 'lb_theme', '25000000', 'class', 'lb-chroma-theme', NULL, NULL, 'Mythic', 'A row of pure chroma.', 'Chroma'),
('lb_frosted', 'Frosted Glass', 'lb_theme', '2500000', 'style', 'background: linear-gradient(90deg, rgba(195, 226, 255, 0.28), rgba(255,255,255,0.16), rgba(195, 226, 255, 0.28)); border: 1px solid rgba(230,245,255,0.58); box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 18px rgba(190,220,255,0.18), 0 12px 28px rgba(120,150,190,0.2), 0 0 0 1px rgba(210,235,255,0.18); backdrop-filter: blur(14px);', NULL, NULL, 'Epic', 'A bright frosted glass row with icy highlights and soft blur.', 'Geometric'),
('lb_glow', 'Glowing Row', 'lb_theme', '1000000', 'class', 'lb-glow-theme', NULL, NULL, 'Rare', 'Applies a custom background and border to your row on the global leaderboard.', NULL),
('lb_gold', 'Golden Row', 'lb_theme', '7500000', 'class', 'lb-gold-theme', NULL, NULL, 'Mythic', 'A premium golden leaderboard row with a bright shine.', NULL),
('lb_magma', 'Magma Row', 'lb_theme', '4000000', 'style', 'background: linear-gradient(90deg, #f12711, #f5af19); border: 1px solid #f12711; color: #000 !important;', NULL, NULL, 'Mythic', 'A row filled with magma.', 'Elemental'),
('lb_neon_outline', 'Neon Outline', 'lb_theme', '1000000', 'style', 'border: 2px solid #9146FF; box-shadow: 0 0 10px rgba(145,70,255,0.3);', NULL, NULL, 'Epic', 'A bright neon outline.', 'Digital Landscape'),
('lb_void', 'Void Row', 'lb_theme', '15000000', 'style', 'background: #000000; border: 1px solid #333; color: #fff !important;', NULL, NULL, 'Mythic', 'A row of pure void.', 'Voidwalker'),
('name_chroma', 'Chroma Name', 'name_effect', '25000000', 'class', 'chroma-name-anim', NULL, NULL, 'Mythic', 'A high-energy chroma sweep with the brightest spectral edge.', 'Chroma'),
('name_diamond_shimmer', 'Diamond Shimmer', 'name_effect', '6500000', 'class', 'diamond-shimmer-anim', NULL, NULL, 'Mythic', 'A diamond-white shimmer that slides across the text.', NULL),
('name_drop_shadow', 'Drop Shadow', 'name_effect', '50000', 'class', 'name_drop_shadow', NULL, NULL, 'Uncommon', 'A white name with a deep shadow for stronger contrast.', NULL),
('name_flicker_neon', 'Flickering Neon', 'name_effect', '1800000', 'class', 'flicker-neon-anim', NULL, NULL, 'Epic', 'A teal neon sign effect with intermittent flicker.', NULL),
('name_glitch_effect', 'Glitch Effect', 'name_effect', '9500000', 'class', 'glitch-anim', NULL, NULL, 'Mythic', 'A clean cyan-magenta glitch jitter across your name.', 'Voidwalker'),
('name_glow_blue', 'Blue Glow', 'name_effect', '100000', 'style', 'text-shadow: 0 0 10px #3498db; color: #fff;', NULL, NULL, 'Rare', 'Blue glow text that reads clearly on dark surfaces.', NULL),
('name_glow_gold', 'Gold Glow', 'name_effect', '500000', 'style', 'text-shadow: 0 0 15px #f1c40f; color: #fff;', NULL, NULL, 'Epic', 'A gold glow effect with a premium shine.', NULL),
('name_glow_green', 'Green Glow', 'name_effect', '100000', 'style', 'text-shadow: 0 0 10px #2ecc71; color: #fff;', NULL, NULL, 'Rare', 'Green glow text with a vivid neon edge.', NULL),
('name_glow_pink_neon', 'Neon Pink Glow', 'name_effect', '250000', 'style', 'text-shadow: 0 0 5px #ff00de, 0 0 10px #ff00de; color: #fff;', NULL, NULL, 'Rare', 'A bright neon pink text glow.', NULL),
('name_glow_purple', 'Purple Glow', 'name_effect', '100000', 'style', 'text-shadow: 0 0 10px #9b59b6; color: #fff;', NULL, NULL, 'Rare', 'Purple glow text with a softer magenta tint.', NULL),
('name_glow_red', 'Red Glow', 'name_effect', '100000', 'style', 'text-shadow: 0 0 10px #ff4c4c; color: #fff;', NULL, NULL, 'Rare', 'Red glow text with a hot, alert-style edge.', NULL),
('name_gradient_fire', 'Fire Gradient', 'name_effect', '750000', 'style', 'background: linear-gradient(45deg, #f12711, #f5af19); -webkit-background-clip: text; background-clip: text; color: transparent;', NULL, NULL, 'Epic', 'A warm fire gradient for a hotter username look.', NULL),
('name_gradient_purple', 'Purple Gradient', 'name_effect', '500000', 'style', 'background: linear-gradient(45deg, #8E2DE2, #4A00E0); -webkit-background-clip: text; background-clip: text; color: transparent;', NULL, NULL, 'Epic', 'A purple gradient that clips directly to your name.', NULL),
('name_holographic', 'Holographic', 'name_effect', '6000000', 'class', 'name_holographic', NULL, NULL, 'Mythic', 'A silver-cyan holographic sweep with a glossy shine.', 'Spectrum'),
('name_ice', 'Ice Gradient', 'name_effect', '750000', 'style', 'background: linear-gradient(45deg, #a1c4fd, #c2e9fb); -webkit-background-clip: text; background-clip: text; color: transparent;', NULL, NULL, 'Epic', 'A pale blue gradient with a cold glassy finish.', 'Elemental'),
('name_inferno', 'Inferno Name', 'name_effect', '13500000', 'class', 'inferno-name-anim', NULL, NULL, 'Mythic', 'A flame-like name effect with hot highlights.', NULL),
('name_italic', 'Italic Font', 'name_effect', '50000', 'style', 'font-style: italic; color: #fff;', NULL, NULL, 'Uncommon', 'An italic username with a sharp, clean slant.', NULL),
('name_matrix_rain', 'Matrix Rain', 'name_effect', '4500000', 'class', 'matrix-rain-anim', NULL, NULL, 'Mythic', 'Green matrix-style text rain for a cyber look.', NULL),
('name_ocean_wave', 'Ocean Wave', 'name_effect', '11500000', 'class', 'ocean-wave-anim', NULL, NULL, 'Mythic', 'A blue wave gradient that moves across your name.', NULL),
('name_pulsing_glow', 'Pulsing Glow', 'name_effect', '2500000', 'class', 'pulsing-glow-anim', NULL, NULL, 'Epic', 'A soft pulsing glow around your username.', NULL),
('name_rainbow', 'Rainbow Shift', 'name_effect', '1800000', 'class', 'rainbow-text-anim', NULL, NULL, 'Epic', 'Animated rainbow text that cycles through the spectrum.', 'Spectrum'),
('name_shining_gold', 'Shining Gold Name', 'name_effect', '2500000', 'class', 'shining-gold-anim', NULL, NULL, 'Epic', 'An animated gold gradient that shimmers across the text.', 'Royal Metals'),
('name_slow_pulse', 'Slow Pulse', 'name_effect', '1000000', 'class', 'slow-pulse-name-anim', NULL, NULL, 'Epic', 'A soft white name that pulses with a slow blue glow.', 'Elemental'),
('name_smallcaps', 'Small Caps', 'name_effect', '75000', 'style', 'font-variant: small-caps; color: #fff; letter-spacing: 1px;', NULL, NULL, 'Uncommon', 'A small-caps username with a refined look.', NULL),
('name_sunset_blur', 'Sunset Blur', 'name_effect', '13500000', 'class', 'sunset-blur-anim', NULL, NULL, 'Mythic', 'A warm sunset gradient with a blurred glow.', NULL),
('name_toxic', 'Toxic Gradient', 'name_effect', '750000', 'style', 'background: linear-gradient(45deg, #43e97b, #38f9d7); -webkit-background-clip: text; background-clip: text; color: transparent;', NULL, NULL, 'Epic', 'A bright acid-green gradient with a chemical glow.', 'Elemental'),
('name_void', 'Void Name', 'name_effect', '20000000', 'class', 'name_void', NULL, NULL, 'Mythic', 'A dim name rimmed by a cold void glow.', 'Voidwalker'),
('orb_diamond', 'Diamond Orb', 'orb_shape', '1000000', 'class', 'orb-shape-diamond', NULL, NULL, 'Epic', 'Changes the shape of your color orb on the results screen.', 'Geometric'),
('orb_hexagon', 'Hexagon Orb', 'orb_shape', '500000', 'class', 'orb-shape-hexagon', NULL, NULL, 'Rare', 'Changes the shape of your color orb on the results screen.', 'Geometric'),
('orb_square', 'Square Orb', 'orb_shape', '2000000', 'class', 'orb-shape-square', NULL, NULL, 'Epic', 'Changes the shape of your color orb on the results screen.', 'Geometric'),
('orb_star', 'Star Orb', 'orb_shape', '8000000', 'class', 'orb-shape-star', NULL, NULL, 'Mythic', 'Changes the shape of your color orb on the results screen.', 'Geometric'),
('orb_triangle', 'Triangle Orb', 'orb_shape', '4000000', 'class', 'orb-shape-triangle', NULL, NULL, 'Mythic', 'Changes the shape of your color orb on the results screen.', 'Geometric'),
('roll_black_hole', 'Black Hole', 'roll_effect', '20000000', 'class', 'roll-black-hole-anim', NULL, NULL, 'Mythic', 'A gravitational pull effect.', 'Voidwalker'),
('roll_chroma', 'Chroma Aura', 'roll_effect', '15000000', 'class', 'roll-chroma-anim', NULL, NULL, 'Mythic', 'A blinding display of wealth and power.', 'Chroma'),
('roll_chromatic', 'Cyber Pulse', 'roll_effect', '4000000', 'class', 'roll-cyber-pulse-anim', NULL, NULL, 'Mythic', 'A pulsing ring of cyan and magenta.', 'Spectrum'),
('roll_inferno', 'Inferno Aura', 'roll_effect', '4500000', 'class', 'roll-inferno-anim', NULL, NULL, 'Mythic', 'A hot orange-red aura around your roll orb.', NULL),
('roll_neon_rings', 'Neon Rings', 'roll_effect', '2000000', 'class', 'roll-neon-rings-anim', NULL, NULL, 'Epic', 'Pulsing neon rings around your orb.', 'Digital Landscape'),
('roll_pixelate', 'Nova Bloom', 'roll_effect', '8000000', 'class', 'roll-pixelate-anim', NULL, NULL, 'Mythic', 'A radiant stellar burst that blooms around your roll orb.', 'Digital Landscape'),
('roll_smoke', 'Smoke Trail', 'roll_effect', '500000', 'class', 'roll-smoke-anim', NULL, NULL, 'Epic', 'A trail of smoke behind your orb.', 'Elemental'),
('roll_sparkles', 'Sparkle Aura', 'roll_effect', '1000000', 'class', 'roll-sparkles-anim', NULL, NULL, 'Epic', 'A soft sparkle aura around your roll orb.', NULL),
('streak_freeze', 'Streak Freeze', 'consumable', '100000', 'text', 'Protects your streak if you miss a day.', NULL, NULL, 'Rare', 'Protects your streak if you miss a day.', NULL)
ON CONFLICT (item_key) DO UPDATE
SET name = EXCLUDED.name,
    slot = EXCLUDED.slot,
    cost = EXCLUDED.cost,
    css_type = EXCLUDED.css_type,
    css_value = EXCLUDED.css_value,
    available_from = EXCLUDED.available_from,
    available_until = EXCLUDED.available_until,
    rarity = EXCLUDED.rarity,
    description = EXCLUDED.description,
    collection = EXCLUDED.collection;

DELETE FROM public.shop_items
WHERE item_key IN (
  'frame_spectrum',
  'lb_spectrum',
  'name_spectrum',
  'reroll_shard',
  'roll_spectrum'
);

UPDATE public.shop_items
SET cost = CASE item_key
  WHEN 'bg_aurora' THEN 200000
  WHEN 'bg_blood_void' THEN 300000
  WHEN 'bg_deep_space' THEN 325000
  WHEN 'bg_geo_grid' THEN 130000
  WHEN 'bg_god_rays' THEN 1250000
  WHEN 'bg_matrix' THEN 300000
  WHEN 'bg_mesh_cyan' THEN 90000
  WHEN 'bg_neon_grid' THEN 475000
  WHEN 'bg_ocean_void' THEN 300000
  WHEN 'bg_sunset' THEN 210000
  WHEN 'bg_void' THEN 225000
  WHEN 'border_celestial' THEN 800000
  WHEN 'border_chroma' THEN 250000
  WHEN 'border_crystal' THEN 275000
  WHEN 'border_glitch' THEN 500000
  WHEN 'border_gold' THEN 175000
  WHEN 'border_neon' THEN 140000
  WHEN 'border_prism' THEN 250000
  WHEN 'border_void' THEN 350000
  WHEN 'frame_100_day' THEN 0
  WHEN 'frame_30_day' THEN 0
  WHEN 'frame_365_day' THEN 0
  WHEN 'frame_chroma' THEN 300000
  WHEN 'frame_corner' THEN 60000
  WHEN 'frame_diamond' THEN 425000
  WHEN 'frame_double' THEN 150000
  WHEN 'frame_gold_ring' THEN 90000
  WHEN 'frame_neon_cyan' THEN 50000
  WHEN 'frame_neon_pink' THEN 55000
  WHEN 'frame_platinum' THEN 275000
  WHEN 'frame_thin_white' THEN 15000
  WHEN 'lb_chroma' THEN 1250000
  WHEN 'lb_frosted' THEN 300000
  WHEN 'lb_glow' THEN 100000
  WHEN 'lb_gold' THEN 325000
  WHEN 'lb_magma' THEN 175000
  WHEN 'lb_neon_outline' THEN 160000
  WHEN 'lb_void' THEN 650000
  WHEN 'name_chroma' THEN 1250000
  WHEN 'name_diamond_shimmer' THEN 300000
  WHEN 'name_drop_shadow' THEN 20000
  WHEN 'name_flicker_neon' THEN 225000
  WHEN 'name_glitch_effect' THEN 400000
  WHEN 'name_glow_blue' THEN 30000
  WHEN 'name_glow_gold' THEN 75000
  WHEN 'name_glow_green' THEN 35000
  WHEN 'name_glow_pink_neon' THEN 70000
  WHEN 'name_glow_purple' THEN 40000
  WHEN 'name_glow_red' THEN 45000
  WHEN 'name_gradient_fire' THEN 100000
  WHEN 'name_gradient_purple' THEN 80000
  WHEN 'name_holographic' THEN 300000
  WHEN 'name_ice' THEN 110000
  WHEN 'name_inferno' THEN 550000
  WHEN 'name_italic' THEN 25000
  WHEN 'name_matrix_rain' THEN 225000
  WHEN 'name_ocean_wave' THEN 450000
  WHEN 'name_pulsing_glow' THEN 300000
  WHEN 'name_rainbow' THEN 240000
  WHEN 'name_shining_gold' THEN 300000
  WHEN 'name_slow_pulse' THEN 170000
  WHEN 'name_smallcaps' THEN 35000
  WHEN 'name_sunset_blur' THEN 600000
  WHEN 'name_toxic' THEN 120000
  WHEN 'name_void' THEN 900000
  WHEN 'orb_diamond' THEN 180000
  WHEN 'orb_hexagon' THEN 80000
  WHEN 'orb_square' THEN 260000
  WHEN 'orb_star' THEN 350000
  WHEN 'orb_triangle' THEN 200000
  WHEN 'roll_black_hole' THEN 1000000
  WHEN 'roll_chroma' THEN 700000
  WHEN 'roll_chromatic' THEN 200000
  WHEN 'roll_inferno' THEN 250000
  WHEN 'roll_neon_rings' THEN 275000
  WHEN 'roll_pixelate' THEN 375000
  WHEN 'roll_smoke' THEN 85000
  WHEN 'roll_sparkles' THEN 190000
  WHEN 'streak_freeze' THEN 50000
END;

INSERT INTO public.meta (key, value)
VALUES ('shop_catalog_snapshot', '2026-07-10-live-79-items')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
