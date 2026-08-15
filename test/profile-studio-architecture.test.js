import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getProfileStudioHash,
  getVisibleProfileStudioSections,
  resolveProfileStudioLocation
} from '../src/lib/profile-studio/dashboardContract.js';
import {
  buildConfigurationV2,
  createEmptyEditorProfileConfig,
  createProfileStudioDraftState,
  createProfileStudioPreviewModel
} from '../src/lib/profile-studio/draftModel.js';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import {
  PROFILE_RENDER_CONTEXTS,
  getProfileRenderGeometry,
  resolveProfileRenderContext
} from '../src/lib/profile-studio/previewContexts.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Profile Studio routing keeps canonical destinations and legacy hashes compatible', () => {
  assert.deepEqual(resolveProfileStudioLocation('#customize-effects'), {
    rawHash: 'customize-effects',
    sectionId: 'customize',
    customizeTab: 'appearance',
    isLegacyAlias: true
  });
  assert.deepEqual(resolveProfileStudioLocation('#customize-media'), {
    rawHash: 'customize-media',
    sectionId: 'customize',
    customizeTab: 'media',
    isLegacyAlias: true
  });
  assert.equal(resolveProfileStudioLocation('#profile-aliases').sectionId, 'links');
  assert.equal(resolveProfileStudioLocation('#profile-layout').sectionId, 'links');
  assert.equal(resolveProfileStudioLocation('#not-a-dashboard-section').sectionId, 'customize');
  assert.equal(getProfileStudioHash('customize', 'layout'), 'customize-layout');
  assert.equal(getProfileStudioHash('links'), 'links');

  const visible = getVisibleProfileStudioSections({ expandedAnalytics: false, socialDepth: false });
  assert.equal(visible.some(section => section.id === 'profile-insights'), false);
  assert.equal(visible.some(section => section.id === 'profile-notifications'), false);
  assert.equal(visible.some(section => section.id === 'profile-social'), true);
});

test('the draft model composes identity, configuration, and cosmetic previews without a server mutation', () => {
  const editorConfig = createEmptyEditorProfileConfig();
  const targetProfile = { id: 'profile-1', username: 'chromadie', bio: 'published bio', equipped_cosmetics: { name_font: 'name_font_default' } };
  const studioDraft = { ...editorConfig.draft, bio: 'configuration draft' };
  const cosmeticPreviewLoadout = { name_font: 'name_font_marker_tag', profile_border: 'border_celestial' };
  const studioIdentityDraft = {
    bio: 'identity draft',
    identityPresentation: { avatarPosition: 'top', showHandle: false }
  };

  const preview = createProfileStudioPreviewModel({
    targetProfile,
    profileConfig: editorConfig,
    equippedCosmetics: targetProfile.equipped_cosmetics,
    studioDraft,
    studioIdentityDraft,
    cosmeticPreviewLoadout
  });

  assert.equal(preview.profile.bio, 'identity draft');
  assert.equal(preview.profile.equipped_cosmetics, cosmeticPreviewLoadout);
  assert.equal(preview.profileConfig.bio, studioDraft.bio);
  assert.deepEqual(preview.profileConfig.identityPresentation, studioIdentityDraft.identityPresentation);
  assert.deepEqual(preview.configuration, {
    ...studioDraft,
    identityPresentation: studioIdentityDraft.identityPresentation
  });
  assert.equal(preview.cosmetics, cosmeticPreviewLoadout);

  const state = createProfileStudioDraftState({
    profileConfig: editorConfig,
    targetProfile,
    equippedCosmetics: targetProfile.equipped_cosmetics
  });
  assert.deepEqual(state.studioDraft, editorConfig.draft);
  assert.equal(state.studioIdentityDraft.bio, targetProfile.bio);
  assert.deepEqual(state.equippedCosmetics, targetProfile.equipped_cosmetics);

  const configurationV2 = buildConfigurationV2(editorConfig.draft, { version: 2, sharing: { qrEnabled: false } });
  assert.equal(configurationV2.version, 2);
  assert.equal(configurationV2.base.version, 1);
  assert.deepEqual(configurationV2.sharing, { qrEnabled: false });

  const avatarPath = 'avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp';
  const mediaConfig = { ...createDefaultProfileConfig('#112233'), avatar_path: avatarPath };
  const mediaV2 = buildConfigurationV2(mediaConfig);
  const mediaPreview = createProfileStudioPreviewModel({
    targetProfile,
    profileConfig: { version: 2, draft: mediaV2, published: mediaV2 },
    equippedCosmetics: targetProfile.equipped_cosmetics
  });
  assert.equal(mediaPreview.profileConfig.avatar_path, avatarPath);
});

test('renderer contexts keep catalog, effect-card, name-control, and live-profile geometry distinct', () => {
  assert.equal(resolveProfileRenderContext('not-a-context'), PROFILE_RENDER_CONTEXTS.LIVE_PROFILE);
  assert.deepEqual(getProfileRenderGeometry(PROFILE_RENDER_CONTEXTS.CATALOG), {
    aspectRatio: '16 / 9', minHeight: '0', bleed: 'contained', motion: 'interactive'
  });
  assert.deepEqual(getProfileRenderGeometry(PROFILE_RENDER_CONTEXTS.EFFECT_CARD), {
    aspectRatio: 'auto', minHeight: '4.25rem', bleed: 'contained', motion: 'preview'
  });
  assert.deepEqual(getProfileRenderGeometry(PROFILE_RENDER_CONTEXTS.NAME_CONTROL), {
    aspectRatio: 'auto', minHeight: '2.9rem', bleed: 'visible', motion: 'slot-owned'
  });
  assert.deepEqual(getProfileRenderGeometry(PROFILE_RENDER_CONTEXTS.LIVE_PROFILE), {
    aspectRatio: 'auto', minHeight: '0', bleed: 'visible', motion: 'profile'
  });
});

test('dashboard ownership keeps routing, rendering, and dirty-state boundaries separate', async () => {
  const [settings, header, workspace, preview, dirtyPrompt, registry, shell] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileStudioDirtyPrompt.svelte'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/ProfileStudioShell.svelte')
  ]);

  assert.match(settings, /save_profile_configuration_v2/);
  assert.match(settings, /publish_profile_studio_v2/);
  assert.match(settings, /resolveProfileStudioLocation/);
  assert.match(settings, /createProfileStudioPreviewModel/);
  assert.match(settings, /previewRenderSnapshot/);
  for (const presentationalComponent of [header, workspace, preview, dirtyPrompt]) {
    assert.doesNotMatch(presentationalComponent, /supabase\.rpc|save_profile_configuration_v2|publish_profile_configuration_v2/);
  }
  assert.match(header, /handleTabKeydown/);
  assert.match(header, /role="tablist"/);
  assert.match(workspace, /getProfileStudioSectionRegistration/);
  assert.doesNotMatch(workspace, /export function getDraftConfig/);
  assert.match(workspace, /export function resetChanges/);
  assert.match(preview, /ProfileReferenceCard/);
  assert.match(preview, /ProfileMotionEffect/);
  assert.match(preview, /inputSurface="container"/);
  assert.match(preview, /previewRenderSnapshot/);
  assert.doesNotMatch(preview, /ProfileShell|renderSnapshot=\{previewRenderSnapshot\}/);
  assert.match(dirtyPrompt, /dispatch\('stay'\)/);
  assert.match(dirtyPrompt, /dispatch\('discard'\)/);
  assert.match(registry, /PROFILE_STUDIO_SECTION_REGISTRY/);
  assert.match(registry, /getProfileStudioSectionLoader/);
  assert.match(shell, /slot name="preview"/);
  const customize = await read('src/lib/ProfileCustomizePage.svelte');
  assert.match(customize, /dispatch\('studiopatch'/);
  assert.doesNotMatch(customize, /customizepreview/);
  assert.doesNotMatch(settings, /configurationPreview|identityPreview/);
});
