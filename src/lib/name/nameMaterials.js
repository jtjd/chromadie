/*
 * Materials are intentionally declarative. The renderer owns how each kind is
 * drawn; these definitions only select approved, fixed palettes.
 */

const material = (key, kind, colors, extra = {}) => Object.freeze({
  key,
  kind,
  colors: Object.freeze([...colors]),
  ...extra
});

export const NAME_MATERIALS = Object.freeze({
  plain: material('plain', 'solid', ['#f7fbff'], { usesDailyColor: true }),
  'drop-shadow': material('drop-shadow', 'solid', ['#ffffff'], { shadow: '#000000' }),
  'glow-blue': material('glow-blue', 'glow', ['#eefaff', '#57dcff', '#0b8cff']),
  'glow-green': material('glow-green', 'glow', ['#f3ffe9', '#8dff86', '#00c878']),
  'glow-purple': material('glow-purple', 'glow', ['#fffaff', '#c095ff', '#783dff']),
  'glow-red': material('glow-red', 'glow', ['#fff3f4', '#ff718b', '#d41246']),
  'glow-pink': material('glow-pink', 'glow', ['#fff4fc', '#ff8edb', '#ff299d']),
  'glow-gold': material('glow-gold', 'glow', ['#fffce8', '#ffd76a', '#bd7623']),
  'gradient-purple': material('gradient-purple', 'gradient', ['#8a5cff', '#e66cff', '#6b85ff']),
  'gradient-fire': material('gradient-fire', 'gradient', ['#fff0a4', '#ff8a3d', '#e93838']),
  'gradient-ice': material('gradient-ice', 'gradient', ['#f7ffff', '#8deaff', '#3a77ff']),
  'gradient-toxic': material('gradient-toxic', 'gradient', ['#efffa2', '#b7fd4d', '#00a862']),
  'slow-blue': material('slow-blue', 'glow', ['#eef7ff', '#a9cfff', '#6db2ff']),
  signal: material('signal', 'gradient', ['#b7fd4d', '#f4f8ea', '#ffb86b']),
  neon: material('neon', 'glow', ['#eaffff', '#8bfff5', '#00ffd5']),
  matrix: material('matrix', 'matrix', ['#e8ffe8', '#00ff66', '#008a31', '#043b17']),
  rainbow: material('rainbow', 'gradient', ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#0088ff', '#8800ff', '#ff0000']),
  diamond: material('diamond', 'gradient', ['#ffffff', '#b9fcff', '#ffffff', '#b9fcff', '#ffffff']),
  holographic: material('holographic', 'gradient', ['#e4e7f2', '#ffffff', '#9ce4ff', '#d7ffff', '#ff84d8', '#ffffff', '#d8ddf0']),
  gold: material('gold', 'gradient', ['#bf953f', '#fcf6ba', '#b38728', '#fbf5b7', '#b38728', '#fcf6ba', '#bf953f']),
  ocean: material('ocean', 'gradient', ['#b9fbff', '#27d7ff', '#006dff', '#73f4ff', '#0048b8', '#b9fbff']),
  sunset: material('sunset', 'gradient', ['#8d2bff', '#ff3d81', '#ff6b35', '#ffd36a', '#ff5a76', '#8d2bff']),
  inferno: material('inferno', 'solid', ['#ffffff'], { shadow: '#ff4500' }),
  void: material('void', 'void', ['#010104', '#f5f1ff', '#8b5cff', '#6ee7ff']),
  chroma: material('chroma', 'gradient', ['#ff335f', '#ff8a00', '#fff44f', '#48ff8b', '#00dcff', '#8f5bff', '#ff335f']),
  atelier: material('atelier', 'gradient', ['#8cecff', '#ff9ee9', '#fff0a8', '#9ce4ff', '#ff84d8', '#8cecff'])
});

export function getNameMaterial(materialKey) {
  return NAME_MATERIALS[materialKey] || NAME_MATERIALS.plain;
}
