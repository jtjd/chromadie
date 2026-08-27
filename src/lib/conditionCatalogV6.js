// Declarative v6 condition catalog.
//
// This file intentionally contains no rarity, probability, or score fields.
// Those values are derived by scripts/generate-scoring-v6.mjs from the exact
// RGB universe and the model contract in scoringV6Spec.js.

import { GENERATED_V6_MANIFEST_BY_ID } from './generated/scoringV6.generated.js';

const freeze = value => Object.freeze(value);

function condition(id, name, category, predicate, semanticTags = [], display = {}, options = {}) {
  return freeze({
    id,
    name,
    category,
    predicate: freeze(predicate),
    semanticTags: freeze([...semanticTags]),
    symbol: display.symbol || '✦',
    description: display.description || name,
    active: options.active !== false,
    ...(options.exclusiveGroup ? { exclusiveGroup: options.exclusiveGroup } : {}),
    ...(options.exclusiveRank !== undefined ? { exclusiveRank: options.exclusiveRank } : {}),
    ...(options.pattern ? { pattern: options.pattern } : {})
  });
}

const sumModulo = (id, name, divisor, remainder, symbol = '🔢', semanticTags = []) => condition(
  id,
  name,
  'mathematical',
  { type: 'sumModulo', divisor, remainder },
  semanticTags,
  { symbol, description: `The RGB channel sum leaves remainder ${remainder} when divided by ${divisor}.` }
);

const sumEquals = (id, name, value, symbol = '🔢', semanticTags = []) => condition(
  id,
  name,
  'mathematical',
  { type: 'sumEquals', value },
  semanticTags,
  { symbol, description: `The RGB channel sum is exactly ${value}.` }
);

const rangeCondition = (id, name, op, value, symbol = '↔️', semanticTags = []) => condition(
  id,
  name,
  'color_relationship',
  { type: 'rangeCompare', op, value },
  semanticTags,
  { symbol, description: `The RGB channel range is ${op} ${value}.` }
);

const hslCondition = (id, name, field, op, value, category = 'color_identity', semanticTags = [], symbol = '🎨') => condition(
  id,
  name,
  category,
  { type: 'hslCompare', field, op, value },
  semanticTags,
  { symbol, description: `${field} is ${op} ${value}.` }
);

const hexContains = (id, name, value, category = 'hex_pattern', semanticTags = [], symbol = '🔤', options = {}) => condition(
  id,
  name,
  category,
  { type: 'hexContains', value },
  semanticTags,
  { symbol, description: `The hexadecimal color contains ${value}.` },
  { ...options, pattern: options.pattern || value }
);

const hexExact = (id, name, value, category = 'exact', semanticTags = ['exact'], symbol = '✦') => condition(
  id,
  name,
  category,
  { type: 'hexExact', value },
  semanticTags,
  { symbol, description: `The hexadecimal color is exactly ${value}.` }
);

const channelExact = (id, name, red, green, blue, symbol = '🎨', semanticTags = ['exact']) => condition(
  id,
  name,
  'exact',
  { type: 'channelExact', red, green, blue },
  semanticTags,
  { symbol, description: `The RGB color is exactly (${red}, ${green}, ${blue}).` }
);

const combination = (id, name, components, semanticTags = ['combination'], symbol = '✧') => condition(
  id,
  name,
  'combination',
  { type: 'combination', all: components },
  semanticTags,
  { symbol, description: `The ${components.join(' + ')} signals align in one color.` }
);

const HEX_DIGITS = Object.freeze('0123456789ABCDEF'.split(''));
const HEX_BYTES = Object.freeze(['00', '11', '22', '33', '44', '55', '66', '77', '88', '99', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF']);

const coreConditions = [
  condition('spectrum_presence', 'Spectrum Presence', 'identity', { type: 'always' }, [], { symbol: '🌈', description: 'Every valid RGB color belongs to the spectrum.' }),
  condition('sum_even', 'Even Pulse', 'mathematical', { type: 'sumModulo', divisor: 2, remainder: 0 }, [], { symbol: '⚖️', description: 'The RGB channel sum is even.' }),
  condition('sum_odd', 'Odd Pulse', 'mathematical', { type: 'sumModulo', divisor: 2, remainder: 1 }, [], { symbol: '🎲', description: 'The RGB channel sum is odd.' }),
  sumModulo('sum_divisible_3', 'Rule of Three', 3, 0, '3️⃣'),
  sumModulo('sum_divisible_5', 'Fivefold Sum', 5, 0, '5️⃣'),
  sumModulo('sum_divisible_7', 'Lucky Sum', 7, 0, '7️⃣', ['named']),
  sumModulo('sum_divisible_9', 'Triple Triple', 9, 0, '9️⃣'),
  sumModulo('sum_divisible_11', 'Eleven Signal', 11, 0, '1️⃣1️⃣'),
  sumEquals('sum_42', 'Meaning of Life', 42, '🧬', ['named']),
  sumEquals('sum_69', 'Nice Sum', 69, '😏', ['meme']),
  sumEquals('sum_100', 'Perfect Century', 100, '💯', ['named']),
  sumEquals('sum_255', 'Max Byte', 255, '💾', ['named']),
  sumEquals('sum_420', 'Blaze Sum', 420, '🌿', ['meme']),
  sumEquals('sum_666', 'Sinister Shade', 666, '😈', ['meme']),
  condition('sum_fibonacci', 'Fibonacci Energy', 'mathematical', { type: 'sumSet', values: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765] }, ['named'], { symbol: '🌀', description: 'The RGB channel sum is a Fibonacci number.' }),
  condition('sum_square', 'Perfect Square', 'mathematical', { type: 'sumSet', values: [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256, 289, 324, 361, 400, 441, 484, 529, 576, 625, 676, 729] }, ['named'], { symbol: '⏹️', description: 'The RGB channel sum is a perfect square.' }),
  condition('sum_triangular', 'Triangular Sum', 'mathematical', { type: 'sumSet', values: [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120, 136, 153, 171, 190, 210, 231, 253, 276, 300, 325, 351, 378, 406, 435, 465, 496, 528, 561, 595, 630, 666, 703, 741] }, ['named'], { symbol: '🔺', description: 'The RGB channel sum is triangular.' }),
  condition('sum_prime', 'Prime Energy', 'mathematical', { type: 'sumPrime' }, ['named'], { symbol: '🔢', description: 'The RGB channel sum is prime.' }),
  condition('balanced_sum_band', 'Balanced Sum', 'sum_shape', { type: 'sumBetween', min: 300, max: 465 }, [], { symbol: '⚖️', description: 'The RGB channel sum sits in a balanced middle band.' })
];

const channelConditions = [
  condition('all_channels_even', 'All Even Channels', 'channel_identity', { type: 'channelsAll', operation: 'parity', value: 'even' }, [], { symbol: '2️⃣', description: 'Every RGB channel is even.' }),
  condition('all_channels_odd', 'All Odd Channels', 'channel_identity', { type: 'channelsAll', operation: 'parity', value: 'odd' }, [], { symbol: '1️⃣', description: 'Every RGB channel is odd.' }),
  condition('all_channels_div3', 'Triple Threat', 'channel_identity', { type: 'channelsAll', operation: 'divisibleBy', value: 3 }, [], { symbol: '3️⃣', description: 'Every RGB channel is divisible by three.' }),
  condition('all_channels_div5', 'Five Channel Lock', 'channel_identity', { type: 'channelsAll', operation: 'divisibleBy', value: 5 }, [], { symbol: '5️⃣', description: 'Every RGB channel is divisible by five.' }),
  condition('web_safe', 'Web Safe', 'channel_identity', { type: 'channelsAll', operation: 'inSet', values: [0, 51, 102, 153, 204, 255] }, ['named'], { symbol: '🕸️', description: 'Every channel lands on a classic web-safe value.' }),
  condition('channel_zero', 'Zero Channel', 'channel_identity', { type: 'channelsAny', operation: 'equals', value: 0 }, [], { symbol: '0️⃣', description: 'At least one channel is exactly zero.' }),
  condition('channel_maxed', 'Maxed Channel', 'channel_identity', { type: 'channelsAny', operation: 'equals', value: 255 }, [], { symbol: '🔆', description: 'At least one channel reaches 255.' }),
  condition('channel_one', 'One Is the Loneliest', 'channel_identity', { type: 'channelsAny', operation: 'equals', value: 1 }, ['named'], { symbol: '1️⃣', description: 'At least one channel is exactly one.' }),
  condition('channel_edge', 'Edge Channel', 'edge_behavior', { type: 'any', checks: [{ type: 'channelsAny', operation: 'inRange', min: 0, max: 8 }, { type: 'channelsAny', operation: 'gte', value: 247 }] }, [], { symbol: '📐', description: 'At least one channel is near an RGB edge.' }),
  condition('edge_pair', 'Edge Pair', 'edge_behavior', { type: 'channelCount', operation: 'edge', op: 'gte', value: 2 }, [], { symbol: '⚡', description: 'At least two channels sit near an RGB edge.' }),
  condition('twin_channels', 'Twin Channels', 'symmetry', { type: 'channelRelation', relation: 'hasEqualPair' }, [], { symbol: '👯', description: 'Two channels share the exact same value.' }),
  condition('greyscale', 'Perfect Greyscale', 'symmetry', { type: 'channelRelation', relation: 'allEqual' }, [], { symbol: '⚫', description: 'All three channels are identical.' }),
  condition('all_channels_distinct', 'Three-Way Split', 'symmetry', { type: 'channelRelation', relation: 'allDistinct' }, [], { symbol: '🔀', description: 'All three channels have different values.' }),
  condition('red_green_equal', 'Red Green Mirror', 'symmetry', { type: 'channelRelation', relation: 'redGreenEqual' }, [], { symbol: '🟥', description: 'Red and green channels match.' }),
  condition('green_blue_equal', 'Green Blue Mirror', 'symmetry', { type: 'channelRelation', relation: 'greenBlueEqual' }, [], { symbol: '🟩', description: 'Green and blue channels match.' }),
  condition('red_blue_equal', 'Mirror Channels', 'symmetry', { type: 'channelRelation', relation: 'redBlueEqual' }, [], { symbol: '🪞', description: 'Red and blue channels mirror each other.' }),
  rangeCondition('low_contrast', 'Close Harmony', 'lte', 20),
  rangeCondition('gentle_contrast', 'Gentle Contrast', 'gtLt', [20, 80], '🌫️'),
  rangeCondition('layered_contrast', 'Layered Contrast', 'gteLt', [80, 205], '🪜'),
  rangeCondition('high_contrast', 'Polarized Channels', 'gte', 205, '🌓'),
  rangeCondition('extreme_span', 'Extreme Span', 'gte', 230, '⚡'),
  condition('red_dominant', 'Red Dominant', 'composition', { type: 'channelDominant', channel: 'r' }, [], { symbol: '🔴', description: 'Red is the unique leading channel.' }),
  condition('green_dominant', 'Green Dominant', 'composition', { type: 'channelDominant', channel: 'g' }, [], { symbol: '🟢', description: 'Green is the unique leading channel.' }),
  condition('blue_dominant', 'Blue Dominant', 'composition', { type: 'channelDominant', channel: 'b' }, [], { symbol: '🔵', description: 'Blue is the unique leading channel.' }),
  condition('balanced_channels', 'Balanced Channels', 'composition', { type: 'channelRelation', relation: 'noUniqueDominant' }, [], { symbol: '⚪', description: 'No channel is a unique strong leader.' }),
  condition('ascending_channels', 'Ascending Channels', 'sequence', { type: 'channelOrder', order: ['r', 'g', 'b'], direction: 'ascending' }, ['sequence'], { symbol: '📈', description: 'Red is below green, which is below blue.' }),
  condition('descending_channels', 'Descending Channels', 'sequence', { type: 'channelOrder', order: ['r', 'g', 'b'], direction: 'descending' }, ['sequence'], { symbol: '📉', description: 'Red is above green, which is above blue.' }),
  condition('red_green_step', 'Red-Green Step', 'sequence', { type: 'channelOrder', order: ['r', 'g'], direction: 'ascending' }, ['sequence'], { symbol: '↗️', description: 'Red is below green.' }),
  condition('green_blue_step', 'Green-Blue Step', 'sequence', { type: 'channelOrder', order: ['g', 'b'], direction: 'ascending' }, ['sequence'], { symbol: '↗️', description: 'Green is below blue.' }),
  condition('blue_red_step', 'Blue-Red Step', 'sequence', { type: 'channelOrder', order: ['b', 'r'], direction: 'ascending' }, ['sequence'], { symbol: '↗️', description: 'Blue is below red.' }),
  condition('channel_progression', 'Channel Progression', 'sequence', { type: 'arithmeticProgression', sorted: true }, ['sequence'], { symbol: '📏', description: 'Sorted channels share a constant step.' }),
  condition('channel_complement_red_blue', 'Red-Blue Complement', 'relationship', { type: 'channelComplement', first: 'r', second: 'b', sum: 255 }, ['named'], { symbol: '☯️', description: 'Red and blue add to a complete byte.' }),
  condition('channel_complement_red_green', 'Red-Green Complement', 'relationship', { type: 'channelComplement', first: 'r', second: 'g', sum: 255 }, ['named'], { symbol: '☯️', description: 'Red and green add to a complete byte.' }),
  condition('channel_complement_green_blue', 'Green-Blue Complement', 'relationship', { type: 'channelComplement', first: 'g', second: 'b', sum: 255 }, ['named'], { symbol: '☯️', description: 'Green and blue add to a complete byte.' }),
  condition('power_two_channels', 'Power-of-Two Channels', 'mathematical', { type: 'channelsAll', operation: 'inSet', values: [1, 2, 4, 8, 16, 32, 64, 128] }, ['named'], { symbol: '⚡', description: 'Every channel is a power of two.' }),
  condition('power_two_any', 'Power-of-Two Spark', 'mathematical', { type: 'channelsAny', operation: 'inSet', values: [1, 2, 4, 8, 16, 32, 64, 128] }, ['named'], { symbol: '⚡', description: 'At least one channel is a power of two.' }),
  condition('parity_pattern_even_odd_even', 'Even Odd Even', 'channel_identity', { type: 'parityPattern', value: 'EOE' }, [], { symbol: '🔢', description: 'The channels follow an even-odd-even rhythm.' }),
  condition('parity_pattern_odd_even_odd', 'Odd Even Odd', 'channel_identity', { type: 'parityPattern', value: 'OEO' }, [], { symbol: '🔢', description: 'The channels follow an odd-even-odd rhythm.' })
];

const hueFamilies = [
  ['crimson', 'Crimson'], ['amber', 'Amber'], ['gold', 'Gold'], ['lime', 'Lime'],
  ['emerald', 'Emerald'], ['cyan', 'Cyan'], ['azure', 'Azure'], ['blue', 'Blue'],
  ['violet', 'Violet'], ['magenta', 'Magenta'], ['rose', 'Rose'], ['neutral', 'Neutral']
];

const colorConditions = [
  ...hueFamilies.map(([id, label]) => condition(
    `hue_family_${id}`,
    `${label} Hue`,
    'color_identity',
    { type: 'hueFamily', value: label },
    [],
    { symbol: '🌈', description: `The color belongs to the ${label} hue family.` }
  )),
  condition('temperature_warm', 'Warm Temperature', 'color_identity', { type: 'temperature', value: 'warm' }, [], { symbol: '🌡️', description: 'Red leads the warm-cool axis.' }),
  condition('temperature_cool', 'Cool Temperature', 'color_identity', { type: 'temperature', value: 'cool' }, [], { symbol: '🌡️', description: 'Blue leads the warm-cool axis.' }),
  condition('temperature_neutral', 'Neutral Temperature', 'color_identity', { type: 'temperature', value: 'neutral' }, [], { symbol: '🌡️', description: 'All channels share one neutral value.' }),
  hslCondition('saturation_soft', 'Soft Saturation', 'saturation', 'lt', 15, 'saturation'),
  hslCondition('saturation_muted', 'Muted Saturation', 'saturation', 'gteLt', [15, 40], 'saturation'),
  hslCondition('saturation_rich', 'Rich Saturation', 'saturation', 'gteLt', [40, 70], 'saturation'),
  hslCondition('saturation_vivid', 'Vivid Saturation', 'saturation', 'gteLt', [70, 95], 'saturation'),
  hslCondition('saturation_electric', 'Electric Saturation', 'saturation', 'gte', 95, 'saturation', ['named']),
  hslCondition('saturation_high_chroma', 'High Chroma', 'saturation', 'gte', 80, 'saturation', ['named'], '💎'),
  hslCondition('lightness_shadow', 'Shadow Tone', 'lightness', 'lt', 15, 'tone'),
  hslCondition('lightness_deep', 'Deep Tone', 'lightness', 'gteLt', [15, 35], 'tone'),
  hslCondition('lightness_balanced', 'Balanced Tone', 'lightness', 'gteLt', [35, 65], 'tone'),
  hslCondition('lightness_bright', 'Bright Tone', 'lightness', 'gteLt', [65, 85], 'tone'),
  hslCondition('lightness_luminous', 'Luminous Tone', 'lightness', 'gte', 85, 'tone', ['named']),
  condition('tone_edge', 'Tone Edge', 'tone', { type: 'hslAny', checks: [{ field: 'lightness', op: 'lt', value: 10 }, { field: 'lightness', op: 'gt', value: 90 }] }, ['named'], { symbol: '🌗', description: 'The color sits at a lightness extreme.' }),
  condition('pastel', 'Pastel Bloom', 'color_relationship', { type: 'all', checks: [{ type: 'channelsAll', operation: 'gte', value: 120 }, { type: 'channelsAny', operation: 'gte', value: 210 }, { type: 'rangeCompare', op: 'lt', value: 75 }] }, ['named'], { symbol: '🌸', description: 'Bright channels form a soft pastel balance.' }),
  condition('neon', 'Neon Voltage', 'color_relationship', { type: 'all', checks: [{ type: 'channelsAny', operation: 'gte', value: 221 }, { type: 'channelsAny', operation: 'lt', value: 45 }] }, ['named'], { symbol: '💡', description: 'A bright channel meets a near-dark channel.' }),
  condition('luminous_core', 'Luminous Core', 'color_relationship', { type: 'all', checks: [{ type: 'hslCompare', field: 'lightness', op: 'gte', value: 90 }, { type: 'hslCompare', field: 'saturation', op: 'lte', value: 20 }] }, ['named'], { symbol: '✨', description: 'The color is unusually bright and pale.' }),
  condition('warm_bias', 'Warm Bias', 'color_relationship', { type: 'channelOrder', order: ['r', 'g', 'b'], direction: 'nonIncreasing' }, ['named'], { symbol: '🔥', description: 'The channels lean from warm red toward blue.' }),
  condition('cool_bias', 'Cool Bias', 'color_relationship', { type: 'channelOrder', order: ['b', 'g', 'r'], direction: 'nonIncreasing' }, ['named'], { symbol: '❄️', description: 'The channels lean from cool blue toward red.' }),
  condition('monochromatic', 'Monochromatic', 'color_relationship', { type: 'rangeCompare', op: 'lte', value: 15 }, ['named'], { symbol: '🎛️', description: 'All channels stay within fifteen values.' })
];

const hexStructureConditions = [
  condition('palindrome', 'Hex Palindrome', 'hex_pattern', { type: 'hexPalindrome' }, ['sequence', 'named'], { symbol: '🪞', description: 'The six hexadecimal characters read the same backwards.' }),
  condition('repeated_pair', 'Repeated Pair', 'hex_pattern', { type: 'hexByteEquality' }, ['sequence', 'named'], { symbol: '🟰', description: 'The same two-character byte repeats three times.' }),
  condition('sixfold_digit', 'Sixfold Digit', 'hex_pattern', { type: 'hexAllSame' }, ['sequence', 'named'], { symbol: '🔁', description: 'One hexadecimal digit fills all six positions.' }),
  condition('triple_hex', 'Triple Hex', 'hex_pattern', { type: 'hexRun', length: 3 }, ['sequence'], { symbol: '3️⃣', description: 'Three matching hexadecimal characters appear in a row.' }),
  condition('double_hex', 'Double Hex', 'hex_pattern', { type: 'hexRun', length: 2 }, ['sequence'], { symbol: '2️⃣', description: 'Two matching hexadecimal characters appear in a row.' }),
  condition('hex_letter_rich', 'Letter-Rich Hex', 'hex_structure', { type: 'hexCharacterCount', class: 'letter', op: 'gte', value: 3 }, [], { symbol: '🔤', description: 'At least three hexadecimal characters are letters.' }),
  condition('hex_digit_rich', 'Digit-Rich Hex', 'hex_structure', { type: 'hexCharacterCount', class: 'digit', op: 'gte', value: 4 }, [], { symbol: '🔢', description: 'At least four hexadecimal characters are digits.' }),
  condition('hex_digit_sum_prime', 'Prime Hex Sum', 'hex_structure', { type: 'hexDigitSumPrime' }, ['named'], { symbol: '🧮', description: 'The hexadecimal digit sum is prime.' }),
  condition('hex_digit_sum_square', 'Square Hex Sum', 'hex_structure', { type: 'hexDigitSumSquare' }, ['named'], { symbol: '⏹️', description: 'The hexadecimal digit sum is a perfect square.' }),
  condition('hex_letter_majority', 'Letter Majority', 'hex_structure', { type: 'hexCharacterCount', class: 'letter', op: 'gte', value: 4 }, [], { symbol: '🔤', description: 'Letters occupy at least four hexadecimal positions.' }),
  condition('hex_bookends', 'Hex Bookends', 'hex_structure', { type: 'hexBookends' }, ['sequence'], { symbol: '🔗', description: 'The first and last hexadecimal characters match.' }),
  condition('byte_bookends', 'Byte Bookends', 'hex_structure', { type: 'byteBookends' }, ['sequence'], { symbol: '🔗', description: 'The first and last hexadecimal bytes match.' }),
  condition('hex_ascending', 'Ascending Hex', 'sequence', { type: 'hexMonotonic', direction: 'ascending' }, ['sequence'], { symbol: '📈', description: 'Hexadecimal characters strictly rise from left to right.' }),
  condition('hex_descending', 'Descending Hex', 'sequence', { type: 'hexMonotonic', direction: 'descending' }, ['sequence'], { symbol: '📉', description: 'Hexadecimal characters strictly fall from left to right.' }),
  condition('hex_staircase', 'Hex Staircase', 'sequence', { type: 'hexStep', step: 1 }, ['sequence', 'named'], { symbol: '🪜', description: 'Each hexadecimal character advances by one.' }),
  condition('hex_reverse_staircase', 'Reverse Hex Staircase', 'sequence', { type: 'hexStep', step: -1 }, ['sequence', 'named'], { symbol: '🪜', description: 'Each hexadecimal character retreats by one.' }),
  condition('hex_unique_four', 'Four-Color Hex', 'hex_structure', { type: 'hexUniqueCount', op: 'eq', value: 4 }, [], { symbol: '🔹', description: 'Exactly four distinct hexadecimal characters appear.' }),
  condition('hex_unique_six', 'Full Hex Variety', 'hex_structure', { type: 'hexUniqueCount', op: 'eq', value: 6 }, [], { symbol: '🔷', description: 'Every hexadecimal position is distinct.' }),
  condition('hex_contains_all_letters', 'Alphabet Soup', 'hex_structure', { type: 'hexContainsAll', values: ['A', 'B', 'C', 'D', 'E', 'F'] }, ['named'], { symbol: '🔤', description: 'Every hexadecimal letter appears.' }),
  hexContains('f1', 'Formula 1', 'F1', 'hex_culture', ['named'], '🏎️'),
  hexContains('letter_run', 'Letter Run', 'ABC', 'hex_pattern', ['sequence'], '🔤'),
  hexContains('digit_run', 'Digit Run', '123', 'hex_pattern', ['sequence'], '🔢')
];

const hexPairConditions = HEX_BYTES.map(pair => hexContains(
  `contains_${pair.toLowerCase()}`,
  `Double ${pair[0]}`,
  pair,
  'hex_pair',
  ['sequence'],
  '🔁'
));

const hexTripletConditions = HEX_DIGITS.map(digit => hexContains(
  `contains_${digit.toLowerCase().repeat(3)}`,
  `Triple ${digit}`,
  digit.repeat(3),
  'hex_triplet',
  ['sequence'],
  '3️⃣'
));

const namedCultureConditions = [
  hexContains('dead', 'Dead Man Walking', 'DEAD', 'hex_culture', ['named'], '💀'),
  hexContains('beef', 'Where Is the Beef?', 'BEEF', 'hex_culture', ['named'], '🥩'),
  hexContains('cafe', 'Coffee Break', 'CAFE', 'hex_culture', ['named'], '☕'),
  hexContains('face', 'Face Value', 'FACE', 'hex_culture', ['named'], '😎'),
  hexContains('babe', 'Babe', 'BABE', 'hex_culture', ['named'], '👶'),
  hexContains('fade', 'Fade', 'FADE', 'hex_culture', ['named'], '🕳️'),
  hexContains('feed', 'Feed', 'FEED', 'hex_culture', ['named'], '🍼'),
  hexContains('boob', 'Boob', 'B00B', 'hex_culture', ['meme'], '🍒'),
  hexContains('dood', 'Dood', 'D00D', 'hex_culture', ['named'], '🧑‍🎨'),
  hexContains('food', 'Food', 'F00D', 'hex_culture', ['named'], '🍔'),
  hexContains('leet', 'Leet Speak', '1337', 'hex_culture', ['meme'], '💻'),
  hexContains('boob_2', 'Boob Two', '8008', 'hex_culture', ['meme'], '🍈'),
  hexContains('abcd', 'Alphabetical', 'ABCD', 'hex_culture', ['sequence', 'named'], '🔤'),
  hexContains('james_bond', 'James Bond', '007', 'hex_culture', ['named'], '🕵️'),
  hexContains('blaze_it', 'Blaze It', '420', 'hex_culture', ['meme'], '🌿'),
  hexContains('nice', 'Nice', '69', 'hex_culture', ['meme'], '😏'),
  hexContains('demon', 'Demon', '666', 'hex_culture', ['meme'], '😈'),
  hexContains('jackpot', 'Jackpot', '777', 'hex_culture', ['meme'], '🎰'),
  hexContains('emergency', 'Emergency', '911', 'hex_culture', ['named'], '🚨'),
  hexContains('not_found', 'Not Found', '404', 'hex_culture', ['named'], '🚫'),
  hexContains('server_error', 'Server Error', '500', 'hex_culture', ['named'], '⚠️'),
  hexContains('perfect_score', 'Perfect Score', '100', 'hex_culture', ['named'], '💯')
];

const exactColorConditions = [
  channelExact('pure_black', 'The Void', 0, 0, 0, '🌑'),
  channelExact('pure_white', 'The Light', 255, 255, 255, '☀️'),
  channelExact('pure_red', 'Maximum Red', 255, 0, 0, '🟥'),
  channelExact('pure_green', 'Maximum Green', 0, 255, 0, '🟩'),
  channelExact('pure_blue', 'Maximum Blue', 0, 0, 255, '🟦'),
  channelExact('pure_cyan', 'Maximum Cyan', 0, 255, 255, '🟦'),
  channelExact('pure_magenta', 'Maximum Magenta', 255, 0, 255, '🟪'),
  channelExact('pure_yellow', 'Maximum Yellow', 255, 255, 0, '🟨'),
  channelExact('pure_gold', 'Midas', 255, 215, 0, '🥇'),
  channelExact('streamer_purple', 'Streamer Purple', 145, 70, 255, '🟣'),
  channelExact('audio_stream_green', 'Audio Stream Green', 30, 215, 96, '🟢'),
  channelExact('classic_cola_red', 'Classic Cola Red', 244, 0, 9, '🥤'),
  channelExact('almost_black', 'Almost Black', 0, 0, 1, '🌑'),
  channelExact('almost_white', 'Almost White', 255, 255, 254, '☀️'),
  channelExact('perfect_grey', 'Perfect Grey', 127, 127, 127, '🔘'),
  hexExact('reference_123456', 'Reference Sequence', '123456', 'exact', ['exact', 'sequence', 'named'], '🔢'),
  hexExact('reference_abcdef', 'Alphabetic Gradient', 'ABCDEF', 'exact', ['exact', 'sequence', 'named'], '🔤'),
  hexExact('reference_fedcba', 'Reverse Gradient', 'FEDCBA', 'exact', ['exact', 'sequence', 'named'], '🔄')
];

const cultureConditions = [
  hexContains('six_seven', 'Six Seven', '67', 'hex_culture', ['meme'], '6️⃣', { exclusiveGroup: 'six_seven', exclusiveRank: 1 }),
  hexContains('six_seven_echo', 'Six Seven Echo', '6767', 'hex_culture', ['meme', 'sequence'], '🔁', { exclusiveGroup: 'six_seven', exclusiveRank: 2 }),
  hexExact('six_seven_full', 'Six Seven Full House', '676767', 'hex_culture', ['meme', 'sequence', 'exact'], '🎲'),
  hexContains('a24', 'A24', 'A24', 'hex_culture', ['named'], '🎬'),
  hexContains('d23', 'D23', 'D23', 'hex_culture', ['named'], '🏰'),
  hexContains('ff7', 'Final Fantasy VII', 'FF7', 'hex_culture', ['named'], '🗡️'),
  hexContains('a113', 'A113', 'A113', 'hex_culture', ['named'], '🎞️'),
  hexContains('eight_oh_eight', '808', '808', 'hex_culture', ['named'], '🥁'),
  hexContains('era_1989', '1989 Era', '1989', 'hex_culture', ['named'], '🎤'),
  hexContains('blaze_nice', 'Blaze Nice', '42069', 'hex_culture', ['meme'], '🌿'),
  hexContains('nice_blaze', 'Nice Blaze', '69420', 'hex_culture', ['meme'], '😏'),
  hexContains('calculator_classic', 'Calculator Classic', '58008', 'hex_culture', ['meme'], '🧮'),
  hexContains('calculator_hello', 'Calculator Hello', '07734', 'hex_culture', ['meme'], '👋'),
  hexContains('calculator_boobs', 'Calculator Boobs', '80085', 'hex_culture', ['meme'], '🙃'),
  hexContains('double_blaze', 'Double Blaze', '420420', 'hex_culture', ['meme', 'sequence'], '🔥'),
  hexContains('double_not_found', '404 Echo', '404404', 'hex_culture', ['named', 'sequence'], '🕳️'),
  hexContains('six_sixes', 'Six Sixes', '666666', 'hex_culture', ['meme', 'sequence'], '😈'),
  hexContains('nice_stack', 'Nice Stack', '696969', 'hex_culture', ['meme', 'sequence'], '😏'),
  hexContains('jackpot_stack', 'Jackpot Stack', '777777', 'hex_culture', ['meme', 'sequence'], '🎰'),
  hexContains('leet_stack', 'Leet Stack', '133713', 'hex_culture', ['meme', 'sequence'], '💻'),
  hexExact('coffee_code', 'Coffee Code', 'C0FFEE', 'hex_culture', ['named', 'exact'], '☕'),
  hexContains('code_echo', 'Code Echo', 'C0D3', 'hex_culture', ['named'], '👾'),
  hexExact('decode', 'Decode', 'DEC0DE', 'hex_culture', ['named', 'exact'], '🔓'),
  hexExact('facade', 'Facade', 'FACADE', 'hex_culture', ['named', 'exact'], '🎭'),
  hexExact('deface', 'Deface', 'DEFACE', 'hex_culture', ['named', 'exact'], '🖌️'),
  hexExact('badass', 'Badass', 'BADA55', 'hex_culture', ['meme', 'exact'], '😎'),
  hexExact('foobar', 'Foobar', 'F00BA4', 'hex_culture', ['named', 'exact'], '🧪'),
  hexContains('boba', 'Boba', 'B0BA', 'hex_culture', ['named'], '🧋')
].map(entry => freeze({ ...entry, ...(entry.id === 'six_seven_full' ? { exclusiveGroup: 'six_seven', exclusiveRank: 3 } : {}) }));

const combinationConditions = [
  combination('combo_meme_symmetry', 'Meme Mirror', ['nice', 'red_blue_equal'], ['combination', 'meme'], '🪞'),
  combination('combo_meme_palindrome', 'Meme Palindrome', ['blaze_it', 'palindrome'], ['combination', 'meme', 'sequence'], '🌿'),
  combination('combo_sequence_channel_order', 'Ordered Sequence', ['ascending_channels', 'hex_ascending'], ['combination', 'sequence'], '📈'),
  combination('combo_reverse_sequence', 'Reversed Sequence', ['descending_channels', 'hex_descending'], ['combination', 'sequence'], '📉'),
  combination('combo_prime_palindrome', 'Prime Mirror', ['sum_prime', 'palindrome'], ['combination', 'named'], '🔢'),
  combination('combo_square_greyscale', 'Square Grey', ['sum_square', 'greyscale'], ['combination', 'named'], '⚫'),
  combination('combo_fibonacci_sequence', 'Fibonacci Flow', ['sum_fibonacci', 'ascending_channels'], ['combination', 'sequence', 'named'], '🌀'),
  combination('combo_high_contrast_neon', 'Neon Contrast', ['high_contrast', 'neon'], ['combination', 'named'], '💡'),
  combination('combo_pastel_luminous', 'Pastel Light', ['pastel', 'lightness_luminous'], ['combination', 'named'], '🌸'),
  combination('combo_warm_red', 'Warm Red Lead', ['temperature_warm', 'red_dominant'], ['combination', 'named'], '🔥'),
  combination('combo_cool_blue', 'Cool Blue Lead', ['temperature_cool', 'blue_dominant'], ['combination', 'named'], '❄️'),
  combination('combo_complement_vivid', 'Vivid Complement', ['channel_complement_red_blue', 'saturation_vivid'], ['combination', 'named'], '☯️'),
  combination('combo_web_safe_greyscale', 'Safe Grey', ['web_safe', 'greyscale'], ['combination', 'named'], '🕸️'),
  combination('combo_repeated_palindrome', 'Echo Mirror', ['repeated_pair', 'palindrome'], ['combination', 'sequence'], '🔁'),
  combination('combo_sixfold_greyscale', 'Sixfold Grey', ['sixfold_digit', 'greyscale'], ['combination', 'sequence', 'named'], '⚫'),
  combination('combo_exact_sequence', 'Exact Sequence', ['reference_123456', 'hex_staircase'], ['combination', 'exact', 'sequence'], '🔢'),
  combination('combo_exact_reverse', 'Exact Reverse', ['reference_fedcba', 'hex_reverse_staircase'], ['combination', 'exact', 'sequence'], '🔄'),
  combination('combo_anomaly_meme', 'Stacked Meme', ['six_sixes', 'demon'], ['combination', 'meme', 'sequence'], '😈'),
  combination('combo_six_seven_palindrome', 'Six Seven Mirror', ['six_seven_full', 'greyscale'], ['combination', 'meme', 'sequence'], '6️⃣'),
  combination('combo_hex_letters', 'Lettered Spectrum', ['hex_letter_rich', 'hex_letter_majority'], ['combination', 'named'], '🔤'),
  combination('combo_digit_structure', 'Digit Structure', ['hex_digit_rich', 'hex_digit_sum_prime'], ['combination', 'named'], '🔢'),
  combination('combo_power_progression', 'Electric Progression', ['power_two_any', 'channel_progression'], ['combination', 'sequence'], '⚡'),
  combination('combo_edge_contrast', 'Edge Contrast', ['edge_pair', 'extreme_span'], ['combination', 'named'], '⚡'),
  combination('combo_saturation_tone', 'Saturated Light', ['saturation_electric', 'lightness_luminous'], ['combination', 'named'], '✨'),
  combination('combo_culture_exact', 'Cultural Artifact', ['coffee_code', 'hex_letter_majority'], ['combination', 'exact', 'named'], '☕')
];

export const V6_CONDITION_CATALOG = freeze([
  ...coreConditions,
  ...channelConditions,
  ...colorConditions,
  ...hexStructureConditions,
  ...hexPairConditions,
  ...hexTripletConditions,
  ...namedCultureConditions,
  ...exactColorConditions,
  ...cultureConditions,
  ...combinationConditions
]);

export const ACTIVE_V6_CONDITIONS = freeze(V6_CONDITION_CATALOG.filter(entry => entry.active));
export const V6_CONDITION_BY_ID = freeze(Object.fromEntries(V6_CONDITION_CATALOG.map(entry => [entry.id, entry])));
export const V6_CULTURE_CONDITIONS = freeze(V6_CONDITION_CATALOG.filter(entry => entry.category === 'hex_culture'));
export const V6_CULTURE_CONDITION_BY_ID = freeze(Object.fromEntries(V6_CULTURE_CONDITIONS.map(entry => [entry.id, entry])));
export const V6_NEW_CONDITION_IDS = freeze(V6_CULTURE_CONDITIONS.map(entry => entry.id));
export const V6_COMBINATION_CONDITIONS = freeze(V6_CONDITION_CATALOG.filter(entry => entry.predicate.type === 'combination'));
export const V6_CONDITION_IDS = freeze(V6_CONDITION_CATALOG.map(entry => entry.id));

export function getV6CultureMatches(hexValue) {
  const normalizedHex = String(hexValue || '').replace(/^#/, '').toUpperCase();
  return V6_CULTURE_CONDITIONS.filter(entry => {
    if (entry.predicate.type === 'hexExact') return normalizedHex === entry.predicate.value;
    if (entry.predicate.type === 'hexContains') return normalizedHex.includes(entry.predicate.value);
    return false;
  });
}

export function getV6Condition(id) {
  return V6_CONDITION_BY_ID[id] || null;
}

// Compatibility lookup for presentation and legacy tooling. The value is
// measured in the generated manifest; no rarity is authored in this catalog.
export function getConditionRarityV6(condition = {}) {
  return GENERATED_V6_MANIFEST_BY_ID[condition.id]?.rarity || 'Common';
}
