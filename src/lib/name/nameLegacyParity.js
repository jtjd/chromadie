import { LEGACY_NAME_EFFECT_KEYS } from './nameCatalog.js';

/*
 * Internal parity fixture only. These values describe the old catalog CSS so
 * the QA harness can place it beside the code-owned renderer. Production
 * components must not import this module or apply these classes/styles.
 */
const LEGACY_CSS = Object.freeze({
  name_prism_atelier: { style: 'color: transparent; background: linear-gradient(90deg, #6ee7f9, #c4b5fd, #f9a8d4); -webkit-background-clip: text; background-clip: text; text-shadow: 0 0 18px rgba(196,181,253,0.65);' },
  name_drop_shadow: { className: 'name_drop_shadow' },
  name_italic: { style: 'font-style: italic; color: #fff;' },
  name_glow_blue: { style: 'text-shadow: 0 0 10px #3498db; color: #fff;' },
  name_glow_green: { style: 'text-shadow: 0 0 10px #2ecc71; color: #fff;' },
  name_smallcaps: { style: 'font-variant: small-caps; color: #fff; letter-spacing: 1px;' },
  name_glow_purple: { style: 'text-shadow: 0 0 10px #9b59b6; color: #fff;' },
  name_glow_red: { style: 'text-shadow: 0 0 10px #ff4c4c; color: #fff;' },
  name_glow_pink_neon: { style: 'text-shadow: 0 0 5px #ff00de, 0 0 10px #ff00de; color: #fff;' },
  name_glow_gold: { style: 'text-shadow: 0 0 15px #f1c40f; color: #fff;' },
  name_gradient_purple: { style: 'background: linear-gradient(45deg, #8E2DE2, #4A00E0); -webkit-background-clip: text; background-clip: text; color: transparent;' },
  name_gradient_fire: { style: 'background: linear-gradient(45deg, #f12711, #f5af19); -webkit-background-clip: text; background-clip: text; color: transparent;' },
  name_ice: { style: 'background: linear-gradient(45deg, #a1c4fd, #c2e9fb); -webkit-background-clip: text; background-clip: text; color: transparent;' },
  name_toxic: { style: 'background: linear-gradient(45deg, #43e97b, #38f9d7); -webkit-background-clip: text; background-clip: text; color: transparent;' },
  name_slow_pulse: { className: 'slow-pulse-name-anim' },
  name_signal: { className: 'name-signal-anim' },
  name_flicker_neon: { className: 'flicker-neon-anim' },
  name_matrix_rain: { className: 'matrix-rain-anim' },
  name_rainbow: { className: 'rainbow-text-anim' },
  name_diamond_shimmer: { className: 'diamond-shimmer-anim' },
  name_holographic: { className: 'name_holographic' },
  name_pulsing_glow: { className: 'pulsing-glow-anim' },
  name_shining_gold: { className: 'shining-gold-anim' },
  name_glitch_effect: { className: 'glitch-anim' },
  name_ocean_wave: { className: 'ocean-wave-anim' },
  name_inferno: { className: 'inferno-name-anim' },
  name_sunset_blur: { className: 'sunset-blur-anim' },
  name_void: { className: 'name_void' },
  name_chroma: { className: 'chroma-name-anim' }
});

const PARITY = Object.freeze({
  name_prism_atelier: { classification: 'needs refinement', note: 'Canvas preserves the cyan-lilac-pink prism and sweep, but the old CSS blur and exact gradient clipping are intentionally approximated.' },
  name_drop_shadow: { classification: 'strong parity', note: 'Fixed white text and deep shadow are reproduced by the drop-shadow material.' },
  name_italic: { classification: 'strong parity', note: 'Uses the local high-contrast italic font fallback.' },
  name_glow_blue: { classification: 'strong parity', note: 'Fixed blue glow palette is preserved.' },
  name_glow_green: { classification: 'strong parity', note: 'Fixed green glow palette is preserved.' },
  name_smallcaps: { classification: 'strong parity', note: 'Small-caps and compact mono treatment are preserved.' },
  name_glow_purple: { classification: 'strong parity', note: 'Fixed purple glow palette is preserved.' },
  name_glow_red: { classification: 'strong parity', note: 'Fixed red glow palette is preserved.' },
  name_glow_pink_neon: { classification: 'strong parity', note: 'Fixed pink neon palette is preserved.' },
  name_glow_gold: { classification: 'strong parity', note: 'Fixed gold glow palette is preserved.' },
  name_gradient_purple: { classification: 'strong parity', note: 'The legacy purple gradient is rendered as a code-owned canvas gradient.' },
  name_gradient_fire: { classification: 'strong parity', note: 'The legacy fire gradient is rendered as a code-owned canvas gradient.' },
  name_ice: { classification: 'strong parity', note: 'The pale blue ice gradient is preserved.' },
  name_toxic: { classification: 'strong parity', note: 'The acid green/cyan gradient is preserved.' },
  name_slow_pulse: { classification: 'strong parity', note: 'Pulse timing remains bounded and uses the shared clock.' },
  name_signal: { classification: 'strong parity', note: 'Lime/amber signal sweep remains deterministic.' },
  name_flicker_neon: { classification: 'strong parity', note: 'Teal neon flicker remains deterministic rather than per-component CSS animation.' },
  name_matrix_rain: { classification: 'acceptable reinterpretation', note: 'Deterministic phosphor scan particles replace the old repeating gradient and pseudo-element.' },
  name_rainbow: { classification: 'strong parity', note: 'The shared chroma/rainbow sweep preserves the animated spectrum treatment.' },
  name_diamond_shimmer: { classification: 'strong parity', note: 'White/cyan diamond shimmer is preserved.' },
  name_holographic: { classification: 'acceptable reinterpretation', note: 'The silver-cyan holographic sweep is preserved without the old CSS filter stack.' },
  name_pulsing_glow: { classification: 'strong parity', note: 'Purple glow pulse remains tied to the shared clock.' },
  name_shining_gold: { classification: 'strong parity', note: 'Gold sweep and highlight remain deterministic.' },
  name_glitch_effect: { classification: 'acceptable reinterpretation', note: 'Cyan/magenta offset slices are deterministic and bounded rather than CSS jitter.' },
  name_ocean_wave: { classification: 'acceptable reinterpretation', note: 'Blue wave motion and highlight are preserved without the old pseudo-stroke.' },
  name_inferno: { classification: 'acceptable reinterpretation', note: 'Hot highlight and orange glow are preserved with fewer stacked shadows.' },
  name_sunset_blur: { classification: 'needs refinement', note: 'The sunset palette and skew remain, but the old multi-filter blur and pseudo-stroke are intentionally reduced.' },
  name_void: { classification: 'needs refinement', note: 'The near-black cyan-violet edge treatment remains, but the old pseudo-element lensing is not pixel-identical.' },
  name_chroma: { classification: 'strong parity', note: 'The high-energy spectral sweep is preserved through the shared chroma motion.' }
});

export const LEGACY_NAME_PARITY = Object.freeze(LEGACY_NAME_EFFECT_KEYS.map(key => Object.freeze({
  key,
  className: LEGACY_CSS[key]?.className || '',
  style: LEGACY_CSS[key]?.style || '',
  classification: PARITY[key]?.classification || 'needs refinement',
  note: PARITY[key]?.note || 'No parity note recorded.'
})));

const PARITY_BY_KEY = new Map(LEGACY_NAME_PARITY.map(entry => [entry.key, entry]));

export function getLegacyNameParity(key) {
  return PARITY_BY_KEY.get(String(key || '')) || null;
}
