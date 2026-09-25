export const PROFILE_VIDEO_LIMITS = Object.freeze({
  maxWidth: 1280,
  maxHeight: 720,
  maxPixels: 1280 * 720,
  maxDurationMs: 30_000
});

function ascii(bytes, value, offset, end = bytes.length) {
  if (offset < 0 || offset + value.length > end) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

function u32(bytes, offset) {
  return bytes[offset] * 0x1000000
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3];
}

function u64(bytes, offset) {
  const high = u32(bytes, offset);
  const low = u32(bytes, offset + 4);
  const value = high * 0x100000000 + low;
  return Number.isSafeInteger(value) ? value : null;
}

class BitReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.bitOffset = 0;
  }

  readBits(count) {
    if (!Number.isInteger(count) || count < 0 || count > 32 || this.bitOffset + count > this.bytes.length * 8) return null;
    let value = 0;
    for (let index = 0; index < count; index += 1) {
      const byte = this.bytes[this.bitOffset >> 3];
      value = value * 2 + ((byte >> (7 - (this.bitOffset & 7))) & 1);
      this.bitOffset += 1;
    }
    return value;
  }

  readBit() {
    return this.readBits(1);
  }

  readUnsignedExpGolomb() {
    let leadingZeros = 0;
    while (leadingZeros <= 31) {
      const bit = this.readBit();
      if (bit === null) return null;
      if (bit) break;
      leadingZeros += 1;
    }
    if (leadingZeros > 31) return null;
    const suffix = this.readBits(leadingZeros);
    if (suffix === null) return null;
    return (2 ** leadingZeros) - 1 + suffix;
  }

  readSignedExpGolomb() {
    const value = this.readUnsignedExpGolomb();
    if (value === null) return null;
    return value & 1 ? (value + 1) / 2 : -(value / 2);
  }
}

const AVC_HIGH_PROFILES = new Set([44, 83, 86, 100, 110, 118, 122, 128, 134, 135, 138, 139, 144, 244]);

function removeEmulationPreventionBytes(value) {
  const output = [];
  let zeroCount = 0;
  for (const byte of value) {
    if (zeroCount >= 2 && byte === 0x03) {
      continue;
    }
    output.push(byte);
    zeroCount = byte === 0 ? zeroCount + 1 : 0;
  }
  return Uint8Array.from(output);
}

function skipScalingList(reader, size) {
  let lastScale = 8;
  let nextScale = 8;
  for (let index = 0; index < size; index += 1) {
    if (nextScale !== 0) {
      const deltaScale = reader.readSignedExpGolomb();
      if (deltaScale === null) return false;
      nextScale = (lastScale + deltaScale + 256) % 256;
    }
    if (nextScale !== 0) lastScale = nextScale;
  }
  return true;
}

function parseAvcSps(nal) {
  if (nal.length < 4 || (nal[0] & 0x1f) !== 7 || (nal[0] & 0x80)) return null;
  const reader = new BitReader(removeEmulationPreventionBytes(nal.subarray(1)));
  const profileIdc = reader.readBits(8);
  if (profileIdc === null || reader.readBits(8) === null || reader.readBits(8) === null
    || reader.readUnsignedExpGolomb() === null) return null;

  let chromaFormatIdc = 1;
  let separateColourPlane = false;
  if (AVC_HIGH_PROFILES.has(profileIdc)) {
    chromaFormatIdc = reader.readUnsignedExpGolomb();
    if (chromaFormatIdc === null || chromaFormatIdc > 3) return null;
    if (chromaFormatIdc === 3) {
      const value = reader.readBit();
      if (value === null) return null;
      separateColourPlane = Boolean(value);
    }
    if (reader.readUnsignedExpGolomb() === null || reader.readUnsignedExpGolomb() === null
      || reader.readBit() === null) return null;
    const scalingMatrixPresent = reader.readBit();
    if (scalingMatrixPresent === null) return null;
    if (scalingMatrixPresent) {
      const listCount = chromaFormatIdc === 3 ? 12 : 8;
      for (let index = 0; index < listCount; index += 1) {
        const present = reader.readBit();
        if (present === null) return null;
        if (present && !skipScalingList(reader, index < 6 ? 16 : 64)) return null;
      }
    }
  }

  if (reader.readUnsignedExpGolomb() === null) return null; // log2_max_frame_num_minus4
  const picOrderCountType = reader.readUnsignedExpGolomb();
  if (picOrderCountType === null || picOrderCountType > 2) return null;
  if (picOrderCountType === 0) {
    if (reader.readUnsignedExpGolomb() === null) return null;
  } else if (picOrderCountType === 1) {
    if (reader.readBit() === null || reader.readSignedExpGolomb() === null
      || reader.readSignedExpGolomb() === null) return null;
    const cycleCount = reader.readUnsignedExpGolomb();
    if (cycleCount === null || cycleCount > 255) return null;
    for (let index = 0; index < cycleCount; index += 1) {
      if (reader.readSignedExpGolomb() === null) return null;
    }
  }
  if (reader.readUnsignedExpGolomb() === null || reader.readBit() === null) return null;
  const widthInMbsMinusOne = reader.readUnsignedExpGolomb();
  const heightInMapUnitsMinusOne = reader.readUnsignedExpGolomb();
  if (widthInMbsMinusOne === null || heightInMapUnitsMinusOne === null
    || widthInMbsMinusOne > 8191 || heightInMapUnitsMinusOne > 8191) return null;
  const frameMbsOnly = reader.readBit();
  if (frameMbsOnly === null) return null;
  if (!frameMbsOnly && reader.readBit() === null) return null;
  if (reader.readBit() === null) return null;
  const cropping = reader.readBit();
  if (cropping === null) return null;
  let cropLeft = 0;
  let cropRight = 0;
  let cropTop = 0;
  let cropBottom = 0;
  if (cropping) {
    cropLeft = reader.readUnsignedExpGolomb();
    cropRight = reader.readUnsignedExpGolomb();
    cropTop = reader.readUnsignedExpGolomb();
    cropBottom = reader.readUnsignedExpGolomb();
    if ([cropLeft, cropRight, cropTop, cropBottom].some(value => value === null)) return null;
  }

  const codedWidth = (widthInMbsMinusOne + 1) * 16;
  const codedHeight = (heightInMapUnitsMinusOne + 1) * 16 * (2 - frameMbsOnly);
  const chromaArrayType = separateColourPlane ? 0 : chromaFormatIdc;
  const subWidth = chromaArrayType === 1 || chromaArrayType === 2 ? 2 : 1;
  const subHeight = chromaArrayType === 1 ? 2 : 1;
  const cropUnitX = chromaArrayType === 0 ? 1 : subWidth;
  const cropUnitY = chromaArrayType === 0 ? (2 - frameMbsOnly) : subHeight * (2 - frameMbsOnly);
  const width = codedWidth - (cropLeft + cropRight) * cropUnitX;
  const height = codedHeight - (cropTop + cropBottom) * cropUnitY;
  return width > 0 && height > 0 ? { width, height, codedWidth, codedHeight } : null;
}

function avcConfigurationDimensions(bytes, entry) {
  const childrenStart = entry.dataStart + 78;
  if (childrenStart > entry.end) return null;
  const children = isoBoxes(bytes, childrenStart, entry.end);
  const avcC = children?.find(box => box.type === 'avcC');
  if (!avcC || avcC.size < avcC.headerSize + 7) return null;
  const start = avcC.dataStart;
  const end = avcC.end;
  if (bytes[start] !== 1 || start + 6 > end) return null;
  const spsCount = bytes[start + 5] & 0x1f;
  if (spsCount < 1 || spsCount > 31) return null;
  let offset = start + 6;
  const dimensions = [];
  for (let index = 0; index < spsCount; index += 1) {
    if (offset + 2 > end) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;
    if (length < 4 || offset + length > end) return null;
    const parsed = parseAvcSps(bytes.subarray(offset, offset + length));
    if (!parsed) return null;
    dimensions.push(parsed);
    offset += length;
  }
  if (offset >= end) return null;
  const ppsCount = bytes[offset++];
  if (!ppsCount || ppsCount > 255) return null;
  for (let index = 0; index < ppsCount; index += 1) {
    if (offset + 2 > end) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;
    if (!length || offset + length > end) return null;
    offset += length;
  }
  const first = dimensions[0];
  if (dimensions.some(value => value.width !== first.width || value.height !== first.height
    || value.codedWidth > PROFILE_VIDEO_LIMITS.maxWidth
    || value.codedHeight > PROFILE_VIDEO_LIMITS.maxHeight
    || value.codedWidth * value.codedHeight > PROFILE_VIDEO_LIMITS.maxPixels)) return null;
  return { width: first.width, height: first.height };
}

function readIsoBox(bytes, offset, end) {
  if (offset < 0 || offset + 8 > end) return null;
  let size = u32(bytes, offset);
  const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
  let headerSize = 8;
  if (size === 1) {
    if (offset + 16 > end) return null;
    size = u64(bytes, offset + 8);
    if (size === null) return null;
    headerSize = 16;
  } else if (size === 0) {
    size = end - offset;
  }
  if (size < headerSize || offset + size > end) return null;
  return { type, start: offset, dataStart: offset + headerSize, end: offset + size, size, headerSize };
}

function isoBoxes(bytes, start, end) {
  const boxes = [];
  let offset = start;
  while (offset < end) {
    if (boxes.length >= 10_000) return null;
    const box = readIsoBox(bytes, offset, end);
    if (!box) return null;
    boxes.push(box);
    offset = box.end;
  }
  return offset === end ? boxes : null;
}

function mdhdTiming(bytes, box) {
  const start = box.dataStart;
  if (start + 4 > box.end) return null;
  const version = bytes[start];
  let timescale;
  let duration;
  if (version === 0) {
    if (start + 20 > box.end) return null;
    timescale = u32(bytes, start + 12);
    duration = u32(bytes, start + 16);
    if (duration === 0xffffffff) return null;
  } else if (version === 1) {
    if (start + 32 > box.end) return null;
    timescale = u32(bytes, start + 20);
    duration = u64(bytes, start + 24);
    if (duration === null || duration === 0xffffffffffff) return null;
  } else {
    return null;
  }
  if (!timescale || !duration) return null;
  const durationMs = duration / timescale * 1000;
  return Number.isFinite(durationMs) && durationMs > 0 ? { durationTicks: duration, timescale, durationMs } : null;
}

function sampleTableSampleCount(bytes, stsz) {
  const start = stsz.dataStart;
  if (start + 12 > stsz.end || bytes[start] !== 0 || bytes[start + 1] !== 0
    || bytes[start + 2] !== 0 || bytes[start + 3] !== 0) return null;
  const constantSize = u32(bytes, start + 4);
  const sampleCount = u32(bytes, start + 8);
  if (!sampleCount || sampleCount > 100_000) return null;
  if (constantSize) return start + 12 === stsz.end ? sampleCount : null;
  if (start + 12 + sampleCount * 4 !== stsz.end) return null;
  for (let index = 0; index < sampleCount; index += 1) {
    if (!u32(bytes, start + 12 + index * 4)) return null;
  }
  return sampleCount;
}

function parseSampleTimingRuns(bytes, box, { composition = false } = {}) {
  const start = box.dataStart;
  if (start + 8 > box.end || (bytes[start] !== 0 && !(composition && bytes[start] === 1))
    || bytes[start + 1] !== 0 || bytes[start + 2] !== 0 || bytes[start + 3] !== 0) return null;
  const version = bytes[start];
  const entryCount = u32(bytes, start + 4);
  if (!entryCount || entryCount > 10_000 || start + 8 + entryCount * 8 !== box.end) return null;
  const runs = [];
  let totalSamples = 0;
  let totalDurationTicks = 0;
  let minimumValue = Infinity;
  let maximumValue = -Infinity;
  for (let index = 0; index < entryCount; index += 1) {
    const entryStart = start + 8 + index * 8;
    const sampleCount = u32(bytes, entryStart);
    const rawValue = u32(bytes, entryStart + 4);
    const value = composition && version === 1 && rawValue >= 0x80000000
      ? rawValue - 0x100000000
      : rawValue;
    if (!sampleCount || (!composition && !value)) return null;
    totalSamples += sampleCount;
    if (totalSamples > 100_000) return null;
    if (!composition) totalDurationTicks += sampleCount * value;
    if (!Number.isSafeInteger(totalDurationTicks)) return null;
    minimumValue = Math.min(minimumValue, value);
    maximumValue = Math.max(maximumValue, value);
    runs.push({ sampleCount, value });
  }
  return { runs, totalSamples, totalDurationTicks, minimumValue, maximumValue };
}

function mp4SampleTimelineDurationMs(bytes, stblChildren, timescale, sampleCount) {
  const stts = stblChildren.find(box => box.type === 'stts');
  const stsz = stblChildren.find(box => box.type === 'stsz');
  if (!stts || !stsz) return null;
  const decodeTiming = parseSampleTimingRuns(bytes, stts);
  if (!decodeTiming || decodeTiming.totalSamples !== sampleCount) return null;

  const cttsBox = stblChildren.find(box => box.type === 'ctts');
  const compositionTiming = cttsBox
    ? parseSampleTimingRuns(bytes, cttsBox, { composition: true })
    : { runs: [{ sampleCount, value: 0 }], totalSamples: sampleCount };
  if (!compositionTiming || compositionTiming.totalSamples !== sampleCount) return null;

  let decodeTicks = 0;
  let minimumPresentationTicks = 0;
  let maximumPresentationEndTicks = 0;
  let hasPresentationTime = false;
  let decodeIndex = 0;
  let compositionIndex = 0;
  let decodeRemaining = decodeTiming.runs[0].sampleCount;
  let compositionRemaining = compositionTiming.runs[0].sampleCount;
  while (decodeIndex < decodeTiming.runs.length && compositionIndex < compositionTiming.runs.length) {
    const sampleCountInRun = Math.min(decodeRemaining, compositionRemaining);
    const sampleDuration = decodeTiming.runs[decodeIndex].value;
    const compositionOffset = compositionTiming.runs[compositionIndex].value;
    for (let index = 0; index < sampleCountInRun; index += 1) {
      const presentationStart = decodeTicks + compositionOffset;
      const presentationEnd = presentationStart + sampleDuration;
      if (!hasPresentationTime) {
        minimumPresentationTicks = presentationStart;
        maximumPresentationEndTicks = presentationEnd;
        hasPresentationTime = true;
      } else {
        minimumPresentationTicks = Math.min(minimumPresentationTicks, presentationStart);
        maximumPresentationEndTicks = Math.max(maximumPresentationEndTicks, presentationEnd);
      }
      decodeTicks += sampleDuration;
    }
    decodeRemaining -= sampleCountInRun;
    compositionRemaining -= sampleCountInRun;
    if (decodeRemaining === 0) {
      decodeIndex += 1;
      if (decodeIndex < decodeTiming.runs.length) decodeRemaining = decodeTiming.runs[decodeIndex].sampleCount;
    }
    if (compositionRemaining === 0) {
      compositionIndex += 1;
      if (compositionIndex < compositionTiming.runs.length) compositionRemaining = compositionTiming.runs[compositionIndex].sampleCount;
    }
  }
  if (!hasPresentationTime || !Number.isSafeInteger(decodeTicks)) return null;
  const presentationSpanTicks = maximumPresentationEndTicks - minimumPresentationTicks;
  const mediaDurationTicks = Math.max(decodeTicks, presentationSpanTicks);
  const durationMs = mediaDurationTicks / timescale * 1000;
  const absolutePresentationEndMs = maximumPresentationEndTicks / timescale * 1000;
  const maximumSampleDurationTicks = Math.max(...decodeTiming.runs.map(run => run.value));
  const compositionOffsetRangeTicks = Math.max(0, compositionTiming.maximumValue - compositionTiming.minimumValue);
  // Allow the presentation tail implied by B-frame reordering, but not an
  // arbitrary positive composition-time shift beyond the media header.
  const reorderingToleranceTicks = compositionOffsetRangeTicks + maximumSampleDurationTicks;
  return Number.isFinite(durationMs) && durationMs > 0
    && Number.isFinite(absolutePresentationEndMs)
    ? {
        durationMs,
        absolutePresentationEndMs,
        minimumPresentationTicks,
        maximumPresentationEndTicks,
        reorderingToleranceTicks
      }
    : null;
}

function mp4MovieTimescale(bytes, box) {
  const start = box.dataStart;
  if (start + 4 > box.end) return null;
  const version = bytes[start];
  const timescaleOffset = version === 0 ? 12 : version === 1 ? 20 : -1;
  const requiredSize = version === 0 ? 20 : version === 1 ? 32 : 0;
  if (!requiredSize || start + requiredSize > box.end) return null;
  const timescale = u32(bytes, start + timescaleOffset);
  return timescale || null;
}

function mp4TrackDuration(bytes, box) {
  const start = box.dataStart;
  if (start + 4 > box.end) return null;
  const version = bytes[start];
  let duration;
  if (version === 0) {
    if (start + 24 > box.end) return null;
    duration = u32(bytes, start + 20);
    if (duration === 0xffffffff) return null;
  } else if (version === 1) {
    if (start + 36 > box.end) return null;
    duration = u64(bytes, start + 28);
    if (duration === null || duration === 0xffffffffffff) return null;
  } else {
    return null;
  }
  return duration > 0 ? duration : null;
}

function signed64(bytes, offset) {
  if (offset < 0 || offset + 8 > bytes.length) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
  const value = view.getBigInt64(0, false);
  return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : null;
}

function mp4EditDuration(bytes, trackChildren, movieTimescale, mdhdInfo, sampleTimeline) {
  const editContainers = trackChildren.filter(box => box.type === 'edts');
  const trackHeaders = trackChildren.filter(box => box.type === 'tkhd');
  if (editContainers.length > 1 || trackHeaders.length !== 1) return null;
  const trackDurationTicks = mp4TrackDuration(bytes, trackHeaders[0]);
  if (!trackDurationTicks) return null;
  const trackDurationMs = trackDurationTicks / movieTimescale * 1000;
  if (!Number.isFinite(trackDurationMs) || trackDurationMs <= 0) return null;
  if (!editContainers.length) return { durationMs: trackDurationMs };

  // This bounded reader supports one unity-rate media edit. Empty edits,
  // rate changes, and chained edits need a fuller movie-timeline parser.
  const editChildren = isoBoxes(bytes, editContainers[0].dataStart, editContainers[0].end);
  const editLists = editChildren?.filter(box => box.type === 'elst') || [];
  if (!editChildren || editLists.length !== 1) return null;
  const editList = editLists[0];
  const start = editList.dataStart;
  if (start + 8 > editList.end) return null;
  const version = bytes[start];
  if ((bytes[start + 1] | bytes[start + 2] | bytes[start + 3]) !== 0) return null;
  const entryCount = u32(bytes, start + 4);
  if (entryCount !== 1) return null;

  let segmentDuration;
  let mediaTime;
  let rateOffset;
  if (version === 0) {
    if (start + 20 !== editList.end) return null;
    segmentDuration = u32(bytes, start + 8);
    mediaTime = (bytes[start + 12] << 24) | (bytes[start + 13] << 16) | (bytes[start + 14] << 8) | bytes[start + 15];
    if (mediaTime & 0x80000000) mediaTime -= 0x100000000;
    rateOffset = start + 16;
  } else if (version === 1) {
    if (start + 28 !== editList.end) return null;
    segmentDuration = u64(bytes, start + 8);
    mediaTime = signed64(bytes, start + 16);
    if (segmentDuration === null || mediaTime === null) return null;
    rateOffset = start + 24;
  } else {
    return null;
  }
  const rateInteger = (bytes[rateOffset] << 8) | bytes[rateOffset + 1];
  const signedRateInteger = rateInteger & 0x8000 ? rateInteger - 0x10000 : rateInteger;
  const rateFraction = (bytes[rateOffset + 2] << 8) | bytes[rateOffset + 3];
  const signedRateFraction = rateFraction & 0x8000 ? rateFraction - 0x10000 : rateFraction;
  if (!segmentDuration || mediaTime < 0 || signedRateInteger !== 1 || signedRateFraction !== 0
    || trackDurationTicks !== segmentDuration) return null;

  const durationMs = segmentDuration / movieTimescale * 1000;
  const editMediaEndTicks = mediaTime + segmentDuration * mdhdInfo.timescale / movieTimescale;
  const minimumMediaStart = sampleTimeline.minimumPresentationTicks - sampleTimeline.reorderingToleranceTicks;
  const maximumMediaEnd = sampleTimeline.maximumPresentationEndTicks + sampleTimeline.reorderingToleranceTicks;
  const mdhdMediaEnd = mdhdInfo.durationTicks + sampleTimeline.reorderingToleranceTicks;
  if (!Number.isFinite(durationMs) || durationMs <= 0
    || !Number.isFinite(editMediaEndTicks)
    || mediaTime < minimumMediaStart
    || editMediaEndTicks > maximumMediaEnd
    || editMediaEndTicks > mdhdMediaEnd) return null;
  return { durationMs };
}

function visualSampleDimensions(bytes, stsd) {
  const content = stsd.dataStart;
  if (content + 8 > stsd.end) return null;
  const count = u32(bytes, content + 4);
  if (count < 1 || count > 64) return null;
  let offset = content + 8;
  let width = 0;
  let height = 0;
  for (let index = 0; index < count; index += 1) {
    const entry = readIsoBox(bytes, offset, stsd.end);
    if (!entry || entry.dataStart + 28 > entry.end) return null;
    const codec = entry.type;
    // Only accept AVC samples with an out-of-band avcC configuration that can
    // be inspected. Other MP4 codecs and avc3 in-band parameter changes need
    // their own coded-frame parsers before they can be safely bounded here.
    if (codec !== 'avc1') return null;
    const entryWidth = (bytes[entry.dataStart + 24] << 8) | bytes[entry.dataStart + 25];
    const entryHeight = (bytes[entry.dataStart + 26] << 8) | bytes[entry.dataStart + 27];
    if (!entryWidth || !entryHeight) return null;
    const encodedDimensions = avcConfigurationDimensions(bytes, entry);
    if (!encodedDimensions || encodedDimensions.width !== entryWidth || encodedDimensions.height !== entryHeight) return null;
    width = Math.max(width, entryWidth);
    height = Math.max(height, entryHeight);
    offset = entry.end;
  }
  return offset === stsd.end ? { width, height } : null;
}

function inspectMp4(bytes) {
  if (!ascii(bytes, 'ftyp', 4)) return null;
  const topLevel = isoBoxes(bytes, 0, bytes.length);
  if (!topLevel) return null;
  if (topLevel.some(box => box.type === 'moof')) return null;
  const moov = topLevel.find(box => box.type === 'moov');
  if (!moov || !topLevel.some(box => box.type === 'ftyp')) return null;
  const moovChildren = isoBoxes(bytes, moov.dataStart, moov.end);
  if (!moovChildren) return null;
  const movieHeader = moovChildren.find(box => box.type === 'mvhd');
  const movieTimescale = movieHeader && mp4MovieTimescale(bytes, movieHeader);
  if (!movieTimescale) return null;
  const tracks = moovChildren.filter(box => box.type === 'trak');
  if (!tracks.length || tracks.length > 128) return null;

  let width = 0;
  let height = 0;
  let durationMs = 0;
  let videoTracks = 0;
  for (const track of tracks) {
    const trackChildren = isoBoxes(bytes, track.dataStart, track.end);
    if (!trackChildren) return null;
    const mdia = trackChildren.find(box => box.type === 'mdia');
    if (!mdia) continue;
    const mediaChildren = isoBoxes(bytes, mdia.dataStart, mdia.end);
    if (!mediaChildren) return null;
    const handler = mediaChildren.find(box => box.type === 'hdlr');
    if (!handler || handler.dataStart + 12 > handler.end || !ascii(bytes, 'vide', handler.dataStart + 8, handler.end)) continue;
    const mdhd = mediaChildren.find(box => box.type === 'mdhd');
    const minf = mediaChildren.find(box => box.type === 'minf');
    if (!mdhd || !minf) return null;
    const mdhdInfo = mdhdTiming(bytes, mdhd);
    const minfChildren = isoBoxes(bytes, minf.dataStart, minf.end);
    if (!mdhdInfo || !minfChildren) return null;
    const stbl = minfChildren.find(box => box.type === 'stbl');
    if (!stbl) return null;
    const stblChildren = isoBoxes(bytes, stbl.dataStart, stbl.end);
    const stsd = stblChildren?.find(box => box.type === 'stsd');
    const stsz = stblChildren?.find(box => box.type === 'stsz');
    const dimensions = stsd && visualSampleDimensions(bytes, stsd);
    const sampleCount = stsz && sampleTableSampleCount(bytes, stsz);
    const sampleTimeline = stblChildren && sampleCount
      ? mp4SampleTimelineDurationMs(bytes, stblChildren, mdhdInfo.timescale, sampleCount)
      : null;
    const editDuration = sampleTimeline
      ? mp4EditDuration(bytes, trackChildren, movieTimescale, mdhdInfo, sampleTimeline)
      : null;
    if (!dimensions || !sampleTimeline || !editDuration
      || sampleTimeline.maximumPresentationEndTicks > mdhdInfo.durationTicks + sampleTimeline.reorderingToleranceTicks) return null;
    width = Math.max(width, dimensions.width);
    height = Math.max(height, dimensions.height);
    durationMs = Math.max(
      durationMs,
      mdhdInfo.durationMs,
      sampleTimeline.durationMs,
      sampleTimeline.absolutePresentationEndMs,
      editDuration.durationMs
    );
    videoTracks += 1;
  }
  if (!videoTracks) return null;
  return { width, height, durationMs, valid: videoBoundsValid(width, height, durationMs) };
}

const EBML_ID = Object.freeze({
  ebml: 0x1a45dfa3,
  segment: 0x18538067,
  docType: 0x4282,
  info: 0x1549a966,
  timecodeScale: 0x2ad7b1,
  duration: 0x4489,
  tracks: 0x1654ae6b,
  trackEntry: 0xae,
  trackNumber: 0xd7,
  trackType: 0x83,
  codecId: 0x86,
  defaultDuration: 0x23e383,
  video: 0xe0,
  pixelWidth: 0xb0,
  pixelHeight: 0xba,
  cluster: 0x1f43b675,
  clusterTimecode: 0xe7,
  simpleBlock: 0xa3,
  blockGroup: 0xa0,
  block: 0xa1,
  blockDuration: 0x9b
});

function readEbmlVint(bytes, offset, end, isId) {
  if (offset >= end) return null;
  const first = bytes[offset];
  let marker = 0x80;
  let length = 1;
  while (length <= (isId ? 4 : 8) && !(first & marker)) {
    marker >>= 1;
    length += 1;
  }
  if (length > (isId ? 4 : 8) || offset + length > end) return null;
  let value = BigInt(isId ? first : first & (marker - 1));
  let allOnes = !isId && (first & (marker - 1)) === marker - 1;
  for (let index = 1; index < length; index += 1) {
    value = value * 256n + BigInt(bytes[offset + index]);
    if (bytes[offset + index] !== 0xff) allOnes = false;
  }
  return { length, value, unknown: allOnes };
}

function readEbmlElement(bytes, offset, end, allowUnknown = false) {
  const id = readEbmlVint(bytes, offset, end, true);
  if (!id) return null;
  const size = readEbmlVint(bytes, offset + id.length, end, false);
  if (!size) return null;
  if (size.unknown && !allowUnknown) return null;
  const dataStart = offset + id.length + size.length;
  const elementSize = size.unknown ? BigInt(end - dataStart) : size.value;
  if (elementSize > BigInt(end - dataStart)) return null;
  const numericId = Number(id.value);
  if (!Number.isSafeInteger(numericId)) return null;
  return {
    id: numericId,
    dataStart,
    end: dataStart + Number(elementSize),
    size: Number(elementSize),
    unknown: size.unknown
  };
}

function ebmlChildren(bytes, start, end) {
  const elements = [];
  let offset = start;
  while (offset < end) {
    if (elements.length >= 10_000) return null;
    const element = readEbmlElement(bytes, offset, end);
    if (!element || element.end <= offset) return null;
    elements.push(element);
    offset = element.end;
  }
  return offset === end ? elements : null;
}

function ebmlUnsigned(bytes, element) {
  if (element.size < 1 || element.size > 8) return null;
  let value = 0;
  for (let index = 0; index < element.size; index += 1) {
    value = value * 256 + bytes[element.dataStart + index];
  }
  return Number.isSafeInteger(value) ? value : null;
}

function ebmlFloat(bytes, element) {
  if (element.size !== 4 && element.size !== 8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + element.dataStart, element.size);
  const value = element.size === 4 ? view.getFloat32(0, false) : view.getFloat64(0, false);
  return Number.isFinite(value) ? value : null;
}

class MsbBitReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.bitOffset = 0;
  }

  read(count) {
    if (!Number.isInteger(count) || count < 0 || count > 32 || this.bitOffset + count > this.bytes.length * 8) return null;
    let value = 0;
    for (let index = 0; index < count; index += 1) {
      value = value * 2 + ((this.bytes[this.bitOffset >> 3] >> (7 - (this.bitOffset & 7))) & 1);
      this.bitOffset += 1;
    }
    return value;
  }
}

function vp9ColorConfig(reader, profile) {
  if (profile >= 2 && reader.read(1) === null) return false;
  const colorSpace = reader.read(3);
  if (colorSpace === null) return false;
  if (colorSpace !== 7) {
    if (reader.read(1) === null) return false;
    if (profile === 1 || profile === 3) {
      const subsamplingX = reader.read(1);
      const subsamplingY = reader.read(1);
      const reservedZero = reader.read(1);
      if (subsamplingX === null || subsamplingY === null || reservedZero !== 0) return false;
    }
  } else {
    if (profile !== 1 && profile !== 3) return false;
    if (reader.read(1) === null || reader.read(1) !== 0) return false;
  }
  return true;
}

function vp9SyncCode(reader) {
  return reader.read(24) === 0x498342;
}

function vp9FrameSize(reader) {
  const width = reader.read(16);
  const height = reader.read(16);
  return width === null || height === null ? null : { width: width + 1, height: height + 1 };
}

function vp9RenderSize(reader, codedSize) {
  const different = reader.read(1);
  if (different === null) return null;
  if (!different) return { width: codedSize.width, height: codedSize.height };
  const width = reader.read(16);
  const height = reader.read(16);
  return width === null || height === null ? null : { width: width + 1, height: height + 1 };
}

function parseVp9Frame(value, references) {
  const reader = new MsbBitReader(value);
  if (reader.read(2) !== 2) return null;
  const profileLow = reader.read(1);
  const profileHigh = reader.read(1);
  if (profileLow === null || profileHigh === null) return null;
  const profile = profileLow | (profileHigh << 1);
  if (profile === 3 && reader.read(1) !== 0) return null;
  const showExistingFrame = reader.read(1);
  if (showExistingFrame === null) return null;
  if (showExistingFrame) {
    const index = reader.read(3);
    const size = index === null ? null : references[index];
    return size ? { ...size, refreshFlags: 0 } : null;
  }

  const frameType = reader.read(1);
  const showFrame = reader.read(1);
  const errorResilient = reader.read(1);
  if (frameType === null || showFrame === null || errorResilient === null) return null;

  let codedSize;
  let refreshFlags;
  if (frameType === 0) {
    if (!vp9SyncCode(reader) || !vp9ColorConfig(reader, profile)) return null;
    codedSize = vp9FrameSize(reader);
    if (!codedSize) return null;
    refreshFlags = 0xff;
  } else {
    const intraOnly = showFrame ? 0 : reader.read(1);
    if (intraOnly === null) return null;
    if (!errorResilient && reader.read(2) === null) return null;
    if (intraOnly) {
      if (!vp9SyncCode(reader)) return null;
      if (profile > 0 && !vp9ColorConfig(reader, profile)) return null;
      refreshFlags = reader.read(8);
      if (refreshFlags === null) return null;
      codedSize = vp9FrameSize(reader);
      if (!codedSize) return null;
    } else {
      refreshFlags = reader.read(8);
      if (refreshFlags === null) return null;
      const referencesUsed = [];
      for (let index = 0; index < 3; index += 1) {
        const frameIndex = reader.read(3);
        const signBias = reader.read(1);
        if (frameIndex === null || signBias === null) return null;
        referencesUsed.push(frameIndex);
      }
      codedSize = null;
      for (const frameIndex of referencesUsed) {
        const foundReference = reader.read(1);
        if (foundReference === null) return null;
        if (foundReference) {
          codedSize = references[frameIndex] || null;
          break;
        }
      }
      if (!codedSize) codedSize = vp9FrameSize(reader);
      if (!codedSize) return null;
    }
  }

  const renderSize = vp9RenderSize(reader, codedSize);
  if (!renderSize) return null;
  const size = {
    width: codedSize.width,
    height: codedSize.height,
    renderWidth: renderSize.width,
    renderHeight: renderSize.height,
    refreshFlags
  };
  for (let index = 0; index < 8; index += 1) {
    if ((refreshFlags >> index) & 1) references[index] = size;
  }
  return size;
}

function parseVp8Frame(value, state) {
  if (value.length < 3) return null;
  const frameTag = value[0] | (value[1] << 8) | (value[2] << 16);
  const isKeyframe = !(frameTag & 1);
  if (isKeyframe) {
    if (value.length < 10 || !ascii(value, '\x9d\x01\x2a', 3)) return null;
    const width = ((value[7] << 8) | value[6]) & 0x3fff;
    const height = ((value[9] << 8) | value[8]) & 0x3fff;
    if (!width || !height) return null;
    state.vp8Size = { width, height, renderWidth: width, renderHeight: height };
  }
  return state.vp8Size || null;
}

function splitVp9Superframe(value) {
  if (!value.length) return null;
  const marker = value[value.length - 1];
  if ((marker & 0xe0) !== 0xc0) return [value];
  const frameCount = (marker & 0x07) + 1;
  const magnitude = ((marker >> 3) & 0x03) + 1;
  const indexSize = 2 + frameCount * magnitude;
  const indexStart = value.length - indexSize;
  if (indexStart < 0 || value[indexStart] !== marker) return null;
  const frames = [];
  let offset = indexStart + 1;
  let dataOffset = 0;
  for (let index = 0; index < frameCount; index += 1) {
    let size = 0;
    for (let byte = 0; byte < magnitude; byte += 1) size += value[offset++] * (256 ** byte);
    if (!Number.isSafeInteger(size) || size <= 0 || dataOffset + size > indexStart) return null;
    frames.push(value.subarray(dataOffset, dataOffset + size));
    dataOffset += size;
  }
  return dataOffset === indexStart ? frames : null;
}

function splitLacedBlock(bytes, block) {
  const track = readEbmlVint(bytes, block.dataStart, block.end, false);
  if (!track || track.unknown || track.value < 1n || track.value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const timeOffset = block.dataStart + track.length;
  if (timeOffset + 3 > block.end) return null;
  const timecode = (bytes[timeOffset] << 8) | bytes[timeOffset + 1];
  const relativeTimecode = timecode & 0x8000 ? timecode - 0x10000 : timecode;
  const flags = bytes[timeOffset + 2];
  const lacing = flags & 0x06;
  let offset = timeOffset + 3;
  const frames = [];
  const remaining = block.end - offset;
  if (lacing === 0) {
    if (!remaining) return null;
    frames.push(bytes.subarray(offset, block.end));
  } else {
    if (offset >= block.end) return null;
    const frameCount = bytes[offset++] + 1;
    if (frameCount < 2 || frameCount > 256) return null;
    const sizes = [];
    if (lacing === 0x02) {
      for (let frame = 0; frame < frameCount - 1; frame += 1) {
        let size = 0;
        let byte;
        do {
          if (offset >= block.end) return null;
          byte = bytes[offset++];
          size += byte;
          if (size > block.end) return null;
        } while (byte === 0xff);
        sizes.push(size);
      }
    } else if (lacing === 0x04) {
      const payloadSize = block.end - offset;
      if (payloadSize % frameCount !== 0) return null;
      for (let frame = 0; frame < frameCount; frame += 1) sizes.push(payloadSize / frameCount);
    } else {
      const first = readEbmlVint(bytes, offset, block.end, false);
      if (!first || first.unknown || first.value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
      offset += first.length;
      sizes.push(Number(first.value));
      for (let frame = 1; frame < frameCount - 1; frame += 1) {
        const difference = readEbmlVint(bytes, offset, block.end, false);
        if (!difference || difference.unknown || difference.value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
        offset += difference.length;
        const bias = 2 ** (7 * difference.length - 1) - 1;
        const nextSize = sizes[sizes.length - 1] + Number(difference.value) - bias;
        if (!Number.isSafeInteger(nextSize) || nextSize <= 0) return null;
        sizes.push(nextSize);
      }
    }
    if (lacing !== 0x04) {
      const knownSize = sizes.reduce((sum, size) => sum + size, 0);
      const lastSize = block.end - offset - knownSize;
      if (!Number.isSafeInteger(lastSize) || lastSize <= 0) return null;
      sizes.push(lastSize);
    }
    for (const size of sizes) {
      if (size <= 0 || offset + size > block.end) return null;
      frames.push(bytes.subarray(offset, offset + size));
      offset += size;
    }
    if (offset !== block.end) return null;
  }
  return { trackNumber: Number(track.value), relativeTimecode, frames };
}

function inspectVideoFrame(track, frame) {
  if (track.codecId === 'V_VP8') return parseVp8Frame(frame, track);
  const frames = splitVp9Superframe(frame);
  if (!frames) return null;
  let last = null;
  for (const vp9Frame of frames) {
    last = parseVp9Frame(vp9Frame, track.references);
    if (!last) return null;
  }
  return last;
}

function frameWithinLimits(size) {
  return size.width > 0
    && size.height > 0
    && size.width <= PROFILE_VIDEO_LIMITS.maxWidth
    && size.height <= PROFILE_VIDEO_LIMITS.maxHeight
    && size.width * size.height <= PROFILE_VIDEO_LIMITS.maxPixels
    && size.renderWidth > 0
    && size.renderHeight > 0
    && size.renderWidth <= PROFILE_VIDEO_LIMITS.maxWidth
    && size.renderHeight <= PROFILE_VIDEO_LIMITS.maxHeight
    && size.renderWidth * size.renderHeight <= PROFILE_VIDEO_LIMITS.maxPixels;
}

function inspectCluster(bytes, cluster, segmentEnd, videoTracks, timecodeScale, state) {
  const end = cluster.unknown ? segmentEnd : cluster.end;
  let offset = cluster.dataStart;
  let clusterTimecode = null;
  const blocks = [];
  let nextClusterOffset = null;
  let elements = 0;
  while (offset < end) {
    if (++elements > 100_000) return null;
    const child = readEbmlElement(bytes, offset, end, true);
    if (!child || child.end <= offset) return null;
    if (cluster.unknown && child.id === EBML_ID.cluster) {
      nextClusterOffset = offset;
      break;
    }
    if (child.id === EBML_ID.clusterTimecode) clusterTimecode = ebmlUnsigned(bytes, child);
    if (child.id === EBML_ID.simpleBlock) blocks.push({ block: child, blockDuration: null });
    if (child.id === EBML_ID.blockGroup) {
      const group = ebmlChildren(bytes, child.dataStart, child.end);
      const block = group?.find(element => element.id === EBML_ID.block);
      const blockDuration = group?.find(element => element.id === EBML_ID.blockDuration);
      if (!group) return null;
      if (block) blocks.push({ block, blockDuration: blockDuration ? ebmlUnsigned(bytes, blockDuration) : null });
    }
    offset = child.end;
  }
  if (clusterTimecode === null) return null;
  let blockCount = 0;
  for (const item of blocks) {
    const parsedBlock = splitLacedBlock(bytes, item.block);
    if (!parsedBlock) return null;
    const track = videoTracks.get(parsedBlock.trackNumber);
    if (!track) continue;
    if (!parsedBlock.frames.length) return null;
    const timestampTicks = clusterTimecode + parsedBlock.relativeTimecode;
    if (timestampTicks < 0) return null;
    const timestampMs = timestampTicks * timecodeScale / 1_000_000;
    const frameCount = parsedBlock.frames.length;
    if (!Number.isFinite(timestampMs) || timestampMs > PROFILE_VIDEO_LIMITS.maxDurationMs) return null;
    const frameDurationMs = item.blockDuration !== null
      ? item.blockDuration * timecodeScale / 1_000_000
      : track.defaultDurationNs > 0 ? track.defaultDurationNs * frameCount / 1_000_000 : 0;
    state.observedDurationMs = Math.max(state.observedDurationMs, timestampMs + frameDurationMs);
    for (const frame of parsedBlock.frames) {
      if (++state.frameCount > 10_000) return null;
      const dimensions = inspectVideoFrame(track, frame);
      if (!dimensions || !frameWithinLimits(dimensions)) return null;
      if (!track.sawFrame && (dimensions.width !== track.width || dimensions.height !== track.height)) return null;
      track.sawFrame = true;
      track.maxWidth = Math.max(track.maxWidth, dimensions.width, dimensions.renderWidth);
      track.maxHeight = Math.max(track.maxHeight, dimensions.height, dimensions.renderHeight);
      if (track.maxWidth > PROFILE_VIDEO_LIMITS.maxWidth || track.maxHeight > PROFILE_VIDEO_LIMITS.maxHeight) return null;
      blockCount += 1;
    }
  }
  return { nextOffset: nextClusterOffset ?? offset, blockCount };
}

function inspectWebm(bytes) {
  const header = readEbmlElement(bytes, 0, bytes.length);
  if (!header || header.id !== EBML_ID.ebml) return null;
  const headerChildren = ebmlChildren(bytes, header.dataStart, header.end);
  if (!headerChildren || !headerChildren.some(element =>
    element.id === EBML_ID.docType && ascii(bytes, 'webm', element.dataStart, element.end)
  )) return null;

  let offset = header.end;
  let segment = null;
  while (offset < bytes.length) {
    const element = readEbmlElement(bytes, offset, bytes.length, true);
    if (!element) return null;
    if (element.id === EBML_ID.segment) { segment = element; break; }
    offset = element.end;
  }
  if (!segment) return null;
  let info = null;
  let tracks = null;
  let childOffset = segment.dataStart;
  let childCount = 0;
  while (childOffset < segment.end && (!info || !tracks)) {
    if (childCount >= 10_000) return null;
    const child = readEbmlElement(bytes, childOffset, segment.end, true);
    if (!child) return null;
    if (child.unknown && (child.id === EBML_ID.info || child.id === EBML_ID.tracks)) return null;
    if (child.id === EBML_ID.info) info = child;
    if (child.id === EBML_ID.tracks) tracks = child;
    childOffset = child.end;
    childCount += 1;
  }
  if (!info || !tracks) return null;
  const infoChildren = ebmlChildren(bytes, info.dataStart, info.end);
  const trackChildren = ebmlChildren(bytes, tracks.dataStart, tracks.end);
  if (!infoChildren || !trackChildren) return null;
  const scaleElement = infoChildren.find(element => element.id === EBML_ID.timecodeScale);
  const durationElement = infoChildren.find(element => element.id === EBML_ID.duration);
  const timecodeScale = scaleElement ? ebmlUnsigned(bytes, scaleElement) : 1_000_000;
  const durationTicks = durationElement ? ebmlFloat(bytes, durationElement) : null;
  if (!timecodeScale || !durationTicks || durationTicks <= 0) return null;
  const durationMs = durationTicks * timecodeScale / 1_000_000;
  let width = 0;
  let height = 0;
  const videoTracks = new Map();
  for (const track of trackChildren.filter(element => element.id === EBML_ID.trackEntry)) {
    const values = ebmlChildren(bytes, track.dataStart, track.end);
    if (!values) return null;
    const type = values.find(element => element.id === EBML_ID.trackType);
    if (!type || ebmlUnsigned(bytes, type) !== 1) continue;
    const trackNumberElement = values.find(element => element.id === EBML_ID.trackNumber);
    const codecElement = values.find(element => element.id === EBML_ID.codecId);
    const trackNumber = trackNumberElement && ebmlUnsigned(bytes, trackNumberElement);
    const codecId = codecElement && ascii(bytes, 'V_VP8', codecElement.dataStart, codecElement.end)
      ? 'V_VP8'
      : codecElement && ascii(bytes, 'V_VP9', codecElement.dataStart, codecElement.end)
        ? 'V_VP9'
        : '';
    const video = values.find(element => element.id === EBML_ID.video);
    const videoValues = video && ebmlChildren(bytes, video.dataStart, video.end);
    const widthElement = videoValues?.find(element => element.id === EBML_ID.pixelWidth);
    const heightElement = videoValues?.find(element => element.id === EBML_ID.pixelHeight);
    const trackWidth = widthElement && ebmlUnsigned(bytes, widthElement);
    const trackHeight = heightElement && ebmlUnsigned(bytes, heightElement);
    const defaultDurationElement = values.find(element => element.id === EBML_ID.defaultDuration);
    const defaultDurationNs = defaultDurationElement ? ebmlUnsigned(bytes, defaultDurationElement) : 0;
    if (!trackNumber || !['V_VP8', 'V_VP9'].includes(codecId) || !trackWidth || !trackHeight
      || !Number.isSafeInteger(defaultDurationNs) || defaultDurationNs > 30_000_000_000
      || videoTracks.has(trackNumber)
      || !videoBoundsValid(trackWidth, trackHeight, Math.min(durationMs, PROFILE_VIDEO_LIMITS.maxDurationMs))) return null;
    width = Math.max(width, trackWidth);
    height = Math.max(height, trackHeight);
    videoTracks.set(trackNumber, {
      codecId,
      width: trackWidth,
      height: trackHeight,
      defaultDurationNs,
      vp8Size: null,
      references: Array(8).fill(null),
      sawFrame: false,
      maxWidth: 0,
      maxHeight: 0
    });
  }
  if (!videoTracks.size || videoTracks.size > 1) return null;

  const state = { frameCount: 0, observedDurationMs: 0 };
  let clusterOffset = segment.dataStart;
  let clusterCount = 0;
  while (clusterOffset < segment.end) {
    if (++clusterCount > 10_000) return null;
    const element = readEbmlElement(bytes, clusterOffset, segment.end, true);
    if (!element || element.end <= clusterOffset) return null;
    if (element.id === EBML_ID.cluster) {
      const inspected = inspectCluster(bytes, element, segment.end, videoTracks, timecodeScale, state);
      if (!inspected || inspected.nextOffset <= clusterOffset) return null;
      clusterOffset = inspected.nextOffset;
    } else {
      clusterOffset = element.end;
    }
  }

  if (!state.frameCount || [...videoTracks.values()].some(track => !track.sawFrame)) return null;
  for (const track of videoTracks.values()) {
    width = Math.max(width, track.maxWidth);
    height = Math.max(height, track.maxHeight);
  }
  const effectiveDuration = Math.max(durationMs, state.observedDurationMs);
  return { width, height, durationMs: effectiveDuration, valid: videoBoundsValid(width, height, effectiveDuration) };
}

function videoBoundsValid(width, height, durationMs) {
  return width > 0
    && height > 0
    && width <= PROFILE_VIDEO_LIMITS.maxWidth
    && height <= PROFILE_VIDEO_LIMITS.maxHeight
    && width * height <= PROFILE_VIDEO_LIMITS.maxPixels
    && Number.isFinite(durationMs)
    && durationMs > 0
    && durationMs <= PROFILE_VIDEO_LIMITS.maxDurationMs;
}

/** Read actual dimensions and duration from an MP4 or WebM container. */
export function inspectProfileVideoBounds(value, mimeType = '') {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  const mime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  if (mime === 'video/mp4' || (!mime && ascii(bytes, 'ftyp', 4))) {
    return inspectMp4(bytes) || { width: 0, height: 0, durationMs: 0, valid: false };
  }
  if (mime === 'video/webm' || (!mime && bytes[0] === 0x1a && bytes[1] === 0x45)) {
    return inspectWebm(bytes) || { width: 0, height: 0, durationMs: 0, valid: false };
  }
  return { width: 0, height: 0, durationMs: 0, valid: false };
}
