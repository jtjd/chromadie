const SOURCE_IMAGE_LIMITS = Object.freeze({
  maxWidth: 8192,
  maxHeight: 8192,
  maxPixels: 32_000_000
});

const STATIC_WEBP_LIMITS = Object.freeze({
  avatar: Object.freeze({ maxWidth: 800, maxHeight: 800, maxPixels: 640_000 }),
  background: Object.freeze({ maxWidth: 3200, maxHeight: 3200, maxPixels: 10_240_000 }),
  banner: Object.freeze({ maxWidth: 3200, maxHeight: 3200, maxPixels: 10_240_000 }),
  cursor: Object.freeze({ maxWidth: 128, maxHeight: 128, maxPixels: 16_384 }),
  pointer_cursor: Object.freeze({ maxWidth: 128, maxHeight: 128, maxPixels: 16_384 })
});

const SHARE_IMAGE_LIMITS = Object.freeze({ maxWidth: 1200, maxHeight: 630, maxPixels: 756_000 });
const JPEG_SOURCE_LIMITS = Object.freeze({ maxWidth: 8192, maxHeight: 8192, maxPixels: 32_000_000 });
const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

function ascii(bytes, value, offset) {
  if (offset < 0 || offset + value.length > bytes.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

function u16le(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u24le(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function u32le(bytes, offset) {
  return bytes[offset]
    + bytes[offset + 1] * 0x100
    + bytes[offset + 2] * 0x10000
    + bytes[offset + 3] * 0x1000000;
}

function u32be(bytes, offset) {
  return bytes[offset] * 0x1000000
    + bytes[offset + 1] * 0x10000
    + bytes[offset + 2] * 0x100
    + bytes[offset + 3];
}

function u16be(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

/** @param {{maxWidth: number, maxHeight: number, maxPixels: number}} [limits] */
function dimensionsResult(width, height, limits = SOURCE_IMAGE_LIMITS) {
  return {
    width,
    height,
    valid: Number.isSafeInteger(width)
      && Number.isSafeInteger(height)
      && width > 0
      && height > 0
      && width <= limits.maxWidth
      && height <= limits.maxHeight
      && width * height <= limits.maxPixels
  };
}

function parseVp8Dimensions(bytes, start, end) {
  if (start + 10 > end || bytes[start] & 1) return null;
  if (bytes[start + 3] !== 0x9d || bytes[start + 4] !== 0x01 || bytes[start + 5] !== 0x2a) return null;
  return {
    width: u16le(bytes, start + 6) & 0x3fff,
    height: u16le(bytes, start + 8) & 0x3fff
  };
}

function parseVp8lDimensions(bytes, start, end) {
  if (start + 5 > end || bytes[start] !== 0x2f || (bytes[start + 4] >> 5) !== 0) return null;
  const width = 1 + bytes[start + 1] + ((bytes[start + 2] & 0x3f) << 8);
  const height = 1 + (bytes[start + 2] >> 6) + (bytes[start + 3] << 2) + ((bytes[start + 4] & 0x0f) << 10);
  return { width, height };
}

/** Read dimensions from the WebP canvas and its encoded VP8/VP8L frame. */
export function inspectStaticWebpBounds(value, kind) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  const limits = STATIC_WEBP_LIMITS[kind];
  if (!limits || bytes.length < 20 || !ascii(bytes, 'RIFF', 0) || !ascii(bytes, 'WEBP', 8)) {
    return { width: 0, height: 0, valid: false, animated: false };
  }
  if (u32le(bytes, 4) + 8 !== bytes.length) return { width: 0, height: 0, valid: false, animated: false };

  let canvas = null;
  let frame = null;
  let animated = false;
  let chunkCount = 0;
  for (let offset = 12; offset < bytes.length;) {
    if (++chunkCount > 4096 || offset + 8 > bytes.length) return { width: 0, height: 0, valid: false, animated };
    const type = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = u32le(bytes, offset + 4);
    const start = offset + 8;
    const end = start + size;
    const paddedEnd = end + (size & 1);
    if (end > bytes.length || paddedEnd > bytes.length) return { width: 0, height: 0, valid: false, animated };

    if (type === 'VP8X') {
      if (offset !== 12 || size < 10 || canvas) return { width: 0, height: 0, valid: false, animated };
      animated = Boolean(bytes[start] & 0x02);
      canvas = { width: u24le(bytes, start + 4) + 1, height: u24le(bytes, start + 7) + 1 };
    } else if (type === 'VP8 ' || type === 'VP8L') {
      if (frame) return { width: 0, height: 0, valid: false, animated };
      frame = type === 'VP8 '
        ? parseVp8Dimensions(bytes, start, end)
        : parseVp8lDimensions(bytes, start, end);
      if (!frame) return { width: 0, height: 0, valid: false, animated };
    } else if (type === 'ANIM' || type === 'ANMF') {
      animated = true;
    }
    offset = paddedEnd;
  }

  if (!frame || animated || (canvas && (canvas.width !== frame.width || canvas.height !== frame.height))) {
    return { width: frame?.width || canvas?.width || 0, height: frame?.height || canvas?.height || 0, valid: false, animated };
  }
  const width = Math.max(frame.width, canvas?.width || 0);
  const height = Math.max(frame.height, canvas?.height || 0);
  return { ...dimensionsResult(width, height, limits), animated: false };
}

/** Parse JPEG dimensions from the SOF marker before image decode or delivery. */
function parseJpegDimensions(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  let dimensions = null;
  let markerCount = 0;
  while (offset < bytes.length && ++markerCount <= 8192) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = u16be(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (dimensions || segmentLength < 8) return null;
      dimensions = { width: u16be(bytes, offset + 5), height: u16be(bytes, offset + 3) };
      break;
    }
    offset += segmentLength;
  }
  return dimensions;
}

/** Parse JPEG dimensions using the cap for the relevant image pipeline. */
export function inspectJpegBounds(value, kind = 'share_image') {
  const limits = kind === 'share_image' ? SHARE_IMAGE_LIMITS : null;
  const dimensions = limits && parseJpegDimensions(value);
  return dimensions ? dimensionsResult(dimensions.width, dimensions.height, limits) : { width: 0, height: 0, valid: false };
}

/** Parse the dimensions of JPEG, PNG, or WebP user input before browser decode. */
export function inspectRasterImageSourceBounds(value, mimeType = '') {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  const mime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  if (mime === 'image/webp' || (ascii(bytes, 'RIFF', 0) && ascii(bytes, 'WEBP', 8))) {
    const result = inspectSourceWebp(bytes);
    return result ? dimensionsResult(result.width, result.height, SOURCE_IMAGE_LIMITS) : { width: 0, height: 0, valid: false };
  }
  if (mime === 'image/jpeg' || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
    const result = parseJpegDimensions(bytes);
    return result ? dimensionsResult(result.width, result.height, JPEG_SOURCE_LIMITS) : { width: 0, height: 0, valid: false };
  }
  if (mime === 'image/png' || (bytes.length >= 24 && ascii(bytes, '\x89PNG\r\n\x1a\n', 0))) {
    if (bytes.length < 24 || !ascii(bytes, '\x89PNG\r\n\x1a\n', 0) || u32be(bytes, 8) !== 13 || !ascii(bytes, 'IHDR', 12)) {
      return { width: 0, height: 0, valid: false };
    }
    const width = (bytes[16] * 0x1000000) + (bytes[17] << 16) + (bytes[18] << 8) + bytes[19];
    const height = (bytes[20] * 0x1000000) + (bytes[21] << 16) + (bytes[22] << 8) + bytes[23];
    const bounds = dimensionsResult(width, height, SOURCE_IMAGE_LIMITS);
    if (!bounds.valid) return bounds;
    // APNG carries an acTL chunk before IDAT. Reject it before `Image` can
    // animate/decode source frames; the image conversion flow accepts stills.
    let offset = 8;
    let chunks = 0;
    let foundImageData = false;
    while (offset + 12 <= bytes.length && ++chunks <= 4096) {
      const size = u32be(bytes, offset);
      const end = offset + 12 + size;
      if (end > bytes.length) return { width: 0, height: 0, valid: false };
      if (ascii(bytes, 'acTL', offset + 4)) return { width, height, valid: false };
      if (ascii(bytes, 'IDAT', offset + 4)) {
        foundImageData = true;
        break;
      }
      if (ascii(bytes, 'IEND', offset + 4)) break;
      offset = end;
    }
    return foundImageData ? bounds : { width: 0, height: 0, valid: false };
  }
  return { width: 0, height: 0, valid: false };
}

function inspectSourceWebp(bytes) {
  if (bytes.length < 20 || !ascii(bytes, 'RIFF', 0) || !ascii(bytes, 'WEBP', 8) || u32le(bytes, 4) + 8 !== bytes.length) return null;
  let width = 0;
  let height = 0;
  let canvas = null;
  let frameCount = 0;
  for (let offset = 12, chunks = 0; offset < bytes.length;) {
    if (++chunks > 4096 || offset + 8 > bytes.length) return null;
    const type = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = u32le(bytes, offset + 4);
    const start = offset + 8;
    const end = start + size;
    const paddedEnd = end + (size & 1);
    if (end > bytes.length || paddedEnd > bytes.length) return null;
    if (type === 'VP8X') {
      if (size < 10 || offset !== 12 || (bytes[start] & 0x02)) return null;
      canvas = { width: u24le(bytes, start + 4) + 1, height: u24le(bytes, start + 7) + 1 };
    } else if (type === 'VP8 ' || type === 'VP8L') {
      const frame = type === 'VP8 '
        ? parseVp8Dimensions(bytes, start, end)
        : parseVp8lDimensions(bytes, start, end);
      if (!frame) return null;
      width = Math.max(width, frame.width);
      height = Math.max(height, frame.height);
      frameCount += 1;
    } else if (type === 'ANIM' || type === 'ANMF') {
      return null;
    }
    offset = paddedEnd;
  }
  if (frameCount !== 1 || !width || !height || (canvas && (canvas.width !== width || canvas.height !== height))) return null;
  return { width, height };
}
