import { normalizeHexColor } from './utils.js';

/** Choose readable system text for an owner or gameplay-selected hex color. */
export function getReadableTextColor(value) {
  const hex = normalizeHexColor(value, '#FFFFFF').slice(1);
  const channels = [0, 2, 4].map(offset => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  return luminance > 0.179 ? '#0E0E10' : '#FFFFFF';
}
