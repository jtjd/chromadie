import { BADGES } from './badgeData.js';

const FIBONACCI_SUMS = new Set([0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610]);
const SQUARE_SUMS = new Set([
  0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256, 289,
  324, 361, 400, 441, 484, 529, 576, 625, 676, 729
]);
const WEB_SAFE_CHANNELS = new Set([0, 51, 102, 153, 204, 255]);
const HEX_CHARACTERS = '0123456789ABCDEF';
const MEME_PATTERNS = Object.freeze([
  ['dead', 'DEAD'], ['beef', 'BEEF'], ['cafe', 'CAFE'], ['face', 'FACE'],
  ['babe', 'BABE'], ['fade', 'FADE'], ['feed', 'FEED'], ['boob', 'B00B'],
  ['dood', 'D00D'], ['food', 'F00D'], ['leet', '1337'], ['boob_2', '8008'],
  ['abcd', 'ABCD'], ['james_bond', '007'], ['blaze_it', '420'], ['nice', '69'],
  ['demon', '666'], ['jackpot', '777'], ['emergency', '911'], ['not_found', '404'],
  ['server_error', '500'], ['perfect_score', '100'], ['f1', 'F1']
]);

const LEGACY_RARITY_THRESHOLDS = Object.freeze([
  Object.freeze({ name: 'Mythic', min: 5000000 }),
  Object.freeze({ name: 'Anomaly', min: 1000000 }),
  Object.freeze({ name: 'Epic', min: 250000 }),
  Object.freeze({ name: 'Rare', min: 50000 }),
  Object.freeze({ name: 'Uncommon', min: 10000 }),
  Object.freeze({ name: 'Common', min: 1500 }),
  Object.freeze({ name: 'Trash', min: 0 })
]);

function getLegacyRarity(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return LEGACY_RARITY_THRESHOLDS.find(tier => safeScore >= tier.min).name;
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

function validateChannel(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`${name} must be an integer from 0 to 255.`);
  }
}

export function scoreColor(red, green, blue) {
  validateChannel(red, 'red');
  validateChannel(green, 'green');
  validateChannel(blue, 'blue');

  const channels = [red, green, blue];
  const sum = red + green + blue;
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const range = maximum - minimum;
  const hex = channels.map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
  const badges = [];
  let score = 0;

  const award = (condition, id) => {
    if (!condition) return;
    const badge = BADGES[id];
    if (!badge) throw new Error(`Missing score metadata for ${id}.`);
    score += badge.points;
    badges.push(id);
  };

  award(true, 'base_spectrum');
  award(sum % 2 === 0, 'sum_even');
  award(sum % 2 !== 0, 'sum_odd');
  award(sum % 3 === 0, 'sum_div3');
  award(sum % 9 === 0, 'sum_div9');
  award(sum % 10 === 0, 'sum_div10');
  award(sum === 42, 'sum_42');
  award(sum === 100, 'sum_100');
  award(sum === 255, 'sum_255');
  award(sum === 666, 'sum_666');
  award(sum === 777, 'sum_777');
  award(FIBONACCI_SUMS.has(sum), 'sum_fibonacci');
  award(SQUARE_SUMS.has(sum), 'sum_square');
  award(isPrime(sum), 'sum_prime');
  award(channels.every(value => value % 2 === 0), 'all_even');
  award(channels.every(value => value % 2 !== 0), 'all_odd');
  award(channels.every(value => value % 3 === 0), 'mult_3');
  award(channels.every(value => WEB_SAFE_CHANNELS.has(value)), 'web_safe');
  award(channels.every(value => value % 50 === 0), 'mult_50');
  award(channels.includes(1), 'one_is_loneliest');
  award(red === green || green === blue || red === blue, 'twin_channels');

  award(range > 200, 'high_contrast');
  award(range < 50, 'low_contrast');
  award(range > 50 && range < 150, 'mod_contrast');
  award(maximum > 200 && minimum > 100 && range < 80, 'pastel_soft');
  award(maximum > 200 && minimum < 50, 'neon_bright');
  award(maximum > 250 && minimum < 20, 'neon_glow');
  award(maximum > 180 && minimum > 180, 'pastel_dream');
  award(maximum < 50 && minimum < 50, 'deep_shadow');
  award(maximum > 200 && minimum > 200, 'high_roller');
  award(red > 128, 'bright_red');
  award(red < 128, 'dark_red');
  award(green > 128, 'bright_green');
  award(green < 128, 'dark_green');
  award(blue > 128, 'bright_blue');
  award(blue < 128, 'dark_blue');
  award(red === green && green === blue, 'greyscale');
  award(maximum - minimum <= 15, 'monochromatic');
  award(red > green && red > blue, 'warm_tone');
  award(blue > red && blue > green, 'cool_tone');
  award(red < green && green < blue, 'ascending');
  award(red > green && green > blue, 'descending');
  award(red === blue, 'symmetrical');

  award(hex === [...hex].reverse().join(''), 'palindrome');
  award(hex.slice(0, 2) === hex.slice(2, 4) && hex.slice(2, 4) === hex.slice(4, 6), 'perfect_triplets');
  award(red === 255 && green === 255 && blue === 255, 'the_light');
  award(red === 0 && green === 0 && blue === 0, 'the_void');

  for (const character of HEX_CHARACTERS) {
    award(hex.includes(character), `contains_${character.toLowerCase()}`);
    award(hex.includes(character.repeat(2)), `contains_${character.toLowerCase().repeat(2)}`);
    award(hex.includes(character.repeat(3)), `contains_${character.toLowerCase().repeat(3)}`);
  }
  for (const [id, pattern] of MEME_PATTERNS) award(hex.includes(pattern), id);

  award(red === 255 && green === 0 && blue === 0, 'pure_red');
  award(red === 0 && green === 255 && blue === 0, 'pure_green');
  award(red === 0 && green === 0 && blue === 255, 'pure_blue');
  award(red === 255 && green === 215 && blue === 0, 'gold');
  award(red === 145 && green === 70 && blue === 255, 'streamer_purple');
  award(red === 30 && green === 215 && blue === 96, 'audio_stream_green');
  award(red === 244 && green === 0 && blue === 9, 'classic_cola_red');
  award(red === 0 && green === 0 && blue === 1, 'almost_black');
  award(red === 255 && green === 255 && blue === 254, 'almost_white');
  award(red === 127 && green === 127 && blue === 127, 'perfect_grey');

  return { red, green, blue, hex: `#${hex}`, score, rarity: getLegacyRarity(score), badges };
}
