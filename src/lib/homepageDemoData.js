/**
 * Homepage-only demo content. Keep this shape close to a public profile
 * projection so curated profiles can replace the fixtures without changing
 * the presentation layer.
 */
export const HOMEPAGE_DEMO_PROFILES = Object.freeze([
  {
    id: 'minimal',
    label: 'Minimal and clean',
    username: 'mira',
    bio: 'Quiet design, good coffee, and a few useful links.',
    background: 'linear-gradient(145deg, #13151b 0%, #252937 55%, #0d0e12 100%)',
    avatar: 'linear-gradient(145deg, #f7f4ec 0%, #b9c4d8 45%, #626d82 100%)',
    accent: '#d7e2f2',
    color: '#B8C7E2',
    rank: '#28',
    links: ['portfolio', 'notes'],
    effect: 'Soft grain'
  },
  {
    id: 'atmospheric',
    label: 'Dark and atmospheric',
    username: 'nocturne',
    bio: 'Night walks, field recordings, and things in progress.',
    background: 'radial-gradient(circle at 74% 16%, rgba(61, 76, 155, .52), transparent 34%), linear-gradient(145deg, #090b17, #17162b 58%, #08090e)',
    avatar: 'radial-gradient(circle at 30% 25%, #a5b8ff, #5361bd 45%, #171936 78%)',
    accent: '#8f9dff',
    color: '#5967D5',
    rank: '#12',
    links: ['soundcloud', 'archive'],
    effect: 'Indigo halo'
  },
  {
    id: 'expressive',
    label: 'Bright and expressive',
    username: 'solstice',
    bio: 'Illustration, tiny experiments, and loud colors.',
    background: 'linear-gradient(125deg, #21132d 0%, #6d275d 46%, #dd7c59 100%)',
    avatar: 'conic-gradient(from 210deg, #ffe07a, #ff8c8c, #b88cff, #62d9da, #ffe07a)',
    accent: '#ffd36e',
    color: '#F28A6C',
    rank: '#7',
    links: ['shop', 'projects'],
    effect: 'Prism edge'
  }
]);
