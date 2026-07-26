function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

/**
 * Fixture-only data for the Phase 1 profile canvas. It intentionally mirrors
 * public profile concepts without depending on Supabase or private account data.
 */
export const PROFILE_CANVAS_FIXTURE = deepFreeze({
  version: 1,
  mode: 'fixture',
  signatureColor: '#7B5CFF',
  identity: {
    name: 'Mira Vale',
    username: 'miravale',
    pronouns: 'she / they',
    tagline: 'Collecting quiet colors and loud little victories.',
    location: 'Brooklyn, NY',
    joined: 'Playing since 2024',
    avatarSrc: '/logo-mark.svg',
    avatarAlt: 'ChromaDie identity mark'
  },
  stats: [
    { value: '218', label: 'daily rolls' },
    { value: '42', label: 'achievements' },
    { value: 'Violet', label: 'current mood' }
  ],
  roll: {
    dateLabel: 'Today · July 25, 2026',
    hex: '#7B5CFF',
    score: '1,284,620',
    rarity: 'Mythic',
    identity: 'Violet signal',
    traits: ['Electric', 'Violet', 'Balanced', 'High contrast'],
    conditions: ['Prime energy', 'Mirror channels', 'Rare hue family']
  },
  links: [
    { label: 'Listen on Bandcamp', href: 'https://bandcamp.com/' },
    { label: 'Read the field notes', href: 'https://example.com/' },
    { label: 'Say hello', href: 'mailto:hello@example.com' }
  ],
  story: {
    eyebrow: 'A profile in progress',
    title: 'The best colors are the ones you remember.',
    copy: 'Mira keeps the rolls that feel like weather: a blue morning, a red warning, a violet hour that lasted longer than expected.'
  },
  achievements: [
    { icon: '✦', title: 'Violet Hour', copy: 'A Mythic roll with a color worth keeping.', meta: 'Unlocked today' },
    { icon: '↗', title: 'Long Game', copy: '218 daily rolls and counting.', meta: '218 / 365 rolls' },
    { icon: '◈', title: 'Quiet Signal', copy: 'A signature palette built from recent history.', meta: 'Pinned' }
  ],
  timeline: [
    { date: 'Today', title: 'Found a violet signal', copy: 'A Mythic roll joined the profile.' },
    { date: '12 days ago', title: 'Pinned Quiet Signal', copy: 'A small color story became part of the identity.' },
    { date: '3 weeks ago', title: 'Reached Violet rank', copy: 'The profile crossed a new lifetime EP threshold.' }
  ],
  collection: [
    { label: 'Violet', color: '#7B5CFF' },
    { label: 'Afterglow', color: '#F08AFF' },
    { label: 'Tidepool', color: '#2ED3C9' },
    { label: 'Night Walk', color: '#263C72' },
    { label: 'First Light', color: '#F4D06F' }
  ]
});
