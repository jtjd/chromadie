/*
 * Materials are declarative, finite renderer inputs. The renderer owns how
 * each primitive is drawn; these definitions only select approved palettes
 * and bounded behavior. No catalog row can provide CSS, shader code, or
 * arbitrary Canvas commands.
 */

const material = (key, kind, colors, extra = {}) => Object.freeze({
  key,
  kind,
  colors: Object.freeze([...colors]),
  composable: false,
  ...extra
});

const composableMaterial = (key, kind, colors, extra = {}) => material(key, kind, colors, {
  composable: true,
  ...extra
});

export const NAME_MATERIALS = Object.freeze({
  plain: composableMaterial('plain', 'solid', ['#f7fbff'], {
    usesDailyColor: true,
    label: 'Plain',
    collection: 'Baseline',
    rarity: 'Free'
  }),

  // Phase D1 composable materials. The colors are intentionally code-owned
  // and bounded; the renderer derives daily-color variants from todayColor.
  'polished-chrome': composableMaterial('polished-chrome', 'polished-chrome', ['#626771', '#e7ebef', '#777d87', '#ffffff', '#9ca3ad', '#e7ebef'], {
    label: 'Polished Chrome', collection: 'Nocturne', rarity: 'Epic'
  }),
  'copper-press': composableMaterial('copper-press', 'copper-press', ['#efc09a', '#a95637', '#e08d5d', '#6f3321'], {
    label: 'Copper Press', collection: 'Ember', rarity: 'Rare'
  }),
  'glass-emboss': composableMaterial('glass-emboss', 'glass-emboss', ['#dae8ff', '#7da0dc', '#f6fbff'], {
    label: 'Glass Emboss', collection: 'Prism', rarity: 'Epic'
  }),
  'fine-outline': composableMaterial('fine-outline', 'fine-outline', ['#efede7', '#cdd2ff'], {
    label: 'Fine Outline', collection: 'Archive', rarity: 'Uncommon'
  }),
  'ink-bleed': composableMaterial('ink-bleed', 'ink-bleed', ['#e7e1d7', '#857b72', '#332b2b'], {
    label: 'Ink Bleed', collection: 'Archive', rarity: 'Rare'
  }),
  'pearl-foil': composableMaterial('pearl-foil', 'pearl-foil', ['#f7f5fb', '#d8e8f3', '#f0dfe9', '#dcece7', '#f6efdf'], {
    label: 'Pearl Foil', collection: 'Prism', rarity: 'Epic'
  }),
  'carbon-cut': composableMaterial('carbon-cut', 'carbon-cut', ['#838993', '#17191f', '#d3d8e2'], {
    label: 'Carbon Cut', collection: 'Nocturne', rarity: 'Rare'
  }),
  'frosted-edge': composableMaterial('frosted-edge', 'frosted-edge', ['#e7effe', '#ffffff', '#b8d2ff'], {
    label: 'Frosted Edge', collection: 'Signal', rarity: 'Rare'
  }),
  'holographic-film': composableMaterial('holographic-film', 'holographic-film', ['#8fd8e8', '#c2b7e8', '#e3b8cc', '#ddd3a6', '#a9d8ca', '#8fd8e8'], {
    label: 'Holographic Film', collection: 'Prism', rarity: 'Anomaly'
  }),
  'cut-paper': composableMaterial('cut-paper', 'cut-paper', ['#716a63', '#e8e1d6', '#b3a89a'], {
    label: 'Cut Paper', collection: 'Archive', rarity: 'Rare'
  }),
  'neon-tube': composableMaterial('neon-tube', 'neon-tube', ['#f7eaf2', '#ffffff', '#d84b8e'], {
    label: 'Neon Tube', collection: 'Signal', rarity: 'Epic', usesDailyColor: true
  }),
  'liquid-mercury': composableMaterial('liquid-mercury', 'liquid-mercury', ['#31343b', '#eef1f5', '#555a64', '#ffffff', '#24272d', '#cfd3d9'], {
    label: 'Liquid Mercury', collection: 'Nocturne', rarity: 'Anomaly', usesDailyColor: true
  }),
  'oil-slick': composableMaterial('oil-slick', 'oil-slick', ['#161a24', '#564078', '#187078', '#9c7044', '#32224e', '#161a24'], {
    label: 'Oil Slick', collection: 'Prism', rarity: 'Epic'
  }),
  'thermal-ink': composableMaterial('thermal-ink', 'thermal-ink', ['#24123a', '#5d4dd7', '#2bc4c9', '#f3d34a', '#d84b8e'], {
    label: 'Thermal Ink', collection: 'Signal', rarity: 'Epic', usesDailyColor: true
  }),
  'velvet-ink': composableMaterial('velvet-ink', 'velvet-ink', ['#3c172a', '#ffb4d2', '#6c294e'], {
    label: 'Velvet Ink', collection: 'Ember', rarity: 'Rare'
  }),
  'embroidered-thread': composableMaterial('embroidered-thread', 'embroidered-thread', ['#d9d0c7', '#8f8275', '#f7eadb'], {
    label: 'Embroidered Thread', collection: 'Archive', rarity: 'Epic'
  }),
  'engraved-stone': composableMaterial('engraved-stone', 'engraved-stone', ['#666b72', '#292c31', '#c4c8cf'], {
    label: 'Engraved Stone', collection: 'Nocturne', rarity: 'Rare'
  }),
  'crt-phosphor': composableMaterial('crt-phosphor', 'crt-phosphor', ['#9df5c3', '#5cff9a', '#043b17'], {
    label: 'CRT Phosphor', collection: 'Static Bloom', rarity: 'Epic'
  }),
  'gold-leaf': composableMaterial('gold-leaf', 'gold-leaf', ['#5c3d0b', '#f7dc7b', '#a86d11', '#ffe59a', '#6f470c'], {
    label: 'Gold Leaf', collection: 'Archive', rarity: 'Anomaly'
  }),
  'chroma-glass': composableMaterial('chroma-glass', 'chroma-glass', ['#ff335f', '#ff8a00', '#fff44f', '#48ff8b', '#00dcff', '#8f5bff'], {
    label: 'Chroma Glass', collection: 'Prism', rarity: 'Epic', usesDailyColor: true
  }),
  'ceramic-glaze': composableMaterial('ceramic-glaze', 'ceramic-glaze', ['#fff1e9', '#d88463', '#8b3d2f', '#4a1c18'], {
    label: 'Ceramic Glaze', collection: 'Ember', rarity: 'Epic'
  }),
  'blueprint-ink': composableMaterial('blueprint-ink', 'blueprint-ink', ['#7ec7ff', '#d8efff', '#6eb1e3'], {
    label: 'Blueprint Ink', collection: 'Signal', rarity: 'Rare'
  })
});

export const NAME_MATERIAL_KEYS = Object.freeze(Object.keys(NAME_MATERIALS));
export const NAME_COMPOSABLE_MATERIAL_KEYS = Object.freeze(
  NAME_MATERIAL_KEYS.filter(key => NAME_MATERIALS[key].composable)
);
export const NAME_PAID_MATERIAL_KEYS = Object.freeze(
  NAME_COMPOSABLE_MATERIAL_KEYS.filter(key => key !== 'plain')
);

function canonicalMaterialKey(materialKey) {
  if (typeof materialKey !== 'string') return 'plain';
  const candidate = materialKey.trim();
  if (Object.prototype.hasOwnProperty.call(NAME_MATERIALS, candidate) && NAME_MATERIALS[candidate].composable) return candidate;
  const prefix = 'name_material_';
  const namespaced = candidate.startsWith(prefix) ? candidate.slice(prefix.length) : '';
  const normalizedNamespaced = namespaced.replaceAll('_', '-');
  return Object.prototype.hasOwnProperty.call(NAME_MATERIALS, normalizedNamespaced) && NAME_MATERIALS[normalizedNamespaced].composable
    ? normalizedNamespaced
    : 'plain';
}

export function resolveNameMaterialKey(materialKey) {
  return canonicalMaterialKey(materialKey);
}

export function getNameMaterial(materialKey) {
  const candidate = typeof materialKey === 'string' && Object.prototype.hasOwnProperty.call(NAME_MATERIALS, materialKey.trim())
    ? materialKey.trim()
    : canonicalMaterialKey(materialKey);
  return NAME_MATERIALS[candidate] || NAME_MATERIALS.plain;
}
