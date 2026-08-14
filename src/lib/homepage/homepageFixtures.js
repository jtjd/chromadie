const SUPPORTED_EFFECTS = Object.freeze({
  compact: Object.freeze({
    nameFont: 'name_font_editorial_serif',
    nameMaterial: 'name_material_glass_emboss',
    nameMotion: 'name_motion_haunt_glow',
    profileBorder: 'border_signal',
    avatar: 'signal-ring',
    cursorTrail: 'cursor_trail_signal_trace',
    atmosphere: 'profile_atmosphere_rain_window'
  }),
  sleek: Object.freeze({
    nameFont: 'name_font_wide_geometric',
    nameMaterial: 'name_material_neon_tube',
    nameMotion: 'name_motion_haunt_gradient',
    profileBorder: 'border_neon',
    avatar: 'prism-orbit',
    cursorTrail: 'cursor_trail_pixel_wake',
    atmosphere: 'profile_atmosphere_dust_light'
  }),
  minimal: Object.freeze({
    nameFont: 'name_font_mono_compact',
    nameMaterial: 'name_material_carbon_cut',
    nameMotion: 'name_motion_haunt_fuzzy',
    profileBorder: 'border_void',
    avatar: 'crystal-aperture',
    cursorTrail: 'cursor_trail_glass_shards',
    atmosphere: 'profile_atmosphere_droplets_glass'
  }),
  portfolio: Object.freeze({
    nameFont: 'name_font_editorial_serif',
    nameMaterial: 'name_material_glass_emboss',
    nameMotion: 'name_motion_haunt_rainbow',
    profileBorder: 'border_prism',
    avatar: 'chroma-arc',
    cursorTrail: 'cursor_trail_chroma_ribbon',
    atmosphere: 'profile_atmosphere_silk_folds'
  })
});

function createScores(scores) {
  return scores.map((score, index) => Object.freeze({
    ...score,
    roll_date: score.roll_date || `2026-08-${String(14 - index).padStart(2, '0')}`
  }));
}

function createTimeline(username, scores) {
  return scores.map((score, index) => Object.freeze({
    id: `homepage-${username}-roll-${index + 1}`,
    eventType: 'roll',
    occurredAt: `${score.roll_date}T12:00:00.000Z`,
    payload: {
      hex: score.hex_code,
      score: String(score.score),
      rarity: score.rarity,
      identity: score.identity,
      conditionIds: score.condition_ids
    }
  }));
}

function createFixture({
  id,
  username,
  displayName,
  bio,
  accent,
  background,
  avatar,
  effects,
  links,
  scores,
  showcasePosition
}) {
  const normalizedScores = createScores(scores);

  return Object.freeze({
    id,
    username,
    displayName,
    bio,
    accent,
    media: Object.freeze({ background, avatar }),
    links: Object.freeze(links.map(link => Object.freeze({ ...link }))),
    effects: SUPPORTED_EFFECTS[effects],
    scores: Object.freeze(normalizedScores),
    timelineEvents: Object.freeze(createTimeline(username, normalizedScores)),
    showcasePosition
  });
}

export const HOMEPAGE_FIXTURES = Object.freeze([
  createFixture({
    id: 'compact-tjz',
    username: 'Tjz',
    displayName: 'Tjz',
    bio: 'Software developer · Tokyo',
    accent: '#00FFB3',
    background: '/homepage/fixtures/compact-background.png',
    avatar: '/homepage/fixtures/compact-avatar.png',
    effects: 'compact',
    showcasePosition: 'bottom',
    links: [
      { type: 'website', label: 'Website', url: 'https://chm.lol/', order: 0 },
      { type: 'github', label: 'GitHub', url: 'https://github.com/', order: 1 },
      { type: 'discord', label: 'Discord', url: 'https://discord.com/', order: 2 },
      { type: 'other', label: 'Archive', url: 'https://example.com/', order: 3 }
    ],
    scores: [
      { hex_code: '#00FFB3', score: 326203, rarity: 'Epic', identity: 'Balanced Electric Emerald', condition_ids: ['sum_even', 'hue_family_emerald', 'temperature_cool', 'mixed_channel_rhythm'] },
      { hex_code: '#4E7CFF', score: 307989, rarity: 'Epic', identity: 'Bright Electric Azure', condition_ids: ['sum_odd', 'hue_family_azure', 'temperature_cool', 'mixed_channel_rhythm'] },
      { hex_code: '#FF5C8A', score: 60083, rarity: 'Rare', identity: 'Bright Electric Rose', condition_ids: ['sum_odd', 'hue_family_rose', 'temperature_warm', 'mixed_channel_rhythm'] }
    ]
  }),
  createFixture({
    id: 'sleek-arcade',
    username: 'Arcade',
    displayName: 'Arcade',
    bio: 'FPS · design · late nights',
    accent: '#7AA2F7',
    background: '/homepage/fixtures/sleek-background.png',
    avatar: '/homepage/fixtures/sleek-avatar.png',
    effects: 'sleek',
    showcasePosition: 'bottom',
    links: [
      { type: 'website', label: 'Website', url: 'https://example.com/studio', order: 0 },
      { type: 'github', label: 'GitHub', url: 'https://github.com/', order: 1 },
      { type: 'twitter', label: 'X', url: 'https://x.com/', order: 2 },
      { type: 'discord', label: 'Discord', url: 'https://discord.com/', order: 3 }
    ],
    scores: [
      { hex_code: '#7AA2F7', score: 52058, rarity: 'Rare', identity: 'Bright Vivid Azure', condition_ids: ['sum_odd', 'hue_family_azure', 'temperature_cool', 'mixed_channel_rhythm'] },
      { hex_code: '#BBA4FF', score: 57079, rarity: 'Rare', identity: 'Bright Electric Violet', condition_ids: ['sum_even', 'hue_family_violet', 'temperature_cool', 'mixed_channel_rhythm'] },
      { hex_code: '#34C759', score: 21717, rarity: 'Trash', identity: 'Balanced Rich Emerald', condition_ids: ['sum_even', 'hue_family_emerald', 'temperature_cool', 'mixed_channel_rhythm'] }
    ]
  }),
  createFixture({
    id: 'minimal-mono',
    username: 'mono',
    displayName: 'mono',
    bio: 'Designer · Berlin',
    accent: '#F5F5F7',
    background: '/homepage/fixtures/minimal-background.png',
    avatar: '/homepage/fixtures/minimal-avatar.png',
    effects: 'minimal',
    showcasePosition: 'left',
    links: [
      { type: 'website', label: 'Work', url: 'https://example.com/work', order: 0 },
      { type: 'other', label: 'Archive', url: 'https://example.com/archive', order: 1 },
      { type: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/', order: 2 },
      { type: 'other', label: 'Notes', url: 'https://example.com/notes', order: 3 }
    ],
    scores: [
      { hex_code: '#F5F5F7', score: 102607, rarity: 'Epic', identity: 'Luminous Soft Blue', condition_ids: ['sum_odd', 'hue_family_blue', 'temperature_cool', 'odd_channel_rhythm'] },
      { hex_code: '#B8C0D8', score: 44097, rarity: 'Uncommon', identity: 'Bright Muted Blue', condition_ids: ['sum_even', 'hue_family_blue', 'temperature_cool', 'even_channel_harmony'] },
      { hex_code: '#8794A6', score: 27641, rarity: 'Common', identity: 'Balanced Soft Azure', condition_ids: ['sum_odd', 'hue_family_azure', 'temperature_cool', 'mixed_channel_rhythm'] }
    ]
  }),
  createFixture({
    id: 'portfolio-void',
    username: 'void',
    displayName: 'void',
    bio: 'Visuals · music · archive',
    accent: '#BB9AF7',
    background: '/homepage/fixtures/portfolio-background.png',
    avatar: '/homepage/fixtures/portfolio-avatar.png',
    effects: 'portfolio',
    showcasePosition: 'center',
    links: [
      { type: 'website', label: 'Gallery', url: 'https://example.com/gallery', order: 0 },
      { type: 'spotify', label: 'Music', url: 'https://open.spotify.com/', order: 1 },
      { type: 'other', label: 'Archive', url: 'https://example.com/archive', order: 2 },
      { type: 'other', label: 'Notes', url: 'https://example.com/notes', order: 3 }
    ],
    scores: [
      { hex_code: '#BB9AF7', score: 42043, rarity: 'Uncommon', identity: 'Bright Vivid Violet', condition_ids: ['sum_even', 'hue_family_violet', 'temperature_cool', 'mixed_channel_rhythm'] },
      { hex_code: '#F38BA8', score: 32965, rarity: 'Common', identity: 'Bright Vivid Rose', condition_ids: ['sum_even', 'hue_family_rose', 'temperature_warm', 'mixed_channel_rhythm'] },
      { hex_code: '#FFD166', score: 60081, rarity: 'Rare', identity: 'Bright Electric Amber', condition_ids: ['sum_even', 'hue_family_amber', 'temperature_warm', 'mixed_channel_rhythm'] }
    ]
  })
]);

export const HOMEPAGE_SHOWCASE_FIXTURE_IDS = Object.freeze([
  'minimal-mono',
  'sleek-arcade',
  'portfolio-void'
]);

export function getHomepageFixture(value) {
  if (typeof value === 'number') return HOMEPAGE_FIXTURES[value] || null;
  return HOMEPAGE_FIXTURES.find(fixture => fixture.id === value) || null;
}

export function getHomepageShowcaseFixtures() {
  return HOMEPAGE_SHOWCASE_FIXTURE_IDS.map(id => getHomepageFixture(id));
}
