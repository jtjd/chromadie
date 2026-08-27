import { isPrime } from './scoring.js';
import { getRarityV3, getRarityV4 } from './balanceConfig.js';

export const HISTORICAL_SCORE_MODEL_VERSION = 3;
export const SCORE_MODEL_VERSION = 4;

const FIBONACCI_SUMS = new Set([0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610]);
const WEB_SAFE_CHANNELS = new Set([0, 51, 102, 153, 204, 255]);
const MEME_PATTERNS = Object.freeze([
  ['dead', 'DEAD', 180000, 'Legendary'],
  ['beef', 'BEEF', 165000, 'Legendary'],
  ['cafe', 'CAFE', 150000, 'Legendary'],
  ['face', 'FACE', 150000, 'Legendary'],
  ['fade', 'FADE', 140000, 'Legendary'],
  ['feed', 'FEED', 180000, 'Legendary'],
  ['food', 'F00D', 160000, 'Legendary'],
  ['leet', '1337', 220000, 'Legendary'],
  ['james_bond', '007', 90000, 'Epic'],
  ['blaze_it', '420', 70000, 'Epic'],
  ['babe', 'BABE', 95000, 'Legendary'],
  ['boob', 'B00B', 95000, 'Legendary'],
  ['dood', 'D00D', 75000, 'Legendary'],
  ['nice', '69', 35000, 'Uncommon'],
  ['demon', '666', 80000, 'Epic'],
  ['jackpot', '777', 90000, 'Epic'],
  ['not_found', '404', 55000, 'Epic'],
  ['server_error', '500', 60000, 'Epic'],
  ['perfect_score', '100', 80000, 'Epic'],
  ['abcd', 'ABCD', 65000, 'Legendary']
]);

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

function saturationTrait(saturation) {
  if (saturation >= 95) return 'Electric';
  if (saturation >= 70) return 'Vivid';
  if (saturation >= 40) return 'Rich';
  if (saturation >= 15) return 'Muted';
  return 'Soft';
}

function lightnessTrait(lightness) {
  if (lightness < 15) return 'Shadow';
  if (lightness < 35) return 'Deep';
  if (lightness < 65) return 'Balanced';
  if (lightness < 85) return 'Bright';
  return 'Luminous';
}

function validateChannel(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`${name} must be an integer from 0 to 255.`);
  }
}

function addCondition(conditions, triggered, id, name, category, points, conditionRarity = 'Common') {
  if (!triggered) return;
  if (!Number.isSafeInteger(points) || points <= 0) {
    throw new RangeError(`Condition ${id} must have a positive safe integer point value.`);
  }
  conditions.push({ id, name, category, points, conditionRarity });
}

function addMemeConditions(conditions, hexValue) {
  for (const [id, pattern, points, conditionRarity] of MEME_PATTERNS) {
    addCondition(conditions, hexValue.includes(String(pattern)), String(id), String(pattern), 'hex_culture', Number(points), String(conditionRarity));
  }
}

function isHexStaircase(hexValue) {
  return ['012345', '123456', '234567', '345678', '456789', '56789A', '6789AB', '789ABC', '89ABCD', '9ABCDE', 'ABCDEF', 'FEDCBA', 'EDCBA9', 'DCBA98', 'CBA987', 'BA9876', 'A98765', '987654'].includes(hexValue);
}

export function scoreCandidateColorV3(red, green, blue) {
  validateChannel(red, 'red');
  validateChannel(green, 'green');
  validateChannel(blue, 'blue');

  const channels = [red, green, blue];
  const sum = red + green + blue;
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const range = maximum - minimum;
  const hexValue = channels.map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
  const hex = `#${hexValue}`;
  const hsl = hslFromRgb(red, green, blue);
  const family = hueFamily(hsl.hue, hsl.saturation);
  const saturation = saturationTrait(hsl.saturation);
  const lightness = lightnessTrait(hsl.lightness);
  const sorted = [...channels].sort((a, b) => a - b);
  const evenChannels = channels.filter(value => value % 2 === 0).length;
  const uniqueMaximum = channels.filter(value => value === maximum).length === 1;
  const dominantIndex = channels.indexOf(maximum);
  const hexDigits = [...hexValue].filter(character => /[0-9]/.test(character)).length;
  const hexLetters = hexValue.match(/[A-F]/g)?.length || 0;
  const hexDigitSum = [...hexValue].reduce((total, character) => total + Number.parseInt(character, 16), 0);
  const hasEqualChannels = new Set(channels).size < 3;
  const conditions = [];

  // Core identity signals are intentionally small but always explain the color.
  addCondition(conditions, sum % 2 === 0, 'sum_even', 'Even Pulse', 'number_pattern', 140);
  addCondition(conditions, sum % 2 !== 0, 'sum_odd', 'Odd Pulse', 'number_pattern', 150);
  addCondition(conditions, true, `hue_family_${family.toLowerCase()}`, `${family} Hue`, 'color_identity', 120, family === 'Neutral' ? 'Rare' : family === 'Emerald' ? 'Common' : 'Uncommon');
  addCondition(
    conditions,
    true,
    `temperature_${red === green && green === blue ? 'neutral' : red >= blue ? 'warm' : 'cool'}`,
    `${red === green && green === blue ? 'Neutral' : red >= blue ? 'Warm' : 'Cool'} Temperature`,
    'color_identity',
    120,
    red === green && green === blue ? 'Legendary' : 'Common'
  );
  addCondition(
    conditions,
    true,
    evenChannels === 3 ? 'even_channel_harmony' : evenChannels === 0 ? 'odd_channel_rhythm' : 'mixed_channel_rhythm',
    evenChannels === 3 ? 'Even Channel Harmony' : evenChannels === 0 ? 'Odd Channel Rhythm' : 'Mixed Channel Rhythm',
    'channel_identity',
    150
  );

  // RGB arithmetic and meaningful sums.
  addCondition(conditions, isPrime(sum), 'prime_sum', 'Prime Energy', 'mathematical', 2400);
  addCondition(conditions, FIBONACCI_SUMS.has(sum), 'fibonacci_sum', 'Fibonacci Energy', 'mathematical', 3200, 'Rare');
  addCondition(conditions, sum % 3 === 0, 'sum_divisible_3', 'Rule of Three', 'mathematical', 900);
  addCondition(conditions, sum % 5 === 0, 'sum_divisible_5', 'Fivefold Sum', 'mathematical', 1100);
  addCondition(conditions, sum % 7 === 0, 'sum_divisible_7', 'Lucky Sum', 'mathematical', 1500);
  addCondition(conditions, sum === 42, 'sum_42', 'Meaning of Life', 'rare_event', 75000, 'Legendary');
  addCondition(conditions, sum === 100, 'sum_100', 'Perfect Century', 'rare_event', 55000, 'Epic');
  addCondition(conditions, sum === 255, 'sum_255', 'Max Byte', 'rare_event', 45000, 'Rare');
  addCondition(conditions, sum === 666, 'sum_666', 'Sinister Shade', 'rare_event', 85000, 'Epic');
  addCondition(conditions, sum >= 300 && sum <= 465, 'balanced_sum_band', 'Balanced Sum', 'sum_shape', 700);

  // Color relationships overlap deliberately so a color can tell a richer story.
  addCondition(conditions, range >= 205, 'high_contrast', 'Polarized Channels', 'color_relationship', 4200);
  addCondition(conditions, range <= 20, 'low_contrast', 'Close Harmony', 'color_relationship', 2900, 'Uncommon');
  addCondition(conditions, range > 20 && range < 80, 'gentle_contrast', 'Gentle Contrast', 'color_relationship', 1900);
  addCondition(conditions, range >= 80 && range < 205, 'layered_contrast', 'Layered Contrast', 'color_relationship', 2400);
  addCondition(conditions, maximum > 210 && minimum > 120 && range < 75, 'pastel', 'Pastel Bloom', 'color_relationship', 4500, 'Uncommon');
  addCondition(conditions, maximum > 220 && minimum < 45, 'neon', 'Neon Voltage', 'color_relationship', 5200);
  addCondition(conditions, hsl.lightness >= 90 && hsl.saturation <= 20, 'luminous_core', 'Luminous Core', 'color_relationship', 9000, 'Epic');
  addCondition(conditions, maximum + minimum >= 235 && range >= 120, 'complementary_balance', 'Complementary Balance', 'color_relationship', 3200);
  addCondition(conditions, red >= green && green >= blue && red > blue, 'warm_bias', 'Warm Bias', 'color_relationship', 1800);
  addCondition(conditions, blue >= green && green >= red && blue > red, 'cool_bias', 'Cool Bias', 'color_relationship', 1800);

  addCondition(conditions, hsl.saturation >= 70 && range >= 120, 'vivid_contrast', 'Vivid Contrast', 'color_signature', 3700);
  addCondition(conditions, hsl.lightness < 20 || hsl.lightness >= 80, 'edge_luminance', 'Edge Luminance', 'color_signature', 2300, 'Uncommon');
  addCondition(conditions, range >= 170, 'channel_span', 'Wide Channel Span', 'color_signature', 3000);
  addCondition(conditions, hexLetters >= 3, 'hex_letter_rich', 'Letter-Rich Hex', 'hex_signature', 1400);
  addCondition(conditions, hexDigits >= 4, 'hex_digit_rich', 'Digit-Rich Hex', 'hex_signature', 1300);
  addCondition(conditions, isPrime(hexDigitSum), 'hex_digit_prime', 'Prime Hex Sum', 'hex_signature', 1600);
  addCondition(conditions, channels.some(value => value <= 8 || value >= 247), 'channel_edge', 'Edge Channel', 'edge_behavior', 1500);
  addCondition(conditions, channels.filter(value => value <= 8 || value >= 247).length >= 2, 'edge_pair', 'Edge Pair', 'edge_behavior', 9500, 'Uncommon');
  addCondition(conditions, range >= 230, 'extreme_span', 'Extreme Span', 'edge_behavior', 4000, 'Uncommon');
  addCondition(conditions, red === blue, 'mirror_channels', 'Mirror Channels', 'symmetry', 7000, 'Rare');
  addCondition(conditions, /(.)\1/.test(hexValue), 'hex_echo', 'Hex Echo', 'hex_signature', 2500);
  addCondition(conditions, hexValue[0] === hexValue.at(-1), 'hex_bookends', 'Hex Bookends', 'hex_signature', 4500, 'Uncommon');
  addCondition(conditions, evenChannels === 0 || evenChannels === 3, 'channel_parity_lock', 'Parity Lock', 'channel_identity', 1200);

  addCondition(conditions, sorted[0] <= 10 && sorted[1] >= 110 && sorted[1] <= 145 && sorted[2] >= 245, 'triple_crown', 'Triple Crown', 'rare_event', 175000, 'Rare');

  // Saturation and tone are descriptive bands, with additional overlaps for memorable extremes.
  addCondition(conditions, hsl.saturation >= 95, 'saturation_spike', 'Saturation Spike', 'saturation', 4500);
  addCondition(conditions, hsl.saturation >= 70 && hsl.saturation < 95, 'vivid_saturation', 'Vivid Saturation', 'saturation', 3300);
  addCondition(conditions, hsl.saturation >= 40 && hsl.saturation < 70, 'rich_saturation', 'Rich Saturation', 'saturation', 2300);
  addCondition(conditions, hsl.saturation >= 15 && hsl.saturation < 40, 'muted_saturation', 'Muted Saturation', 'saturation', 1400);
  addCondition(conditions, hsl.saturation < 15, 'soft_saturation', 'Soft Saturation', 'saturation', 900, 'Uncommon');
  addCondition(conditions, hsl.saturation >= 80, 'high_chroma', 'High Chroma', 'saturation', 2100);
  addCondition(conditions, hsl.lightness >= 70 && hsl.saturation >= 55, 'luminous_saturation', 'Luminous Saturation', 'saturation', 4500, 'Uncommon');
  addCondition(conditions, hsl.lightness <= 30 && hsl.saturation >= 55, 'shadow_saturation', 'Shadow Saturation', 'saturation', 4300, 'Uncommon');

  addCondition(conditions, hsl.lightness < 15, 'shadow_tone', 'Shadow Tone', 'tone', 4500, 'Uncommon');
  addCondition(conditions, hsl.lightness >= 15 && hsl.lightness < 35, 'deep_tone', 'Deep Tone', 'tone', 2400);
  addCondition(conditions, hsl.lightness >= 35 && hsl.lightness < 65, 'balanced_tone', 'Balanced Tone', 'tone', 1400);
  addCondition(conditions, hsl.lightness >= 65 && hsl.lightness < 85, 'bright_tone', 'Bright Tone', 'tone', 2400);
  addCondition(conditions, hsl.lightness >= 85, 'luminous_tone', 'Luminous Tone', 'tone', 4500, 'Uncommon');
  addCondition(conditions, hsl.lightness < 10 || hsl.lightness > 90, 'tone_edge', 'Tone Edge', 'tone', 3500, 'Rare');

  // Channel composition and structured RGB relationships.
  addCondition(conditions, uniqueMaximum && range >= 30 && dominantIndex === 0, 'red_dominant', 'Red Dominant', 'composition', 2500);
  addCondition(conditions, uniqueMaximum && range >= 30 && dominantIndex === 1, 'green_dominant', 'Green Dominant', 'composition', 2500);
  addCondition(conditions, uniqueMaximum && range >= 30 && dominantIndex === 2, 'blue_dominant', 'Blue Dominant', 'composition', 2500);
  addCondition(conditions, !uniqueMaximum || range < 30, 'balanced_channels', 'Balanced Channels', 'composition', 1800, 'Uncommon');
  addCondition(conditions, red < green && green < blue, 'ascending_channels', 'Ascending Channels', 'composition', 3600);
  addCondition(conditions, red > green && green > blue, 'descending_channels', 'Descending Channels', 'composition', 3600);
  addCondition(conditions, hasEqualChannels, 'channel_pair', 'Channel Pair', 'symmetry', 8000, 'Uncommon');
  addCondition(conditions, red === green && green === blue, 'greyscale', 'Perfect Greyscale', 'structure', 40000, 'Legendary');
  addCondition(conditions, channels.every(value => WEB_SAFE_CHANNELS.has(value)), 'web_safe', 'Web Safe', 'structure', 22000, 'Legendary');
  addCondition(conditions, channels.every(value => value % 2 === 0), 'all_channels_even', 'All Even Channels', 'channel_identity', 3500);
  addCondition(conditions, channels.every(value => value % 2 !== 0), 'all_channels_odd', 'All Odd Channels', 'channel_identity', 3500);

  // Hex patterns and culturally recognizable strings.
  addCondition(conditions, hexValue === [...hexValue].reverse().join(''), 'palindrome', 'Hex Palindrome', 'hex_pattern', 120000, 'Epic');
  addCondition(conditions, hexValue.slice(0, 2) === hexValue.slice(2, 4) && hexValue.slice(2, 4) === hexValue.slice(4, 6), 'repeated_pair', 'Repeated Pair', 'hex_pattern', 100000, 'Legendary');
  addCondition(conditions, /(.)\1\1/.test(hexValue), 'triple_hex', 'Triple Hex', 'hex_pattern', 45000, 'Uncommon');
  addCondition(conditions, hexValue.includes('F1'), 'f1', 'F1', 'hex_pattern', 30000, 'Uncommon');
  addCondition(conditions, isHexStaircase(hexValue), 'hex_staircase', 'Hex Staircase', 'hex_pattern', 100000, 'Anomaly');
  addCondition(conditions, /[A-F]{3}/.test(hexValue), 'hex_letter_run', 'Letter Run', 'hex_pattern', 15000, 'Common');
  addCondition(conditions, /[0-9]{3}/.test(hexValue), 'hex_digit_run', 'Digit Run', 'hex_pattern', 14000, 'Common');
  addMemeConditions(conditions, hexValue);

  // Density matters, but these are ordinary additive signals rather than cliffs.
  const baseConditionCount = conditions.length;
  addCondition(conditions, baseConditionCount >= 14, 'condition_cascade', 'Condition Cascade', 'cascade', 3000);
  addCondition(conditions, baseConditionCount >= 18, 'condition_storm', 'Condition Storm', 'cascade', 20000, 'Common');
  addCondition(conditions, baseConditionCount >= 22, 'condition_constellation', 'Condition Constellation', 'cascade', 100000, 'Uncommon');

  // Exact colors are intentionally huge, making the upper tail memorable without
  // making ordinary condition density jump across multiple tiers.
  addCondition(conditions, red === 0 && green === 0 && blue === 0, 'pure_black', 'The Void', 'special_event', 100000000, 'Anomaly');
  addCondition(conditions, red === 255 && green === 255 && blue === 255, 'pure_white', 'The Light', 'special_event', 100000000, 'Anomaly');
  addCondition(conditions, red === 255 && green === 0 && blue === 0, 'pure_red', 'Maximum Red', 'special_event', 18000000, 'Anomaly');
  addCondition(conditions, red === 0 && green === 255 && blue === 0, 'pure_green', 'Maximum Green', 'special_event', 18000000, 'Anomaly');
  addCondition(conditions, red === 0 && green === 0 && blue === 255, 'pure_blue', 'Maximum Blue', 'special_event', 18000000, 'Anomaly');
  addCondition(conditions, red === 0 && green === 255 && blue === 255, 'pure_cyan', 'Maximum Cyan', 'special_event', 16000000, 'Anomaly');
  addCondition(conditions, red === 255 && green === 0 && blue === 255, 'pure_magenta', 'Maximum Magenta', 'special_event', 16000000, 'Anomaly');
  addCondition(conditions, red === 255 && green === 255 && blue === 0, 'pure_yellow', 'Maximum Yellow', 'special_event', 16000000, 'Anomaly');
  addCondition(conditions, red === 255 && green === 215 && blue === 0, 'pure_gold', 'Midas', 'special_event', 30000000, 'Anomaly');
  addCondition(conditions, red === 145 && green === 70 && blue === 255, 'streamer_purple', 'Streamer Purple', 'special_event', 20000000, 'Anomaly');
  addCondition(conditions, red === 30 && green === 215 && blue === 96, 'audio_stream_green', 'Audio Stream Green', 'special_event', 20000000, 'Anomaly');
  addCondition(conditions, red === 244 && green === 0 && blue === 9, 'classic_cola_red', 'Classic Cola Red', 'special_event', 20000000, 'Anomaly');
  addCondition(conditions, hexValue === '123456', 'reference_123456', 'Reference Sequence', 'special_event', 30000000, 'Anomaly');
  addCondition(conditions, hexValue === 'ABCDEF', 'reference_abcdef', 'Alphabetic Gradient', 'special_event', 30000000, 'Anomaly');
  addCondition(conditions, hexValue === 'FEDCBA', 'reference_fedcba', 'Reverse Gradient', 'special_event', 30000000, 'Anomaly');

  const contributors = conditions
    .map(condition => ({ ...condition, awardedPoints: condition.points, multiplier: 1 }))
    .sort((left, right) => right.awardedPoints - left.awardedPoints || left.id.localeCompare(right.id));
  const score = contributors.reduce((total, condition) => total + condition.awardedPoints, 0);

  const traits = [
    { id: `hue_${family.toLowerCase()}`, label: `${family} Hue`, group: 'hue' },
    { id: `saturation_${saturation.toLowerCase()}`, label: `${saturation} Saturation`, group: 'saturation' },
    { id: `lightness_${lightness.toLowerCase()}`, label: `${lightness} Lightness`, group: 'lightness' },
    {
      id: red === green && green === blue ? 'temperature_neutral' : red >= blue ? 'temperature_warm' : 'temperature_cool',
      label: red === green && green === blue ? 'Neutral Temperature' : red >= blue ? 'Warm Temperature' : 'Cool Temperature',
      group: 'temperature'
    },
    {
      id: range <= 20 ? 'structure_smooth' : range >= 205 ? 'structure_polarized' : 'structure_layered',
      label: range <= 20 ? 'Smooth Structure' : range >= 205 ? 'Polarized Structure' : 'Layered Structure',
      group: 'structure'
    }
  ];

  return {
    scoreVersion: HISTORICAL_SCORE_MODEL_VERSION,
    red,
    green,
    blue,
    hex,
    hsl,
    identity: `${lightness} ${saturation} ${family}`,
    score,
    rarity: getRarityV3(score),
    conditions,
    contributors,
    traits
  };
}

// v4 keeps memorable, exact-pattern awards legible while giving ordinary
// signals a small deterministic spread. The spread is derived from the
// rolled RGB value and condition order, so the server and client can agree
// without introducing a second client-controlled random source.
const FIXED_SCORE_CONDITION_IDS = new Set([
  'sum_42', 'sum_100', 'sum_255', 'sum_666',
  'triple_crown', 'palindrome', 'repeated_pair', 'hex_staircase', 'f1',
  ...MEME_PATTERNS.map(([id]) => id),
  'pure_black', 'pure_white', 'pure_red', 'pure_green', 'pure_blue',
  'pure_cyan', 'pure_magenta', 'pure_yellow', 'pure_gold',
  'streamer_purple', 'audio_stream_green', 'classic_cola_red',
  'reference_123456', 'reference_abcdef', 'reference_fedcba'
]);

export function getConditionVariationBps(red, green, blue, conditionIndex, conditionId) {
  if (FIXED_SCORE_CONDITION_IDS.has(conditionId)) return 0;
  const seed = (red * 97 + green * 193 + blue * 389 + conditionIndex * 9973) % 2001;
  return seed - 1000;
}

export function scoreCandidateColorV4(red, green, blue) {
  const base = scoreCandidateColorV3(red, green, blue);
  const contributors = base.conditions
    .map((condition, conditionIndex) => {
      const variationBps = getConditionVariationBps(
        red,
        green,
        blue,
        conditionIndex,
        condition.id
      );
      const awardedPoints = Math.max(
        1,
        Math.round(condition.points * (10000 + variationBps) / 10000)
      );
      return {
        ...condition,
        basePoints: condition.points,
        awardedPoints,
        multiplier: 1,
        variationBps
      };
    })
    .sort((left, right) => right.awardedPoints - left.awardedPoints || left.id.localeCompare(right.id));
  const score = contributors.reduce((total, condition) => total + condition.awardedPoints, 0);

  return {
    ...base,
    scoreVersion: SCORE_MODEL_VERSION,
    score,
    rarity: getRarityV4(score),
    contributors
  };
}

export { MEME_PATTERNS };
