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
  'glass-emboss': composableMaterial('glass-emboss', 'glass-emboss', ['#dae8ff', '#7da0dc', '#f6fbff'], {
    label: 'Raised Glass', collection: 'Prism', rarity: 'Epic'
  }),
  'carbon-cut': composableMaterial('carbon-cut', 'carbon-cut', ['#aab3c0', '#2b3038', '#e2e8f0'], {
    label: 'Carbon Vein', collection: 'Nocturne', rarity: 'Rare'
  }),
  'neon-tube': composableMaterial('neon-tube', 'neon-tube', ['#f7eaf2', '#ffffff', '#d84b8e'], {
    label: 'Afterglow', collection: 'Signal', rarity: 'Epic', usesDailyColor: true
  }),
  'velvet-ink': composableMaterial('velvet-ink', 'velvet-ink', ['#5b2b43', '#ffb4d2', '#8d4669'], {
    label: 'Soft Black', collection: 'Ember', rarity: 'Rare'
  }),
  'engraved-stone': composableMaterial('engraved-stone', 'engraved-stone', ['#9aa1aa', '#353a40', '#e2e6eb'], {
    label: 'Quarry Mark', collection: 'Nocturne', rarity: 'Rare'
  }),
  'crt-phosphor': composableMaterial('crt-phosphor', 'crt-phosphor', ['#9df5c3', '#5cff9a', '#043b17'], {
    label: 'Cathode Bloom', collection: 'Static Bloom', rarity: 'Epic'
  }),
  'blueprint-ink': composableMaterial('blueprint-ink', 'blueprint-ink', ['#7ec7ff', '#d8efff', '#6eb1e3'], {
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
