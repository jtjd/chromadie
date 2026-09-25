const MAX_CURSOR_DIMENSION = 128;
const MAX_CURSOR_FRAMES = 60;
const MAX_CURSOR_STEPS = 600;

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

function pngCrc32(bytes, start, end) {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validPngBitDepth(colorType, bitDepth) {
  const allowed = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16]
  }[colorType];
  return Boolean(allowed?.includes(bitDepth));
}

function parsePngImageDimensions(bytes, offset, end) {
  if (end - offset < 8 || !ascii(bytes, '\x89PNG\r\n\x1a\n', offset)) return null;
  let cursor = offset + 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = 0;
  let sawHeader = false;
  let sawPalette = false;
  let sawImageData = false;
  let imageDataEnded = false;
  let imageDataBytes = 0;
  let sawEnd = false;

  while (cursor < end) {
    if (cursor + 12 > end) return null;
    const chunkLength = u32be(bytes, cursor);
    const typeOffset = cursor + 4;
    const dataOffset = cursor + 8;
    const chunkEnd = dataOffset + chunkLength;
    const nextChunk = chunkEnd + 4;
    if (chunkEnd > end || nextChunk > end) return null;
    const type = String.fromCharCode(...bytes.subarray(typeOffset, typeOffset + 4));
    if (pngCrc32(bytes, typeOffset, chunkEnd) !== u32be(bytes, chunkEnd)) return null;
    if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') return null;

    if (!sawHeader) {
      if (type !== 'IHDR' || chunkLength !== 13) return null;
      width = u32be(bytes, dataOffset);
      height = u32be(bytes, dataOffset + 4);
      bitDepth = bytes[dataOffset + 8];
      colorType = bytes[dataOffset + 9];
      if (!width || !height || !validPngBitDepth(colorType, bitDepth)
        || bytes[dataOffset + 10] !== 0 || bytes[dataOffset + 11] !== 0
        || bytes[dataOffset + 12] > 1) return null;
      sawHeader = true;
    } else if (type === 'IHDR') {
      return null;
    } else if (type === 'PLTE') {
      if (sawImageData || sawPalette || chunkLength === 0 || chunkLength % 3 !== 0 || chunkLength > 768
        || colorType === 0 || colorType === 4
        || (colorType === 3 && chunkLength / 3 > 2 ** bitDepth)) return null;
      sawPalette = true;
    } else if (type === 'IDAT') {
      if (imageDataEnded) return null;
      if (chunkLength) {
        sawImageData = true;
        imageDataBytes += chunkLength;
      }
    } else if (type === 'IEND') {
      if (chunkLength !== 0 || !sawImageData || !imageDataBytes || (colorType === 3 && !sawPalette)) return null;
      sawEnd = true;
      cursor = nextChunk;
      break;
    } else {
      if (sawImageData) imageDataEnded = true;
      // PNG readers must reject unknown critical chunks.
      if (bytes[typeOffset] >= 0x41 && bytes[typeOffset] <= 0x5a) return null;
    }

    if (sawImageData && type !== 'IDAT') imageDataEnded = true;
    cursor = nextChunk;
  }

  if (!sawHeader || !sawImageData || !sawEnd || cursor !== end) return null;
  return { width, height };
}

function parseDibImageDimensions(bytes, offset, end) {
  const size = end - offset;
  if (size < 12) return null;
  const headerSize = u32le(bytes, offset);
  let width;
  let doubledHeight;
  let planes;
  let bitCount;
  let colorsUsed = 0;
  let paletteEntrySize;
  let pixelOffset;
  if (headerSize === 12) {
    width = u16le(bytes, offset + 4);
    doubledHeight = u16le(bytes, offset + 6);
    planes = u16le(bytes, offset + 8);
    bitCount = u16le(bytes, offset + 10);
    paletteEntrySize = 3;
    pixelOffset = offset + headerSize;
  } else {
    // The sizes below are the documented Windows bitmap information headers.
    if (![40, 52, 56, 108, 124].includes(headerSize) || headerSize > size) return null;
    width = u32le(bytes, offset + 4);
    doubledHeight = u32le(bytes, offset + 8);
    planes = u16le(bytes, offset + 12);
    bitCount = u16le(bytes, offset + 14);
    const compression = u32le(bytes, offset + 16);
    colorsUsed = u32le(bytes, offset + 32);
    paletteEntrySize = 4;
    pixelOffset = offset + headerSize;
    if (width > 0x7fffffff || doubledHeight > 0x7fffffff) return null;

    if (compression === 3 || compression === 6) {
      if (bitCount !== 16 && bitCount !== 32) return null;
      const requiredMaskCount = compression === 6 ? 4 : 3;
      if (headerSize === 40) {
        const masksSize = requiredMaskCount * 4;
        if (pixelOffset + masksSize > end) return null;
        pixelOffset += masksSize;
      } else if (headerSize < (requiredMaskCount === 4 ? 56 : 52)) {
        return null;
      }
    } else if (compression !== 0) {
      // Compressed DIBs are uncommon for cursor images. Reject them because
      // their plane boundaries cannot be verified from dimensions alone.
      return null;
    }
  }

  if (!width || width > MAX_CURSOR_DIMENSION || !doubledHeight || doubledHeight % 2 !== 0
    || planes !== 1 || ![1, 4, 8, 16, 24, 32].includes(bitCount)) return null;
  const height = doubledHeight / 2;
  if (!height || height > MAX_CURSOR_DIMENSION) return null;

  const maxPaletteEntries = bitCount <= 8 ? 2 ** bitCount : 256;
  const paletteEntries = colorsUsed || (bitCount <= 8 ? 2 ** bitCount : 0);
  if (paletteEntries > maxPaletteEntries) return null;
  pixelOffset += paletteEntries * paletteEntrySize;

  const xorStride = Math.ceil((width * bitCount) / 32) * 4;
  const andStride = Math.ceil(width / 32) * 4;
  const xorBytes = xorStride * height;
  const andBytes = andStride * height;
  const pixelEnd = pixelOffset + xorBytes + andBytes;
  if (!Number.isSafeInteger(pixelEnd) || pixelEnd > end) return null;
  const declaredImageSize = headerSize === 12 ? 0 : u32le(bytes, offset + 20);
  if (declaredImageSize && declaredImageSize < xorBytes) return null;
  return { width, height };
}

function parseIconImageDimensions(bytes, offset, size) {
  const end = offset + size;
  if (size < 12 || end > bytes.length) return null;
  if (ascii(bytes, '\x89PNG\r\n\x1a\n', offset)) return parsePngImageDimensions(bytes, offset, end);
  return parseDibImageDimensions(bytes, offset, end);
}

function parseIconResource(bytes, start, end) {
  if (end - start < 6 || u16le(bytes, start) !== 0) return null;
  const type = u16le(bytes, start + 2);
  const count = u16le(bytes, start + 4);
  if ((type !== 1 && type !== 2) || count < 1 || count > 16 || start + 6 + count * 16 > end) return null;

  let width = 0;
  let height = 0;
  for (let index = 0; index < count; index += 1) {
    const entry = start + 6 + index * 16;
    const entryWidth = bytes[entry] || 256;
    const entryHeight = bytes[entry + 1] || 256;
    const imageSize = u32le(bytes, entry + 8);
    const imageOffset = u32le(bytes, entry + 12);
    const imageStart = start + imageOffset;
    const imageEnd = imageStart + imageSize;
    if (entryWidth > MAX_CURSOR_DIMENSION || entryHeight > MAX_CURSOR_DIMENSION
      || imageSize < 12 || imageStart < start + 6 + count * 16 || imageEnd > end) return null;
    const image = parseIconImageDimensions(bytes, imageStart, imageSize);
    if (!image || image.width !== entryWidth || image.height !== entryHeight
      || image.width > MAX_CURSOR_DIMENSION || image.height > MAX_CURSOR_DIMENSION) return null;
    width = Math.max(width, image.width);
    height = Math.max(height, image.height);
  }
  return { width, height };
}

function parseFrameList(bytes, chunkStart, chunkEnd) {
  if (chunkEnd - chunkStart < 4 || !ascii(bytes, 'fram', chunkStart)) return null;
  const frames = [];
  let offset = chunkStart + 4;
  while (offset < chunkEnd) {
    if (offset + 8 > chunkEnd || frames.length >= MAX_CURSOR_FRAMES) return null;
    const type = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = u32le(bytes, offset + 4);
    const start = offset + 8;
    const end = start + size;
    const paddedEnd = end + (size & 1);
    if (end > chunkEnd || paddedEnd > chunkEnd) return null;
    if (type === 'icon') {
      const dimensions = parseIconResource(bytes, start, end);
      if (!dimensions) return null;
      frames.push(dimensions);
    }
    offset = paddedEnd;
  }
  return frames.length ? frames : null;
}

/** Parse the ANI header and every embedded cursor image before publication. */
export function inspectAnimatedCursorBounds(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  if (bytes.length < 56 || !ascii(bytes, 'RIFF', 0) || !ascii(bytes, 'ACON', 8)
    || u32le(bytes, 4) + 8 !== bytes.length) {
    return { width: 0, height: 0, frameCount: 0, stepCount: 0, valid: false };
  }

  let header = null;
  let frames = null;
  let sequence = null;
  let offset = 12;
  let chunkCount = 0;
  while (offset < bytes.length) {
    if (++chunkCount > 4096 || offset + 8 > bytes.length) break;
    const type = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = u32le(bytes, offset + 4);
    const start = offset + 8;
    const end = start + size;
    const paddedEnd = end + (size & 1);
    if (end > bytes.length || paddedEnd > bytes.length) break;

    if (type === 'anih') {
      if (header || size < 36) break;
      const declaredSize = u32le(bytes, start);
      if (declaredSize < 36 || declaredSize > size) break;
      header = {
        frameCount: u32le(bytes, start + 4),
        stepCount: u32le(bytes, start + 8),
        width: u32le(bytes, start + 12),
        height: u32le(bytes, start + 16),
        flags: u32le(bytes, start + 32)
      };
    } else if (type === 'LIST') {
      if (size < 4 || !ascii(bytes, 'fram', start)) break;
      if (frames) break;
      frames = parseFrameList(bytes, start, end);
      if (!frames) break;
    } else if (type === 'seq ') {
      if (sequence || size % 4 !== 0 || size / 4 > MAX_CURSOR_STEPS) break;
      sequence = [];
      for (let index = start; index < end; index += 4) sequence.push(u32le(bytes, index));
    }
    offset = paddedEnd;
  }

  const validStructure = offset === bytes.length && header && frames
    && header.frameCount >= 1 && header.frameCount <= MAX_CURSOR_FRAMES
    && header.stepCount >= 1 && header.stepCount <= MAX_CURSOR_STEPS
    && frames.length === header.frameCount
    && Boolean(header.flags & 0x01)
    && (!sequence || (sequence.length === header.stepCount && sequence.every(index => index < header.frameCount)));
  if (!validStructure) return { width: 0, height: 0, frameCount: frames?.length || 0, stepCount: header?.stepCount || 0, valid: false };

  const width = Math.max(...frames.map(frame => frame.width));
  const height = Math.max(...frames.map(frame => frame.height));
  const consistentFrames = frames.every(frame => frame.width === frames[0].width && frame.height === frames[0].height);
  const headerMatches = (!header.width && !header.height)
    || (header.width === frames[0].width && header.height === frames[0].height);
  return {
    width,
    height,
    frameCount: frames.length,
    stepCount: header.stepCount,
    valid: consistentFrames && headerMatches && width <= MAX_CURSOR_DIMENSION && height <= MAX_CURSOR_DIMENSION
  };
}
