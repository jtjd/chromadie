-- Sync the linked Supabase project to the launch catalog pricing.
-- This is a data-only migration because the earlier snapshot migration had already
-- been applied before the catalog repricing was finalized.

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
  WHEN 'title_founder' THEN 0
END;
