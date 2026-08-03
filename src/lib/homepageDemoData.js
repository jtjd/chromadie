/**
 * Homepage-only profile specimens. These are deliberately kept separate from
 * account and discovery data so the homepage never presents a fictional
 * profile as a real player.
 */
export const HOMEPAGE_DEMO_PROFILES = Object.freeze([
  Object.freeze({
    id: 'minimal',
    label: 'Minimal',
    username: 'mira',
    displayName: 'Mira',
    bio: 'Product designer making quiet tools for busy days.',
    accent: '#c8d5c0',
    backgroundClass: 'home-demo-background--minimal',
    avatarClass: 'home-demo-avatar--minimal',
    nameRendererLoadout: null,
    profileBorder: '',
    links: [
      { type: 'link', label: 'mira.design', url: 'https://example.com/mira-design', order: 0 },
      { type: 'github', label: 'GitHub', url: 'https://github.com', order: 1 }
    ],
    color: '#c8d5c0',
    colorName: 'Pale fern',
    rarity: 'Common',
    rank: '#28',
  }),
  Object.freeze({
    id: 'atmospheric',
    label: 'Atmospheric',
    username: 'nocturne',
    displayName: 'Nocturne',
    bio: 'Field recordings, night walks, and things in progress.',
    accent: '#8f9dff',
    backgroundClass: 'home-demo-background--atmospheric',
    avatarClass: 'home-demo-avatar--atmospheric',
    nameRendererLoadout: { fontKey: 'editorial-serif', materialKey: 'liquid-mercury', motionKey: 'ghost-offset' },
    profileBorder: 'void',
    links: [
      { type: 'link', label: 'soundcloud', url: 'https://example.com/nocturne-audio', order: 0 },
      { type: 'link', label: 'field notes', url: 'https://example.com/nocturne-notes', order: 1 }
    ],
    color: '#5967d5',
    colorName: 'Deep indigo',
    rarity: 'Uncommon',
    rank: '#12',
  }),
  Object.freeze({
    id: 'expressive',
    label: 'Expressive',
    username: 'solstice',
    displayName: 'Solstice',
    bio: 'Illustration, tiny experiments, and loud colors.',
    accent: '#7CE7FF',
    backgroundClass: 'home-demo-background--expressive',
    avatarClass: 'home-demo-avatar--expressive',
    nameRendererLoadout: { fontKey: 'wide-geometric', materialKey: 'chroma-glass', motionKey: 'chromatic-ripple' },
    profileBorder: 'prism',
    links: [
      { type: 'link', label: 'solstice.art', url: 'https://example.com/solstice-art', order: 0 },
      { type: 'youtube', label: 'YouTube', url: 'https://youtube.com', order: 1 }
    ],
    color: '#7C9CFF',
    colorName: 'Electric periwinkle',
    rarity: 'Rare',
    rank: '#7',
  })
]);
