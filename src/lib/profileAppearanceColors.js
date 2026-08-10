/**
 * The editor's color-role contract. Keeping the field/path mapping outside the
 * component makes the matrix, active picker, and tests use the same source of
 * truth instead of drifting into separate role lists.
 */
export const PROFILE_APPEARANCE_COLOR_FIELDS = Object.freeze([
  Object.freeze({ key: 'text', label: 'Profile text', path: Object.freeze(['colors', 'text']) }),
  Object.freeze({ key: 'accent', label: 'Accent', path: Object.freeze(['colors', 'accent']) }),
  Object.freeze({ key: 'secondaryText', label: 'Handle & metadata', path: Object.freeze(['colors', 'secondaryText']) }),
  Object.freeze({ key: 'surface', label: 'Profile surface', path: Object.freeze(['colors', 'surface']) }),
  Object.freeze({ key: 'username', label: 'Username', path: Object.freeze(['colors', 'username']) }),
  Object.freeze({ key: 'surfaceTint', label: 'Surface tint', path: Object.freeze(['colors', 'highlight']) }),
  Object.freeze({ key: 'description', label: 'Bio text', path: Object.freeze(['colors', 'description']) }),
  Object.freeze({ key: 'border', label: 'Border', path: Object.freeze(['border', 'color']) }),
  Object.freeze({ key: 'background', label: 'Page background', path: Object.freeze(['colors', 'background']) })
]);

export const PROFILE_APPEARANCE_COLOR_PALETTE = Object.freeze([
  '#f5e0dc', '#b4befe', '#fab387', '#f5c2e7', '#cba6f7', '#a6adc8',
  '#9399b2', '#7f849c', '#6c7086', '#585b70', '#45475a'
]);

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function getProfileAppearanceColorField(key) {
  return PROFILE_APPEARANCE_COLOR_FIELDS.find(field => field.key === key) || PROFILE_APPEARANCE_COLOR_FIELDS[0];
}

export function getProfileAppearanceColorValue(appearance, key, fallback = '#000000') {
  const field = getProfileAppearanceColorField(key);
  const value = field.path.reduce((current, segment) => current?.[segment], appearance);
  return HEX_COLOR_PATTERN.test(String(value || '')) ? String(value).toUpperCase() : fallback;
}

export function setProfileAppearanceColor(appearance, key, value) {
  const field = getProfileAppearanceColorField(key);
  const next = JSON.parse(JSON.stringify(appearance || {}));
  let cursor = next;
  for (let index = 0; index < field.path.length - 1; index += 1) {
    const segment = field.path[index];
    if (!cursor[segment] || typeof cursor[segment] !== 'object') cursor[segment] = {};
    cursor = cursor[segment];
  }
  cursor[field.path[field.path.length - 1]] = String(value || '').toUpperCase();
  return next;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

/** Return HSV channels as h: 0–360 and s/v: 0–1. */
export function hexToHsv(value) {
  const hex = HEX_COLOR_PATTERN.test(String(value || '')) ? String(value).slice(1) : '000000';
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return {
    h: hue,
    s: maximum === 0 ? 0 : delta / maximum,
    v: maximum
  };
}

/** Convert HSV channels (h: 0–360, s/v: 0–1) to a normalized hex value. */
export function hsvToHex({ h = 0, s = 0, v = 0 }) {
  const hue = ((Number(h) % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const value = clamp(v, 0, 1);
  const chroma = value * saturation;
  const sector = hue / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const match = value - chroma;
  let red;
  let green;
  let blue;
  if (sector < 1) [red, green, blue] = [chroma, x, 0];
  else if (sector < 2) [red, green, blue] = [x, chroma, 0];
  else if (sector < 3) [red, green, blue] = [0, chroma, x];
  else if (sector < 4) [red, green, blue] = [0, x, chroma];
  else if (sector < 5) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];
  return `#${[red, green, blue]
    .map(channel => Math.round((channel + match) * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

export function getHueColor(value) {
  const { h } = hexToHsv(value);
  return hsvToHex({ h, s: 1, v: 1 });
}
