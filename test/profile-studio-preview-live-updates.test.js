import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import { applyProfileStudioDraftPatch, createProfileStudioPreviewModel } from '../src/lib/profile-studio/draftModel.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Studio preview snapshots carry staged appearance and every equipped effect into the card contract', () => {
  const base = createDefaultProfileConfig('#112233');
  const targetProfile = { id: 'preview-profile', username: 'nocturne', bio: 'Field recordings.' };
  const studioDraft = {
    ...base,
    appearance: {
      ...base.appearance,
      colors: { ...base.appearance.colors, username: '#F7B7E2', accent: '#7B5CFF' },
      surface: { ...base.appearance.surface, opacity: 42, blur: 8 }
    }
  };
  const cosmeticPreviewLoadout = {
    name_font: 'name_font_editorial_serif',
    name_material: 'name_material_glass_emboss',
    name_motion: 'name_motion_typewriter_name',
    avatar_effect: 'avatar_effect_cyber_hud',
    profile_border: 'border_celestial',
    profile_atmosphere: 'profile_atmosphere_rain_window',
    profile_motion: 'profile_motion_perspective_tilt',
    cursor_trail: 'cursor_trail_signal_trace'
  };

  const preview = createProfileStudioPreviewModel({
    targetProfile,
    profileConfig: { draft: base, published: base },
    equippedCosmetics: {},
    studioDraft,
    cosmeticPreviewLoadout
  });

  assert.equal(preview.snapshot.appearance.colors.username, '#F7B7E2');
  assert.equal(preview.snapshot.appearance.surface.opacity, 42);
  assert.equal(preview.snapshot.appearance.surface.blur, 8);
  assert.match(preview.snapshot.surface.style, /--profile-username:#F7B7E2/);
  assert.match(preview.snapshot.surface.style, /--profile-surface-opacity:0\.42/);
  assert.match(preview.snapshot.surface.style, /--profile-surface-blur:8px/);
  assert.equal(preview.snapshot.cosmetics.name.fontKey, 'name_font_editorial_serif');
  assert.equal(preview.snapshot.cosmetics.name.materialKey, 'name_material_glass_emboss');
  assert.equal(preview.snapshot.cosmetics.name.motionKey, 'name_motion_typewriter_name');
  assert.equal(preview.snapshot.cosmetics.avatarEffectKey, 'avatar_effect_cyber_hud');
  assert.equal(preview.snapshot.cosmetics.borderKey, 'border_celestial');
  assert.equal(preview.snapshot.cosmetics.atmosphereKey, 'profile_atmosphere_rain_window');
  assert.equal(preview.snapshot.cosmetics.profileMotionKey, 'profile_motion_perspective_tilt');
  assert.equal(preview.snapshot.cosmetics.cursorTrailKey, 'signal-trace');
});

test('the bounded Studio card consumes the shared appearance and cosmetic leaf renderers', async () => {
  const [preview, card, nameCanvas] = await Promise.all([
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/name/NameEffectCanvas.svelte')
  ]);

  assert.match(preview, /\{nameLoadout\}/);
  assert.match(preview, /avatarEffectKey={avatarEffectKey}/);
  assert.match(preview, /profileBorderKey={profileBorderKey}/);
  assert.match(preview, /surfaceStyle={appearanceStyle}/);
  assert.match(preview, /descriptionMode={identity.descriptionMode}/);
  assert.match(preview, /entryAnimation={identity.entryAnimation}/);
  assert.match(card, /import AvatarEffect from '\.\/avatar-effect\/AvatarEffect\.svelte'/);
  assert.match(card, /import NameEffectCanvas from '\.\/name\/NameEffectCanvas\.svelte'/);
  assert.match(card, /import ProfileBorderEffect from '\.\/profile-border\/ProfileBorderEffect\.svelte'/);
  assert.match(card, /semanticClass="profile-reference-card__name"/);
  assert.match(card, /effectKey={avatarEffectKey}/);
  assert.match(card, /borderKey={profileBorderKey}/);
  assert.match(card, /style={cardStyle}/);
  assert.match(nameCanvas, /'profile-reference-card__name'/);
});

test('staged link edits reach the compact preview and stop at six entries', () => {
  const base = createDefaultProfileConfig('#112233');
  const targetProfile = { id: 'preview-links', username: 'linkkeeper', bio: 'A bounded profile.' };
  const makeLink = index => ({
    key: `preview-link-${index}`,
    type: 'website',
    label: `Link ${index + 1}`,
    url: `https://example.com/${index + 1}`,
    visible: true,
    order: index
  });
  const initial = createProfileStudioPreviewModel({
    targetProfile,
    profileConfig: { draft: base, published: base },
    studioDraft: base
  });
  assert.deepEqual(initial.snapshot.links.opening, []);

  const staged = applyProfileStudioDraftPatch(base, {
    scope: 'links',
    detail: { config: { ...base, links: [makeLink(0)] } }
  });
  const preview = createProfileStudioPreviewModel({
    targetProfile,
    profileConfig: { draft: base, published: base },
    studioDraft: staged
  });
  assert.deepEqual(preview.snapshot.links.opening.map(link => link.url), ['https://example.com/1']);

  const capped = applyProfileStudioDraftPatch(base, {
    scope: 'links',
    detail: { config: { ...base, links: Array.from({ length: 10 }, (_, index) => makeLink(index)) } }
  });
  assert.equal(capped.links.length, 6);
  assert.deepEqual(capped.links.map(link => link.label), ['Link 1', 'Link 2', 'Link 3', 'Link 4', 'Link 5', 'Link 6']);
});
