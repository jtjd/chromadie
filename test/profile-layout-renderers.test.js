import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_LAYOUT_DEFINITIONS,
  PROFILE_LAYOUT_KEYS,
  resolveProfileLayoutVariant
} from '../src/lib/profile-layout/profileLayouts.js';
import {
  createDefaultProfileConfig,
  areProfileConfigsEqual,
  getProfileContinuationLinks,
  getProfileLayoutLinkPartitions,
  getProfileOpeningLinks,
  hasProfileMoreContent,
  normalizeProfileConfig
} from '../src/lib/profileConfig.js';
import {
  buildConfigurationV2,
  mergeConfigurationV2ExpressionFields
} from '../src/lib/profile-studio/draftModel.js';
import { createProfileLayoutPatch } from '../src/lib/profile-layout/profileLayoutPatch.js';
import { PROFILE_LINK_DEFINITIONS, PROFILE_LINK_TYPES, isProfileLinkUrlValid, isProfileSocialLink } from '../src/lib/profileLinkTypes.js';
import { RICH_PROFILE_FIXTURE } from '../scripts/browser/profile-rich-fixture.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the active layout definitions carry distinct structural contracts', () => {
  assert.deepEqual(PROFILE_LAYOUT_KEYS, ['compact', 'full-bleed', 'framed']);
  assert.deepEqual(
    PROFILE_LAYOUT_KEYS.map(key => PROFILE_LAYOUT_DEFINITIONS[key].structure),
    [
      { identity: 'centered', roll: 'integrated', surface: 'reference-card' },
      { identity: 'centered', roll: 'below-fold', surface: 'cardless' },
      { identity: 'left', roll: 'below-fold', surface: 'reference-card' }
    ]
  );
});

test('Framed preserves the bounded profile layout contract', () => {
  assert.equal(resolveProfileLayoutVariant({ layoutVariant: 'framed' }), 'framed');
  assert.equal(resolveProfileLayoutVariant({ layoutVariant: 'profile_layout_framed' }), 'framed');
  assert.equal(PROFILE_LAYOUT_DEFINITIONS.framed.label, 'Framed');
  assert.equal(PROFILE_LAYOUT_DEFINITIONS.framed.motionTarget, 'framed-card');
  const patch = createProfileLayoutPatch('framed');
  assert.equal(patch.templateKey, 'framed');
  assert.equal(patch.layoutVariant, 'framed');
  assert.deepEqual(patch.modules.map(module => module.id), ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore']);
});

test('public layout authority comes from profile configuration', () => {
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'profile_layout_full_bleed', layoutVariant: 'compact' }), 'compact');
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'profile_layout_modern', layoutVariant: 'not-real' }), 'compact');
});

test('opening and continuation link helpers partition a rich profile without overlap', () => {
  const config = normalizeProfileConfig({
    ...createDefaultProfileConfig(),
    configurationVersion: 2,
    links: Array.from({ length: 10 }, (_, index) => ({
      key: `fixture-link-${index}`,
      type: index < 6 ? 'github' : 'website',
      label: `Fixture link ${index + 1}`,
      url: `https://example.com/fixture-${index + 1}`,
      visible: true,
      order: index
    }))
  });
  const opening = getProfileOpeningLinks(config);
  const continuation = getProfileContinuationLinks(config);
  const openingUrls = opening.map(link => link.url);
  const continuationUrls = continuation.map(link => link.url);

  assert.equal(opening.length, 6);
  assert.equal(continuation.length, 4);
  assert.deepEqual(openingUrls, Array.from({ length: 6 }, (_, index) => `https://example.com/fixture-${index + 1}`));
  assert.deepEqual(continuationUrls, Array.from({ length: 4 }, (_, index) => `https://example.com/fixture-${index + 7}`));
  assert.equal(new Set([...openingUrls, ...continuationUrls]).size, 10);
});

test('layout link partitions keep Compact and Immersive deterministic', () => {
  const config = normalizeProfileConfig({
    ...createDefaultProfileConfig(),
    configurationVersion: 2,
    links: RICH_PROFILE_FIXTURE.links.map((link, order) => ({ ...link, key: `layout-link-${order}`, order, visible: true }))
  });
  const compact = getProfileLayoutLinkPartitions(config, 'compact');
  const immersive = getProfileLayoutLinkPartitions(config, 'full-bleed');

  assert.deepEqual(compact.opening.map(link => link.label), ['GitHub', 'YouTube', 'Twitch', 'Instagram', 'Personal site', 'Portfolio']);
  assert.deepEqual(compact.continuation.map(link => link.label), ['Project notes', 'Now playing', 'Field guide', 'Contact']);
  assert.deepEqual(immersive.opening.map(link => link.label), RICH_PROFILE_FIXTURE.links.map(link => link.label));
  assert.deepEqual(immersive.continuation, []);
  for (const partition of [compact, immersive]) {
    assert.equal(new Set([...partition.opening, ...partition.continuation].map(link => link.url)).size, 10);
  }
});

test('layout link partitions keep later social services in the opening', () => {
  const config = normalizeProfileConfig({
    ...createDefaultProfileConfig(),
    configurationVersion: 2,
    links: [
      ['Website', 'website', 'https://example.com'],
      ['Portfolio', 'other', 'https://example.com/portfolio'],
      ['Blog', 'other', 'https://example.com/blog'],
      ['Project', 'other', 'https://example.com/project'],
      ['Store', 'other', 'https://example.com/store'],
      ['Contact', 'other', 'https://example.com/contact'],
      ['GitHub', 'github', 'https://github.com/chromadie'],
      ['YouTube', 'youtube', 'https://youtube.com/@chromadie'],
      ['Twitch', 'twitch', 'https://twitch.tv/chromadie']
    ].map(([label, type, url], order) => ({ label, type, url, order, visible: true }))
  });
  const compact = getProfileLayoutLinkPartitions(config, 'compact');
  const immersive = getProfileLayoutLinkPartitions(config, 'full-bleed');

  assert.deepEqual(compact.opening.map(link => link.label), ['Website', 'Portfolio', 'Blog', 'Project', 'Store', 'Contact']);
  assert.deepEqual(compact.continuation.map(link => link.label), ['GitHub', 'YouTube', 'Twitch']);
  assert.deepEqual(immersive.opening.map(link => link.label), ['Website', 'Portfolio', 'Blog', 'Project', 'Store', 'Contact', 'GitHub', 'YouTube', 'Twitch']);
  assert.equal(new Set([...compact.opening, ...compact.continuation].map(link => link.url)).size, 9);
});

test('an incomplete publish envelope preserves dedicated expression fields defensively', () => {
  const fallback = buildConfigurationV2({
    ...createDefaultProfileConfig(),
    avatar_path: 'avatars/00000000-0000-0000-0000-000000000001/avatar.webp',
    background_path: 'backgrounds/00000000-0000-0000-0000-000000000001/background.webp',
    background_video_path: 'profile_media/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.mp4',
    audio_path: 'profile_audio/00000000-0000-0000-0000-000000000001/profile.mp3',
    cursor_path: 'profile_media/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000003.webp'
  });
  const incomplete = {
    ...fallback,
    base: { ...fallback.base, layoutVariant: 'compact' }
  };
  for (const field of ['avatar_path', 'background_path', 'background_video_path', 'audio_path', 'cursor_path']) {
    delete incomplete.base[field];
    delete incomplete[field];
  }
  const merged = mergeConfigurationV2ExpressionFields(incomplete, fallback);
  assert.equal(merged.base.avatar_path, 'avatars/00000000-0000-0000-0000-000000000001/avatar.webp');
  assert.equal(merged.base.background_path, 'backgrounds/00000000-0000-0000-0000-000000000001/background.webp');
  assert.equal(merged.base.background_video_path, 'profile_media/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.mp4');
  assert.equal(merged.base.audio_path, 'profile_audio/00000000-0000-0000-0000-000000000001/profile.mp3');
  assert.equal(merged.cursor_path, 'profile_media/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000003.webp');

  const explicitNull = mergeConfigurationV2ExpressionFields({
    ...incomplete,
    base: { ...incomplete.base, avatar_path: null }
  }, fallback);
  assert.equal(explicitNull.base.avatar_path, null);
});

test('a layout template round trip returns the normalized draft to its published baseline', () => {
  const published = normalizeProfileConfig({
    ...createDefaultProfileConfig(),
    ...createProfileLayoutPatch('compact')
  });
  const immersive = normalizeProfileConfig({ ...published, ...createProfileLayoutPatch('full-bleed') });
  const compactAgain = normalizeProfileConfig({ ...immersive, ...createProfileLayoutPatch('compact') });

  assert.equal(areProfileConfigsEqual(immersive, published), false);
  assert.equal(areProfileConfigsEqual(compactAgain, published), true);
});

test('compact profiles do not create an empty below-fold region from roll data alone', () => {
  assert.equal(hasProfileMoreContent({ continuationCount: 0, hasBelowFoldRoll: false, showLowerExpression: false, hasProfileStory: false }), false);
  assert.equal(hasProfileMoreContent({ continuationCount: 0, hasBelowFoldRoll: true }), true);
  assert.equal(hasProfileMoreContent({ continuationCount: 1 }), true);
});

test('the canonical browser fixture contains the rich renderer coverage data', () => {
  assert.match(RICH_PROFILE_FIXTURE.usernamePrefix, /[a-z]+/);
  assert(RICH_PROFILE_FIXTURE.bio.length > 40);
  assert.equal(RICH_PROFILE_FIXTURE.background.width, 637);
  assert.equal(RICH_PROFILE_FIXTURE.background.height, 311);
  assert.equal(RICH_PROFILE_FIXTURE.links.length, 10);
  assert(RICH_PROFILE_FIXTURE.links.slice(0, 4).every(link => isProfileSocialLink(link.type)));
  assert(RICH_PROFILE_FIXTURE.links.slice(4).every(link => !isProfileSocialLink(link.type)));
  assert(RICH_PROFILE_FIXTURE.links.every(link => /^https:\/\//.test(link.url)));
  assert(RICH_PROFILE_FIXTURE.effects.nameFont && RICH_PROFILE_FIXTURE.effects.nameMaterial && RICH_PROFILE_FIXTURE.effects.nameMotion);
});

test('template selection applies the authored module order while remaining bounded', () => {
  const patch = createProfileLayoutPatch('full-bleed');
  assert.equal(patch.templateKey, 'full-bleed');
  assert.equal(patch.layoutVariant, 'full-bleed');
  assert.deepEqual(patch.modules.map(module => module.id), ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore']);
  assert.deepEqual(createDefaultProfileConfig().modules.map(module => module.id), [
    'roll', 'stats', 'signature', 'links', 'recent', 'achievements', 'boundary', 'explore'
  ]);
});

test('editor, renderer, and public icon files consume one link service registry', async () => {
  const [editor, identity] = await Promise.all([
    read('src/lib/ProfileLinksEditor.svelte'),
    read('src/lib/ProfileReferenceCard.svelte')
  ]);
  assert.equal(PROFILE_LINK_TYPES.length, PROFILE_LINK_DEFINITIONS.length);
  assert.equal(new Set(PROFILE_LINK_TYPES).size, PROFILE_LINK_TYPES.length);
  for (const definition of PROFILE_LINK_DEFINITIONS) {
    assert.match(editor, new RegExp(`PROFILE_LINK_DEFINITIONS`));
    assert.match(identity, /visibleLinks/);
    assert.match(definition.icon, /^[a-z0-9-]+$/);
  }
  assert.match(editor, /PROFILE_LINK_DEFINITIONS as definition/);
  assert.equal(isProfileSocialLink('github'), true);
  assert.equal(isProfileSocialLink('spotify'), true);
  assert.equal(isProfileSocialLink('website'), false);
  assert.equal(isProfileSocialLink('other'), false);
});

test('Website and Other accept any valid HTTPS destination', () => {
  for (const type of ['website', 'other']) {
    assert.equal(isProfileLinkUrlValid(type, 'https://chromadie.com/about'), true);
    assert.equal(isProfileLinkUrlValid(type, 'http://chromadie.com/about'), false);
  }
});

test('link size and glow settings reach every active profile link renderer', async () => {
  const [card, fullBleed, preview, shell] = await Promise.all([
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/profile-layout/ProfileFullBleedLayout.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileShell.svelte')
  ]);
  assert.match(card, /safeLinkScale[\s\S]*\* \.16/);
  assert.match(card, /rgba\(255,255,255/);
  assert.match(fullBleed, /export let linkStyle = null/);
  assert.match(fullBleed, /safeLinkScale[\s\S]*\* \.16/);
  assert.match(fullBleed, /--profile-full-bleed-link-scale/);
  assert.doesNotMatch(fullBleed, /\.profile-full-bleed__links a \{[^}]*box-shadow:/);
  assert.match(fullBleed, /drop-shadow\(0 0/);
  assert.doesNotMatch(card, /\.profile-reference-card--framed \.profile-reference-card__links a \{[^}]*box-shadow:/);
  assert.match(card, /\.profile-reference-card--framed \.profile-reference-card__links a img[^}]*drop-shadow\(0 0/);
  assert.match(preview, /<ProfileFullBleedLayout[\s\S]*\{linkStyle\}/);
  assert.match(shell, /<ProfileFullBleedLayout[\s\S]*linkStyle=\{effectiveProfileConfig\.linkStyle\}/);
});

test('layout renderer composes Compact and Immersive through distinct presentation regions', async () => {
  const [card, fullBleed, dailyRoll, shell, preview, customize, settings, roll, content, widgets, renderModel] = await Promise.all([
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/profile-layout/ProfileFullBleedLayout.svelte'),
    read('src/lib/ProfileDailyRoll.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileRoll.svelte'),
    read('src/lib/ProfileContent.svelte'),
    read('src/lib/ProfileWidgets.svelte'),
    read('src/lib/profileRenderModel.js')
  ]);
  assert.match(shell, /ProfileReferenceCard/);
  assert.match(shell, /<ProfileFullBleedLayout/);
  assert.match(card, /ProfileDailyRoll/);
  assert.match(fullBleed, /data-profile-layout-content="full-bleed"/);
  assert.doesNotMatch(shell, /ProfileLayoutFrame|IdentityCard|profile-layout-frame/);
  assert.doesNotMatch(dailyRoll, /profile-daily-roll--(?:sleek|minimal|modern|portfolio)/);
  assert.doesNotMatch(shell, /profileLayoutFrameComponent|Profile layout pending/);
  assert.match(shell, /isOwner=\{isOwnProfile\}/);
  assert.match(shell, /compact=\{true\}/);
  assert.match(shell, /links=\{openingLinks\}/);
  assert.match(shell, /continuationLinks/);
  assert.match(shell, /buildProfileRenderSnapshot/);
  assert.match(renderModel, /getProfileLayoutLinkPartitions/);
  assert.match(renderModel, /continuationSocialLinks/);
  assert.match(renderModel, /continuationNavigationLinks/);
  assert.match(renderModel, /hasBelowFoldRoll = showRoll[\s\S]*full-bleed[\s\S]*framed/);
  assert.match(shell, /\{#if renderProfileMore\}[\s\S]*<div id="profile-more"/);
  assert.match(renderModel, /hasLowerExpression = hasProfileMusic/);
  const mediaDeleteMigration = await read('supabase/migrations/20260812160000_profile_media_delete_token_guard.sql');
  assert.match(mediaDeleteMigration, /v_selected := v_selected OR EXISTS/);
  assert.doesNotMatch(mediaDeleteMigration, /v_selected := EXISTS/);
  assert.match(shell, /profilePresentationLayoutVariant === 'full-bleed'/);
  assert.match(shell, /<ProfileFullBleedLayout/);
  assert.match(shell, /profile-shell__more-cue--continuation/);
  assert.doesNotMatch(shell, /links=\{visibleLinks\}/);
  assert.match(card, /profile-border-effect--content/);
  assert.match(dailyRoll, /profile-daily-roll--' \+ variant/);
  assert.match(preview, /profile-studio-preview__stage/);
  assert.doesNotMatch(preview, /logical-canvas|1440|previewScale|transform: scale/);
  assert.doesNotMatch(fullBleed, /role="tab"|presenceLabel|daily color profile/);
  assert.doesNotMatch(preview, /@container profile-preview \(max-width: 31rem\)/);
  assert.match(preview, /profile-studio-preview__viewport[\s\S]*width: min\(350px, 100%\)/);
  assert.match(preview, /profile-studio-preview__footer/);
  assert.doesNotMatch(preview, /device-sample/);
  assert.match(dailyRoll, /presentation=\{variant\}/);
  assert.match(roll, /profile-roll--presentation[\s\S]*final-color-display/);
  assert.match(dailyRoll, /final-color-display/);
  assert.match(shell, /profile-shell__continuation-column/);
  assert.match(shell, /data-profile-continuation="content"[\s\S]*data-profile-continuation="links"[\s\S]*data-profile-continuation="media"/);
  assert.match(shell, /formatLinkDestination/);
  assert.match(content, /About me/);
  assert.doesNotMatch(content, /↗/);
  assert.doesNotMatch(widgets, /↗/);
  assert.match(preview, /profile-studio-preview__canvas/);
  assert.match(preview, /ProfileReferenceCard/);
  assert.doesNotMatch(preview, /profile-studio-preview__scroll-cue|previewContentOverflow|previewOpeningOverflow|overflow-y:\s*auto/);
  assert.doesNotMatch(shell, /data-preview-opening-overflow/);
  assert.match(preview, /export let previewRenderSnapshot/);
  assert.doesNotMatch(preview, /previewIdentityOnly/);
  assert.match(customize, /ProfileReferenceLayoutEditor/);
  assert.doesNotMatch(customize, /export function getDraftConfig/);
  assert.match(customize, /<ProfileAppearanceEditor[\s\S]*layoutVariant=\{profileConfig\?\.draft\?\.layoutVariant/);
  assert.match(settings, /function getDashboardDraft\(\)[\s\S]*studioDraft \|\| toEditorProfileConfig/);
  assert.match(settings, /applyProfileStudioDraftPatch/);
});

test('Studio media mutations return the profile concurrency token', async () => {
  const [migration, deleteMigration, expressionEditor, richMediaEditor, settings] = await Promise.all([
    read('supabase/migrations/20260812150000_profile_media_updated_at_contract.sql'),
    read('supabase/migrations/20260812160000_profile_media_delete_token_guard.sql'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('src/lib/ProfileSettings.svelte')
  ]);

  for (const functionName of [
    'update_my_profile_audio',
    'select_my_profile_rich_media',
    'commit_my_profile_media_replacement'
  ]) {
    const functionStart = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}`);
    const nextFunction = migration.indexOf('CREATE OR REPLACE FUNCTION public.', functionStart + 1);
    const functionBody = migration.slice(functionStart, nextFunction === -1 ? migration.length : nextFunction);
    assert(functionStart >= 0, `${functionName} is missing from the media token migration.`);
    assert.match(functionBody, /updated_at = now\(\)/);
    assert.match(functionBody, /RETURNING updated_at INTO v_updated_at/);
    assert.match(functionBody, /'updated_at', v_updated_at/);
  }
  const deleteFunctionStart = deleteMigration.indexOf('CREATE OR REPLACE FUNCTION public.delete_my_profile_media_asset');
  assert(deleteFunctionStart >= 0, 'The guarded media deletion function is missing.');
  const deleteFunction = deleteMigration.slice(deleteFunctionStart);
  assert.match(deleteFunction, /v_selected boolean/);
  assert.match(deleteFunction, /v_audio_path/);
  assert.match(deleteFunction, /v_asset\.kind = 'audio'[\s\S]*v_audio_path IS NOT DISTINCT FROM v_asset\.storage_path/);
  assert.match(deleteFunction, /audio_path = CASE WHEN v_asset\.kind = 'audio' AND v_audio_path IS NOT DISTINCT FROM v_asset\.storage_path THEN NULL ELSE audio_path END/);
  assert.match(deleteFunction, /IF v_selected THEN[\s\S]*UPDATE public\.profile_configurations/);
  assert.match(deleteFunction, /'configuration_changed', v_selected/);
  assert.match(deleteFunction, /storage\.allow_delete_query/);
  assert.match(expressionEditor, /updatedAt: data\.updated_at/);
  const deletionHandlerStart = expressionEditor.indexOf('async function deleteAsset');
  const deletionHandler = expressionEditor.slice(deletionHandlerStart, expressionEditor.indexOf('function formatAudioTime', deletionHandlerStart));
  assert.match(deletionHandler, /dispatch\('expressionchange', \{ \.\.\.expression, media_references: nextReferences, updatedAt: data\.updated_at/);
  assert.match(richMediaEditor, /updatedAt: data\.updated_at/);
  assert.match(settings, /fields\.updatedAt \|\| fields\.updated_at/);
});

test('public viewport and Compact roll contracts do not inherit legacy offsets', async () => {
  const [shell, roll, card, music] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileRoll.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/ProfileMusic.svelte')
  ]);
  assert.doesNotMatch(shell, /4\.75rem/);
  assert.match(shell, /--profile-viewport-offset: 0px/);
  assert.match(shell, /calc\(100dvh - var\(--profile-viewport-offset/);
  assert.match(roll, /profile-roll--quiet\.profile-roll--compact:not\(\.profile-roll--presentation\)/);
  assert.match(card, /profile-reference-card__links/);
  assert.match(card, /profile-reference-card__avatar/);
  assert.doesNotMatch(card, /identity-card--layout-(?:sleek|minimal|modern|portfolio)/);
  assert.match(music, /profile-music--compact profile-music--spotify-compact/);
  const compactMusicBranch = music.split('{:else if spotifyEmbedSrc && compact}')[1]?.split('{:else if spotifyEmbedSrc && (!deferMedia')[0] || '';
  assert.doesNotMatch(compactMusicBranch, /<iframe/);
});

test('surface and canvas ownership stay bounded at the renderer boundaries', async () => {
  const [border, canvas, renderer] = await Promise.all([
    read('src/lib/profile-border/ProfileBorderEffect.svelte'),
    read('src/lib/name/NameEffectCanvas.svelte'),
    read('src/lib/name/nameRenderer.js')
  ]);
  assert.match(border, /profile-border-effect--content/);
  assert.match(border, /profile-border-effect--surface/);
  assert.match(border, /profile-border-effect__content \{ overflow: visible; \}/);
  assert.match(canvas, /lastHostSize/);
  assert.match(canvas, /Math\.min\(1024/);
  assert.match(canvas, /profile-reference-card__name/);
  assert.match(renderer, /MAX_CANVAS_WIDTH = 1024/);
  assert.match(renderer, /MAX_CANVAS_HEIGHT = 256/);
});

test('public profile does not inject filler bio copy or obsolete handle styles', async () => {
  const [shell, identity, homepage] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte')
  ]);
  assert.doesNotMatch(shell + homepage, /No bio added yet/);
  assert.doesNotMatch(identity, /identity-card__handle-row|identity-card__handle/);
});

test('the layout reset leaves only Compact and Immersive in the active catalog', async () => {
  const migration = await read('supabase/migrations/20260815130000_profile_compact_immersive_reset.sql');
  assert.match(migration, /css_value IN \('compact', 'full-bleed'\)/);
  assert.match(migration, /Expected 2 active Profile Layout rows/);
  assert.match(migration, /DELETE FROM public\.shop_items/);
});
