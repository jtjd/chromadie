const RARITY_PRESENTATION_ENTRIES = {
  Trash: { color: '#aaa9b8', icon: '◇' },
  Common: { color: '#dedce8', icon: '○' },
  Uncommon: { color: '#6ee2a4', icon: '✦' },
  Rare: { color: '#84aaff', icon: '✧' },
  Epic: { color: '#d8a6ff', icon: '✹' },
  Anomaly: { color: '#ff9a66', icon: '⚠' },
  Mythic: { color: '#f4cd76', icon: '✺' }
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
