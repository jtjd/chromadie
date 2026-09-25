export const HOW_TO_PLAY_CANONICAL_PATH = '/how-to-play';
export const HOW_TO_PLAY_META_DESCRIPTION = 'Learn how to play ChromaDie: roll a color each day, grow a lasting profile, and discover other players.';
export const HOW_TO_PLAY_NO_SCRIPT_SUMMARY = 'Roll a color each day from the homepage. Signed-in rolls save to your profile, add score to the leaderboard, and add account EP. Guest rolls stay on this device, earn no account EP, do not appear on the leaderboard, and are discarded when signup begins. When available, Today’s top roll on the homepage links to a public profile; you can also browse the leaderboard.';

// Static teaching example. Keep this in sync with the canonical scoring model
// in tests; the guide must never calculate or grant a live roll.
export const HOW_TO_PLAY_EXAMPLE_ROLL = Object.freeze({
  channels: Object.freeze({ red: 183, green: 253, blue: 77 }),
  displayColor: '#B7FD4D',
  identity: 'Balanced Electric Lime',
  rarity: 'Uncommon',
  totalScore: 43194,
  traits: Object.freeze([
    Object.freeze({ id: 'hue_lime', label: 'Lime Hue', group: 'hue' }),
    Object.freeze({ id: 'saturation_electric', label: 'Electric Saturation', group: 'saturation' }),
    Object.freeze({ id: 'lightness_balanced', label: 'Balanced Lightness', group: 'lightness' }),
    Object.freeze({ id: 'temperature_warm', label: 'Warm Temperature', group: 'temperature' }),
    Object.freeze({ id: 'structure_layered', label: 'Layered Structure', group: 'structure' })
  ]),
  baseScore: 0,
  contributors: Object.freeze([
    Object.freeze({ id: 'hue_family_lime', name: 'Lime Hue', awardedPoints: 4072, conditionRarity: 'Common' }),
    Object.freeze({ id: 'saturation_electric', name: 'Electric Saturation', awardedPoints: 3858, conditionRarity: 'Common' }),
    Object.freeze({ id: 'combo_hex_letters', name: 'Lettered Spectrum', awardedPoints: 3819, conditionRarity: 'Common' }),
    Object.freeze({ id: 'all_channels_odd', name: 'All Odd Channels', awardedPoints: 3794, conditionRarity: 'Common' }),
    Object.freeze({ id: 'sum_divisible_9', name: 'Triple Triple', awardedPoints: 3587, conditionRarity: 'Common' }),
    Object.freeze({ id: 'hex_letter_majority', name: 'Letter Majority', awardedPoints: 3385, conditionRarity: 'Common' }),
    Object.freeze({ id: 'channel_edge', name: 'Edge Channel', awardedPoints: 2824, conditionRarity: 'Common' }),
    Object.freeze({ id: 'sum_divisible_3', name: 'Rule of Three', awardedPoints: 2209, conditionRarity: 'Common' }),
    Object.freeze({ id: 'green_dominant', name: 'Green Dominant', awardedPoints: 2125, conditionRarity: 'Common' }),
    Object.freeze({ id: 'saturation_high_chroma', name: 'High Chroma', awardedPoints: 1973, conditionRarity: 'Common' }),
    Object.freeze({ id: 'hex_letter_rich', name: 'Letter-Rich Hex', awardedPoints: 1878, conditionRarity: 'Common' }),
    Object.freeze({ id: 'temperature_warm', name: 'Warm Temperature', awardedPoints: 1602, conditionRarity: 'Common' }),
    Object.freeze({ id: 'sum_odd', name: 'Odd Pulse', awardedPoints: 1601, conditionRarity: 'Common' }),
    Object.freeze({ id: 'red_green_step', name: 'Red-Green Step', awardedPoints: 1578, conditionRarity: 'Common' }),
    Object.freeze({ id: 'blue_red_step', name: 'Blue-Red Step', awardedPoints: 1546, conditionRarity: 'Common' }),
    Object.freeze({ id: 'lightness_balanced', name: 'Balanced Tone', awardedPoints: 1164, conditionRarity: 'Common' }),
    Object.freeze({ id: 'layered_contrast', name: 'Layered Contrast', awardedPoints: 1125, conditionRarity: 'Common' }),
    Object.freeze({ id: 'all_channels_distinct', name: 'Three-Way Split', awardedPoints: 554, conditionRarity: 'Common' }),
    Object.freeze({ id: 'spectrum_presence', name: 'Spectrum Presence', awardedPoints: 500, conditionRarity: 'Common' })
  ])
});
