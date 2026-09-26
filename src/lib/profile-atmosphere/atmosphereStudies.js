/** Public metadata only; painters are loaded with the decorative renderer. */
export const ATMOSPHERE_STUDIES = Object.freeze([
  { key: 'aurora-veil', label: 'Aurora Veil', collection: 'Nocturne', rarity: 'Epic', description: 'Emerald and violet curtains fold across a star-strewn polar sky.' },
  { key: 'abyssal-bloom', label: 'Abyssal Bloom', collection: 'Prism', rarity: 'Epic', description: 'Luminous jellyfish breathe and trail delicate filaments through deep blue water.' },
  { key: 'astral-orbit', label: 'Astral Orbit', collection: 'Nocturne', rarity: 'Epic', description: 'A ringed sapphire world turns beneath fine orbital arcs and distant stars.' },
  { key: 'lantern-festival', label: 'Lantern Festival', collection: 'Ember', rarity: 'Rare', description: 'Warm paper lanterns rise at different depths, carrying little wishes into the night.' },
  { key: 'firefly-grove', label: 'Firefly Grove', collection: 'Archive', rarity: 'Rare', description: 'Fern fronds sway around a grove of wandering golden fireflies.' },
  { key: 'opal-tide', label: 'Opal Tide', collection: 'Prism', rarity: 'Epic', description: 'Iridescent contour waves fold into a fluid sculpture of coral, turquoise, and pearl.' },
  { key: 'retro-horizon', label: 'Retro Horizon', collection: 'Signal', rarity: 'Rare', description: 'A striped neon sunset hangs above a drifting perspective grid and violet mountains.' },
  { key: 'lunar-moths', label: 'Lunar Moths', collection: 'Nocturne', rarity: 'Epic', description: 'Engraved moon phases and silvery luna moths trace a nocturnal reverie.' },
  { key: 'koi-reverie', label: 'Koi Reverie', collection: 'Archive', rarity: 'Epic', description: 'Vermilion and pearl koi circle lily pads beneath widening water rings.' },
  { key: 'kinetic-studio', label: 'Kinetic Studio', collection: 'Signal', rarity: 'Rare', description: 'Cobalt, tangerine, and citron mobiles balance in a playful geometric composition.' }
].map(definition => Object.freeze(definition)));

export { ATMOSPHERE_STUDY_KEYS } from './atmosphereKeys.js';
