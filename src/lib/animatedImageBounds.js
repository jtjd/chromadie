export const ANIMATED_IMAGE_LIMITS = Object.freeze({
  maxWidth: 1024,
  maxHeight: 1024,
  maxCanvasPixels: 1024 * 1024,
  maxFrames: 60,
  maxDecodedPixelWork: 12 * 1024 * 1024
});

function ascii(bytes, value, offset) {
  if (offset < 0 || offset + value.length > bytes.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

function readU16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU24(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function limitsResult(width, height, frames, pixelWork) {
  return {
    width,
    height,
    frames,
    pixelWork,
    valid: width > 0
      && height > 0
      && width <= ANIMATED_IMAGE_LIMITS.maxWidth
      && height <= ANIMATED_IMAGE_LIMITS.maxHeight
      && width * height <= ANIMATED_IMAGE_LIMITS.maxCanvasPixels
      && frames > 1
      && frames <= ANIMATED_IMAGE_LIMITS.maxFrames
      && pixelWork <= ANIMATED_IMAGE_LIMITS.maxDecodedPixelWork
  };
}

function skipGifSubBlocks(bytes, offset) {
  let cursor = offset;
  while (cursor < bytes.length) {
    const size = bytes[cursor++];
    if (size === 0) return cursor;
    cursor += size;
    if (cursor > bytes.length) return -1;
  }
  return -1;
}

function inspectGif(bytes) {
  if (!(ascii(bytes, 'GIF87a', 0) || ascii(bytes, 'GIF89a', 0)) || bytes.length < 14) return null;
  const width = readU16(bytes, 6);
  const height = readU16(bytes, 8);
  const packed = bytes[10];
  let offset = 13 + ((packed & 0x80) ? 3 * (2 ** ((packed & 0x07) + 1)) : 0);
  if (offset > bytes.length) return null;
  let frames = 0;
  let pixelWork = 0;
  const canvasPixels = width * height;

  while (offset < bytes.length) {
    const block = bytes[offset];
    if (block === 0x3b) break;
    if (block === 0x21) {
      offset = skipGifSubBlocks(bytes, offset + 2);
      if (offset < 0) return null;
      continue;
    }
    if (block !== 0x2c || offset + 10 > bytes.length) return null;
    const left = readU16(bytes, offset + 1);
    const top = readU16(bytes, offset + 3);
    const frameWidth = readU16(bytes, offset + 5);
    const frameHeight = readU16(bytes, offset + 7);
    const imageFlags = bytes[offset + 9];
    if (!frameWidth || !frameHeight || left + frameWidth > width || top + frameHeight > height) return null;
    frames += 1;
    pixelWork += Math.max(canvasPixels, frameWidth * frameHeight);
    if (frames > ANIMATED_IMAGE_LIMITS.maxFrames || pixelWork > ANIMATED_IMAGE_LIMITS.maxDecodedPixelWork) {
      return limitsResult(width, height, frames, pixelWork);
    }
    offset += 10;
    if (imageFlags & 0x80) offset += 3 * (2 ** ((imageFlags & 0x07) + 1));
    if (offset >= bytes.length) return null;
    offset += 1; // LZW minimum code size
    offset = skipGifSubBlocks(bytes, offset);
    if (offset < 0) return null;
  }
  return limitsResult(width, height, frames, pixelWork);
}

function inspectWebp(bytes) {
  if (!ascii(bytes, 'RIFF', 0) || !ascii(bytes, 'WEBP', 8) || bytes.length < 30) return null;
  let width = 0;
  let height = 0;
  let frames = 0;
  let pixelWork = 0;
  let animated = false;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const chunkSize = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkSize;
    if (chunkSize < 0 || dataEnd > bytes.length) return null;
    if (chunkType === 'VP8X') {
      if (chunkSize < 10) return null;
      animated = Boolean(bytes[dataStart] & 0x02);
      width = readU24(bytes, dataStart + 4) + 1;
      height = readU24(bytes, dataStart + 7) + 1;
    } else if (chunkType === 'ANMF') {
      if (chunkSize < 16) return null;
      const x = readU24(bytes, dataStart) * 2;
      const y = readU24(bytes, dataStart + 3) * 2;
      const frameWidth = readU24(bytes, dataStart + 6) + 1;
      const frameHeight = readU24(bytes, dataStart + 9) + 1;
      if (!width || !height || x + frameWidth > width || y + frameHeight > height) return null;
      frames += 1;
      pixelWork += Math.max(width * height, frameWidth * frameHeight);
      if (frames > ANIMATED_IMAGE_LIMITS.maxFrames || pixelWork > ANIMATED_IMAGE_LIMITS.maxDecodedPixelWork) {
        return limitsResult(width, height, frames, pixelWork);
      }
    } else if (chunkType === 'ANIM') {
      animated = true;
    }
    offset = dataEnd + (chunkSize % 2);
  }
  return animated ? limitsResult(width, height, frames, pixelWork) : null;
}

/** Inspect animation headers before browser decode and before public promotion. */
export function inspectAnimatedImageBounds(value, mimeType = '') {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  const mime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  const result = mime === 'image/gif' || ascii(bytes, 'GIF87a', 0) || ascii(bytes, 'GIF89a', 0)
    ? inspectGif(bytes)
    : mime === 'image/webp' || (ascii(bytes, 'RIFF', 0) && ascii(bytes, 'WEBP', 8))
      ? inspectWebp(bytes)
      : null;
  return result || { width: 0, height: 0, frames: 0, pixelWork: 0, valid: false };
}
