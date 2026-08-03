-- Refresh the display vocabulary for the composable Name catalog.
--
-- Renderer keys, item keys, prices, rarities, and descriptions are unchanged.
-- This is intentionally a label-only migration so existing purchases and
-- equipped profiles keep resolving to the same effects.

UPDATE public.shop_items AS item
SET name = labels.name
FROM (VALUES
  ('name_font_editorial_serif', 'Velvet Antiqua'),
  ('name_font_condensed_sans', 'Narrowcast'),
  ('name_font_wide_geometric', 'Monument'),
  ('name_font_mono_compact', 'Fixed Point'),
  ('name_font_rounded_mono', 'Soft Circuit'),
  ('name_font_soft_grotesk', 'Lowlight'),
  ('name_font_humanist_display', 'Paper Lantern'),
  ('name_font_modern_fraktur', 'Black Cathedral'),
  ('name_font_pixel_display', 'Raster Bloom'),
  ('name_font_high_contrast_italic', 'Razor Script'),
  ('name_font_neo_slab', 'Foundry Slab'),
  ('name_font_reverse_contrast', 'Split Serif'),
  ('name_font_industrial_stencil', 'Cutline'),
  ('name_font_futurist_extended', 'Longwave'),
  ('name_font_terminal_bitmap', 'Greenroom'),
  ('name_font_rounded_display', 'Soft Orbit'),
  ('name_font_marker_tag', 'Handstamp'),
  ('name_font_newspaper_black', 'Front Page'),
  ('name_material_polished_chrome', 'Cold Mirror'),
  ('name_material_copper_press', 'Oxide Press'),
  ('name_material_glass_emboss', 'Raised Glass'),
  ('name_material_fine_outline', 'Hairline'),
  ('name_material_ink_bleed', 'Wet Type'),
  ('name_material_pearl_foil', 'Mother of Pearl'),
  ('name_material_carbon_cut', 'Carbon Vein'),
  ('name_material_frosted_edge', 'Ice Line'),
  ('name_material_holographic_film', 'Spectral Film'),
  ('name_material_cut_paper', 'Scissorwork'),
  ('name_material_neon_tube', 'Afterglow'),
  ('name_material_liquid_mercury', 'Quicksilver'),
  ('name_material_oil_slick', 'Spillway'),
  ('name_material_thermal_ink', 'Heat Map'),
  ('name_material_velvet_ink', 'Soft Black'),
  ('name_material_embroidered_thread', 'Threadwork'),
  ('name_material_engraved_stone', 'Quarry Mark'),
  ('name_material_crt_phosphor', 'Cathode Bloom'),
  ('name_material_gold_leaf', 'Gilded'),
  ('name_material_chroma_glass', 'Color Prism'),
  ('name_material_ceramic_glaze', 'Kiln Glow'),
  ('name_material_blueprint_ink', 'Draftline'),
  ('name_motion_velvet_sweep', 'Satin Pass'),
  ('name_motion_refraction_sweep', 'Split Light'),
  ('name_motion_ghost_offset', 'Double Exposure'),
  ('name_motion_focus_resolve', 'Come Into Focus'),
  ('name_motion_mask_reveal', 'Curtain Lift'),
  ('name_motion_quiet_afterimage', 'Residual'),
  ('name_motion_soft_rise', 'Lift Off'),
  ('name_motion_scanline_reveal', 'Scan In'),
  ('name_motion_particle_drift', 'Dustfall'),
  ('name_motion_letter_shuffle', 'Scramble'),
  ('name_motion_fuzzy_signal', 'Ghost Frequency'),
  ('name_motion_typewriter_name', 'Keyed In'),
  ('name_motion_chromatic_ripple', 'Color Wake'),
  ('name_motion_liquid_fill', 'Floodline'),
  ('name_motion_pixel_dissolve', 'Rasterfall'),
  ('name_motion_echo_collapse', 'Convergence'),
  ('name_motion_heat_shimmer', 'Mirage'),
  ('name_motion_signal_lock', 'Lockstep'),
  ('name_motion_letter_cascade', 'Typefall'),
  ('name_motion_orbiting_spark', 'Perihelion'),
  ('name_motion_color_memory', 'Archive Loop'),
  ('name_motion_daily_pulse', 'Solar Return'),
  ('name_motion_prism_shatter', 'Facet Break'),
  ('name_motion_ink_spread', 'Bloomline')
) AS labels(item_key, name)
WHERE item.item_key = labels.item_key;

DO $$
DECLARE
  refreshed_count integer;
BEGIN
  SELECT count(*) INTO refreshed_count
  FROM public.shop_items
  WHERE item_key IN (
    'name_font_editorial_serif', 'name_font_condensed_sans',
    'name_font_wide_geometric', 'name_font_mono_compact',
    'name_font_rounded_mono', 'name_font_soft_grotesk',
    'name_font_humanist_display', 'name_font_modern_fraktur',
    'name_font_pixel_display', 'name_font_high_contrast_italic',
    'name_font_neo_slab', 'name_font_reverse_contrast',
    'name_font_industrial_stencil', 'name_font_futurist_extended',
    'name_font_terminal_bitmap', 'name_font_rounded_display',
    'name_font_marker_tag', 'name_font_newspaper_black',
    'name_material_polished_chrome', 'name_material_copper_press',
    'name_material_glass_emboss', 'name_material_fine_outline',
    'name_material_ink_bleed', 'name_material_pearl_foil',
    'name_material_carbon_cut', 'name_material_frosted_edge',
    'name_material_holographic_film', 'name_material_cut_paper',
    'name_material_neon_tube', 'name_material_liquid_mercury',
    'name_material_oil_slick', 'name_material_thermal_ink',
    'name_material_velvet_ink', 'name_material_embroidered_thread',
    'name_material_engraved_stone', 'name_material_crt_phosphor',
    'name_material_gold_leaf', 'name_material_chroma_glass',
    'name_material_ceramic_glaze', 'name_material_blueprint_ink',
    'name_motion_velvet_sweep', 'name_motion_refraction_sweep',
    'name_motion_ghost_offset', 'name_motion_focus_resolve',
    'name_motion_mask_reveal', 'name_motion_quiet_afterimage',
    'name_motion_soft_rise', 'name_motion_scanline_reveal',
    'name_motion_particle_drift', 'name_motion_letter_shuffle',
    'name_motion_fuzzy_signal', 'name_motion_typewriter_name',
    'name_motion_chromatic_ripple', 'name_motion_liquid_fill',
    'name_motion_pixel_dissolve', 'name_motion_echo_collapse',
    'name_motion_heat_shimmer', 'name_motion_signal_lock',
    'name_motion_letter_cascade', 'name_motion_orbiting_spark',
    'name_motion_color_memory', 'name_motion_daily_pulse',
    'name_motion_prism_shatter', 'name_motion_ink_spread'
  );

  IF refreshed_count <> 64 THEN
    RAISE EXCEPTION 'Expected 64 composable Name catalog rows, found %', refreshed_count;
  END IF;
END
$$;
