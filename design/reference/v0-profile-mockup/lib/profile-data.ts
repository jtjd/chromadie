export const profile = {
  handle: 'gripgod',
  name: 'Alex',
  url: 'chm.lol/gripgod',
  bio: 'trying to collect every impossible color.',
  avatar: '/avatar-portrait.png',
  isFounder: true,
  signatureColor: '#8EFE1C',
  location: 'somewhere blue',
  views: 48213,
  socials: [
    { label: 'Discord', href: '#', key: 'discord' },
    { label: 'GitHub', href: '#', key: 'github' },
    { label: 'YouTube', href: '#', key: 'youtube' },
    { label: 'X', href: '#', key: 'x' },
  ],
  achievements: ['First Steps', 'Uncommonly Rare'],
}

// Colors the orb cycles through while rolling before it settles on today's result.
export const rollCandidates = [
  '#8EFE1C',
  '#B14A5D',
  '#4AB1A0',
  '#B1874A',
  '#6A4AB1',
  '#4A6EB1',
  '#B14A9E',
  '#5D8BB1',
]

export const todayColor = {
  name: 'Balanced Muted Azure',
  hex: '#5D8BB1',
  rarity: 'Uncommon',
  points: 40485,
  roll: 'First roll of the day',
  cooldown: 'Next roll in 13h 42m',
  image: '/color-orb.png',
  details: [
    { label: 'Rarity', value: 'Uncommon' },
    { label: 'Points', value: '40,485' },
    { label: 'Roll', value: 'First of the day' },
    { label: 'Condition', value: 'Balanced · Muted' },
    { label: 'Reward', value: '+1 collectible slot' },
    { label: 'Next roll', value: 'in 13h 42m' },
  ],
}

export const track = {
  title: 'Stardust',
  artist: 'VXLLEN',
  artwork: '/album-stardust.png',
  progress: 0.38,
  duration: '3:24',
  current: '1:17',
}

export const collection = {
  title: 'Impossible Blues',
  collected: 13,
  total: 20,
  swatches: [
    '#5D8BB1',
    '#3E6E93',
    '#7FA6C6',
    '#2B4C6F',
    '#93B7D4',
    '#4A7BA6',
    '#6690B4',
    '#1F3A57',
    '#A9C6DD',
    '#557E9E',
  ],
}
