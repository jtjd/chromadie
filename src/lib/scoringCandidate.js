import {
  BASE_ROLL_SCORE,
  CATEGORY_MULTIPLIERS,
  getCandidateRarity
} from './balanceCandidate.js';
import { isPrime } from './scoring.js';

const FIBONACCI_SUMS = new Set([0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610]);
const WEB_SAFE_CHANNELS = new Set([0, 51, 102, 153, 204, 255]);
const MEME_PATTERNS = Object.freeze([
  ['dead', 'DEAD', 300000],
  ['beef', 'BEEF', 300000],
  ['cafe', 'CAFE', 250000],
  ['face', 'FACE', 250000],
  ['fade', 'FADE', 225000],
  ['feed', 'FEED', 250000],
  ['food', 'F00D', 225000],
  ['leet', '1337', 250000],
  ['james_bond', '007', 100000],
  ['blaze_it', '420', 75000]
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
  return { hue, saturation: saturation * 100, lightness: lightness * 100 };
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

export function scoreCandidateColor(red, green, blue) {
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
  const conditions = [];

  const add = (triggered, id, name, category, points, options = {}) => {
    if (triggered) conditions.push({ id, name, category, points, ...options });
  };

  add(isPrime(sum), 'prime_sum', 'Prime Energy', 'mathematical', 15000);
  add(FIBONACCI_SUMS.has(sum), 'fibonacci_sum', 'Fibonacci Energy', 'mathematical', 25000);
  add(sum === 42, 'sum_42', 'Meaning of Life', 'rare_event', 150000, { fullValue: true });
  add(sum === 100, 'sum_100', 'Perfect Century', 'rare_event', 100000, { fullValue: true });
  add(sum === 255, 'sum_255', 'Max Byte', 'rare_event', 75000, { fullValue: true });
  add(sum === 666, 'sum_666', 'Sinister Shade', 'rare_event', 250000, { fullValue: true });

  add(range >= 205, 'high_contrast', 'Polarized Channels', 'color_relationship', 18000);
  add(range <= 20, 'low_contrast', 'Close Harmony', 'color_relationship', 12000);
  add(range > 20 && range < 80, 'gentle_contrast', 'Gentle Contrast', 'color_relationship', 3000);
  add(range >= 80 && range < 205, 'layered_contrast', 'Layered Contrast', 'color_relationship', 6000);
  add(maximum > 210 && minimum > 120 && range < 75, 'pastel', 'Pastel Bloom', 'color_relationship', 25000);
  add(maximum > 220 && minimum < 45, 'neon', 'Neon Voltage', 'color_relationship', 30000);
  add(hsl.lightness >= 90 && hsl.saturation <= 20, 'luminous_core', 'Luminous Core', 'color_relationship', 40000);
  const sorted = [...channels].sort((a, b) => a - b);
  add(
    sorted[0] <= 10 && sorted[1] >= 110 && sorted[1] <= 145 && sorted[2] >= 245,
    'triple_crown',
    'Triple Crown',
    'rare_event',
    175000,
    { fullValue: true }
  );
  add(hsl.saturation >= 95, 'saturation_spike', 'Saturation Spike', 'saturation', 20000);
  add(hsl.saturation >= 70 && hsl.saturation < 95, 'vivid_saturation', 'Vivid Saturation', 'saturation', 12000);
  add(hsl.saturation >= 40 && hsl.saturation < 70, 'rich_saturation', 'Rich Saturation', 'saturation', 7000);
  add(hsl.saturation >= 15 && hsl.saturation < 40, 'muted_saturation', 'Muted Saturation', 'saturation', 3000);
  add(hsl.saturation < 15, 'soft_saturation', 'Soft Saturation', 'saturation', 1000);
  add(hsl.lightness < 15, 'shadow_tone', 'Shadow Tone', 'tone', 15000);
  add(hsl.lightness >= 15 && hsl.lightness < 35, 'deep_tone', 'Deep Tone', 'tone', 7000);
  add(hsl.lightness >= 35 && hsl.lightness < 65, 'balanced_tone', 'Balanced Tone', 'tone', 3000);
  add(hsl.lightness >= 65 && hsl.lightness < 85, 'bright_tone', 'Bright Tone', 'tone', 7000);
  add(hsl.lightness >= 85, 'luminous_tone', 'Luminous Tone', 'tone', 15000);
  const dominantIndex = channels.indexOf(maximum);
  const uniqueMaximum = channels.filter(value => value === maximum).length === 1;
  add(uniqueMaximum && range >= 30 && dominantIndex === 0, 'red_dominant', 'Red Dominant', 'composition', 5000);
  add(uniqueMaximum && range >= 30 && dominantIndex === 1, 'green_dominant', 'Green Dominant', 'composition', 5000);
  add(uniqueMaximum && range >= 30 && dominantIndex === 2, 'blue_dominant', 'Blue Dominant', 'composition', 5000);
  add(!uniqueMaximum || range < 30, 'balanced_channels', 'Balanced Channels', 'composition', 3000);
  add(red === green && green === blue, 'greyscale', 'Perfect Greyscale', 'structure', 75000);
  add(channels.every(value => WEB_SAFE_CHANNELS.has(value)), 'web_safe', 'Web Safe', 'structure', 50000);
  add(hexValue === [...hexValue].reverse().join(''), 'palindrome', 'Hex Palindrome', 'hex_pattern', 175000);
  add(
    hexValue.slice(0, 2) === hexValue.slice(2, 4) && hexValue.slice(2, 4) === hexValue.slice(4, 6),
    'repeated_pair',
    'Repeated Pair',
    'hex_pattern',
    150000
  );
  add(/(.)\1\1/.test(hexValue), 'triple_hex', 'Triple Hex', 'hex_pattern', 90000);
  add(hexValue.includes('F1'), 'f1', 'F1', 'hex_pattern', 75000);
  for (const [id, pattern, points] of MEME_PATTERNS) {
    add(hexValue.includes(pattern), id, pattern, 'rare_event', points, { fullValue: true });
  }

  add(red === 0 && green === 0 && blue === 0, 'pure_black', 'The Void', 'special_event', 1750000, { fullValue: true });
  add(red === 255 && green === 255 && blue === 255, 'pure_white', 'The Light', 'special_event', 1750000, { fullValue: true });
  add(red === 255 && green === 0 && blue === 0, 'pure_red', 'Maximum Red', 'special_event', 750000, { fullValue: true });
  add(red === 0 && green === 255 && blue === 0, 'pure_green', 'Maximum Green', 'special_event', 750000, { fullValue: true });
  add(red === 0 && green === 0 && blue === 255, 'pure_blue', 'Maximum Blue', 'special_event', 750000, { fullValue: true });
  add(red === 255 && green === 215 && blue === 0, 'pure_gold', 'Midas', 'special_event', 1500000, { fullValue: true });
  add(red === 145 && green === 70 && blue === 255, 'streamer_purple', 'Streamer Purple', 'special_event', 1000000, { fullValue: true });
  add(red === 30 && green === 215 && blue === 96, 'audio_stream_green', 'Audio Stream Green', 'special_event', 1000000, { fullValue: true });
  add(red === 244 && green === 0 && blue === 9, 'classic_cola_red', 'Classic Cola Red', 'special_event', 1000000, { fullValue: true });

  let score = BASE_ROLL_SCORE;
  const contributors = [];
  const categories = new Map();
  for (const condition of conditions) {
    if (condition.fullValue) {
      contributors.push({ ...condition, awardedPoints: condition.points, multiplier: 1 });
      score += condition.points;
      continue;
    }
    if (!categories.has(condition.category)) categories.set(condition.category, []);
    categories.get(condition.category).push(condition);
  }
  for (const categoryConditions of categories.values()) {
    categoryConditions.sort((a, b) => b.points - a.points);
    categoryConditions.slice(0, CATEGORY_MULTIPLIERS.length).forEach((condition, index) => {
      const multiplier = CATEGORY_MULTIPLIERS[index];
      const awardedPoints = Math.round(condition.points * multiplier);
      contributors.push({ ...condition, awardedPoints, multiplier });
      score += awardedPoints;
    });
  }
  contributors.sort((a, b) => b.awardedPoints - a.awardedPoints);

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
    red,
    green,
    blue,
    hex,
    hsl,
    identity: `${lightness} ${saturation} ${family}`,
    score,
    rarity: getCandidateRarity(score),
    traits,
    conditions,
    contributors
  };
}
