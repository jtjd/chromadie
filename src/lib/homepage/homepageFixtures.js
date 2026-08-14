import { createDefaultProfileConfig, normalizeProfileConfig } from '../profileConfig.js';

const BASE_APPEARANCE = Object.freeze({
  colors: {
    text: '#F5F5F7',
    secondaryText: '#95959F',
    username: '#F5F5F7',
    description: '#95959F',
    background: '#050506',
    surface: '#0D0D10',
    accent: '#00FFB3',
    highlight: '#F5F5F7'
  },
  surface: { opacity: 60, blur: 32 },
  background: { blur: 0, imageOpacity: 100, overlayColor: '#050506', overlayOpacity: 26 },
  gradient: { enabled: false, primary: '#050506', secondary: '#050506', angle: 135 },
  border: { enabled: true, color: '#FFFFFF', width: 1, radius: 22, opacity: 12 }
});

const MODULES = Object.freeze([
  { id: 'roll', visible: true, order: 0, size: 'wide' },
  { id: 'stats', visible: false, order: 1, size: 'wide' },
  { id: 'signature', visible: false, order: 2, size: 'medium' },
  { id: 'links', visible: true, order: 3, size: 'medium' },
  { id: 'recent', visible: false, order: 4, size: 'medium' },
  { id: 'achievements', visible: false, order: 5, size: 'medium' },
  { id: 'boundary', visible: false, order: 6, size: 'medium' },
  { id: 'explore', visible: false, order: 7, size: 'wide' }
]);

function createConfig({ accent, background, avatar, layoutVariant, links }) {
  const base = createDefaultProfileConfig(accent);
  return normalizeProfileConfig({
    ...base,
    appearance: {
      ...BASE_APPEARANCE,
      colors: { ...BASE_APPEARANCE.colors, accent },
      background: { ...BASE_APPEARANCE.background, overlayColor: '#050506' },
      border: { ...BASE_APPEARANCE.border }
    },
    signatureColor: accent,
    layoutVariant,
    templateKey: layoutVariant,
    storyVisible: false,
    modules: MODULES.map(module => ({ ...module })),
    links,
    media_references: {
      background: { preview_url: background },
      avatar: { preview_url: avatar }
    }
  }, accent);
}

function createScores(scores) {
  return scores.map((score, index) => ({
    ...score,
    roll_date: score.roll_date || `2026-08-${String(14 - index).padStart(2, '0')}`
  }));
}

function createTimeline(username, scores) {
  return scores.map((score, index) => ({
    id: `homepage-${username}-roll-${index + 1}`,
    eventType: 'roll',
    occurredAt: `${score.roll_date}T12:00:00.000Z`,
    payload: {
      hex: score.hex_code,
      score: String(score.score),
      rarity: score.rarity,
      identity: score.identity
    }
  }));
}

function createFixture({
  id,
  username,
  displayName,
  bio,
  accent,
  layoutVariant,
  background,
  avatar,
  cosmetics,
  links,
  scores
}) {
  const normalizedScores = createScores(scores);
  const best = normalizedScores.reduce((current, candidate) => Number(candidate.score) > Number(current.score) ? candidate : current, normalizedScores[0]);
  const profile = {
    id: `homepage-fixture-${id}`,
    username,
    display_name: displayName,
    bio,
    mood_color: accent,
    current_streak: 7,
    longest_streak: 19,
    lifetime_ep: normalizedScores.reduce((total, score) => total + Number(score.score || 0), 0),
    total_rolls: normalizedScores.length,
    best_roll_score: best.score,
    best_roll_hex: best.hex_code,
    best_roll_rarity: best.rarity,
    created_at: '2025-01-15T12:00:00.000Z',
    is_staff: false,
    equipped_cosmetics: cosmetics,
    equipped_badges: []
  };

  return Object.freeze({
    id,
    username,
    displayName,
    layoutLabel: layoutVariant[0].toUpperCase() + layoutVariant.slice(1),
    accent,
    background,
    avatar,
    profile,
    profileConfig: createConfig({ accent, background, avatar, layoutVariant, links }),
    scores: Object.freeze(normalizedScores),
    timelineEvents: Object.freeze(createTimeline(username, normalizedScores)),
    collectionItems: Object.freeze([]),
    allAchievements: Object.freeze([])
  });
}

export const HOMEPAGE_FIXTURES = Object.freeze([
  createFixture({
    id: 'compact-tjz',
    username: 'Tjz',
    displayName: 'Tjz',
    bio: 'Software developer · Tokyo',
    accent: '#00FFB3',
    layoutVariant: 'compact',
    background: '/homepage/fixtures/compact-background.png',
    avatar: '/homepage/fixtures/compact-avatar.png',
    cosmetics: {
      name_font: 'name_font_soft_grotesk',
      name_material: 'name_material_glass_emboss',
      name_motion: 'name_motion_haunt_glow',
      profile_border: 'border_signal',
      avatar_effect: 'avatar_effect_signal_ring',
      cursor_trail: 'cursor_trail_signal_trace',
      profile_atmosphere: 'profile_atmosphere_rain_window'
    },
    links: [
      { type: 'website', label: 'Website', url: 'https://chm.lol/', order: 0 },
      { type: 'github', label: 'GitHub', url: 'https://github.com/', order: 1 },
      { type: 'discord', label: 'Discord', url: 'https://discord.com/', order: 2 },
      { type: 'other', label: 'Archive', url: 'https://example.com/', order: 3 }
    ],
    scores: [
      { hex_code: '#00FFB3', score: 1250, rarity: 'Epic', identity: 'Signal Bloom' },
      { hex_code: '#4E7CFF', score: 980, rarity: 'Rare', identity: 'Blue Hour' },
      { hex_code: '#FF5C8A', score: 810, rarity: 'Uncommon', identity: 'Soft Static' }
    ]
  }),
  createFixture({
    id: 'sleek-arcade',
    username: 'Arcade',
    displayName: 'Arcade',
    bio: 'FPS · design · late nights',
    accent: '#7AA2F7',
    layoutVariant: 'sleek',
    background: '/homepage/fixtures/sleek-background.png',
    avatar: '/homepage/fixtures/sleek-avatar.png',
    cosmetics: {
      name_font: 'name_font_wide_geometric',
      name_material: 'name_material_neon_tube',
      name_motion: 'name_motion_haunt_gradient',
      profile_border: 'border_neon',
      avatar_effect: 'avatar_effect_prism_orbit',
      cursor_trail: 'cursor_trail_pixel_wake',
      profile_atmosphere: 'profile_atmosphere_dust_light'
    },
    links: [
      { type: 'website', label: 'Website', url: 'https://example.com/studio', order: 0 },
      { type: 'github', label: 'GitHub', url: 'https://github.com/', order: 1 },
      { type: 'twitter', label: 'X', url: 'https://x.com/', order: 2 },
      { type: 'discord', label: 'Discord', url: 'https://discord.com/', order: 3 }
    ],
    scores: [
      { hex_code: '#7AA2F7', score: 980, rarity: 'Rare', identity: 'Night Drive' },
      { hex_code: '#BBA4FF', score: 760, rarity: 'Uncommon', identity: 'Arcade Light' },
      { hex_code: '#34C759', score: 620, rarity: 'Common', identity: 'Green Room' }
    ]
  }),
  createFixture({
    id: 'minimal-mono',
    username: 'mono',
    displayName: 'mono',
    bio: 'Designer · Berlin',
    accent: '#F5F5F7',
    layoutVariant: 'minimal',
    background: '/homepage/fixtures/minimal-background.png',
    avatar: '/homepage/fixtures/minimal-avatar.png',
    cosmetics: {
      name_font: 'name_font_mono_compact',
      name_material: 'name_material_carbon_cut',
      name_motion: 'name_motion_haunt_fuzzy',
      profile_border: 'border_void',
      avatar_effect: 'avatar_effect_crystal_aperture',
      cursor_trail: 'cursor_trail_glass_shards',
      profile_atmosphere: 'profile_atmosphere_droplets_glass'
    },
    links: [
      { type: 'website', label: 'Work', url: 'https://example.com/work', order: 0 },
      { type: 'other', label: 'Archive', url: 'https://example.com/archive', order: 1 },
      { type: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/', order: 2 }
    ],
    scores: [
      { hex_code: '#F5F5F7', score: 930, rarity: 'Rare', identity: 'Paper Light' },
      { hex_code: '#B8C0D8', score: 710, rarity: 'Uncommon', identity: 'Concrete Air' },
      { hex_code: '#8794A6', score: 540, rarity: 'Common', identity: 'Wet Stone' }
    ]
  }),
  createFixture({
    id: 'portfolio-void',
    username: 'void',
    displayName: 'void',
    bio: 'Visuals · music · archive',
    accent: '#BB9AF7',
    layoutVariant: 'portfolio',
    background: '/homepage/fixtures/portfolio-background.png',
    avatar: '/homepage/fixtures/portfolio-avatar.png',
    cosmetics: {
      name_font: 'name_font_editorial_serif',
      name_material: 'name_material_velvet_ink',
      name_motion: 'name_motion_haunt_rainbow',
      profile_border: 'border_prism',
      avatar_effect: 'avatar_effect_chroma_arc',
      cursor_trail: 'cursor_trail_chroma_ribbon',
      profile_atmosphere: 'profile_atmosphere_silk_folds'
    },
    links: [
      { type: 'website', label: 'Gallery', url: 'https://example.com/gallery', order: 0 },
      { type: 'spotify', label: 'Music', url: 'https://open.spotify.com/', order: 1 },
      { type: 'other', label: 'Archive', url: 'https://example.com/archive', order: 2 }
    ],
    scores: [
      { hex_code: '#BB9AF7', score: 1120, rarity: 'Epic', identity: 'Archive Glow' },
      { hex_code: '#F38BA8', score: 840, rarity: 'Rare', identity: 'Afterimage' },
      { hex_code: '#FFD166', score: 680, rarity: 'Uncommon', identity: 'Late Light' }
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
