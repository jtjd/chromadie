import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectProfileVideoBounds } from '../src/lib/videoContainerBounds.js';

const fixture = name => readFile(new URL(`./fixtures/profile-media/${name}`, import.meta.url));

function findBytes(bytes, values, start = 0) {
  outer: for (let index = start; index <= bytes.length - values.length; index += 1) {
    for (let offset = 0; offset < values.length; offset += 1) {
      if (bytes[index + offset] !== values[offset]) continue outer;
    }
    return index;
  }
  return -1;
}

function readU32(bytes, offset) {
  return bytes[offset] * 0x1000000
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3];
}

function writeU32(bytes, offset, value) {
  bytes[offset] = Math.floor(value / 0x1000000) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function patchAvcSampleEntry(bytes, width, height) {
  const entryType = findBytes(bytes, [...Buffer.from('avc1')], 32);
  assert.notEqual(entryType, -1);
  bytes[entryType + 28] = (width >>> 8) & 0xff;
  bytes[entryType + 29] = width & 0xff;
  bytes[entryType + 30] = (height >>> 8) & 0xff;
  bytes[entryType + 31] = height & 0xff;
}

function patchWebmTrackDimensions(bytes, sourceWidth, sourceHeight, width, height) {
  const widthLength = sourceWidth > 255 ? 2 : 1;
  const heightLength = sourceHeight > 255 ? 2 : 1;
  const widthPrefix = widthLength === 2
    ? [0xb0, 0x82, (sourceWidth >>> 8) & 0xff, sourceWidth & 0xff]
    : [0xb0, 0x81, sourceWidth & 0xff];
  const heightPrefix = heightLength === 2
    ? [0xba, 0x82, (sourceHeight >>> 8) & 0xff, sourceHeight & 0xff]
    : [0xba, 0x81, sourceHeight & 0xff];
  const widthOffset = findBytes(bytes, widthPrefix);
  const heightOffset = findBytes(bytes, heightPrefix);
  assert.notEqual(widthOffset, -1);
  assert.notEqual(heightOffset, -1);
  if (widthLength === 2) {
    bytes[widthOffset + 2] = (width >>> 8) & 0xff;
    bytes[widthOffset + 3] = width & 0xff;
  } else {
    bytes[widthOffset + 2] = width;
  }
  if (heightLength === 2) {
    bytes[heightOffset + 2] = (height >>> 8) & 0xff;
    bytes[heightOffset + 3] = height & 0xff;
  } else {
    bytes[heightOffset + 2] = height;
  }
}

test('MP4 H.264 dimensions are checked against SPS data, not just the sample entry', async () => {
  const bounded = new Uint8Array(await fixture('h264-320x180.mp4'));
  assert.equal(inspectProfileVideoBounds(bounded, 'video/mp4').valid, true);

  const oversized = new Uint8Array(await fixture('h264-1920x1080.mp4'));
  assert.equal(inspectProfileVideoBounds(oversized, 'video/mp4').valid, false);

  patchAvcSampleEntry(oversized, 1280, 720);
  assert.equal(inspectProfileVideoBounds(oversized, 'video/mp4').valid, false);
});

test('MP4 sample-table timing cannot outlast a patched mdhd duration', async () => {
  const valid = new Uint8Array(await fixture('h264-320x180.mp4'));
  const mdhdOffset = findBytes(valid, [...Buffer.from('mdhd')]);
  const sttsOffset = findBytes(valid, [...Buffer.from('stts')]);
  assert.notEqual(mdhdOffset, -1);
  assert.notEqual(sttsOffset, -1);
  const timescale = readU32(valid, mdhdOffset + 16);
  assert.equal(inspectProfileVideoBounds(valid, 'video/mp4').valid, true);

  // The header claims a 30-second track while each of its 24 samples spans
  // 16,000/12,288 seconds, for a real sample-table duration of 31.25 seconds.
  writeU32(valid, mdhdOffset + 20, timescale * 30);
  writeU32(valid, sttsOffset + 16, 16_000);
  const inspected = inspectProfileVideoBounds(valid, 'video/mp4');
  assert.equal(inspected.valid, false);
  assert.ok(inspected.durationMs > 30_000);
});

test('MP4 absolute presentation timestamps cannot be shifted past mdhd and the edit-list window', async () => {
  const shifted = new Uint8Array(await fixture('h264-320x180.mp4'));
  const mdhdOffset = findBytes(shifted, [...Buffer.from('mdhd')]);
  const cttsOffset = findBytes(shifted, [...Buffer.from('ctts')]);
  assert.notEqual(mdhdOffset, -1);
  assert.notEqual(cttsOffset, -1);
  const mediaTimescale = readU32(shifted, mdhdOffset + 16);
  const entryCount = readU32(shifted, cttsOffset + 8);
  assert.equal(inspectProfileVideoBounds(shifted, 'video/mp4').valid, true);

  // Keep the declared duration and edit list unchanged while moving every
  // sample's presentation timestamp 31 seconds later than its decode time.
  for (let index = 0; index < entryCount; index += 1) {
    const offset = cttsOffset + 16 + index * 8;
    writeU32(shifted, offset, readU32(shifted, offset) + mediaTimescale * 31);
  }
  const inspected = inspectProfileVideoBounds(shifted, 'video/mp4');
  assert.equal(inspected.valid, false);
});

test('MP4 edit lists with unsupported playback rates fail closed', async () => {
  const unsupportedRate = new Uint8Array(await fixture('h264-320x180.mp4'));
  const editListOffset = findBytes(unsupportedRate, [...Buffer.from('elst')]);
  assert.notEqual(editListOffset, -1);
  unsupportedRate[editListOffset + 21] = 2;
  assert.equal(inspectProfileVideoBounds(unsupportedRate, 'video/mp4').valid, false);
});

test('WebM VP8 and VP9 dimensions are checked from each encoded frame', async () => {
  const vp8 = new Uint8Array(await fixture('vp8-320x180.webm'));
  const vp9 = new Uint8Array(await fixture('vp9-320x180.webm'));
  assert.equal(inspectProfileVideoBounds(vp8, 'video/webm').valid, true);
  assert.equal(inspectProfileVideoBounds(vp9, 'video/webm').valid, true);

  const oversizedVp9 = new Uint8Array(await fixture('vp9-1920x1080.webm'));
  assert.equal(inspectProfileVideoBounds(oversizedVp9, 'video/webm').valid, false);
  patchWebmTrackDimensions(oversizedVp9, 1920, 1080, 1280, 720);
  assert.equal(inspectProfileVideoBounds(oversizedVp9, 'video/webm').valid, false);
});
