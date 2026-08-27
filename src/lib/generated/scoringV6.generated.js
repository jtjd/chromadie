// GENERATED FILE. Run npm run check:scoring-spec after changing the v6 catalog or model.
import { evaluateCatalogConditions } from '../scoringV6Engine.js';

export const GENERATED_SCORE_MODEL_V6_VERSION = 6;
export const GENERATED_V6_CATALOG = Object.freeze([
  {
    "id": "spectrum_presence",
    "name": "Spectrum Presence",
    "category": "identity",
    "predicate": {
      "type": "always"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "Every valid RGB color belongs to the spectrum.",
    "active": true
  },
  {
    "id": "sum_even",
    "name": "Even Pulse",
    "category": "mathematical",
    "predicate": {
      "type": "sumModulo",
      "divisor": 2,
      "remainder": 0
    },
    "semanticTags": [],
    "symbol": "⚖️",
    "description": "The RGB channel sum is even.",
    "active": true
  },
  {
    "id": "sum_odd",
    "name": "Odd Pulse",
    "category": "mathematical",
    "predicate": {
      "type": "sumModulo",
      "divisor": 2,
      "remainder": 1
    },
    "semanticTags": [],
    "symbol": "🎲",
    "description": "The RGB channel sum is odd.",
    "active": true
  },
  {
    "id": "sum_divisible_3",
    "name": "Rule of Three",
    "category": "mathematical",
    "predicate": {
      "type": "sumModulo",
      "divisor": 3,
      "remainder": 0
    },
    "semanticTags": [],
    "symbol": "3️⃣",
    "description": "The RGB channel sum leaves remainder 0 when divided by 3.",
    "active": true
  },
  {
    "id": "sum_divisible_5",
    "name": "Fivefold Sum",
    "category": "mathematical",
    "predicate": {
      "type": "sumModulo",
      "divisor": 5,
      "remainder": 0
    },
    "semanticTags": [],
    "symbol": "5️⃣",
    "description": "The RGB channel sum leaves remainder 0 when divided by 5.",
    "active": true
  },
  {
    "id": "sum_divisible_7",
    "name": "Lucky Sum",
    "category": "mathematical",
    "predicate": {
      "type": "sumModulo",
      "divisor": 7,
      "remainder": 0
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "7️⃣",
    "description": "The RGB channel sum leaves remainder 0 when divided by 7.",
    "active": true
  },
  {
    "id": "sum_divisible_9",
    "name": "Triple Triple",
    "category": "mathematical",
    "predicate": {
      "type": "sumModulo",
      "divisor": 9,
      "remainder": 0
    },
    "semanticTags": [],
    "symbol": "9️⃣",
    "description": "The RGB channel sum leaves remainder 0 when divided by 9.",
    "active": true
  },
  {
    "id": "sum_divisible_11",
    "name": "Eleven Signal",
    "category": "mathematical",
    "predicate": {
      "type": "sumModulo",
      "divisor": 11,
      "remainder": 0
    },
    "semanticTags": [],
    "symbol": "1️⃣1️⃣",
    "description": "The RGB channel sum leaves remainder 0 when divided by 11.",
    "active": true
  },
  {
    "id": "sum_42",
    "name": "Meaning of Life",
    "category": "mathematical",
    "predicate": {
      "type": "sumEquals",
      "value": 42
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🧬",
    "description": "The RGB channel sum is exactly 42.",
    "active": true
  },
  {
    "id": "sum_69",
    "name": "Nice Sum",
    "category": "mathematical",
    "predicate": {
      "type": "sumEquals",
      "value": 69
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "😏",
    "description": "The RGB channel sum is exactly 69.",
    "active": true
  },
  {
    "id": "sum_100",
    "name": "Perfect Century",
    "category": "mathematical",
    "predicate": {
      "type": "sumEquals",
      "value": 100
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "💯",
    "description": "The RGB channel sum is exactly 100.",
    "active": true
  },
  {
    "id": "sum_255",
    "name": "Max Byte",
    "category": "mathematical",
    "predicate": {
      "type": "sumEquals",
      "value": 255
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "💾",
    "description": "The RGB channel sum is exactly 255.",
    "active": true
  },
  {
    "id": "sum_420",
    "name": "Blaze Sum",
    "category": "mathematical",
    "predicate": {
      "type": "sumEquals",
      "value": 420
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "🌿",
    "description": "The RGB channel sum is exactly 420.",
    "active": true
  },
  {
    "id": "sum_666",
    "name": "Sinister Shade",
    "category": "mathematical",
    "predicate": {
      "type": "sumEquals",
      "value": 666
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "😈",
    "description": "The RGB channel sum is exactly 666.",
    "active": true
  },
  {
    "id": "sum_fibonacci",
    "name": "Fibonacci Energy",
    "category": "mathematical",
    "predicate": {
      "type": "sumSet",
      "values": [
        0,
        1,
        2,
        3,
        5,
        8,
        13,
        21,
        34,
        55,
        89,
        144,
        233,
        377,
        610,
        987,
        1597,
        2584,
        4181,
        6765
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🌀",
    "description": "The RGB channel sum is a Fibonacci number.",
    "active": true
  },
  {
    "id": "sum_square",
    "name": "Perfect Square",
    "category": "mathematical",
    "predicate": {
      "type": "sumSet",
      "values": [
        0,
        1,
        4,
        9,
        16,
        25,
        36,
        49,
        64,
        81,
        100,
        121,
        144,
        169,
        196,
        225,
        256,
        289,
        324,
        361,
        400,
        441,
        484,
        529,
        576,
        625,
        676,
        729
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "⏹️",
    "description": "The RGB channel sum is a perfect square.",
    "active": true
  },
  {
    "id": "sum_triangular",
    "name": "Triangular Sum",
    "category": "mathematical",
    "predicate": {
      "type": "sumSet",
      "values": [
        0,
        1,
        3,
        6,
        10,
        15,
        21,
        28,
        36,
        45,
        55,
        66,
        78,
        91,
        105,
        120,
        136,
        153,
        171,
        190,
        210,
        231,
        253,
        276,
        300,
        325,
        351,
        378,
        406,
        435,
        465,
        496,
        528,
        561,
        595,
        630,
        666,
        703,
        741
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🔺",
    "description": "The RGB channel sum is triangular.",
    "active": true
  },
  {
    "id": "sum_prime",
    "name": "Prime Energy",
    "category": "mathematical",
    "predicate": {
      "type": "sumPrime"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🔢",
    "description": "The RGB channel sum is prime.",
    "active": true
  },
  {
    "id": "balanced_sum_band",
    "name": "Balanced Sum",
    "category": "sum_shape",
    "predicate": {
      "type": "sumBetween",
      "min": 300,
      "max": 465
    },
    "semanticTags": [],
    "symbol": "⚖️",
    "description": "The RGB channel sum sits in a balanced middle band.",
    "active": true
  },
  {
    "id": "all_channels_even",
    "name": "All Even Channels",
    "category": "channel_identity",
    "predicate": {
      "type": "channelsAll",
      "operation": "parity",
      "value": "even"
    },
    "semanticTags": [],
    "symbol": "2️⃣",
    "description": "Every RGB channel is even.",
    "active": true
  },
  {
    "id": "all_channels_odd",
    "name": "All Odd Channels",
    "category": "channel_identity",
    "predicate": {
      "type": "channelsAll",
      "operation": "parity",
      "value": "odd"
    },
    "semanticTags": [],
    "symbol": "1️⃣",
    "description": "Every RGB channel is odd.",
    "active": true
  },
  {
    "id": "all_channels_div3",
    "name": "Triple Threat",
    "category": "channel_identity",
    "predicate": {
      "type": "channelsAll",
      "operation": "divisibleBy",
      "value": 3
    },
    "semanticTags": [],
    "symbol": "3️⃣",
    "description": "Every RGB channel is divisible by three.",
    "active": true
  },
  {
    "id": "all_channels_div5",
    "name": "Five Channel Lock",
    "category": "channel_identity",
    "predicate": {
      "type": "channelsAll",
      "operation": "divisibleBy",
      "value": 5
    },
    "semanticTags": [],
    "symbol": "5️⃣",
    "description": "Every RGB channel is divisible by five.",
    "active": true
  },
  {
    "id": "web_safe",
    "name": "Web Safe",
    "category": "channel_identity",
    "predicate": {
      "type": "channelsAll",
      "operation": "inSet",
      "values": [
        0,
        51,
        102,
        153,
        204,
        255
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🕸️",
    "description": "Every channel lands on a classic web-safe value.",
    "active": true
  },
  {
    "id": "channel_zero",
    "name": "Zero Channel",
    "category": "channel_identity",
    "predicate": {
      "type": "channelsAny",
      "operation": "equals",
      "value": 0
    },
    "semanticTags": [],
    "symbol": "0️⃣",
    "description": "At least one channel is exactly zero.",
    "active": true
  },
  {
    "id": "channel_maxed",
    "name": "Maxed Channel",
    "category": "channel_identity",
    "predicate": {
      "type": "channelsAny",
      "operation": "equals",
      "value": 255
    },
    "semanticTags": [],
    "symbol": "🔆",
    "description": "At least one channel reaches 255.",
    "active": true
  },
  {
    "id": "channel_one",
    "name": "One Is the Loneliest",
    "category": "channel_identity",
    "predicate": {
      "type": "channelsAny",
      "operation": "equals",
      "value": 1
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "1️⃣",
    "description": "At least one channel is exactly one.",
    "active": true
  },
  {
    "id": "channel_edge",
    "name": "Edge Channel",
    "category": "edge_behavior",
    "predicate": {
      "type": "any",
      "checks": [
        {
          "type": "channelsAny",
          "operation": "inRange",
          "min": 0,
          "max": 8
        },
        {
          "type": "channelsAny",
          "operation": "gte",
          "value": 247
        }
      ]
    },
    "semanticTags": [],
    "symbol": "📐",
    "description": "At least one channel is near an RGB edge.",
    "active": true
  },
  {
    "id": "edge_pair",
    "name": "Edge Pair",
    "category": "edge_behavior",
    "predicate": {
      "type": "channelCount",
      "operation": "edge",
      "op": "gte",
      "value": 2
    },
    "semanticTags": [],
    "symbol": "⚡",
    "description": "At least two channels sit near an RGB edge.",
    "active": true
  },
  {
    "id": "twin_channels",
    "name": "Twin Channels",
    "category": "symmetry",
    "predicate": {
      "type": "channelRelation",
      "relation": "hasEqualPair"
    },
    "semanticTags": [],
    "symbol": "👯",
    "description": "Two channels share the exact same value.",
    "active": true
  },
  {
    "id": "greyscale",
    "name": "Perfect Greyscale",
    "category": "symmetry",
    "predicate": {
      "type": "channelRelation",
      "relation": "allEqual"
    },
    "semanticTags": [],
    "symbol": "⚫",
    "description": "All three channels are identical.",
    "active": true
  },
  {
    "id": "all_channels_distinct",
    "name": "Three-Way Split",
    "category": "symmetry",
    "predicate": {
      "type": "channelRelation",
      "relation": "allDistinct"
    },
    "semanticTags": [],
    "symbol": "🔀",
    "description": "All three channels have different values.",
    "active": true
  },
  {
    "id": "red_green_equal",
    "name": "Red Green Mirror",
    "category": "symmetry",
    "predicate": {
      "type": "channelRelation",
      "relation": "redGreenEqual"
    },
    "semanticTags": [],
    "symbol": "🟥",
    "description": "Red and green channels match.",
    "active": true
  },
  {
    "id": "green_blue_equal",
    "name": "Green Blue Mirror",
    "category": "symmetry",
    "predicate": {
      "type": "channelRelation",
      "relation": "greenBlueEqual"
    },
    "semanticTags": [],
    "symbol": "🟩",
    "description": "Green and blue channels match.",
    "active": true
  },
  {
    "id": "red_blue_equal",
    "name": "Mirror Channels",
    "category": "symmetry",
    "predicate": {
      "type": "channelRelation",
      "relation": "redBlueEqual"
    },
    "semanticTags": [],
    "symbol": "🪞",
    "description": "Red and blue channels mirror each other.",
    "active": true
  },
  {
    "id": "low_contrast",
    "name": "Close Harmony",
    "category": "color_relationship",
    "predicate": {
      "type": "rangeCompare",
      "op": "lte",
      "value": 20
    },
    "semanticTags": [],
    "symbol": "↔️",
    "description": "The RGB channel range is lte 20.",
    "active": true
  },
  {
    "id": "gentle_contrast",
    "name": "Gentle Contrast",
    "category": "color_relationship",
    "predicate": {
      "type": "rangeCompare",
      "op": "gtLt",
      "value": [
        20,
        80
      ]
    },
    "semanticTags": [],
    "symbol": "🌫️",
    "description": "The RGB channel range is gtLt 20,80.",
    "active": true
  },
  {
    "id": "layered_contrast",
    "name": "Layered Contrast",
    "category": "color_relationship",
    "predicate": {
      "type": "rangeCompare",
      "op": "gteLt",
      "value": [
        80,
        205
      ]
    },
    "semanticTags": [],
    "symbol": "🪜",
    "description": "The RGB channel range is gteLt 80,205.",
    "active": true
  },
  {
    "id": "high_contrast",
    "name": "Polarized Channels",
    "category": "color_relationship",
    "predicate": {
      "type": "rangeCompare",
      "op": "gte",
      "value": 205
    },
    "semanticTags": [],
    "symbol": "🌓",
    "description": "The RGB channel range is gte 205.",
    "active": true
  },
  {
    "id": "extreme_span",
    "name": "Extreme Span",
    "category": "color_relationship",
    "predicate": {
      "type": "rangeCompare",
      "op": "gte",
      "value": 230
    },
    "semanticTags": [],
    "symbol": "⚡",
    "description": "The RGB channel range is gte 230.",
    "active": true
  },
  {
    "id": "red_dominant",
    "name": "Red Dominant",
    "category": "composition",
    "predicate": {
      "type": "channelDominant",
      "channel": "r"
    },
    "semanticTags": [],
    "symbol": "🔴",
    "description": "Red is the unique leading channel.",
    "active": true
  },
  {
    "id": "green_dominant",
    "name": "Green Dominant",
    "category": "composition",
    "predicate": {
      "type": "channelDominant",
      "channel": "g"
    },
    "semanticTags": [],
    "symbol": "🟢",
    "description": "Green is the unique leading channel.",
    "active": true
  },
  {
    "id": "blue_dominant",
    "name": "Blue Dominant",
    "category": "composition",
    "predicate": {
      "type": "channelDominant",
      "channel": "b"
    },
    "semanticTags": [],
    "symbol": "🔵",
    "description": "Blue is the unique leading channel.",
    "active": true
  },
  {
    "id": "balanced_channels",
    "name": "Balanced Channels",
    "category": "composition",
    "predicate": {
      "type": "channelRelation",
      "relation": "noUniqueDominant"
    },
    "semanticTags": [],
    "symbol": "⚪",
    "description": "No channel is a unique strong leader.",
    "active": true
  },
  {
    "id": "ascending_channels",
    "name": "Ascending Channels",
    "category": "sequence",
    "predicate": {
      "type": "channelOrder",
      "order": [
        "r",
        "g",
        "b"
      ],
      "direction": "ascending"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "📈",
    "description": "Red is below green, which is below blue.",
    "active": true
  },
  {
    "id": "descending_channels",
    "name": "Descending Channels",
    "category": "sequence",
    "predicate": {
      "type": "channelOrder",
      "order": [
        "r",
        "g",
        "b"
      ],
      "direction": "descending"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "📉",
    "description": "Red is above green, which is above blue.",
    "active": true
  },
  {
    "id": "red_green_step",
    "name": "Red-Green Step",
    "category": "sequence",
    "predicate": {
      "type": "channelOrder",
      "order": [
        "r",
        "g"
      ],
      "direction": "ascending"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "↗️",
    "description": "Red is below green.",
    "active": true
  },
  {
    "id": "green_blue_step",
    "name": "Green-Blue Step",
    "category": "sequence",
    "predicate": {
      "type": "channelOrder",
      "order": [
        "g",
        "b"
      ],
      "direction": "ascending"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "↗️",
    "description": "Green is below blue.",
    "active": true
  },
  {
    "id": "blue_red_step",
    "name": "Blue-Red Step",
    "category": "sequence",
    "predicate": {
      "type": "channelOrder",
      "order": [
        "b",
        "r"
      ],
      "direction": "ascending"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "↗️",
    "description": "Blue is below red.",
    "active": true
  },
  {
    "id": "channel_progression",
    "name": "Channel Progression",
    "category": "sequence",
    "predicate": {
      "type": "arithmeticProgression",
      "sorted": true
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "📏",
    "description": "Sorted channels share a constant step.",
    "active": true
  },
  {
    "id": "channel_complement_red_blue",
    "name": "Red-Blue Complement",
    "category": "relationship",
    "predicate": {
      "type": "channelComplement",
      "first": "r",
      "second": "b",
      "sum": 255
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "☯️",
    "description": "Red and blue add to a complete byte.",
    "active": true
  },
  {
    "id": "channel_complement_red_green",
    "name": "Red-Green Complement",
    "category": "relationship",
    "predicate": {
      "type": "channelComplement",
      "first": "r",
      "second": "g",
      "sum": 255
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "☯️",
    "description": "Red and green add to a complete byte.",
    "active": true
  },
  {
    "id": "channel_complement_green_blue",
    "name": "Green-Blue Complement",
    "category": "relationship",
    "predicate": {
      "type": "channelComplement",
      "first": "g",
      "second": "b",
      "sum": 255
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "☯️",
    "description": "Green and blue add to a complete byte.",
    "active": true
  },
  {
    "id": "power_two_channels",
    "name": "Power-of-Two Channels",
    "category": "mathematical",
    "predicate": {
      "type": "channelsAll",
      "operation": "inSet",
      "values": [
        1,
        2,
        4,
        8,
        16,
        32,
        64,
        128
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "⚡",
    "description": "Every channel is a power of two.",
    "active": true
  },
  {
    "id": "power_two_any",
    "name": "Power-of-Two Spark",
    "category": "mathematical",
    "predicate": {
      "type": "channelsAny",
      "operation": "inSet",
      "values": [
        1,
        2,
        4,
        8,
        16,
        32,
        64,
        128
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "⚡",
    "description": "At least one channel is a power of two.",
    "active": true
  },
  {
    "id": "parity_pattern_even_odd_even",
    "name": "Even Odd Even",
    "category": "channel_identity",
    "predicate": {
      "type": "parityPattern",
      "value": "EOE"
    },
    "semanticTags": [],
    "symbol": "🔢",
    "description": "The channels follow an even-odd-even rhythm.",
    "active": true
  },
  {
    "id": "parity_pattern_odd_even_odd",
    "name": "Odd Even Odd",
    "category": "channel_identity",
    "predicate": {
      "type": "parityPattern",
      "value": "OEO"
    },
    "semanticTags": [],
    "symbol": "🔢",
    "description": "The channels follow an odd-even-odd rhythm.",
    "active": true
  },
  {
    "id": "hue_family_crimson",
    "name": "Crimson Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Crimson"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Crimson hue family.",
    "active": true
  },
  {
    "id": "hue_family_amber",
    "name": "Amber Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Amber"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Amber hue family.",
    "active": true
  },
  {
    "id": "hue_family_gold",
    "name": "Gold Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Gold"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Gold hue family.",
    "active": true
  },
  {
    "id": "hue_family_lime",
    "name": "Lime Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Lime"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Lime hue family.",
    "active": true
  },
  {
    "id": "hue_family_emerald",
    "name": "Emerald Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Emerald"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Emerald hue family.",
    "active": true
  },
  {
    "id": "hue_family_cyan",
    "name": "Cyan Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Cyan"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Cyan hue family.",
    "active": true
  },
  {
    "id": "hue_family_azure",
    "name": "Azure Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Azure"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Azure hue family.",
    "active": true
  },
  {
    "id": "hue_family_blue",
    "name": "Blue Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Blue"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Blue hue family.",
    "active": true
  },
  {
    "id": "hue_family_violet",
    "name": "Violet Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Violet"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Violet hue family.",
    "active": true
  },
  {
    "id": "hue_family_magenta",
    "name": "Magenta Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Magenta"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Magenta hue family.",
    "active": true
  },
  {
    "id": "hue_family_rose",
    "name": "Rose Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Rose"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Rose hue family.",
    "active": true
  },
  {
    "id": "hue_family_neutral",
    "name": "Neutral Hue",
    "category": "color_identity",
    "predicate": {
      "type": "hueFamily",
      "value": "Neutral"
    },
    "semanticTags": [],
    "symbol": "🌈",
    "description": "The color belongs to the Neutral hue family.",
    "active": true
  },
  {
    "id": "temperature_warm",
    "name": "Warm Temperature",
    "category": "color_identity",
    "predicate": {
      "type": "temperature",
      "value": "warm"
    },
    "semanticTags": [],
    "symbol": "🌡️",
    "description": "Red leads the warm-cool axis.",
    "active": true
  },
  {
    "id": "temperature_cool",
    "name": "Cool Temperature",
    "category": "color_identity",
    "predicate": {
      "type": "temperature",
      "value": "cool"
    },
    "semanticTags": [],
    "symbol": "🌡️",
    "description": "Blue leads the warm-cool axis.",
    "active": true
  },
  {
    "id": "temperature_neutral",
    "name": "Neutral Temperature",
    "category": "color_identity",
    "predicate": {
      "type": "temperature",
      "value": "neutral"
    },
    "semanticTags": [],
    "symbol": "🌡️",
    "description": "All channels share one neutral value.",
    "active": true
  },
  {
    "id": "saturation_soft",
    "name": "Soft Saturation",
    "category": "saturation",
    "predicate": {
      "type": "hslCompare",
      "field": "saturation",
      "op": "lt",
      "value": 15
    },
    "semanticTags": [],
    "symbol": "🎨",
    "description": "saturation is lt 15.",
    "active": true
  },
  {
    "id": "saturation_muted",
    "name": "Muted Saturation",
    "category": "saturation",
    "predicate": {
      "type": "hslCompare",
      "field": "saturation",
      "op": "gteLt",
      "value": [
        15,
        40
      ]
    },
    "semanticTags": [],
    "symbol": "🎨",
    "description": "saturation is gteLt 15,40.",
    "active": true
  },
  {
    "id": "saturation_rich",
    "name": "Rich Saturation",
    "category": "saturation",
    "predicate": {
      "type": "hslCompare",
      "field": "saturation",
      "op": "gteLt",
      "value": [
        40,
        70
      ]
    },
    "semanticTags": [],
    "symbol": "🎨",
    "description": "saturation is gteLt 40,70.",
    "active": true
  },
  {
    "id": "saturation_vivid",
    "name": "Vivid Saturation",
    "category": "saturation",
    "predicate": {
      "type": "hslCompare",
      "field": "saturation",
      "op": "gteLt",
      "value": [
        70,
        95
      ]
    },
    "semanticTags": [],
    "symbol": "🎨",
    "description": "saturation is gteLt 70,95.",
    "active": true
  },
  {
    "id": "saturation_electric",
    "name": "Electric Saturation",
    "category": "saturation",
    "predicate": {
      "type": "hslCompare",
      "field": "saturation",
      "op": "gte",
      "value": 95
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🎨",
    "description": "saturation is gte 95.",
    "active": true
  },
  {
    "id": "saturation_high_chroma",
    "name": "High Chroma",
    "category": "saturation",
    "predicate": {
      "type": "hslCompare",
      "field": "saturation",
      "op": "gte",
      "value": 80
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "💎",
    "description": "saturation is gte 80.",
    "active": true
  },
  {
    "id": "lightness_shadow",
    "name": "Shadow Tone",
    "category": "tone",
    "predicate": {
      "type": "hslCompare",
      "field": "lightness",
      "op": "lt",
      "value": 15
    },
    "semanticTags": [],
    "symbol": "🎨",
    "description": "lightness is lt 15.",
    "active": true
  },
  {
    "id": "lightness_deep",
    "name": "Deep Tone",
    "category": "tone",
    "predicate": {
      "type": "hslCompare",
      "field": "lightness",
      "op": "gteLt",
      "value": [
        15,
        35
      ]
    },
    "semanticTags": [],
    "symbol": "🎨",
    "description": "lightness is gteLt 15,35.",
    "active": true
  },
  {
    "id": "lightness_balanced",
    "name": "Balanced Tone",
    "category": "tone",
    "predicate": {
      "type": "hslCompare",
      "field": "lightness",
      "op": "gteLt",
      "value": [
        35,
        65
      ]
    },
    "semanticTags": [],
    "symbol": "🎨",
    "description": "lightness is gteLt 35,65.",
    "active": true
  },
  {
    "id": "lightness_bright",
    "name": "Bright Tone",
    "category": "tone",
    "predicate": {
      "type": "hslCompare",
      "field": "lightness",
      "op": "gteLt",
      "value": [
        65,
        85
      ]
    },
    "semanticTags": [],
    "symbol": "🎨",
    "description": "lightness is gteLt 65,85.",
    "active": true
  },
  {
    "id": "lightness_luminous",
    "name": "Luminous Tone",
    "category": "tone",
    "predicate": {
      "type": "hslCompare",
      "field": "lightness",
      "op": "gte",
      "value": 85
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🎨",
    "description": "lightness is gte 85.",
    "active": true
  },
  {
    "id": "tone_edge",
    "name": "Tone Edge",
    "category": "tone",
    "predicate": {
      "type": "hslAny",
      "checks": [
        {
          "field": "lightness",
          "op": "lt",
          "value": 10
        },
        {
          "field": "lightness",
          "op": "gt",
          "value": 90
        }
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🌗",
    "description": "The color sits at a lightness extreme.",
    "active": true
  },
  {
    "id": "pastel",
    "name": "Pastel Bloom",
    "category": "color_relationship",
    "predicate": {
      "type": "all",
      "checks": [
        {
          "type": "channelsAll",
          "operation": "gte",
          "value": 120
        },
        {
          "type": "channelsAny",
          "operation": "gte",
          "value": 210
        },
        {
          "type": "rangeCompare",
          "op": "lt",
          "value": 75
        }
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🌸",
    "description": "Bright channels form a soft pastel balance.",
    "active": true
  },
  {
    "id": "neon",
    "name": "Neon Voltage",
    "category": "color_relationship",
    "predicate": {
      "type": "all",
      "checks": [
        {
          "type": "channelsAny",
          "operation": "gte",
          "value": 221
        },
        {
          "type": "channelsAny",
          "operation": "lt",
          "value": 45
        }
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "💡",
    "description": "A bright channel meets a near-dark channel.",
    "active": true
  },
  {
    "id": "luminous_core",
    "name": "Luminous Core",
    "category": "color_relationship",
    "predicate": {
      "type": "all",
      "checks": [
        {
          "type": "hslCompare",
          "field": "lightness",
          "op": "gte",
          "value": 90
        },
        {
          "type": "hslCompare",
          "field": "saturation",
          "op": "lte",
          "value": 20
        }
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "✨",
    "description": "The color is unusually bright and pale.",
    "active": true
  },
  {
    "id": "warm_bias",
    "name": "Warm Bias",
    "category": "color_relationship",
    "predicate": {
      "type": "channelOrder",
      "order": [
        "r",
        "g",
        "b"
      ],
      "direction": "nonIncreasing"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🔥",
    "description": "The channels lean from warm red toward blue.",
    "active": true
  },
  {
    "id": "cool_bias",
    "name": "Cool Bias",
    "category": "color_relationship",
    "predicate": {
      "type": "channelOrder",
      "order": [
        "b",
        "g",
        "r"
      ],
      "direction": "nonIncreasing"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "❄️",
    "description": "The channels lean from cool blue toward red.",
    "active": true
  },
  {
    "id": "monochromatic",
    "name": "Monochromatic",
    "category": "color_relationship",
    "predicate": {
      "type": "rangeCompare",
      "op": "lte",
      "value": 15
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🎛️",
    "description": "All channels stay within fifteen values.",
    "active": true
  },
  {
    "id": "palindrome",
    "name": "Hex Palindrome",
    "category": "hex_pattern",
    "predicate": {
      "type": "hexPalindrome"
    },
    "semanticTags": [
      "sequence",
      "named"
    ],
    "symbol": "🪞",
    "description": "The six hexadecimal characters read the same backwards.",
    "active": true
  },
  {
    "id": "repeated_pair",
    "name": "Repeated Pair",
    "category": "hex_pattern",
    "predicate": {
      "type": "hexByteEquality"
    },
    "semanticTags": [
      "sequence",
      "named"
    ],
    "symbol": "🟰",
    "description": "The same two-character byte repeats three times.",
    "active": true
  },
  {
    "id": "sixfold_digit",
    "name": "Sixfold Digit",
    "category": "hex_pattern",
    "predicate": {
      "type": "hexAllSame"
    },
    "semanticTags": [
      "sequence",
      "named"
    ],
    "symbol": "🔁",
    "description": "One hexadecimal digit fills all six positions.",
    "active": true
  },
  {
    "id": "triple_hex",
    "name": "Triple Hex",
    "category": "hex_pattern",
    "predicate": {
      "type": "hexRun",
      "length": 3
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "Three matching hexadecimal characters appear in a row.",
    "active": true
  },
  {
    "id": "double_hex",
    "name": "Double Hex",
    "category": "hex_pattern",
    "predicate": {
      "type": "hexRun",
      "length": 2
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "2️⃣",
    "description": "Two matching hexadecimal characters appear in a row.",
    "active": true
  },
  {
    "id": "hex_letter_rich",
    "name": "Letter-Rich Hex",
    "category": "hex_structure",
    "predicate": {
      "type": "hexCharacterCount",
      "class": "letter",
      "op": "gte",
      "value": 3
    },
    "semanticTags": [],
    "symbol": "🔤",
    "description": "At least three hexadecimal characters are letters.",
    "active": true
  },
  {
    "id": "hex_digit_rich",
    "name": "Digit-Rich Hex",
    "category": "hex_structure",
    "predicate": {
      "type": "hexCharacterCount",
      "class": "digit",
      "op": "gte",
      "value": 4
    },
    "semanticTags": [],
    "symbol": "🔢",
    "description": "At least four hexadecimal characters are digits.",
    "active": true
  },
  {
    "id": "hex_digit_sum_prime",
    "name": "Prime Hex Sum",
    "category": "hex_structure",
    "predicate": {
      "type": "hexDigitSumPrime"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🧮",
    "description": "The hexadecimal digit sum is prime.",
    "active": true
  },
  {
    "id": "hex_digit_sum_square",
    "name": "Square Hex Sum",
    "category": "hex_structure",
    "predicate": {
      "type": "hexDigitSumSquare"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "⏹️",
    "description": "The hexadecimal digit sum is a perfect square.",
    "active": true
  },
  {
    "id": "hex_letter_majority",
    "name": "Letter Majority",
    "category": "hex_structure",
    "predicate": {
      "type": "hexCharacterCount",
      "class": "letter",
      "op": "gte",
      "value": 4
    },
    "semanticTags": [],
    "symbol": "🔤",
    "description": "Letters occupy at least four hexadecimal positions.",
    "active": true
  },
  {
    "id": "hex_bookends",
    "name": "Hex Bookends",
    "category": "hex_structure",
    "predicate": {
      "type": "hexBookends"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔗",
    "description": "The first and last hexadecimal characters match.",
    "active": true
  },
  {
    "id": "byte_bookends",
    "name": "Byte Bookends",
    "category": "hex_structure",
    "predicate": {
      "type": "byteBookends"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔗",
    "description": "The first and last hexadecimal bytes match.",
    "active": true
  },
  {
    "id": "hex_ascending",
    "name": "Ascending Hex",
    "category": "sequence",
    "predicate": {
      "type": "hexMonotonic",
      "direction": "ascending"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "📈",
    "description": "Hexadecimal characters strictly rise from left to right.",
    "active": true
  },
  {
    "id": "hex_descending",
    "name": "Descending Hex",
    "category": "sequence",
    "predicate": {
      "type": "hexMonotonic",
      "direction": "descending"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "📉",
    "description": "Hexadecimal characters strictly fall from left to right.",
    "active": true
  },
  {
    "id": "hex_staircase",
    "name": "Hex Staircase",
    "category": "sequence",
    "predicate": {
      "type": "hexStep",
      "step": 1
    },
    "semanticTags": [
      "sequence",
      "named"
    ],
    "symbol": "🪜",
    "description": "Each hexadecimal character advances by one.",
    "active": true
  },
  {
    "id": "hex_reverse_staircase",
    "name": "Reverse Hex Staircase",
    "category": "sequence",
    "predicate": {
      "type": "hexStep",
      "step": -1
    },
    "semanticTags": [
      "sequence",
      "named"
    ],
    "symbol": "🪜",
    "description": "Each hexadecimal character retreats by one.",
    "active": true
  },
  {
    "id": "hex_unique_four",
    "name": "Four-Color Hex",
    "category": "hex_structure",
    "predicate": {
      "type": "hexUniqueCount",
      "op": "eq",
      "value": 4
    },
    "semanticTags": [],
    "symbol": "🔹",
    "description": "Exactly four distinct hexadecimal characters appear.",
    "active": true
  },
  {
    "id": "hex_unique_six",
    "name": "Full Hex Variety",
    "category": "hex_structure",
    "predicate": {
      "type": "hexUniqueCount",
      "op": "eq",
      "value": 6
    },
    "semanticTags": [],
    "symbol": "🔷",
    "description": "Every hexadecimal position is distinct.",
    "active": true
  },
  {
    "id": "hex_contains_all_letters",
    "name": "Alphabet Soup",
    "category": "hex_structure",
    "predicate": {
      "type": "hexContainsAll",
      "values": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F"
      ]
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🔤",
    "description": "Every hexadecimal letter appears.",
    "active": true
  },
  {
    "id": "f1",
    "name": "Formula 1",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "F1"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🏎️",
    "description": "The hexadecimal color contains F1.",
    "active": true,
    "pattern": "F1"
  },
  {
    "id": "letter_run",
    "name": "Letter Run",
    "category": "hex_pattern",
    "predicate": {
      "type": "hexContains",
      "value": "ABC"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔤",
    "description": "The hexadecimal color contains ABC.",
    "active": true,
    "pattern": "ABC"
  },
  {
    "id": "digit_run",
    "name": "Digit Run",
    "category": "hex_pattern",
    "predicate": {
      "type": "hexContains",
      "value": "123"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔢",
    "description": "The hexadecimal color contains 123.",
    "active": true,
    "pattern": "123"
  },
  {
    "id": "contains_00",
    "name": "Double 0",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "00"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 00.",
    "active": true,
    "pattern": "00"
  },
  {
    "id": "contains_11",
    "name": "Double 1",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "11"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 11.",
    "active": true,
    "pattern": "11"
  },
  {
    "id": "contains_22",
    "name": "Double 2",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "22"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 22.",
    "active": true,
    "pattern": "22"
  },
  {
    "id": "contains_33",
    "name": "Double 3",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "33"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 33.",
    "active": true,
    "pattern": "33"
  },
  {
    "id": "contains_44",
    "name": "Double 4",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "44"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 44.",
    "active": true,
    "pattern": "44"
  },
  {
    "id": "contains_55",
    "name": "Double 5",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "55"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 55.",
    "active": true,
    "pattern": "55"
  },
  {
    "id": "contains_66",
    "name": "Double 6",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "66"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 66.",
    "active": true,
    "pattern": "66"
  },
  {
    "id": "contains_77",
    "name": "Double 7",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "77"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 77.",
    "active": true,
    "pattern": "77"
  },
  {
    "id": "contains_88",
    "name": "Double 8",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "88"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 88.",
    "active": true,
    "pattern": "88"
  },
  {
    "id": "contains_99",
    "name": "Double 9",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "99"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 99.",
    "active": true,
    "pattern": "99"
  },
  {
    "id": "contains_aa",
    "name": "Double A",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "AA"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains AA.",
    "active": true,
    "pattern": "AA"
  },
  {
    "id": "contains_bb",
    "name": "Double B",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "BB"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains BB.",
    "active": true,
    "pattern": "BB"
  },
  {
    "id": "contains_cc",
    "name": "Double C",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "CC"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains CC.",
    "active": true,
    "pattern": "CC"
  },
  {
    "id": "contains_dd",
    "name": "Double D",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "DD"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains DD.",
    "active": true,
    "pattern": "DD"
  },
  {
    "id": "contains_ee",
    "name": "Double E",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "EE"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains EE.",
    "active": true,
    "pattern": "EE"
  },
  {
    "id": "contains_ff",
    "name": "Double F",
    "category": "hex_pair",
    "predicate": {
      "type": "hexContains",
      "value": "FF"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains FF.",
    "active": true,
    "pattern": "FF"
  },
  {
    "id": "contains_000",
    "name": "Triple 0",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "000"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 000.",
    "active": true,
    "pattern": "000"
  },
  {
    "id": "contains_111",
    "name": "Triple 1",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "111"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 111.",
    "active": true,
    "pattern": "111"
  },
  {
    "id": "contains_222",
    "name": "Triple 2",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "222"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 222.",
    "active": true,
    "pattern": "222"
  },
  {
    "id": "contains_333",
    "name": "Triple 3",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "333"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 333.",
    "active": true,
    "pattern": "333"
  },
  {
    "id": "contains_444",
    "name": "Triple 4",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "444"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 444.",
    "active": true,
    "pattern": "444"
  },
  {
    "id": "contains_555",
    "name": "Triple 5",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "555"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 555.",
    "active": true,
    "pattern": "555"
  },
  {
    "id": "contains_666",
    "name": "Triple 6",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "666"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 666.",
    "active": true,
    "pattern": "666"
  },
  {
    "id": "contains_777",
    "name": "Triple 7",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "777"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 777.",
    "active": true,
    "pattern": "777"
  },
  {
    "id": "contains_888",
    "name": "Triple 8",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "888"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 888.",
    "active": true,
    "pattern": "888"
  },
  {
    "id": "contains_999",
    "name": "Triple 9",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "999"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains 999.",
    "active": true,
    "pattern": "999"
  },
  {
    "id": "contains_aaa",
    "name": "Triple A",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "AAA"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains AAA.",
    "active": true,
    "pattern": "AAA"
  },
  {
    "id": "contains_bbb",
    "name": "Triple B",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "BBB"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains BBB.",
    "active": true,
    "pattern": "BBB"
  },
  {
    "id": "contains_ccc",
    "name": "Triple C",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "CCC"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains CCC.",
    "active": true,
    "pattern": "CCC"
  },
  {
    "id": "contains_ddd",
    "name": "Triple D",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "DDD"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains DDD.",
    "active": true,
    "pattern": "DDD"
  },
  {
    "id": "contains_eee",
    "name": "Triple E",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "EEE"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains EEE.",
    "active": true,
    "pattern": "EEE"
  },
  {
    "id": "contains_fff",
    "name": "Triple F",
    "category": "hex_triplet",
    "predicate": {
      "type": "hexContains",
      "value": "FFF"
    },
    "semanticTags": [
      "sequence"
    ],
    "symbol": "3️⃣",
    "description": "The hexadecimal color contains FFF.",
    "active": true,
    "pattern": "FFF"
  },
  {
    "id": "dead",
    "name": "Dead Man Walking",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "DEAD"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "💀",
    "description": "The hexadecimal color contains DEAD.",
    "active": true,
    "pattern": "DEAD"
  },
  {
    "id": "beef",
    "name": "Where Is the Beef?",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "BEEF"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🥩",
    "description": "The hexadecimal color contains BEEF.",
    "active": true,
    "pattern": "BEEF"
  },
  {
    "id": "cafe",
    "name": "Coffee Break",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "CAFE"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "☕",
    "description": "The hexadecimal color contains CAFE.",
    "active": true,
    "pattern": "CAFE"
  },
  {
    "id": "face",
    "name": "Face Value",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "FACE"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "😎",
    "description": "The hexadecimal color contains FACE.",
    "active": true,
    "pattern": "FACE"
  },
  {
    "id": "babe",
    "name": "Babe",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "BABE"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "👶",
    "description": "The hexadecimal color contains BABE.",
    "active": true,
    "pattern": "BABE"
  },
  {
    "id": "fade",
    "name": "Fade",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "FADE"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🕳️",
    "description": "The hexadecimal color contains FADE.",
    "active": true,
    "pattern": "FADE"
  },
  {
    "id": "feed",
    "name": "Feed",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "FEED"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🍼",
    "description": "The hexadecimal color contains FEED.",
    "active": true,
    "pattern": "FEED"
  },
  {
    "id": "boob",
    "name": "Boob",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "B00B"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "🍒",
    "description": "The hexadecimal color contains B00B.",
    "active": true,
    "pattern": "B00B"
  },
  {
    "id": "dood",
    "name": "Dood",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "D00D"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🧑‍🎨",
    "description": "The hexadecimal color contains D00D.",
    "active": true,
    "pattern": "D00D"
  },
  {
    "id": "food",
    "name": "Food",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "F00D"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🍔",
    "description": "The hexadecimal color contains F00D.",
    "active": true,
    "pattern": "F00D"
  },
  {
    "id": "leet",
    "name": "Leet Speak",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "1337"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "💻",
    "description": "The hexadecimal color contains 1337.",
    "active": true,
    "pattern": "1337"
  },
  {
    "id": "boob_2",
    "name": "Boob Two",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "8008"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "🍈",
    "description": "The hexadecimal color contains 8008.",
    "active": true,
    "pattern": "8008"
  },
  {
    "id": "abcd",
    "name": "Alphabetical",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "ABCD"
    },
    "semanticTags": [
      "sequence",
      "named"
    ],
    "symbol": "🔤",
    "description": "The hexadecimal color contains ABCD.",
    "active": true,
    "pattern": "ABCD"
  },
  {
    "id": "james_bond",
    "name": "James Bond",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "007"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🕵️",
    "description": "The hexadecimal color contains 007.",
    "active": true,
    "pattern": "007"
  },
  {
    "id": "blaze_it",
    "name": "Blaze It",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "420"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "🌿",
    "description": "The hexadecimal color contains 420.",
    "active": true,
    "pattern": "420"
  },
  {
    "id": "nice",
    "name": "Nice",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "69"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "😏",
    "description": "The hexadecimal color contains 69.",
    "active": true,
    "pattern": "69"
  },
  {
    "id": "demon",
    "name": "Demon",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "666"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "😈",
    "description": "The hexadecimal color contains 666.",
    "active": true,
    "pattern": "666"
  },
  {
    "id": "jackpot",
    "name": "Jackpot",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "777"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "🎰",
    "description": "The hexadecimal color contains 777.",
    "active": true,
    "pattern": "777"
  },
  {
    "id": "emergency",
    "name": "Emergency",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "911"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🚨",
    "description": "The hexadecimal color contains 911.",
    "active": true,
    "pattern": "911"
  },
  {
    "id": "not_found",
    "name": "Not Found",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "404"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🚫",
    "description": "The hexadecimal color contains 404.",
    "active": true,
    "pattern": "404"
  },
  {
    "id": "server_error",
    "name": "Server Error",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "500"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "⚠️",
    "description": "The hexadecimal color contains 500.",
    "active": true,
    "pattern": "500"
  },
  {
    "id": "perfect_score",
    "name": "Perfect Score",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "100"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "💯",
    "description": "The hexadecimal color contains 100.",
    "active": true,
    "pattern": "100"
  },
  {
    "id": "pure_black",
    "name": "The Void",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 0,
      "green": 0,
      "blue": 0
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🌑",
    "description": "The RGB color is exactly (0, 0, 0).",
    "active": true
  },
  {
    "id": "pure_white",
    "name": "The Light",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 255,
      "green": 255,
      "blue": 255
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "☀️",
    "description": "The RGB color is exactly (255, 255, 255).",
    "active": true
  },
  {
    "id": "pure_red",
    "name": "Maximum Red",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 255,
      "green": 0,
      "blue": 0
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🟥",
    "description": "The RGB color is exactly (255, 0, 0).",
    "active": true
  },
  {
    "id": "pure_green",
    "name": "Maximum Green",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 0,
      "green": 255,
      "blue": 0
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🟩",
    "description": "The RGB color is exactly (0, 255, 0).",
    "active": true
  },
  {
    "id": "pure_blue",
    "name": "Maximum Blue",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 0,
      "green": 0,
      "blue": 255
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🟦",
    "description": "The RGB color is exactly (0, 0, 255).",
    "active": true
  },
  {
    "id": "pure_cyan",
    "name": "Maximum Cyan",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 0,
      "green": 255,
      "blue": 255
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🟦",
    "description": "The RGB color is exactly (0, 255, 255).",
    "active": true
  },
  {
    "id": "pure_magenta",
    "name": "Maximum Magenta",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 255,
      "green": 0,
      "blue": 255
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🟪",
    "description": "The RGB color is exactly (255, 0, 255).",
    "active": true
  },
  {
    "id": "pure_yellow",
    "name": "Maximum Yellow",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 255,
      "green": 255,
      "blue": 0
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🟨",
    "description": "The RGB color is exactly (255, 255, 0).",
    "active": true
  },
  {
    "id": "pure_gold",
    "name": "Midas",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 255,
      "green": 215,
      "blue": 0
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🥇",
    "description": "The RGB color is exactly (255, 215, 0).",
    "active": true
  },
  {
    "id": "streamer_purple",
    "name": "Streamer Purple",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 145,
      "green": 70,
      "blue": 255
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🟣",
    "description": "The RGB color is exactly (145, 70, 255).",
    "active": true
  },
  {
    "id": "audio_stream_green",
    "name": "Audio Stream Green",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 30,
      "green": 215,
      "blue": 96
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🟢",
    "description": "The RGB color is exactly (30, 215, 96).",
    "active": true
  },
  {
    "id": "classic_cola_red",
    "name": "Classic Cola Red",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 244,
      "green": 0,
      "blue": 9
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🥤",
    "description": "The RGB color is exactly (244, 0, 9).",
    "active": true
  },
  {
    "id": "almost_black",
    "name": "Almost Black",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 0,
      "green": 0,
      "blue": 1
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🌑",
    "description": "The RGB color is exactly (0, 0, 1).",
    "active": true
  },
  {
    "id": "almost_white",
    "name": "Almost White",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 255,
      "green": 255,
      "blue": 254
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "☀️",
    "description": "The RGB color is exactly (255, 255, 254).",
    "active": true
  },
  {
    "id": "perfect_grey",
    "name": "Perfect Grey",
    "category": "exact",
    "predicate": {
      "type": "channelExact",
      "red": 127,
      "green": 127,
      "blue": 127
    },
    "semanticTags": [
      "exact"
    ],
    "symbol": "🔘",
    "description": "The RGB color is exactly (127, 127, 127).",
    "active": true
  },
  {
    "id": "reference_123456",
    "name": "Reference Sequence",
    "category": "exact",
    "predicate": {
      "type": "hexExact",
      "value": "123456"
    },
    "semanticTags": [
      "exact",
      "sequence",
      "named"
    ],
    "symbol": "🔢",
    "description": "The hexadecimal color is exactly 123456.",
    "active": true
  },
  {
    "id": "reference_abcdef",
    "name": "Alphabetic Gradient",
    "category": "exact",
    "predicate": {
      "type": "hexExact",
      "value": "ABCDEF"
    },
    "semanticTags": [
      "exact",
      "sequence",
      "named"
    ],
    "symbol": "🔤",
    "description": "The hexadecimal color is exactly ABCDEF.",
    "active": true
  },
  {
    "id": "reference_fedcba",
    "name": "Reverse Gradient",
    "category": "exact",
    "predicate": {
      "type": "hexExact",
      "value": "FEDCBA"
    },
    "semanticTags": [
      "exact",
      "sequence",
      "named"
    ],
    "symbol": "🔄",
    "description": "The hexadecimal color is exactly FEDCBA.",
    "active": true
  },
  {
    "id": "six_seven",
    "name": "Six Seven",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "67"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "6️⃣",
    "description": "The hexadecimal color contains 67.",
    "active": true,
    "exclusiveGroup": "six_seven",
    "exclusiveRank": 1,
    "pattern": "67"
  },
  {
    "id": "six_seven_echo",
    "name": "Six Seven Echo",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "6767"
    },
    "semanticTags": [
      "meme",
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The hexadecimal color contains 6767.",
    "active": true,
    "exclusiveGroup": "six_seven",
    "exclusiveRank": 2,
    "pattern": "6767"
  },
  {
    "id": "six_seven_full",
    "name": "Six Seven Full House",
    "category": "hex_culture",
    "predicate": {
      "type": "hexExact",
      "value": "676767"
    },
    "semanticTags": [
      "meme",
      "sequence",
      "exact"
    ],
    "symbol": "🎲",
    "description": "The hexadecimal color is exactly 676767.",
    "active": true,
    "exclusiveGroup": "six_seven",
    "exclusiveRank": 3
  },
  {
    "id": "a24",
    "name": "A24",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "A24"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🎬",
    "description": "The hexadecimal color contains A24.",
    "active": true,
    "pattern": "A24"
  },
  {
    "id": "d23",
    "name": "D23",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "D23"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🏰",
    "description": "The hexadecimal color contains D23.",
    "active": true,
    "pattern": "D23"
  },
  {
    "id": "ff7",
    "name": "Final Fantasy VII",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "FF7"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🗡️",
    "description": "The hexadecimal color contains FF7.",
    "active": true,
    "pattern": "FF7"
  },
  {
    "id": "a113",
    "name": "A113",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "A113"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🎞️",
    "description": "The hexadecimal color contains A113.",
    "active": true,
    "pattern": "A113"
  },
  {
    "id": "eight_oh_eight",
    "name": "808",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "808"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🥁",
    "description": "The hexadecimal color contains 808.",
    "active": true,
    "pattern": "808"
  },
  {
    "id": "era_1989",
    "name": "1989 Era",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "1989"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🎤",
    "description": "The hexadecimal color contains 1989.",
    "active": true,
    "pattern": "1989"
  },
  {
    "id": "blaze_nice",
    "name": "Blaze Nice",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "42069"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "🌿",
    "description": "The hexadecimal color contains 42069.",
    "active": true,
    "pattern": "42069"
  },
  {
    "id": "nice_blaze",
    "name": "Nice Blaze",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "69420"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "😏",
    "description": "The hexadecimal color contains 69420.",
    "active": true,
    "pattern": "69420"
  },
  {
    "id": "calculator_classic",
    "name": "Calculator Classic",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "58008"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "🧮",
    "description": "The hexadecimal color contains 58008.",
    "active": true,
    "pattern": "58008"
  },
  {
    "id": "calculator_hello",
    "name": "Calculator Hello",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "07734"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "👋",
    "description": "The hexadecimal color contains 07734.",
    "active": true,
    "pattern": "07734"
  },
  {
    "id": "calculator_boobs",
    "name": "Calculator Boobs",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "80085"
    },
    "semanticTags": [
      "meme"
    ],
    "symbol": "🙃",
    "description": "The hexadecimal color contains 80085.",
    "active": true,
    "pattern": "80085"
  },
  {
    "id": "double_blaze",
    "name": "Double Blaze",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "420420"
    },
    "semanticTags": [
      "meme",
      "sequence"
    ],
    "symbol": "🔥",
    "description": "The hexadecimal color contains 420420.",
    "active": true,
    "pattern": "420420"
  },
  {
    "id": "double_not_found",
    "name": "404 Echo",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "404404"
    },
    "semanticTags": [
      "named",
      "sequence"
    ],
    "symbol": "🕳️",
    "description": "The hexadecimal color contains 404404.",
    "active": true,
    "pattern": "404404"
  },
  {
    "id": "six_sixes",
    "name": "Six Sixes",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "666666"
    },
    "semanticTags": [
      "meme",
      "sequence"
    ],
    "symbol": "😈",
    "description": "The hexadecimal color contains 666666.",
    "active": true,
    "pattern": "666666"
  },
  {
    "id": "nice_stack",
    "name": "Nice Stack",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "696969"
    },
    "semanticTags": [
      "meme",
      "sequence"
    ],
    "symbol": "😏",
    "description": "The hexadecimal color contains 696969.",
    "active": true,
    "pattern": "696969"
  },
  {
    "id": "jackpot_stack",
    "name": "Jackpot Stack",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "777777"
    },
    "semanticTags": [
      "meme",
      "sequence"
    ],
    "symbol": "🎰",
    "description": "The hexadecimal color contains 777777.",
    "active": true,
    "pattern": "777777"
  },
  {
    "id": "leet_stack",
    "name": "Leet Stack",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "133713"
    },
    "semanticTags": [
      "meme",
      "sequence"
    ],
    "symbol": "💻",
    "description": "The hexadecimal color contains 133713.",
    "active": true,
    "pattern": "133713"
  },
  {
    "id": "coffee_code",
    "name": "Coffee Code",
    "category": "hex_culture",
    "predicate": {
      "type": "hexExact",
      "value": "C0FFEE"
    },
    "semanticTags": [
      "named",
      "exact"
    ],
    "symbol": "☕",
    "description": "The hexadecimal color is exactly C0FFEE.",
    "active": true
  },
  {
    "id": "code_echo",
    "name": "Code Echo",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "C0D3"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "👾",
    "description": "The hexadecimal color contains C0D3.",
    "active": true,
    "pattern": "C0D3"
  },
  {
    "id": "decode",
    "name": "Decode",
    "category": "hex_culture",
    "predicate": {
      "type": "hexExact",
      "value": "DEC0DE"
    },
    "semanticTags": [
      "named",
      "exact"
    ],
    "symbol": "🔓",
    "description": "The hexadecimal color is exactly DEC0DE.",
    "active": true
  },
  {
    "id": "facade",
    "name": "Facade",
    "category": "hex_culture",
    "predicate": {
      "type": "hexExact",
      "value": "FACADE"
    },
    "semanticTags": [
      "named",
      "exact"
    ],
    "symbol": "🎭",
    "description": "The hexadecimal color is exactly FACADE.",
    "active": true
  },
  {
    "id": "deface",
    "name": "Deface",
    "category": "hex_culture",
    "predicate": {
      "type": "hexExact",
      "value": "DEFACE"
    },
    "semanticTags": [
      "named",
      "exact"
    ],
    "symbol": "🖌️",
    "description": "The hexadecimal color is exactly DEFACE.",
    "active": true
  },
  {
    "id": "badass",
    "name": "Badass",
    "category": "hex_culture",
    "predicate": {
      "type": "hexExact",
      "value": "BADA55"
    },
    "semanticTags": [
      "meme",
      "exact"
    ],
    "symbol": "😎",
    "description": "The hexadecimal color is exactly BADA55.",
    "active": true
  },
  {
    "id": "foobar",
    "name": "Foobar",
    "category": "hex_culture",
    "predicate": {
      "type": "hexExact",
      "value": "F00BA4"
    },
    "semanticTags": [
      "named",
      "exact"
    ],
    "symbol": "🧪",
    "description": "The hexadecimal color is exactly F00BA4.",
    "active": true
  },
  {
    "id": "boba",
    "name": "Boba",
    "category": "hex_culture",
    "predicate": {
      "type": "hexContains",
      "value": "B0BA"
    },
    "semanticTags": [
      "named"
    ],
    "symbol": "🧋",
    "description": "The hexadecimal color contains B0BA.",
    "active": true,
    "pattern": "B0BA"
  },
  {
    "id": "combo_meme_symmetry",
    "name": "Meme Mirror",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "nice",
        "red_blue_equal"
      ]
    },
    "semanticTags": [
      "combination",
      "meme"
    ],
    "symbol": "🪞",
    "description": "The nice + red_blue_equal signals align in one color.",
    "active": true
  },
  {
    "id": "combo_meme_palindrome",
    "name": "Meme Palindrome",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "blaze_it",
        "palindrome"
      ]
    },
    "semanticTags": [
      "combination",
      "meme",
      "sequence"
    ],
    "symbol": "🌿",
    "description": "The blaze_it + palindrome signals align in one color.",
    "active": true
  },
  {
    "id": "combo_sequence_channel_order",
    "name": "Ordered Sequence",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "ascending_channels",
        "hex_ascending"
      ]
    },
    "semanticTags": [
      "combination",
      "sequence"
    ],
    "symbol": "📈",
    "description": "The ascending_channels + hex_ascending signals align in one color.",
    "active": true
  },
  {
    "id": "combo_reverse_sequence",
    "name": "Reversed Sequence",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "descending_channels",
        "hex_descending"
      ]
    },
    "semanticTags": [
      "combination",
      "sequence"
    ],
    "symbol": "📉",
    "description": "The descending_channels + hex_descending signals align in one color.",
    "active": true
  },
  {
    "id": "combo_prime_palindrome",
    "name": "Prime Mirror",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "sum_prime",
        "palindrome"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "🔢",
    "description": "The sum_prime + palindrome signals align in one color.",
    "active": true
  },
  {
    "id": "combo_square_greyscale",
    "name": "Square Grey",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "sum_square",
        "greyscale"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "⚫",
    "description": "The sum_square + greyscale signals align in one color.",
    "active": true
  },
  {
    "id": "combo_fibonacci_sequence",
    "name": "Fibonacci Flow",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "sum_fibonacci",
        "ascending_channels"
      ]
    },
    "semanticTags": [
      "combination",
      "sequence",
      "named"
    ],
    "symbol": "🌀",
    "description": "The sum_fibonacci + ascending_channels signals align in one color.",
    "active": true
  },
  {
    "id": "combo_high_contrast_neon",
    "name": "Neon Contrast",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "high_contrast",
        "neon"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "💡",
    "description": "The high_contrast + neon signals align in one color.",
    "active": true
  },
  {
    "id": "combo_pastel_luminous",
    "name": "Pastel Light",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "pastel",
        "lightness_luminous"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "🌸",
    "description": "The pastel + lightness_luminous signals align in one color.",
    "active": true
  },
  {
    "id": "combo_warm_red",
    "name": "Warm Red Lead",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "temperature_warm",
        "red_dominant"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "🔥",
    "description": "The temperature_warm + red_dominant signals align in one color.",
    "active": true
  },
  {
    "id": "combo_cool_blue",
    "name": "Cool Blue Lead",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "temperature_cool",
        "blue_dominant"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "❄️",
    "description": "The temperature_cool + blue_dominant signals align in one color.",
    "active": true
  },
  {
    "id": "combo_complement_vivid",
    "name": "Vivid Complement",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "channel_complement_red_blue",
        "saturation_vivid"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "☯️",
    "description": "The channel_complement_red_blue + saturation_vivid signals align in one color.",
    "active": true
  },
  {
    "id": "combo_web_safe_greyscale",
    "name": "Safe Grey",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "web_safe",
        "greyscale"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "🕸️",
    "description": "The web_safe + greyscale signals align in one color.",
    "active": true
  },
  {
    "id": "combo_repeated_palindrome",
    "name": "Echo Mirror",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "repeated_pair",
        "palindrome"
      ]
    },
    "semanticTags": [
      "combination",
      "sequence"
    ],
    "symbol": "🔁",
    "description": "The repeated_pair + palindrome signals align in one color.",
    "active": true
  },
  {
    "id": "combo_sixfold_greyscale",
    "name": "Sixfold Grey",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "sixfold_digit",
        "greyscale"
      ]
    },
    "semanticTags": [
      "combination",
      "sequence",
      "named"
    ],
    "symbol": "⚫",
    "description": "The sixfold_digit + greyscale signals align in one color.",
    "active": true
  },
  {
    "id": "combo_exact_sequence",
    "name": "Exact Sequence",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "reference_123456",
        "hex_staircase"
      ]
    },
    "semanticTags": [
      "combination",
      "exact",
      "sequence"
    ],
    "symbol": "🔢",
    "description": "The reference_123456 + hex_staircase signals align in one color.",
    "active": true
  },
  {
    "id": "combo_exact_reverse",
    "name": "Exact Reverse",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "reference_fedcba",
        "hex_reverse_staircase"
      ]
    },
    "semanticTags": [
      "combination",
      "exact",
      "sequence"
    ],
    "symbol": "🔄",
    "description": "The reference_fedcba + hex_reverse_staircase signals align in one color.",
    "active": true
  },
  {
    "id": "combo_anomaly_meme",
    "name": "Stacked Meme",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "six_sixes",
        "demon"
      ]
    },
    "semanticTags": [
      "combination",
      "meme",
      "sequence"
    ],
    "symbol": "😈",
    "description": "The six_sixes + demon signals align in one color.",
    "active": true
  },
  {
    "id": "combo_six_seven_palindrome",
    "name": "Six Seven Mirror",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "six_seven_full",
        "greyscale"
      ]
    },
    "semanticTags": [
      "combination",
      "meme",
      "sequence"
    ],
    "symbol": "6️⃣",
    "description": "The six_seven_full + greyscale signals align in one color.",
    "active": true
  },
  {
    "id": "combo_hex_letters",
    "name": "Lettered Spectrum",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "hex_letter_rich",
        "hex_letter_majority"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "🔤",
    "description": "The hex_letter_rich + hex_letter_majority signals align in one color.",
    "active": true
  },
  {
    "id": "combo_digit_structure",
    "name": "Digit Structure",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "hex_digit_rich",
        "hex_digit_sum_prime"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "🔢",
    "description": "The hex_digit_rich + hex_digit_sum_prime signals align in one color.",
    "active": true
  },
  {
    "id": "combo_power_progression",
    "name": "Electric Progression",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "power_two_any",
        "channel_progression"
      ]
    },
    "semanticTags": [
      "combination",
      "sequence"
    ],
    "symbol": "⚡",
    "description": "The power_two_any + channel_progression signals align in one color.",
    "active": true
  },
  {
    "id": "combo_edge_contrast",
    "name": "Edge Contrast",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "edge_pair",
        "extreme_span"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "⚡",
    "description": "The edge_pair + extreme_span signals align in one color.",
    "active": true
  },
  {
    "id": "combo_saturation_tone",
    "name": "Saturated Light",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "saturation_electric",
        "lightness_luminous"
      ]
    },
    "semanticTags": [
      "combination",
      "named"
    ],
    "symbol": "✨",
    "description": "The saturation_electric + lightness_luminous signals align in one color.",
    "active": true
  },
  {
    "id": "combo_culture_exact",
    "name": "Cultural Artifact",
    "category": "combination",
    "predicate": {
      "type": "combination",
      "all": [
        "coffee_code",
        "hex_letter_majority"
      ]
    },
    "semanticTags": [
      "combination",
      "exact",
      "named"
    ],
    "symbol": "☕",
    "description": "The coffee_code + hex_letter_majority signals align in one color.",
    "active": true
  }
]);
export const GENERATED_V6_PROBABILITY_MANIFEST = Object.freeze([
  {
    "id": "spectrum_presence",
    "matchCount": 16777216,
    "probability": Number("1"),
    "expectedRolls": 1,
    "rarity": "Common",
    "probabilityReward": 500,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_even",
    "matchCount": 8388608,
    "probability": Number("0.5"),
    "expectedRolls": 2,
    "rarity": "Common",
    "probabilityReward": 1540.9705810057565,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_odd",
    "matchCount": 8388608,
    "probability": Number("0.5"),
    "expectedRolls": 2,
    "rarity": "Common",
    "probabilityReward": 1540.9705810057565,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_divisible_3",
    "matchCount": 5592406,
    "probability": Number("0.3333333730697632"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 2149.8991562191695,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_divisible_5",
    "matchCount": 3355444,
    "probability": Number("0.20000004768371582"),
    "expectedRolls": 5,
    "rarity": "Common",
    "probabilityReward": 2917.0584799307694,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_divisible_7",
    "matchCount": 2396743,
    "probability": Number("0.14285701513290405"),
    "expectedRolls": 8,
    "rarity": "Common",
    "probabilityReward": 3422.3752270208747,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_divisible_9",
    "matchCount": 1864130,
    "probability": Number("0.11111080646514893"),
    "expectedRolls": 10,
    "rarity": "Common",
    "probabilityReward": 3799.8027881659627,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_divisible_11",
    "matchCount": 1525200,
    "probability": Number("0.09090900421142578"),
    "expectedRolls": 12,
    "rarity": "Common",
    "probabilityReward": 4101.167974234275,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_42",
    "matchCount": 946,
    "probability": Number("0.00005638599395751953"),
    "expectedRolls": 17735,
    "rarity": "Legendary",
    "probabilityReward": 28638731.906878054,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_69",
    "matchCount": 2485,
    "probability": Number("0.0001481175422668457"),
    "expectedRolls": 6752,
    "rarity": "Epic",
    "probabilityReward": 4232269.933504387,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_100",
    "matchCount": 5151,
    "probability": Number("0.0003070235252380371"),
    "expectedRolls": 3258,
    "rarity": "Epic",
    "probabilityReward": 2807727.044419017,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_255",
    "matchCount": 32896,
    "probability": Number("0.00196075439453125"),
    "expectedRolls": 511,
    "rarity": "Rare",
    "probabilityReward": 368408.85375357064,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_420",
    "matchCount": 47746,
    "probability": Number("0.0028458833694458008"),
    "expectedRolls": 352,
    "rarity": "Rare",
    "probabilityReward": 295601.7602202606,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_666",
    "matchCount": 5050,
    "probability": Number("0.00030100345611572266"),
    "expectedRolls": 3323,
    "rarity": "Epic",
    "probabilityReward": 2846427.808747475,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_fibonacci",
    "matchCount": 106213,
    "probability": Number("0.0063307881355285645"),
    "expectedRolls": 158,
    "rarity": "Rare",
    "probabilityReward": 139343.80055629663,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_square",
    "matchCount": 453595,
    "probability": Number("0.02703636884689331"),
    "expectedRolls": 37,
    "rarity": "Uncommon",
    "probabilityReward": 22190.59012011876,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_triangular",
    "matchCount": 641336,
    "probability": Number("0.03822660446166992"),
    "expectedRolls": 27,
    "rarity": "Uncommon",
    "probabilityReward": 12506.868721748237,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sum_prime",
    "matchCount": 2760769,
    "probability": Number("0.1645546555519104"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3210.022474405082,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "balanced_sum_band",
    "matchCount": 7778096,
    "probability": Number("0.4636106491088867"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 1654.451353426902,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "all_channels_even",
    "matchCount": 2097152,
    "probability": Number("0.125"),
    "expectedRolls": 8,
    "rarity": "Common",
    "probabilityReward": 3622.911743017269,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "all_channels_odd",
    "matchCount": 2097152,
    "probability": Number("0.125"),
    "expectedRolls": 8,
    "rarity": "Common",
    "probabilityReward": 3622.911743017269,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "all_channels_div3",
    "matchCount": 636056,
    "probability": Number("0.03791189193725586"),
    "expectedRolls": 27,
    "rarity": "Uncommon",
    "probabilityReward": 12738.00644697228,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "all_channels_div5",
    "matchCount": 140608,
    "probability": Number("0.008380889892578125"),
    "expectedRolls": 120,
    "rarity": "Rare",
    "probabilityReward": 84519.36255415299,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "web_safe",
    "matchCount": 216,
    "probability": Number("0.000012874603271484375"),
    "expectedRolls": 77673,
    "rarity": "Legendary",
    "probabilityReward": 89575282.86427253,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "channel_zero",
    "matchCount": 195841,
    "probability": Number("0.011673033237457275"),
    "expectedRolls": 86,
    "rarity": "Uncommon",
    "probabilityReward": 45673.77818354755,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "channel_maxed",
    "matchCount": 195841,
    "probability": Number("0.011673033237457275"),
    "expectedRolls": 86,
    "rarity": "Uncommon",
    "probabilityReward": 45673.77818354755,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "channel_one",
    "matchCount": 195841,
    "probability": Number("0.011673033237457275"),
    "expectedRolls": 86,
    "rarity": "Uncommon",
    "probabilityReward": 45673.77818354755,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "channel_edge",
    "matchCount": 3295944,
    "probability": Number("0.19645357131958008"),
    "expectedRolls": 6,
    "rarity": "Common",
    "probabilityReward": 2943.927959738198,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "edge_pair",
    "matchCount": 237168,
    "probability": Number("0.014136314392089844"),
    "expectedRolls": 71,
    "rarity": "Uncommon",
    "probabilityReward": 40320.50391051974,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "twin_channels",
    "matchCount": 196096,
    "probability": Number("0.011688232421875"),
    "expectedRolls": 86,
    "rarity": "Uncommon",
    "probabilityReward": 45637.39651537303,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "greyscale",
    "matchCount": 256,
    "probability": Number("0.0000152587890625"),
    "expectedRolls": 65536,
    "rarity": "Legendary",
    "probabilityReward": 82565592.59277149,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "all_channels_distinct",
    "matchCount": 16581120,
    "probability": Number("0.988311767578125"),
    "expectedRolls": 2,
    "rarity": "Common",
    "probabilityReward": 517.656814298761,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "red_green_equal",
    "matchCount": 65536,
    "probability": Number("0.00390625"),
    "expectedRolls": 256,
    "rarity": "Rare",
    "probabilityReward": 233707.57615036698,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "green_blue_equal",
    "matchCount": 65536,
    "probability": Number("0.00390625"),
    "expectedRolls": 256,
    "rarity": "Rare",
    "probabilityReward": 233707.57615036698,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "red_blue_equal",
    "matchCount": 65536,
    "probability": Number("0.00390625"),
    "expectedRolls": 256,
    "rarity": "Rare",
    "probabilityReward": 233707.57615036698,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "low_contrast",
    "matchCount": 305596,
    "probability": Number("0.018214941024780273"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 33232.91687096811,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "gentle_contrast",
    "matchCount": 3543540,
    "probability": Number("0.2112114429473877"),
    "expectedRolls": 5,
    "rarity": "Common",
    "probabilityReward": 2835.1469462701093,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "layered_contrast",
    "matchCount": 11164500,
    "probability": Number("0.6654560565948486"),
    "expectedRolls": 2,
    "rarity": "Common",
    "probabilityReward": 1111.6583803065694,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "high_contrast",
    "matchCount": 1763580,
    "probability": Number("0.1051175594329834"),
    "expectedRolls": 10,
    "rarity": "Common",
    "probabilityReward": 3883.0757007808193,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "extreme_span",
    "matchCount": 501930,
    "probability": Number("0.029917359352111816"),
    "expectedRolls": 34,
    "rarity": "Uncommon",
    "probabilityReward": 19359.529702735657,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "red_dominant",
    "matchCount": 5559680,
    "probability": Number("0.33138275146484375"),
    "expectedRolls": 4,
    "rarity": "Common",
    "probabilityReward": 2158.713318728861,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "green_dominant",
    "matchCount": 5559680,
    "probability": Number("0.33138275146484375"),
    "expectedRolls": 4,
    "rarity": "Common",
    "probabilityReward": 2158.713318728861,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "blue_dominant",
    "matchCount": 5559680,
    "probability": Number("0.33138275146484375"),
    "expectedRolls": 4,
    "rarity": "Common",
    "probabilityReward": 2158.713318728861,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "balanced_channels",
    "matchCount": 98176,
    "probability": Number("0.00585174560546875"),
    "expectedRolls": 171,
    "rarity": "Rare",
    "probabilityReward": 154721.32033785238,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "ascending_channels",
    "matchCount": 2763520,
    "probability": Number("0.1647186279296875"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3208.5267305525567,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "descending_channels",
    "matchCount": 2763520,
    "probability": Number("0.1647186279296875"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3208.5267305525567,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "red_green_step",
    "matchCount": 8355840,
    "probability": Number("0.498046875"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 1546.8484871194769,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "green_blue_step",
    "matchCount": 8355840,
    "probability": Number("0.498046875"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 1546.8484871194769,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "blue_red_step",
    "matchCount": 8355840,
    "probability": Number("0.498046875"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 1546.8484871194769,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "channel_progression",
    "matchCount": 97792,
    "probability": Number("0.005828857421875"),
    "expectedRolls": 172,
    "rarity": "Rare",
    "probabilityReward": 155487.22105382796,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "channel_complement_red_blue",
    "matchCount": 65536,
    "probability": Number("0.00390625"),
    "expectedRolls": 256,
    "rarity": "Rare",
    "probabilityReward": 233707.57615036698,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "channel_complement_red_green",
    "matchCount": 65536,
    "probability": Number("0.00390625"),
    "expectedRolls": 256,
    "rarity": "Rare",
    "probabilityReward": 233707.57615036698,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "channel_complement_green_blue",
    "matchCount": 65536,
    "probability": Number("0.00390625"),
    "expectedRolls": 256,
    "rarity": "Rare",
    "probabilityReward": 233707.57615036698,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "power_two_channels",
    "matchCount": 512,
    "probability": Number("0.000030517578125"),
    "expectedRolls": 32768,
    "rarity": "Legendary",
    "probabilityReward": 53967743.305723265,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "power_two_any",
    "matchCount": 1524224,
    "probability": Number("0.090850830078125"),
    "expectedRolls": 12,
    "rarity": "Common",
    "probabilityReward": 4102.129309798434,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "parity_pattern_even_odd_even",
    "matchCount": 2097152,
    "probability": Number("0.125"),
    "expectedRolls": 8,
    "rarity": "Common",
    "probabilityReward": 3622.911743017269,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "parity_pattern_odd_even_odd",
    "matchCount": 2097152,
    "probability": Number("0.125"),
    "expectedRolls": 8,
    "rarity": "Common",
    "probabilityReward": 3622.911743017269,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_crimson",
    "matchCount": 1389274,
    "probability": Number("0.08280718326568604"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.352643457189,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_amber",
    "matchCount": 1389276,
    "probability": Number("0.08280730247497559"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.350481461766,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_gold",
    "matchCount": 1389274,
    "probability": Number("0.08280718326568604"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.352643457189,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_lime",
    "matchCount": 1389276,
    "probability": Number("0.08280730247497559"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.350481461766,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_emerald",
    "matchCount": 2778550,
    "probability": Number("0.16561448574066162"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3200.380981453331,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_cyan",
    "matchCount": 1389274,
    "probability": Number("0.08280718326568604"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.352643457189,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_azure",
    "matchCount": 1389276,
    "probability": Number("0.08280730247497559"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.350481461766,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_blue",
    "matchCount": 1389274,
    "probability": Number("0.08280718326568604"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.352643457189,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_violet",
    "matchCount": 1389276,
    "probability": Number("0.08280730247497559"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.350481461766,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_magenta",
    "matchCount": 1389274,
    "probability": Number("0.08280718326568604"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.352643457189,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_rose",
    "matchCount": 1389276,
    "probability": Number("0.08280730247497559"),
    "expectedRolls": 13,
    "rarity": "Common",
    "probabilityReward": 4241.350481461766,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hue_family_neutral",
    "matchCount": 105916,
    "probability": Number("0.0063130855560302734"),
    "expectedRolls": 159,
    "rarity": "Rare",
    "probabilityReward": 139891.04649105849,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "temperature_warm",
    "matchCount": 8421120,
    "probability": Number("0.5019378662109375"),
    "expectedRolls": 2,
    "rarity": "Common",
    "probabilityReward": 1535.1612445184319,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "temperature_cool",
    "matchCount": 8355840,
    "probability": Number("0.498046875"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 1546.8484871194769,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "temperature_neutral",
    "matchCount": 256,
    "probability": Number("0.0000152587890625"),
    "expectedRolls": 65536,
    "rarity": "Legendary",
    "probabilityReward": 82565592.59277149,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "saturation_soft",
    "matchCount": 372574,
    "probability": Number("0.022207140922546387"),
    "expectedRolls": 46,
    "rarity": "Uncommon",
    "probabilityReward": 27692.144777998594,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "saturation_muted",
    "matchCount": 2272800,
    "probability": Number("0.1354694366455078"),
    "expectedRolls": 8,
    "rarity": "Common",
    "probabilityReward": 3502.1182392681435,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "saturation_rich",
    "matchCount": 5473140,
    "probability": Number("0.32622456550598145"),
    "expectedRolls": 4,
    "rarity": "Common",
    "probabilityReward": 2182.2736968327686,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "saturation_vivid",
    "matchCount": 6837624,
    "probability": Number("0.40755414962768555"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 1847.99063351209,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "saturation_electric",
    "matchCount": 1821078,
    "probability": Number("0.10854470729827881"),
    "expectedRolls": 10,
    "rarity": "Common",
    "probabilityReward": 3834.893653289796,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "saturation_high_chroma",
    "matchCount": 6181500,
    "probability": Number("0.36844611167907715"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 1999.491542146011,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "lightness_shadow",
    "matchCount": 232713,
    "probability": Number("0.013870775699615479"),
    "expectedRolls": 73,
    "rarity": "Uncommon",
    "probabilityReward": 40850.6938328383,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "lightness_deep",
    "matchCount": 2658987,
    "probability": Number("0.1584879755973816"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3266.436267311251,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "lightness_balanced",
    "matchCount": 10993816,
    "probability": Number("0.6552824974060059"),
    "expectedRolls": 2,
    "rarity": "Common",
    "probabilityReward": 1134.7954119748142,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "lightness_bright",
    "matchCount": 2658987,
    "probability": Number("0.1584879755973816"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3266.436267311251,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "lightness_luminous",
    "matchCount": 232713,
    "probability": Number("0.013870775699615479"),
    "expectedRolls": 73,
    "rarity": "Uncommon",
    "probabilityReward": 40850.6938328383,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "tone_edge",
    "matchCount": 136552,
    "probability": Number("0.00813913345336914"),
    "expectedRolls": 123,
    "rarity": "Rare",
    "probabilityReward": 90239.7343244495,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pastel",
    "matchCount": 765946,
    "probability": Number("0.04565393924713135"),
    "expectedRolls": 22,
    "rarity": "Uncommon",
    "probabilityReward": 7542.439800348391,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "neon",
    "matchCount": 2041200,
    "probability": Number("0.12166500091552734"),
    "expectedRolls": 9,
    "rarity": "Common",
    "probabilityReward": 3663.5240483462494,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "luminous_core",
    "matchCount": 2906,
    "probability": Number("0.00017321109771728516"),
    "expectedRolls": 5774,
    "rarity": "Epic",
    "probabilityReward": 3926408.5254566707,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "warm_bias",
    "matchCount": 2829056,
    "probability": Number("0.1686248779296875"),
    "expectedRolls": 6,
    "rarity": "Common",
    "probabilityReward": 3173.3276834105036,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "cool_bias",
    "matchCount": 2829056,
    "probability": Number("0.1686248779296875"),
    "expectedRolls": 6,
    "rarity": "Common",
    "probabilityReward": 3173.3276834105036,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "monochromatic",
    "matchCount": 177136,
    "probability": Number("0.010558128356933594"),
    "expectedRolls": 95,
    "rarity": "Uncommon",
    "probabilityReward": 48480.49621095822,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "palindrome",
    "matchCount": 4096,
    "probability": Number("0.000244140625"),
    "expectedRolls": 4096,
    "rarity": "Epic",
    "probabilityReward": 3255619.153495036,
    "semanticBonus": 0.07500000000000001,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "repeated_pair",
    "matchCount": 256,
    "probability": Number("0.0000152587890625"),
    "expectedRolls": 65536,
    "rarity": "Legendary",
    "probabilityReward": 82565592.59277149,
    "semanticBonus": 0.07500000000000001,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "sixfold_digit",
    "matchCount": 16,
    "probability": Number("9.5367431640625e-7"),
    "expectedRolls": 1048576,
    "rarity": "Anomaly",
    "probabilityReward": 1048576000.0000001,
    "semanticBonus": 0.07500000000000001,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "triple_hex",
    "matchCount": 249616,
    "probability": Number("0.014878273010253906"),
    "expectedRolls": 68,
    "rarity": "Uncommon",
    "probabilityReward": 38890.23859383231,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "double_hex",
    "matchCount": 4627216,
    "probability": Number("0.2758035659790039"),
    "expectedRolls": 4,
    "rarity": "Common",
    "probabilityReward": 2434.422082149752,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_letter_rich",
    "matchCount": 6777216,
    "probability": Number("0.40395355224609375"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 1861.3174910711728,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_digit_rich",
    "matchCount": 10000000,
    "probability": Number("0.5960464477539062"),
    "expectedRolls": 2,
    "rarity": "Common",
    "probabilityReward": 1277.0880111784522,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_digit_sum_prime",
    "matchCount": 3969263,
    "probability": Number("0.23658651113510132"),
    "expectedRolls": 5,
    "rarity": "Common",
    "probabilityReward": 2664.7610660597397,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_digit_sum_square",
    "matchCount": 1285123,
    "probability": Number("0.07659929990768433"),
    "expectedRolls": 14,
    "rarity": "Common",
    "probabilityReward": 4358.383465399675,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_letter_majority",
    "matchCount": 2457216,
    "probability": Number("0.14646148681640625"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3384.9528928948457,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_bookends",
    "matchCount": 1048576,
    "probability": Number("0.0625"),
    "expectedRolls": 16,
    "rarity": "Common",
    "probabilityReward": 4663.882324023026,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "byte_bookends",
    "matchCount": 65536,
    "probability": Number("0.00390625"),
    "expectedRolls": 256,
    "rarity": "Rare",
    "probabilityReward": 233707.57615036698,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_ascending",
    "matchCount": 8008,
    "probability": Number("0.0004773139953613281"),
    "expectedRolls": 2096,
    "rarity": "Epic",
    "probabilityReward": 1945380.9203934574,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_descending",
    "matchCount": 8008,
    "probability": Number("0.0004773139953613281"),
    "expectedRolls": 2096,
    "rarity": "Epic",
    "probabilityReward": 1945380.9203934574,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_staircase",
    "matchCount": 11,
    "probability": Number("6.556510925292969e-7"),
    "expectedRolls": 1525202,
    "rarity": "Anomaly",
    "probabilityReward": 1525201454.5454547,
    "semanticBonus": 0.07500000000000001,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_reverse_staircase",
    "matchCount": 11,
    "probability": Number("6.556510925292969e-7"),
    "expectedRolls": 1525202,
    "rarity": "Anomaly",
    "probabilityReward": 1525201454.5454547,
    "semanticBonus": 0.07500000000000001,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_unique_four",
    "matchCount": 2839200,
    "probability": Number("0.16922950744628906"),
    "expectedRolls": 6,
    "rarity": "Common",
    "probabilityReward": 3167.952376840466,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_unique_six",
    "matchCount": 5765760,
    "probability": Number("0.34366607666015625"),
    "expectedRolls": 3,
    "rarity": "Common",
    "probabilityReward": 2104.0530589369596,
    "semanticBonus": 0,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "hex_contains_all_letters",
    "matchCount": 720,
    "probability": Number("0.00004291534423828125"),
    "expectedRolls": 23302,
    "rarity": "Legendary",
    "probabilityReward": 39901802.585519224,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "f1",
    "matchCount": 326145,
    "probability": Number("0.019439756870269775"),
    "expectedRolls": 52,
    "rarity": "Uncommon",
    "probabilityReward": 31413.368953530062,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "letter_run",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "digit_run",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_00",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_11",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_22",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_33",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_44",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_55",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_66",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_77",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_88",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_99",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_aa",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_bb",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_cc",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_dd",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_ee",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_ff",
    "matchCount": 310591,
    "probability": Number("0.01851266622543335"),
    "expectedRolls": 55,
    "rarity": "Uncommon",
    "probabilityReward": 32779.61124935036,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_000",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_111",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_222",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_333",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_444",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_555",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_666",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_777",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_888",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_999",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_aaa",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_bbb",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_ccc",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_ddd",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_eee",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "contains_fff",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.025,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "dead",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "beef",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "cafe",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "face",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "babe",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "fade",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "feed",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "boob",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "dood",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "food",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "leet",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "boob_2",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "abcd",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.07500000000000001,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "james_bond",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "blaze_it",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "nice",
    "matchCount": 326145,
    "probability": Number("0.019439756870269775"),
    "expectedRolls": 52,
    "rarity": "Uncommon",
    "probabilityReward": 31413.368953530062,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "demon",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "jackpot",
    "matchCount": 15616,
    "probability": Number("0.0009307861328125"),
    "expectedRolls": 1075,
    "rarity": "Epic",
    "probabilityReward": 640175.3991080989,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "emergency",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "not_found",
    "matchCount": 16351,
    "probability": Number("0.0009745955467224121"),
    "expectedRolls": 1027,
    "rarity": "Epic",
    "probabilityReward": 550290.087114891,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "server_error",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "perfect_score",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_black",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_white",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_red",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_green",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_blue",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_cyan",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_magenta",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_yellow",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "pure_gold",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "streamer_purple",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "audio_stream_green",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "classic_cola_red",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "almost_black",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "almost_white",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "perfect_grey",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.15,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "reference_123456",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "reference_abcdef",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "reference_fedcba",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "six_seven",
    "matchCount": 325378,
    "probability": Number("0.01939404010772705"),
    "expectedRolls": 52,
    "rarity": "Uncommon",
    "probabilityReward": 31479.19904274948,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "six_seven_echo",
    "matchCount": 766,
    "probability": Number("0.00004565715789794922"),
    "expectedRolls": 21903,
    "rarity": "Legendary",
    "probabilityReward": 37346656.65828862,
    "semanticBonus": 0.1,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "six_seven_full",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "a24",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "d23",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "ff7",
    "matchCount": 16383,
    "probability": Number("0.0009765028953552246"),
    "expectedRolls": 1025,
    "rarity": "Epic",
    "probabilityReward": 546469.080735078,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "a113",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "eight_oh_eight",
    "matchCount": 16351,
    "probability": Number("0.0009745955467224121"),
    "expectedRolls": 1027,
    "rarity": "Epic",
    "probabilityReward": 550290.087114891,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "era_1989",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "blaze_nice",
    "matchCount": 32,
    "probability": Number("0.0000019073486328125"),
    "expectedRolls": 524288,
    "rarity": "Anomaly",
    "probabilityReward": 524288000.00000006,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "nice_blaze",
    "matchCount": 32,
    "probability": Number("0.0000019073486328125"),
    "expectedRolls": 524288,
    "rarity": "Anomaly",
    "probabilityReward": 524288000.00000006,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "calculator_classic",
    "matchCount": 32,
    "probability": Number("0.0000019073486328125"),
    "expectedRolls": 524288,
    "rarity": "Anomaly",
    "probabilityReward": 524288000.00000006,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "calculator_hello",
    "matchCount": 32,
    "probability": Number("0.0000019073486328125"),
    "expectedRolls": 524288,
    "rarity": "Anomaly",
    "probabilityReward": 524288000.00000006,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "calculator_boobs",
    "matchCount": 32,
    "probability": Number("0.0000019073486328125"),
    "expectedRolls": 524288,
    "rarity": "Anomaly",
    "probabilityReward": 524288000.00000006,
    "semanticBonus": 0.075,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "double_blaze",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.1,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "double_not_found",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.07500000000000001,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "six_sixes",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.1,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "nice_stack",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.1,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "jackpot_stack",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.1,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "leet_stack",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.1,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "coffee_code",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "code_echo",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "decode",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "facade",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "deface",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "badass",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "foobar",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "boba",
    "matchCount": 768,
    "probability": Number("0.0000457763671875"),
    "expectedRolls": 21846,
    "rarity": "Legendary",
    "probabilityReward": 37239073.87152481,
    "semanticBonus": 0.05,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_meme_symmetry",
    "matchCount": 1022,
    "probability": Number("0.00006091594696044922"),
    "expectedRolls": 16417,
    "rarity": "Legendary",
    "probabilityReward": 25450554.7977322,
    "semanticBonus": 0.175,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_meme_palindrome",
    "matchCount": 2,
    "probability": Number("1.1920928955078125e-7"),
    "expectedRolls": 8388608,
    "rarity": "Anomaly",
    "probabilityReward": 8388608000.000001,
    "semanticBonus": 0.19999999999999998,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_sequence_channel_order",
    "matchCount": 8008,
    "probability": Number("0.0004773139953613281"),
    "expectedRolls": 2096,
    "rarity": "Epic",
    "probabilityReward": 1945380.9203934574,
    "semanticBonus": 0.125,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_reverse_sequence",
    "matchCount": 8008,
    "probability": Number("0.0004773139953613281"),
    "expectedRolls": 2096,
    "rarity": "Epic",
    "probabilityReward": 1945380.9203934574,
    "semanticBonus": 0.125,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_prime_palindrome",
    "matchCount": 3,
    "probability": Number("1.7881393432617188e-7"),
    "expectedRolls": 5592406,
    "rarity": "Anomaly",
    "probabilityReward": 5592405333.333334,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_square_greyscale",
    "matchCount": 10,
    "probability": Number("5.960464477539062e-7"),
    "expectedRolls": 1677722,
    "rarity": "Anomaly",
    "probabilityReward": 1677721600.0000002,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_fibonacci_sequence",
    "matchCount": 17444,
    "probability": Number("0.001039743423461914"),
    "expectedRolls": 962,
    "rarity": "Rare",
    "probabilityReward": 492382.234996554,
    "semanticBonus": 0.175,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_high_contrast_neon",
    "matchCount": 1566180,
    "probability": Number("0.09335160255432129"),
    "expectedRolls": 11,
    "rarity": "Common",
    "probabilityReward": 4061.349190267277,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_pastel_luminous",
    "matchCount": 231807,
    "probability": Number("0.013816773891448975"),
    "expectedRolls": 73,
    "rarity": "Uncommon",
    "probabilityReward": 40959.758219616815,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_warm_red",
    "matchCount": 5559680,
    "probability": Number("0.33138275146484375"),
    "expectedRolls": 4,
    "rarity": "Common",
    "probabilityReward": 2158.713318728861,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_cool_blue",
    "matchCount": 5559680,
    "probability": Number("0.33138275146484375"),
    "expectedRolls": 4,
    "rarity": "Common",
    "probabilityReward": 2158.713318728861,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_complement_vivid",
    "matchCount": 24792,
    "probability": Number("0.0014777183532714844"),
    "expectedRolls": 677,
    "rarity": "Rare",
    "probabilityReward": 423682.9193086122,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_web_safe_greyscale",
    "matchCount": 6,
    "probability": Number("3.5762786865234375e-7"),
    "expectedRolls": 2796203,
    "rarity": "Anomaly",
    "probabilityReward": 2796202666.666667,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_repeated_palindrome",
    "matchCount": 16,
    "probability": Number("9.5367431640625e-7"),
    "expectedRolls": 1048576,
    "rarity": "Anomaly",
    "probabilityReward": 1048576000.0000001,
    "semanticBonus": 0.125,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_sixfold_greyscale",
    "matchCount": 16,
    "probability": Number("9.5367431640625e-7"),
    "expectedRolls": 1048576,
    "rarity": "Anomaly",
    "probabilityReward": 1048576000.0000001,
    "semanticBonus": 0.175,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_exact_sequence",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_exact_reverse",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_anomaly_meme",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.19999999999999998,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_six_seven_palindrome",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.19999999999999998,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_hex_letters",
    "matchCount": 2457216,
    "probability": Number("0.14646148681640625"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3384.9528928948457,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_digit_structure",
    "matchCount": 2499197,
    "probability": Number("0.14896374940872192"),
    "expectedRolls": 7,
    "rarity": "Common",
    "probabilityReward": 3359.5116298307416,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_power_progression",
    "matchCount": 7292,
    "probability": Number("0.00043463706970214844"),
    "expectedRolls": 2301,
    "rarity": "Epic",
    "probabilityReward": 2128429.1999135083,
    "semanticBonus": 0.125,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_edge_contrast",
    "matchCount": 127080,
    "probability": Number("0.007574558258056641"),
    "expectedRolls": 133,
    "rarity": "Rare",
    "probabilityReward": 104289.0897585077,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_saturation_tone",
    "matchCount": 29988,
    "probability": Number("0.001787424087524414"),
    "expectedRolls": 560,
    "rarity": "Rare",
    "probabilityReward": 386496.8294202694,
    "semanticBonus": 0.15000000000000002,
    "variationMinBps": -700,
    "variationMaxBps": 700
  },
  {
    "id": "combo_culture_exact",
    "matchCount": 1,
    "probability": Number("5.960464477539063e-8"),
    "expectedRolls": 16777216,
    "rarity": "Anomaly",
    "probabilityReward": 16777216000.000002,
    "semanticBonus": 0.2,
    "variationMinBps": -700,
    "variationMaxBps": 700
  }
]);
export const GENERATED_V6_MANIFEST_BY_ID = Object.freeze(Object.fromEntries(GENERATED_V6_PROBABILITY_MANIFEST.map(entry => [entry.id, entry])));

export function evaluateGeneratedV6Conditions(red, green, blue) {
  return evaluateCatalogConditions(red, green, blue, GENERATED_V6_CATALOG);
}
