import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  inspectJpegBounds,
  inspectRasterImageSourceBounds,
  inspectStaticWebpBounds
} from '../src/lib/profileImageBounds.js';
import { inspectAnimatedCursorBounds } from '../src/lib/animatedCursorBounds.js';
import { validateProfileMediaSignature } from '../functions/_profileMediaControl.js';
import { processProfileImage } from '../src/lib/profileMediaProcessing.js';

const fixture = name => readFile(new URL(`./fixtures/profile-media/${name}`, import.meta.url));

function le16(value) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function le24(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff];
}

function le32(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function be16(value) {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function be32(value) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function pngCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(name, payload) {
  const typeAndPayload = Uint8Array.from([...Buffer.from(name), ...payload]);
  return [...be32(payload.length), ...typeAndPayload, ...be32(pngCrc32(typeAndPayload))];
}

function pngWithValidAnimationControl(bytes) {
  const insertionOffset = 33;
  const animationControl = pngChunk('acTL', [0, 0, 0, 2, 0, 0, 0, 0]);
  return Uint8Array.from([
    ...bytes.subarray(0, insertionOffset),
    ...animationControl,
    ...bytes.subarray(insertionOffset)
  ]);
}

function webpChunk(name, payload) {
  return [
    ...Buffer.from(name),
    ...le32(payload.length),
    ...payload,
    ...(payload.length & 1 ? [0] : [])
  ];
}

function staticWebp(width, height, { animated = false, frameWidth = width, frameHeight = height } = {}) {
  const extended = webpChunk('VP8X', [
    animated ? 0x02 : 0,
    0, 0, 0,
    ...le24(width - 1),
    ...le24(height - 1)
  ]);
  const frame = webpChunk('VP8 ', [
    0, 0, 0, 0x9d, 0x01, 0x2a,
    ...le16(frameWidth),
    ...le16(frameHeight)
  ]);
  const payload = [...Buffer.from('WEBP'), ...extended, ...frame];
  return Uint8Array.from([...Buffer.from('RIFF'), ...le32(payload.length), ...payload]);
}

function jpeg(width, height) {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0, ...be16(11),
    8, ...be16(height), ...be16(width),
    1, 1, 0x11, 0,
    0xff, 0xda, 0, 2
  ]);
}

function pngWithAnimationChunk(bytes) {
  const source = [...bytes];
  const offset = 33;
  const actl = [0, 0, 0, 8, ...Buffer.from('acTL'), 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0];
  source.splice(offset, 0, ...actl);
  return Uint8Array.from(source);
}

function aniIconResource(width, height, image) {
  const resource = new Uint8Array(6 + 16 + image.length);
  resource.set(le16(0), 0);
  resource.set(le16(2), 2);
  resource.set(le16(1), 4);
  resource[6] = width === 256 ? 0 : width;
  resource[7] = height === 256 ? 0 : height;
  resource.set(le16(1), 10);
  resource.set(le16(32), 12);
  resource.set(le32(image.length), 14);
  resource.set(le32(22), 18);
  resource.set(image, 22);
  return resource;
}

function aniIcon(width, height, { truncated = false } = {}) {
  const doubledHeight = height * 2;
  const xorBytes = Math.ceil((width * 32) / 32) * 4 * height;
  const andBytes = Math.ceil(width / 32) * 4 * height;
  const dib = new Uint8Array(40 + (truncated ? 8 : xorBytes + andBytes));
  dib.set(le32(40), 0);
  dib.set(le32(width), 4);
  dib.set(le32(doubledHeight), 8);
  dib.set(le16(1), 12);
  dib.set(le16(32), 14);
  dib.set(le32(xorBytes), 20);
  return aniIconResource(width, height, dib);
}

function aniChunk(name, payload) {
  return Uint8Array.from([
    ...Buffer.from(name), ...le32(payload.length), ...payload,
    ...(payload.length & 1 ? [0] : [])
  ]);
}

function validAni(width = 64, height = 64, { icons, stepCount = 1 } = {}) {
  const frameIcons = icons || [aniIcon(width, height)];
  const header = new Uint8Array(36);
  header.set(le32(36), 0);
  header.set(le32(frameIcons.length), 4);
  header.set(le32(stepCount), 8);
  header.set(le32(width), 12);
  header.set(le32(height), 16);
  header.set(le32(32), 20);
  header.set(le32(1), 24);
  header.set(le32(6), 28);
  header.set(le32(1), 32);
  const frameList = Uint8Array.from([
    ...Buffer.from('fram'),
    ...frameIcons.flatMap(icon => [...aniChunk('icon', icon)])
  ]);
  const payload = Uint8Array.from([
    ...Buffer.from('ACON'), ...aniChunk('anih', header), ...aniChunk('LIST', frameList)
  ]);
  return Uint8Array.from([...Buffer.from('RIFF'), ...le32(payload.length), ...payload]);
}

test('static WebP output bounds come from the encoded canvas and frame headers', async () => {
  const realWebp = new Uint8Array(await fixture('static-64.webp'));
  assert.equal(inspectStaticWebpBounds(realWebp, 'avatar').valid, true);
  assert.equal(inspectStaticWebpBounds(staticWebp(4096, 4096), 'avatar').valid, false);
  assert.equal(inspectStaticWebpBounds(staticWebp(4096, 4096), 'background').valid, false);
  assert.equal(inspectStaticWebpBounds(staticWebp(4096, 4096), 'cursor').valid, false);
  assert.equal(inspectStaticWebpBounds(staticWebp(64, 64, { animated: true }), 'avatar').valid, false);
  assert.equal(inspectStaticWebpBounds(staticWebp(64, 64, { frameWidth: 4096 }), 'avatar').valid, false);
  assert.equal(inspectRasterImageSourceBounds(staticWebp(4096, 4096), 'image/webp').valid, true);
});

test('source image parsing accepts normal PNG/JPEG and rejects animated PNG before decode', async () => {
  const pngBytes = new Uint8Array(await fixture('static-64x32.png'));
  const jpegBytes = new Uint8Array(await fixture('static-64x32.jpg'));
  assert.equal(inspectRasterImageSourceBounds(pngBytes, 'image/png').valid, true);
  assert.equal(inspectRasterImageSourceBounds(jpegBytes, 'image/jpeg').valid, true);
  assert.deepEqual(inspectRasterImageSourceBounds(jpeg(4000, 3000), 'image/jpeg'), {
    width: 4000,
    height: 3000,
    valid: true
  });
  assert.equal(inspectJpegBounds(jpeg(4000, 3000), 'share_image').valid, false);
  assert.equal(inspectRasterImageSourceBounds(pngWithAnimationChunk(pngBytes), 'image/png').valid, false);
});

test('profile image processing rejects excessive source dimensions before creating an object URL', async () => {
  const priorWindow = globalThis.window;
  const priorDocument = globalThis.document;
  const originalCreateObjectUrl = URL.createObjectURL;
  let createdObjectUrl = false;
  globalThis.window = {};
  globalThis.document = {};
  URL.createObjectURL = () => {
    createdObjectUrl = true;
    return 'blob:unexpected';
  };
  try {
    const bytes = staticWebp(9000, 9000);
    const file = { type: 'image/webp', size: bytes.length, arrayBuffer: async () => bytes.buffer };
    await assert.rejects(processProfileImage(file, 'avatar'), /invalid dimensions/);
    assert.equal(createdObjectUrl, false);
  } finally {
    URL.createObjectURL = originalCreateObjectUrl;
    if (priorWindow === undefined) delete globalThis.window;
    else globalThis.window = priorWindow;
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
  }
});

test('ANI bounds inspect RIFF chunks and embedded cursor resources', async () => {
  const valid = validAni();
  const tooLarge = validAni(256, 256);
  const truncatedDib = validAni(64, 64, { icons: [aniIcon(64, 64, { truncated: true })] });
  const pngBytes = new Uint8Array(await fixture('static-64x32.png'));
  const validPngAni = validAni(64, 32, { icons: [aniIconResource(64, 32, pngBytes)] });
  const animatedPngBytes = pngWithValidAnimationControl(pngBytes);
  const animatedPngAni = validAni(64, 32, { icons: [aniIconResource(64, 32, animatedPngBytes)] });
  const truncatedPngAni = validAni(64, 32, {
    icons: [aniIconResource(64, 32, pngBytes.subarray(0, pngBytes.length - 12))]
  });
  const maxFramesAndSteps = validAni(1, 1, {
    icons: Array.from({ length: 60 }, () => aniIcon(1, 1)),
    stepCount: 600
  });
  const tooManyFrames = validAni(1, 1, { icons: Array.from({ length: 61 }, () => aniIcon(1, 1)) });
  const tooManySteps = validAni(1, 1, { stepCount: 601 });
  const hugeHeader = new Uint8Array(valid);
  hugeHeader.fill(0xff, 20, 24);
  hugeHeader.set(le32(0xffffffff), 4);
  assert.equal(inspectAnimatedCursorBounds(valid).valid, true);
  assert.equal(inspectAnimatedCursorBounds(tooLarge).valid, false);
  assert.equal(inspectAnimatedCursorBounds(truncatedDib).valid, false);
  assert.equal(inspectAnimatedCursorBounds(validPngAni).valid, true);
  assert.equal(inspectAnimatedCursorBounds(animatedPngAni).valid, false);
  assert.equal(inspectAnimatedCursorBounds(truncatedPngAni).valid, false);
  assert.equal(inspectAnimatedCursorBounds(maxFramesAndSteps).valid, true);
  assert.equal(inspectAnimatedCursorBounds(tooManyFrames).valid, false);
  assert.equal(inspectAnimatedCursorBounds(tooManySteps).valid, false);
  assert.equal(inspectAnimatedCursorBounds(valid.subarray(0, 12)).valid, false);
  assert.equal(inspectAnimatedCursorBounds(hugeHeader).valid, false);
  assert.equal(validateProfileMediaSignature({
    bytes: valid,
    kind: 'cursor',
    extension: 'ani',
    mimeType: 'application/x-navi-animation'
  }), true);
  assert.equal(validateProfileMediaSignature({
    bytes: valid.subarray(0, 12),
    kind: 'cursor',
    extension: 'ani',
    mimeType: 'application/x-navi-animation'
  }), false);
  assert.equal(validateProfileMediaSignature({
    bytes: truncatedDib,
    kind: 'cursor',
    extension: 'ani',
    mimeType: 'application/x-navi-animation'
  }), false);
  assert.equal(validateProfileMediaSignature({
    bytes: truncatedPngAni,
    kind: 'cursor',
    extension: 'ani',
    mimeType: 'application/x-navi-animation'
  }), false);
  assert.equal(validateProfileMediaSignature({
    bytes: animatedPngAni,
    kind: 'cursor',
    extension: 'ani',
    mimeType: 'application/x-navi-animation'
  }), false);
});
