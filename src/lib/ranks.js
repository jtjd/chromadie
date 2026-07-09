const RANKS = [
  { name: 'Bronze', min: 0, color: '#cd7f32' },
  { name: 'Silver', min: 1000000, color: '#c0c0c0' },
  { name: 'Gold', min: 10000000, color: '#ffd700' },
  { name: 'Platinum', min: 50000000, color: '#e5e4e2' },
  { name: 'Diamond', min: 100000000, color: '#b9f2ff' },
  { name: 'Chroma', min: 250000000, color: 'var(--spectrum)' }
];

export function getRank(ep = 0) {
  let currentRank = RANKS[0];
  for (let i = 0; i < RANKS.length; i++) {
    if (ep >= RANKS[i].min) {
      currentRank = RANKS[i];
    }
  }
  return currentRank;
}
