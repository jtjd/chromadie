// Finite, code-owned material definitions. Rich artwork stays in the lazy renderer.
const material = (key, label, colors, collection = 'Prism', rarity = 'Epic', animated = true, usesDailyColor = false) => Object.freeze({
  key, kind: key === 'plain' ? 'solid' : key, label, colors: Object.freeze(colors.split(' ')),
  collection, rarity, composable: true, animated, usesDailyColor,
  durationMs: animated ? 12000 : 0
});

export const NAME_MATERIALS = Object.freeze(Object.fromEntries([
  material("plain", "Plain", "#f7fbff", "Baseline", "Free", false, true),
  material("glass-emboss", "Dewdrop", "#E8FFFF #58CBD8 #B8FFF1"),
  material("carbon-cut", "Violet Glow", "#E9CEFF #B578FF #F0ADFF", "Nocturne", "Rare"),
  material("neon-tube", "Neon Rose", "#FF53C8 #FFE4F6 #D749A3", "Signal"),
  material("velvet-ink", "Rose Dust", "#FFD4EA #EC639C #FFACD0", "Ember", "Rare"),
  material("engraved-stone", "Sunlit", "#FFFFDF #FFE35C #FFB765", "Nocturne", "Rare"),
  material("crt-phosphor", "Cathode Bloom", "#39FF00 #0F8 #06451C", "Static Bloom", "Epic", false),
  material("blueprint-ink", "Blue Bloom", "#D8F5FF #9BC8FF #DFDCFF", "Signal", "Rare"),
  material("halo-edge", "Soft Halo", "#f7fbff", "Prism", "Rare", false),
  material("mercury-polish", "Silver Sparkle", "#FFF #D8E3FF #F7F5FF"),
  material("gilded-leaf", "Pixie Dust", "#F5FFD0 #BDF778 #6BEBB2", "Archive"),
  material("opal-lustre", "Opaline", "#FEF5FF #DACBFF #D5FFFF"),
  material("prism-dispersion", "Colorflow", "#FF9ADE #B2FF94 #9FAEFF", "Prism", "Anomaly"),
  material("aurora-weave", "Aurora", "#B9FFDC #42DFAE #9AA8FF", "Signal"),
  material("ember-enamel", "Peach Fizz", "#FFF1B9 #FFA78E #FF7BBD", "Ember"),
  material("ocean-caustic", "Lagoon", "#B8FFFA #41CCE6 #74AFFF"),
  material("glacier-cut", "Frosted", "#FFF #D4FAFF #91E2FF", "Signal", "Rare"),
  material("rose-satin", "Sugarcoat", "#FFF1FA #FFB9E2 #F383C8", "Ember", "Rare"),
  material("stardust-ink", "Stardust", "#B3A0FF #7966D3 #A4BDFF", "Nocturne"),
  material("porcelain-lacquer", "Moonstone", "#FFF #E4E0FF #BCBAF2", "Archive", "Rare"),
  material("candy-shell", "Daydream", "#FFF #FF94DB #8BE6FF", "Prism", "Rare")
].map(definition => [definition.key, definition])));

export const LEGACY_NAME_MATERIAL_ALIASES = Object.freeze(Object.fromEntries([
  ['carbon-cut', 'polished-chrome'],
  ['velvet-ink', 'copper-press ceramic-glaze'],
  ['blueprint-ink', 'fine-outline ink-bleed cut-paper embroidered-thread'],
  ['glass-emboss', 'pearl-foil frosted-edge holographic-film liquid-mercury oil-slick'],
  ['neon-tube', 'thermal-ink gold-leaf chroma-glass']
].flatMap(([key, aliases]) => aliases.split(' ').map(alias => [alias, key]))));

export const NAME_MATERIAL_KEYS = Object.freeze(Object.keys(NAME_MATERIALS));
export const NAME_COMPOSABLE_MATERIAL_KEYS = NAME_MATERIAL_KEYS;
export const NAME_PAID_MATERIAL_KEYS = Object.freeze(
  NAME_COMPOSABLE_MATERIAL_KEYS.filter(key => key !== 'plain')
);

function canonicalMaterialKey(materialKey) {
  if (typeof materialKey !== 'string') return 'plain';
  const key = materialKey.trim().replace(/^name_material_/, '').replaceAll('_', '-');
  if (Object.hasOwn(NAME_MATERIALS, key)) return key;
  return Object.hasOwn(LEGACY_NAME_MATERIAL_ALIASES, key) ? LEGACY_NAME_MATERIAL_ALIASES[key] : 'plain';
}

export function resolveNameMaterialKey(materialKey) {
  return canonicalMaterialKey(materialKey);
}

export function getNameMaterial(materialKey) {
  return NAME_MATERIALS[canonicalMaterialKey(materialKey)];
}
