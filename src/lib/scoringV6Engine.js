// Pure v6 feature and predicate engine. The generated client artifact supplies
// the catalog snapshot; this module supplies the small, auditable evaluator
// shared by the manifest generator and the browser scorer.

const HEX_ALPHABET = '0123456789ABCDEF';
const FIBONACCI = new Set([0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765]);
const SQUARES = new Set(Array.from({ length: 28 }, (_, index) => index * index));
const TRIANGULAR = new Set(Array.from({ length: 40 }, (_, index) => (index * (index + 1)) / 2));
const WEB_SAFE = new Set([0, 51, 102, 153, 204, 255]);
const POWER_OF_TWO = new Set([1, 2, 4, 8, 16, 32, 64, 128]);

function validateChannel(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`${name} must be an integer from 0 to 255.`);
  }
}

export function isPrime(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  if (value === 2) return true;
  if (value % 2 === 0) return false;
  for (let divisor = 3; divisor * divisor <= value; divisor += 2) {
    if (value % divisor === 0) return false;
  }
  return true;
}

function compare(value, op, target) {
  switch (op) {
    case 'eq': return value === target;
    case 'neq': return value !== target;
    case 'gt': return value > target;
    case 'gte': return value >= target;
    case 'lt': return value < target;
    case 'lte': return value <= target;
    default: throw new Error(`Unsupported v6 comparison operator: ${op}`);
  }
}

function hslFromRgb(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;

  if (delta !== 0) {
    if (maximum === r) hue = 60 * (((g - b) / delta) % 6);
    else if (maximum === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const snap = value => Number(value.toFixed(12));

  return {
    hue: snap(hue),
    saturation: snap(saturation * 100),
    lightness: snap(lightness * 100)
  };
}

function hueFamily(hue, saturation) {
  if (saturation < 8) return 'Neutral';
  if (hue < 15 || hue >= 345) return 'Crimson';
  if (hue < 45) return 'Amber';
  if (hue < 75) return 'Gold';
  if (hue < 105) return 'Lime';
  if (hue < 165) return 'Emerald';
  if (hue < 195) return 'Cyan';
  if (hue < 225) return 'Azure';
  if (hue < 255) return 'Blue';
  if (hue < 285) return 'Violet';
  if (hue < 315) return 'Magenta';
  return 'Rose';
}

function channelValue(features, channel) {
  return features.channels[{ r: 0, g: 1, b: 2 }[channel]];
}

function channelOperation(value, operation, predicate) {
  switch (operation) {
    case 'parity': return predicate.value === 'even' ? value % 2 === 0 : value % 2 !== 0;
    case 'divisibleBy': return value % predicate.value === 0;
    case 'inSet': return predicate.values.includes(value);
    case 'equals': return value === predicate.value;
    case 'edge': return value <= 8 || value >= 247;
    case 'gte': return value >= predicate.value;
    case 'lte': return value <= predicate.value;
    case 'gt': return value > predicate.value;
    case 'lt': return value < predicate.value;
    case 'inRange': return value >= predicate.min && value <= predicate.max;
    default: throw new Error(`Unsupported v6 channel operation: ${operation}`);
  }
}

function compareRange(range, op, value) {
  if (op === 'gtLt') return range > value[0] && range < value[1];
  if (op === 'gteLt') return range >= value[0] && range < value[1];
  return compare(range, op, value);
}

function compareHsl(features, predicate) {
  const value = features.hsl[predicate.field];
  if (predicate.op === 'gtLt') return value > predicate.value[0] && value < predicate.value[1];
  if (predicate.op === 'gteLt') return value >= predicate.value[0] && value < predicate.value[1];
  return compare(value, predicate.op, predicate.value);
}

function hexRun(hex, length) {
  for (let start = 0; start <= hex.length - length; start += 1) {
    if (hex.slice(start, start + length).split('').every(character => character === hex[start])) return true;
  }
  return false;
}

function hexMonotonic(hex, direction, step = null) {
  const values = [...hex].map(character => HEX_ALPHABET.indexOf(character));
  for (let index = 1; index < values.length; index += 1) {
    const difference = values[index] - values[index - 1];
    if (step !== null ? difference !== step : direction === 'ascending' ? difference <= 0 : difference >= 0) return false;
  }
  return true;
}

function evaluateHslAny(features, checks) {
  return checks.some(check => compareHsl(features, check));
}

export function createColorFeatures(red, green, blue) {
  validateChannel(red, 'red');
  validateChannel(green, 'green');
  validateChannel(blue, 'blue');
  const channels = [red, green, blue];
  const hex = channels.map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
  const hsl = hslFromRgb(red, green, blue);
  const sorted = [...channels].sort((left, right) => left - right);
  const maximum = sorted[2];
  const minimum = sorted[0];
  const uniqueMaximum = channels.filter(value => value === maximum).length === 1;
  const digits = [...hex].map(character => HEX_ALPHABET.indexOf(character));
  return {
    red,
    green,
    blue,
    channels,
    hex,
    hexDigits: digits,
    sum: red + green + blue,
    maximum,
    minimum,
    range: maximum - minimum,
    sorted,
    uniqueMaximum,
    hsl,
    hueFamily: hueFamily(hsl.hue, hsl.saturation),
    hexDigitSum: digits.reduce((total, value) => total + value, 0),
    hexLetterCount: [...hex].filter(character => character >= 'A' && character <= 'F').length,
    hexDigitCount: [...hex].filter(character => character >= '0' && character <= '9').length,
    hexUniqueCount: new Set(hex).size
  };
}

export function evaluateV6Predicate(predicate, features, matchedIds = new Set()) {
  switch (predicate.type) {
    case 'always': return true;
    case 'all': return predicate.checks.every(check => evaluateV6Predicate(check, features, matchedIds));
    case 'any': return predicate.checks.some(check => evaluateV6Predicate(check, features, matchedIds));
    case 'not': return !evaluateV6Predicate(predicate.check, features, matchedIds);
    case 'sumModulo': return features.sum % predicate.divisor === predicate.remainder;
    case 'sumEquals': return features.sum === predicate.value;
    case 'sumBetween': return features.sum >= predicate.min && features.sum <= predicate.max;
    case 'sumSet': return predicate.values.includes(features.sum);
    case 'sumPrime': return isPrime(features.sum);
    case 'sumSquare': return SQUARES.has(features.sum);
    case 'sumTriangular': return TRIANGULAR.has(features.sum);
    case 'sumFibonacci': return FIBONACCI.has(features.sum);
    case 'channelsAll': return features.channels.every(value => channelOperation(value, predicate.operation, predicate));
    case 'channelsAny': return features.channels.some(value => channelOperation(value, predicate.operation, predicate));
    case 'channelCount': return compare(features.channels.filter(value => channelOperation(value, predicate.operation, predicate)).length, predicate.op, predicate.value);
    case 'channelExact': return features.red === predicate.red && features.green === predicate.green && features.blue === predicate.blue;
    case 'channelRelation': {
      const [red, green, blue] = features.channels;
      if (predicate.relation === 'allEqual') return red === green && green === blue;
      if (predicate.relation === 'hasEqualPair') return red === green || green === blue || red === blue;
      if (predicate.relation === 'allDistinct') return new Set(features.channels).size === 3;
      if (predicate.relation === 'redGreenEqual') return red === green;
      if (predicate.relation === 'greenBlueEqual') return green === blue;
      if (predicate.relation === 'redBlueEqual') return red === blue;
      if (predicate.relation === 'noUniqueDominant') return !features.uniqueMaximum;
      throw new Error(`Unsupported v6 channel relation: ${predicate.relation}`);
    }
    case 'rangeCompare': return compareRange(features.range, predicate.op, predicate.value);
    case 'hslCompare': return compareHsl(features, predicate);
    case 'hslAny': return evaluateHslAny(features, predicate.checks);
    case 'hueFamily': return features.hueFamily === predicate.value;
    case 'temperature': {
      const neutral = features.red === features.green && features.green === features.blue;
      const temperature = neutral ? 'neutral' : features.red >= features.blue ? 'warm' : 'cool';
      return temperature === predicate.value;
    }
    case 'channelDominant': return features.uniqueMaximum && channelValue(features, predicate.channel) === features.maximum;
    case 'channelOrder': {
      const values = predicate.order.map(channel => channelValue(features, channel));
      if (predicate.direction === 'ascending') return values.every((value, index) => index === 0 || values[index - 1] < value);
      if (predicate.direction === 'descending') return values.every((value, index) => index === 0 || values[index - 1] > value);
      if (predicate.direction === 'nonIncreasing') return values.every((value, index) => index === 0 || values[index - 1] >= value);
      if (predicate.direction === 'nonDecreasing') return values.every((value, index) => index === 0 || values[index - 1] <= value);
      throw new Error(`Unsupported v6 channel order: ${predicate.direction}`);
    }
    case 'arithmeticProgression': return features.sorted[2] - features.sorted[1] === features.sorted[1] - features.sorted[0];
    case 'channelComplement': return channelValue(features, predicate.first) + channelValue(features, predicate.second) === predicate.sum;
    case 'parityPattern': return [...predicate.value].every((value, index) => value === (features.channels[index] % 2 === 0 ? 'E' : 'O'));
    case 'hexContains': return features.hex.includes(predicate.value);
    case 'hexContainsAll': return predicate.values.every(value => features.hex.includes(value));
    case 'hexExact': return features.hex === predicate.value;
    case 'hexPalindrome': return features.hex === [...features.hex].reverse().join('');
    case 'hexByteEquality': return features.hex.slice(0, 2) === features.hex.slice(2, 4) && features.hex.slice(2, 4) === features.hex.slice(4, 6);
    case 'hexAllSame': return new Set(features.hex).size === 1;
    case 'hexRun': return hexRun(features.hex, predicate.length);
    case 'hexCharacterCount': {
      const count = predicate.class === 'letter' ? features.hexLetterCount : features.hexDigitCount;
      return compare(count, predicate.op, predicate.value);
    }
    case 'hexDigitSumPrime': return isPrime(features.hexDigitSum);
    case 'hexDigitSumSquare': return SQUARES.has(features.hexDigitSum);
    case 'hexBookends': return features.hex[0] === features.hex.at(-1);
    case 'byteBookends': return features.hex.slice(0, 2) === features.hex.slice(-2);
    case 'hexMonotonic': return hexMonotonic(features.hex, predicate.direction);
    case 'hexStep': return hexMonotonic(features.hex, null, predicate.step);
    case 'hexUniqueCount': return compare(features.hexUniqueCount, predicate.op, predicate.value);
    case 'combination': return predicate.all.every(id => matchedIds.has(id));
    default: throw new Error(`Unsupported v6 predicate type: ${predicate.type}`);
  }
}

export function evaluateCatalogConditionIndexes(red, green, blue, catalog) {
  const features = createColorFeatures(red, green, blue);
  const active = catalog.filter(entry => entry.active !== false);
  const activeCatalogIndexes = catalog
    .map((entry, index) => entry.active !== false ? index : -1)
    .filter(index => index >= 0);
  const nonCombinationIndexes = [];
  const combinationIndexes = [];
  const rawMatches = new Uint8Array(active.length);

  for (let index = 0; index < active.length; index += 1) {
    if (active[index].predicate.type === 'combination') combinationIndexes.push(index);
    else {
      nonCombinationIndexes.push(index);
      rawMatches[index] = evaluateV6Predicate(active[index].predicate, features) ? 1 : 0;
    }
  }

  const winningByGroup = new Map();
  for (const index of nonCombinationIndexes) {
    const entry = active[index];
    if (!rawMatches[index] || !entry.exclusiveGroup) continue;
    const rank = Number(entry.exclusiveRank || 0);
    const current = winningByGroup.get(entry.exclusiveGroup);
    if (!current || rank > current.rank) winningByGroup.set(entry.exclusiveGroup, { index, rank });
  }

  const selected = new Uint8Array(active.length);
  const matchedIds = new Set();
  for (const index of nonCombinationIndexes) {
    const entry = active[index];
    const winner = entry.exclusiveGroup ? winningByGroup.get(entry.exclusiveGroup)?.index === index : true;
    if (rawMatches[index] && winner) {
      selected[index] = 1;
      matchedIds.add(entry.id);
    }
  }

  for (const index of combinationIndexes) {
    const entry = active[index];
    if (evaluateV6Predicate(entry.predicate, features, matchedIds)) {
      selected[index] = 1;
      matchedIds.add(entry.id);
    }
  }

  const selectedIndexes = [];
  for (let index = 0; index < active.length; index += 1) {
    if (selected[index]) selectedIndexes.push(activeCatalogIndexes[index]);
  }
  return selectedIndexes;
}

export function evaluateCatalogConditions(red, green, blue, catalog) {
  return evaluateCatalogConditionIndexes(red, green, blue, catalog).map(index => catalog[index]);
}

export const V6_ENGINE_CONSTANTS = Object.freeze({
  HEX_ALPHABET,
  WEB_SAFE,
  POWER_OF_TWO
});
