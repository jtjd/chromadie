const RARITY_PRESENTATION_ENTRIES = {
  Trash: { color: '#aaa9b8', icon: '◇' },
  Common: { color: '#dedce8', icon: '○' },
  Uncommon: { color: '#6ee2a4', icon: '✦' },
  Rare: { color: '#84aaff', icon: '✧' },
  Epic: { color: '#d8a6ff', icon: '✹' },
  Legendary: { color: '#ff9a66', icon: '⚠' },
  Anomaly: { color: '#ff6bd6', icon: '✺' },
  Mythic: { color: '#ff6bd6', icon: '✺' }
};

export const RARITY_PRESENTATION = Object.freeze(
  Object.fromEntries(
    Object.entries(RARITY_PRESENTATION_ENTRIES).map(([name, presentation]) => [
      name,
      Object.freeze({ name, ...presentation })
    ])
  )
);

export function getRarityPresentation(rarity) {
  return RARITY_PRESENTATION[rarity] || RARITY_PRESENTATION.Common;
}
