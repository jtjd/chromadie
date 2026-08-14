import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileRenderSnapshot } from '../src/lib/profileRenderModel.js';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import { applyProfileStudioDraftPatch } from '../src/lib/profile-studio/draftModel.js';

const MEDIA = Object.freeze({
  avatar: 'avatars/11111111-1111-4111-8111-111111111111/avatar.webp',
  background: 'backgrounds/11111111-1111-4111-8111-111111111111/background.webp',
  video: 'profile_media/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.mp4',
  banner: 'profile_media/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.webp',
  cursor: 'profile_media/11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.webp',
  audio: 'profile_audio/11111111-1111-4111-8111-111111111111/profile.mp3'
});

const FLAGS = Object.freeze({
  richMedia: true,
  expandedAnalytics: true,
  socialDepth: true,
  profileConfigurationV2: true
});

function mediaResolver(path) {
  return path ? `https://cdn.example.test/${path}` : '';
}

function createRichConfiguration() {
  const base = createDefaultProfileConfig('#123456');
  return {
    ...base,
    configurationVersion: 2,
    layoutVariant: 'modern',
    avatar_path: MEDIA.avatar,
    background_path: MEDIA.background,
    background_video_path: MEDIA.video,
    banner_path: MEDIA.banner,
    cursor_path: MEDIA.cursor,
    audio_path: MEDIA.audio,
    audio_playlist: {
      ...base.audio_playlist,
      tracks: [{ path: MEDIA.audio, label: 'A quiet track', duration_ms: 120000, order: 0 }]
    },
    links: [
      { key: 'github', type: 'github', label: 'GitHub', url: 'https://github.com/chromadie', order: 0, visible: true },
      { key: 'website', type: 'website', label: 'Website', url: 'https://chromadie.example', order: 1, visible: true },
      { key: 'portfolio', type: 'other', label: 'Portfolio', url: 'https://chromadie.example/portfolio', order: 2, visible: true }
    ],
    content: {
      version: 1,
      about: { visible: true, heading: 'About', body: 'A durable profile note.' },
      projects: [{ title: 'Chromadie', description: 'Daily color identity.', url: 'https://chromadie.example/project', visible: true, order: 0 }]
    }
  };
}

function importantSnapshotState(snapshot) {
  return {
    layout: snapshot.layout.variant,
    avatar: snapshot.media.avatarUrl,
    background: snapshot.environment.backgroundImageUrl,
    backgroundVideo: snapshot.environment.backgroundVideoUrl,
    surface: snapshot.surface,
    name: snapshot.cosmetics.name,
    avatarEffect: snapshot.cosmetics.avatarEffectKey,
    border: snapshot.cosmetics.borderKey,
    atmosphere: snapshot.cosmetics.atmosphereKey,
    motion: snapshot.cosmetics.profileMotionKey,
    cursor: snapshot.cosmetics.cursorTrailKey,
    openingLinks: snapshot.links.opening.map(link => link.url),
    continuationLinks: snapshot.links.continuation.map(link => link.url),
    roll: snapshot.roll.latest,
    profileMore: snapshot.visibility.hasProfileMore
  };
}

test('public and Studio hosts resolve one rich profile to the same render state', () => {
  const configuration = createRichConfiguration();
  const profile = {
    id: 'profile-1',
    username: 'chromadie',
    display_name: 'Chromadie',
    bio: 'Published profile note.',
    equipped_badges: ['launch_edition'],
    equipped_cosmetics: {
      name_font: 'name_font_marker_tag',
      name_material: 'name_material_blueprint_ink',
      name_motion: 'name_motion_typewriter_name',
      avatar_effect: 'avatar_effect_ghost_double',
      profile_border: 'border_celestial',
      profile_atmosphere: 'profile_atmosphere_rain_window',
      profile_motion: 'profile_motion_perspective_tilt',
      cursor_trail: 'cursor_trail_pixel_wake'
    }
  };
  const input = {
    profile,
    scores: [{ roll_date: '2026-08-12', hex_code: '#38C880', score: 28724, rarity: 'Rare' }],
    featureFlags: FLAGS,
    allAchievements: [],
    mediaResolver
  };
  const publicSnapshot = buildProfileRenderSnapshot({
    ...input,
    profileConfig: { published: configuration },
    previewMode: false,
    mode: 'public',
    isOwner: false
  });
  const studioSnapshot = buildProfileRenderSnapshot({
    ...input,
    profileConfig: { draft: configuration, published: configuration },
    studioDraft: configuration,
    cosmeticPreviewLoadout: profile.equipped_cosmetics,
    previewMode: true,
    mode: 'studio',
    isOwner: false,
    previewDevice: 'desktop'
  });

  assert.deepEqual(importantSnapshotState(studioSnapshot), importantSnapshotState(publicSnapshot));
  assert.equal(studioSnapshot.mode, 'studio');
  assert.equal(publicSnapshot.mode, 'public');
  assert.equal(studioSnapshot.permissions.isVisitor, true);
  assert.equal(publicSnapshot.cosmetics.profileMotionKey, 'profile_motion_perspective_tilt');
  assert.equal(Object.isFrozen(studioSnapshot), true);
});

test('draft, media, identity, and cosmetic precedence is resolved before rendering', () => {
  const published = createRichConfiguration();
  published.layoutVariant = 'compact';
  const draft = { ...published, layoutVariant: 'sleek' };
  const currentCosmetics = { profile_border: 'border_signal', avatar_effect: 'avatar_effect_ghost_double' };
  const previewCosmetics = { profile_border: 'border_celestial', avatar_effect: 'avatar_effect_orbit' };
  const snapshot = buildProfileRenderSnapshot({
    profile: { id: 'profile-2', username: 'draft-user', bio: 'published bio', equipped_cosmetics: currentCosmetics },
    profileConfig: { draft, published },
    studioDraft: { ...draft, layoutVariant: 'modern', appearance: { ...draft.appearance, surface: { opacity: 82, blur: 8 } } },
    studioIdentityDraft: { bio: 'draft bio', identityPresentation: { location: 'Brooklyn, NY' } },
    cosmeticPreviewLoadout: previewCosmetics,
    featureFlags: FLAGS,
    mediaResolver,
    previewMode: true,
    mode: 'studio'
  });

  assert.equal(snapshot.layout.variant, 'modern');
  assert.equal(snapshot.identity.bio, 'draft bio');
  assert.equal(snapshot.identity.location, 'Brooklyn, NY');
  assert.equal(snapshot.surface.opacity, 82);
  assert.equal(snapshot.surface.blur, 8);
  assert.equal(snapshot.cosmetics.borderKey, 'border_celestial');
  assert.equal(snapshot.cosmetics.avatarEffectKey, 'avatar_effect_orbit');
  assert.equal(snapshot.cosmetics.profileMotionKey, '');
  assert.equal(snapshot.media.avatarUrl, mediaResolver(MEDIA.avatar));
  assert.equal(snapshot.media.backgroundVideoUrl, mediaResolver(MEDIA.video));
});

test('public rendering never promotes an owner draft over the published configuration', () => {
  const published = createRichConfiguration();
  const draft = { ...published, layoutVariant: 'portfolio', appearance: { ...published.appearance, colors: { ...published.appearance.colors, surface: '#010101' } } };
  const snapshot = buildProfileRenderSnapshot({
    profile: { id: 'profile-published', username: 'published-profile' },
    profileConfig: { draft, published },
    featureFlags: FLAGS,
    mediaResolver,
    mode: 'public',
    previewMode: false
  });

  assert.equal(snapshot.layout.variant, 'modern');
  assert.equal(snapshot.surface.color, published.appearance.colors.surface);
  assert.equal(snapshot.media.avatarUrl, mediaResolver(MEDIA.avatar));
});

test('dedicated expression fields survive an incomplete draft envelope', () => {
  const published = createRichConfiguration();
  const draft = {
    version: 2,
    base: {
      ...published,
      version: 1,
      layoutVariant: 'sleek'
    }
  };
  delete draft.base.avatar_path;
  delete draft.base.background_path;
  delete draft.base.background_video_path;
  const snapshot = buildProfileRenderSnapshot({
    profile: { id: 'profile-2b', username: 'envelope-stable' },
    profileConfig: {
      draft,
      published: { version: 2, base: published }
    },
    studioDraft: draft,
    featureFlags: FLAGS,
    mediaResolver,
    previewMode: true,
    mode: 'studio'
  });

  assert.equal(snapshot.layout.variant, 'sleek');
  assert.equal(snapshot.media.avatarUrl, mediaResolver(MEDIA.avatar));
  assert.equal(snapshot.environment.backgroundImageUrl, mediaResolver(MEDIA.background));
  assert.equal(snapshot.environment.backgroundVideoUrl, mediaResolver(MEDIA.video));
});

test('current expression selections override the selected configuration atomically', () => {
  const published = createRichConfiguration();
  const snapshot = buildProfileRenderSnapshot({
    profile: { id: 'profile-expression', username: 'expression-stable' },
    profileConfig: { draft: { ...published, layoutVariant: 'sleek' }, published },
    studioDraft: { ...published, layoutVariant: 'modern' },
    expression: { avatar_path: null, background_path: 'backgrounds/22222222-2222-4222-8222-222222222222/background.webp' },
    featureFlags: FLAGS,
    mediaResolver,
    previewMode: true,
    mode: 'studio'
  });

  assert.equal(snapshot.layout.variant, 'modern');
  assert.equal(snapshot.media.avatarPath, null);
  assert.equal(snapshot.media.backgroundPath, 'backgrounds/22222222-2222-4222-8222-222222222222/background.webp');
  assert.equal(snapshot.media.backgroundUrl, mediaResolver('backgrounds/22222222-2222-4222-8222-222222222222/background.webp'));
});

test('partial appearance edits retain unrelated media, layout, and cosmetics', () => {
  const published = createRichConfiguration();
  const edited = {
    ...published,
    appearance: {
      ...published.appearance,
      colors: { ...published.appearance.colors, surface: '#223344' }
    }
  };
  const base = buildProfileRenderSnapshot({
    profile: { id: 'profile-3', username: 'stable', equipped_cosmetics: { profile_border: 'border_celestial' } },
    profileConfig: { draft: published, published },
    featureFlags: FLAGS,
    mediaResolver,
    previewMode: true,
    mode: 'studio'
  });
  const next = buildProfileRenderSnapshot({
    profile: { id: 'profile-3', username: 'stable', equipped_cosmetics: { profile_border: 'border_celestial' } },
    profileConfig: { draft: published, published },
    studioDraft: edited,
    featureFlags: FLAGS,
    mediaResolver,
    previewMode: true,
    mode: 'studio'
  });

  assert.equal(next.layout.variant, base.layout.variant);
  assert.equal(next.media.avatarUrl, base.media.avatarUrl);
  assert.equal(next.environment.backgroundImageUrl, base.environment.backgroundImageUrl);
  assert.equal(next.surface.blur, base.surface.blur);
  assert.equal(next.surface.radius, base.surface.radius);
  assert.equal(next.cosmetics.borderKey, base.cosmetics.borderKey);
  assert.notEqual(next.surface.color, base.surface.color);
});

test('the same complete input produces a stable snapshot across lifecycle ticks', () => {
  const configuration = createRichConfiguration();
  const input = {
    profile: { id: 'profile-4', username: 'stable-profile', equipped_cosmetics: { profile_border: 'border_celestial' } },
    profileConfig: { draft: configuration, published: configuration },
    featureFlags: FLAGS,
    scores: [{ roll_date: '2026-08-12', hex_code: '#38C880', score: 28724 }],
    mediaResolver,
    previewDevice: 'desktop'
  };
  const first = buildProfileRenderSnapshot(input);
  const second = buildProfileRenderSnapshot({ ...input });
  assert.deepEqual(second, first);
  assert.equal(first.identity.avatarUrl, first.media.avatarUrl);
  assert.equal(first.environment.backgroundImageUrl, first.media.backgroundUrl);
  assert.equal(first.surface.style, first.styles.surface);
});

test('an empty default profile does not manufacture a continuation section', () => {
  const configuration = createDefaultProfileConfig();
  const snapshot = buildProfileRenderSnapshot({
    profile: { id: 'profile-5', username: 'empty-profile' },
    profileConfig: { draft: configuration, published: configuration }
  });

  assert.equal(snapshot.modules.hasContent, false);
  assert.equal(snapshot.modules.showLowerExpression, false);
  assert.equal(snapshot.visibility.hasProfileMore, false);
});

test('Studio patches update only the editor-owned slice of the canonical draft', () => {
  const base = createRichConfiguration();
  const staleEditorConfig = {
    ...createDefaultProfileConfig('#090B0F'),
    layoutVariant: 'sleek',
    appearance: {
      ...createDefaultProfileConfig('#090B0F').appearance,
      colors: { ...createDefaultProfileConfig('#090B0F').appearance.colors, surface: '#090B0F' }
    }
  };

  const afterLayout = applyProfileStudioDraftPatch(base, {
    scope: 'layout',
    detail: { config: staleEditorConfig }
  });
  assert.equal(afterLayout.layoutVariant, 'sleek');
  assert.equal(afterLayout.appearance.colors.surface, base.appearance.colors.surface);
  assert.equal(afterLayout.avatar_path, base.avatar_path);
  assert.equal(afterLayout.background_path, base.background_path);

  const afterAppearance = applyProfileStudioDraftPatch(afterLayout, {
    scope: 'appearance',
    detail: {
      appearance: {
        ...afterLayout.appearance,
        colors: { ...afterLayout.appearance.colors, surface: '#6A2E9A' },
        surface: { ...afterLayout.appearance.surface, opacity: 93, blur: 10 }
      }
    }
  });
  assert.equal(afterAppearance.appearance.colors.surface, '#6A2E9A');
  assert.equal(afterAppearance.appearance.surface.opacity, 93);
  assert.equal(afterAppearance.appearance.surface.blur, 10);
  assert.equal(afterAppearance.layoutVariant, 'sleek');
  assert.equal(afterAppearance.background_path, base.background_path);

  const afterBackground = applyProfileStudioDraftPatch(afterAppearance, {
    scope: 'appearance-background',
    detail: {
      background: { ...base.appearance.background, blur: 32, overlayOpacity: 58 }
    }
  });
  assert.equal(afterBackground.appearance.background.blur, 32);
  assert.equal(afterBackground.appearance.background.overlayOpacity, 58);
  assert.equal(afterBackground.appearance.colors.surface, '#6A2E9A');
  assert.equal(afterBackground.appearance.surface.opacity, 93);
  assert.equal(afterBackground.appearance.surface.blur, 10);

  const staleAppearance = {
    ...afterBackground.appearance,
    colors: { ...afterBackground.appearance.colors, surface: '#11141B' },
    surface: { ...afterBackground.appearance.surface, opacity: 64, blur: 20 },
    background: { ...base.appearance.background, blur: 0, overlayOpacity: 0 }
  };
  const afterStaleAppearance = applyProfileStudioDraftPatch(afterBackground, {
    scope: 'appearance',
    detail: { appearance: staleAppearance }
  });
  assert.equal(afterStaleAppearance.appearance.background.blur, 32);
  assert.equal(afterStaleAppearance.appearance.background.overlayOpacity, 58);
  assert.equal(afterStaleAppearance.appearance.colors.surface, '#11141B');
  assert.equal(afterStaleAppearance.appearance.surface.opacity, 64);
  assert.equal(afterStaleAppearance.appearance.surface.blur, 20);
});

test('layout patches own only link alignment while Links owns the remaining style', () => {
  const base = createDefaultProfileConfig('#123456');
  base.linkStyle = { alignment: 'left', size: 2, glow: 2, monochrome: true };

  const afterLayout = applyProfileStudioDraftPatch(base, {
    scope: 'layout',
    detail: {
      config: {
        ...base,
        layoutVariant: 'minimal',
        linkStyle: { alignment: 'center', size: 0, glow: 0, monochrome: false }
      }
    }
  });
  assert.deepEqual(afterLayout.linkStyle, { alignment: 'center', size: 2, glow: 2, monochrome: true });

  const afterLinks = applyProfileStudioDraftPatch(afterLayout, {
    scope: 'links',
    detail: {
      config: {
        ...afterLayout,
        linkStyle: { alignment: 'center', size: 1, glow: 0, monochrome: false }
      }
    }
  });
  assert.deepEqual(afterLinks.linkStyle, { alignment: 'center', size: 1, glow: 0, monochrome: false });
});
