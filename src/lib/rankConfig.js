// Lifetime EP thresholds for roughly 14, 45, 120, 250, and 500 daily rolls.
// The exhaustive v6 fixture measures the normalized roll EP distribution.
export const RANKS = Object.freeze([
  Object.freeze({ name: 'Bronze', min: 0, color: '#cd7f32' }),
  Object.freeze({ name: 'Silver', min: 1_300_000, color: '#c0c0c0' }),
  Object.freeze({ name: 'Gold', min: 4_200_000, color: '#ffd700' }),
  Object.freeze({ name: 'Platinum', min: 11_200_000, color: '#e5e4e2' }),
  Object.freeze({ name: 'Diamond', min: 21_700_000, color: '#b9f2ff' }),
  Object.freeze({ name: 'Chroma', min: 42_200_000, color: 'var(--spectrum)' })
]);
