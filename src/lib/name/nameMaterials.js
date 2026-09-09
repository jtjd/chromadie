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

  // Curated composable materials. The colors are intentionally code-owned
  // and bounded; the renderer derives daily-color variants from todayColor.
  'glass-emboss': composableMaterial('glass-emboss', 'glass-emboss', ['#00DDFF', '#6500FF', '#FF00BB'], {
    label: 'Raised Glass', collection: 'Prism', rarity: 'Epic'
  }),
  'carbon-cut': composableMaterial('carbon-cut', 'carbon-cut', ['#CC00FF', '#210A38', '#7300C9'], {
    label: 'Carbon Vein', collection: 'Nocturne', rarity: 'Rare'
  }),
  'neon-tube': composableMaterial('neon-tube', 'neon-tube', ['#FF00B8', '#FF66E0', '#460030'], {
    label: 'Afterglow', collection: 'Signal', rarity: 'Epic', usesDailyColor: true
  }),
  'velvet-ink': composableMaterial('velvet-ink', 'velvet-ink', ['#FF0062', '#650026', '#FF39AA'], {
    label: 'Soft Black', collection: 'Ember', rarity: 'Rare'
  }),
  'engraved-stone': composableMaterial('engraved-stone', 'engraved-stone', ['#FFAE00', '#692000', '#FFEA00'], {
    label: 'Quarry Mark', collection: 'Nocturne', rarity: 'Rare'
  }),
  'crt-phosphor': composableMaterial('crt-phosphor', 'crt-phosphor', ['#39FF00', '#00FF88', '#06451C'], {
    label: 'Cathode Bloom', collection: 'Static Bloom', rarity: 'Epic'
  }),
  'blueprint-ink': composableMaterial('blueprint-ink', 'blueprint-ink', ['#0077FF', '#00E5FF', '#003697'], {
    label: 'Draftline', collection: 'Signal', rarity: 'Rare'
  }),
  'halo-edge': composableMaterial('halo-edge', 'halo-edge', ['#f7fbff'], {
    label: 'Soft Halo', collection: 'Prism', rarity: 'Rare'
  })
});

export const LEGACY_NAME_MATERIAL_ALIASES = Object.freeze({
  'polished-chrome': 'carbon-cut',
  'copper-press': 'velvet-ink',
  'fine-outline': 'blueprint-ink',
  'ink-bleed': 'blueprint-ink',
  'pearl-foil': 'glass-emboss',
  'frosted-edge': 'glass-emboss',
  'holographic-film': 'glass-emboss',
  'cut-paper': 'blueprint-ink',
  'liquid-mercury': 'glass-emboss',
  'oil-slick': 'glass-emboss',
  'thermal-ink': 'neon-tube',
  'embroidered-thread': 'blueprint-ink',
  'gold-leaf': 'neon-tube',
  'chroma-glass': 'neon-tube',
  'ceramic-glaze': 'velvet-ink'
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
  const normalized = Object.prototype.hasOwnProperty.call(NAME_MATERIALS, candidate) ? candidate : normalizedNamespaced;
  if (Object.prototype.hasOwnProperty.call(NAME_MATERIALS, normalized) && NAME_MATERIALS[normalized].composable) return normalized;
  return LEGACY_NAME_MATERIAL_ALIASES[normalized] || 'plain';
}

export function resolveNameMaterialKey(materialKey) {
  return canonicalMaterialKey(materialKey);
}

export function getNameMaterial(materialKey) {
  return NAME_MATERIALS[canonicalMaterialKey(materialKey)] || NAME_MATERIALS.plain;
}
