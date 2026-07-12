const UNSAFE_STYLE_PATTERN = /(?:url|image-set|-webkit-image-set|cross-fade|element|paint|src)\s*\(|@import|expression\s*\(|javascript\s*:|https?\s*:|data\s*:|behavior\s*:|-moz-binding|\/\//i;
const SAFE_CLASS_PATTERN = /^[A-Za-z0-9 _-]{1,160}$/;
const SAFE_STYLE_PROPERTIES = new Set([
  '-webkit-background-clip',
  'animation',
  'backdrop-filter',
  'background',
  'background-clip',
  'background-color',
  'background-image',
  'background-position',
  'background-repeat',
  'background-size',
  'border',
  'box-shadow',
  'color',
  'font-style',
  'font-variant',
  'letter-spacing',
  'text-shadow'
]);

export function sanitizeCosmeticClass(value) {
  return typeof value === 'string' && SAFE_CLASS_PATTERN.test(value) ? value : '';
}

export function sanitizeCosmeticStyle(value) {
  const style = typeof value === 'string' ? value.trim() : '';
  if (!style || style.length > 2000 || UNSAFE_STYLE_PATTERN.test(style)) return '';
  const declarations = style.split(';').map(declaration => declaration.trim()).filter(Boolean);
  if (!declarations.length || declarations.some(declaration => {
    const separator = declaration.indexOf(':');
    if (separator <= 0) return true;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const propertyValue = declaration.slice(separator + 1).trim();
    return !SAFE_STYLE_PROPERTIES.has(property) || !propertyValue || /[{}<>]/.test(propertyValue);
  })) return '';
  return style;
}
