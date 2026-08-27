// Runtime rank thresholds generated from the checked-in v6 balance mean.
// The exhaustive fixture and scaling implementation stay in balanceConfig.js;
// ordinary UI routes consume only this small, locked projection.
export const RANKS = Object.freeze([
  Object.freeze({ name: 'Bronze', min: 0, color: '#cd7f32' }),
  Object.freeze({ name: 'Silver', min: 4_790_000, color: '#c0c0c0' }),
  Object.freeze({ name: 'Gold', min: 23_950_000, color: '#ffd700' }),
  Object.freeze({ name: 'Platinum', min: 71_851_000, color: '#e5e4e2' }),
  Object.freeze({ name: 'Diamond', min: 143_703_000, color: '#b9f2ff' }),
  Object.freeze({ name: 'Chroma', min: 287_405_000, color: 'var(--spectrum)' })
]);
