/*
 * The legacy item keys are compatibility identifiers, not replacement product
 * ids. Keeping this table explicit makes ownership and entitlement behavior
 * independent from the future composable catalog.
 */

const preset = (key, font, material, motion, extra = {}) => Object.freeze({
  key,
  kind: 'legacy',
  font,
  material,
  motion,
  ...extra
});

export const NAME_LEGACY_PRESETS = Object.freeze({
  name_prism_atelier: preset('name_prism_atelier', 'soft-grotesk', 'atelier', 'atelier', {
    premiumEntitlementKey: 'name_prism_atelier'
  }),
  name_drop_shadow: preset('name_drop_shadow', 'soft-grotesk', 'drop-shadow', 'none'),
  name_italic: preset('name_italic', 'high-contrast-italic', 'plain', 'none'),
  name_glow_blue: preset('name_glow_blue', 'soft-grotesk', 'glow-blue', 'none'),
  name_glow_green: preset('name_glow_green', 'soft-grotesk', 'glow-green', 'none'),
  name_smallcaps: preset('name_smallcaps', 'mono-compact', 'plain', 'none', { smallCaps: true }),
  name_glow_purple: preset('name_glow_purple', 'soft-grotesk', 'glow-purple', 'none'),
  name_glow_red: preset('name_glow_red', 'soft-grotesk', 'glow-red', 'none'),
  name_glow_pink_neon: preset('name_glow_pink_neon', 'soft-grotesk', 'glow-pink', 'none'),
  name_glow_gold: preset('name_glow_gold', 'soft-grotesk', 'glow-gold', 'none'),
  name_gradient_purple: preset('name_gradient_purple', 'soft-grotesk', 'gradient-purple', 'none'),
  name_gradient_fire: preset('name_gradient_fire', 'soft-grotesk', 'gradient-fire', 'none'),
  name_ice: preset('name_ice', 'soft-grotesk', 'gradient-ice', 'none'),
  name_toxic: preset('name_toxic', 'soft-grotesk', 'gradient-toxic', 'none'),
  name_slow_pulse: preset('name_slow_pulse', 'soft-grotesk', 'slow-blue', 'pulse'),
  name_signal: preset('name_signal', 'soft-grotesk', 'signal', 'signal'),
  name_flicker_neon: preset('name_flicker_neon', 'soft-grotesk', 'neon', 'flicker'),
  name_matrix_rain: preset('name_matrix_rain', 'mono-compact', 'matrix', 'matrix'),
  name_rainbow: preset('name_rainbow', 'soft-grotesk', 'rainbow', 'rainbow'),
  name_diamond_shimmer: preset('name_diamond_shimmer', 'soft-grotesk', 'diamond', 'shimmer'),
  name_holographic: preset('name_holographic', 'soft-grotesk', 'holographic', 'shimmer'),
  name_pulsing_glow: preset('name_pulsing_glow', 'soft-grotesk', 'glow-purple', 'pulse'),
  name_shining_gold: preset('name_shining_gold', 'soft-grotesk', 'gold', 'shimmer'),
  name_glitch_effect: preset('name_glitch_effect', 'soft-grotesk', 'plain', 'glitch'),
  name_ocean_wave: preset('name_ocean_wave', 'soft-grotesk', 'ocean', 'wave'),
  name_inferno: preset('name_inferno', 'soft-grotesk', 'inferno', 'inferno'),
  name_sunset_blur: preset('name_sunset_blur', 'soft-grotesk', 'sunset', 'sunset'),
  name_void: preset('name_void', 'soft-grotesk', 'void', 'void'),
  name_chroma: preset('name_chroma', 'soft-grotesk', 'chroma', 'chroma')
});

export const LEGACY_NAME_EFFECT_KEYS = Object.freeze(Object.keys(NAME_LEGACY_PRESETS));

export function getLegacyNamePreset(itemKey) {
  return NAME_LEGACY_PRESETS[itemKey] || null;
}
