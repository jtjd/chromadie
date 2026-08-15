import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_LAYOUT_DEFINITIONS,
  PROFILE_LAYOUT_KEYS,
  resolveProfileLayoutPreviewVariant,
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
import { createProfileTemplatePatch } from '../src/lib/profileTemplates.js';
import { PROFILE_LINK_DEFINITIONS, PROFILE_LINK_TYPES, isProfileSocialLink } from '../src/lib/profileLinkTypes.js';
import { RICH_PROFILE_FIXTURE } from '../scripts/browser/profile-rich-fixture.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the five layout definitions carry distinct structural contracts', () => {
  assert.deepEqual(PROFILE_LAYOUT_KEYS, ['compact', 'sleek', 'minimal', 'modern', 'portfolio']);
  assert.deepEqual(
    PROFILE_LAYOUT_KEYS.map(key => PROFILE_LAYOUT_DEFINITIONS[key].structure),
    [
      { identity: 'horizontal', roll: 'integrated', surface: 'card' },
      { identity: 'stacked', roll: 'detached', surface: 'card-with-strips' },
      { identity: 'offset', roll: 'inline', surface: 'cardless' },
      { identity: 'compact', roll: 'widget', surface: 'card-with-region' },
      { identity: 'hero', roll: 'below-fold', surface: 'cardless' }
    ]
  );
});

test('public layout authority comes from profile configuration, with a separate fitting-room resolver', () => {
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'profile_layout_modern', layoutVariant: 'sleek' }), 'sleek');
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'profile_layout_modern', layoutVariant: 'not-real' }), 'compact');
  assert.equal(resolveProfileLayoutPreviewVariant({ profile_layout: 'profile_layout_modern' }, { layoutVariant: 'sleek' }), 'modern');
  assert.equal(resolveProfileLayoutPreviewVariant({}, { layoutVariant: 'portfolio' }), 'portfolio');
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

test('layout link partitions keep compact openings quiet while allowing minimal labels', () => {
  const config = normalizeProfileConfig({
    ...createDefaultProfileConfig(),
    configurationVersion: 2,
    links: RICH_PROFILE_FIXTURE.links.map((link, order) => ({ ...link, key: `layout-link-${order}`, order, visible: true }))
  });
  const compact = getProfileLayoutLinkPartitions(config, 'compact');
  const minimal = getProfileLayoutLinkPartitions(config, 'minimal');

  assert.deepEqual(compact.opening.map(link => link.label), ['GitHub', 'YouTube', 'Twitch', 'Instagram']);
  assert.deepEqual(compact.continuation.map(link => link.label), ['Personal site', 'Portfolio', 'Project notes', 'Now playing', 'Field guide', 'Contact']);
  assert.deepEqual(minimal.opening.map(link => link.label), ['GitHub', 'YouTube', 'Twitch', 'Instagram', 'Personal site', 'Portfolio']);
  assert.deepEqual(minimal.continuation.map(link => link.label), ['Project notes', 'Now playing', 'Field guide', 'Contact']);
  for (const partition of [compact, minimal]) {
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
  const minimal = getProfileLayoutLinkPartitions(config, 'minimal');

  assert.deepEqual(compact.opening.map(link => link.label), ['GitHub', 'YouTube', 'Twitch']);
  assert.deepEqual(compact.continuation.map(link => link.label), ['Website', 'Portfolio', 'Blog', 'Project', 'Store', 'Contact']);
  assert.deepEqual(minimal.opening.map(link => link.label), ['Website', 'Portfolio', 'GitHub', 'YouTube', 'Twitch']);
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
    base: { ...fallback.base, layoutVariant: 'sleek' }
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
    ...createProfileTemplatePatch('compact')
  });
  const sleek = normalizeProfileConfig({ ...published, ...createProfileTemplatePatch('sleek') });
  const compactAgain = normalizeProfileConfig({ ...sleek, ...createProfileTemplatePatch('compact') });

  assert.equal(areProfileConfigsEqual(sleek, published), false);
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
  const patch = createProfileTemplatePatch('portfolio');
  assert.equal(patch.templateKey, 'portfolio');
  assert.equal(patch.layoutVariant, 'portfolio');
  assert.deepEqual(patch.modules.map(module => module.id), ['roll', 'signature', 'links', 'recent', 'achievements', 'stats', 'boundary', 'explore']);
  assert.deepEqual(createDefaultProfileConfig().modules.map(module => module.id), [
    'roll', 'stats', 'signature', 'links', 'recent', 'achievements', 'boundary', 'explore'
  ]);
});

test('editor, renderer, and public icon files consume one link service registry', async () => {
  const [editor, identity] = await Promise.all([
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/IdentityCard.svelte')
  ]);
  assert.equal(PROFILE_LINK_TYPES.length, PROFILE_LINK_DEFINITIONS.length);
  assert.equal(new Set(PROFILE_LINK_TYPES).size, PROFILE_LINK_TYPES.length);
  for (const definition of PROFILE_LINK_DEFINITIONS) {
    assert.match(editor, new RegExp(`PROFILE_LINK_DEFINITIONS`));
    assert.match(identity, /getProfileLinkDefinition/);
    assert.match(definition.icon, /^[a-z0-9-]+$/);
  }
  assert.match(editor, /PROFILE_LINK_DEFINITIONS as definition/);
  assert.equal(isProfileSocialLink('github'), true);
  assert.equal(isProfileSocialLink('spotify'), true);
  assert.equal(isProfileSocialLink('website'), false);
  assert.equal(isProfileSocialLink('other'), false);
});

test('layout renderer composes the shared roll through distinct presentation regions', async () => {
  const [frame, dailyRoll, shell, preview, customize, settings, roll, content, widgets, renderModel] = await Promise.all([
    read('src/lib/ProfileLayoutFrame.svelte'),
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
  assert.match(shell, /profile-layout-frame__identity/);
  assert.match(shell, /profile-layout-frame__roll/);
  for (const variant of ['compact', 'sleek', 'minimal', 'modern', 'portfolio']) {
    assert.match(dailyRoll, new RegExp(`profile-daily-roll--${variant}`));
  }
  assert.match(shell, /import ProfileLayoutFrame from '\.\/ProfileLayoutFrame\.svelte'/);
  assert.match(shell, /<ProfileLayoutFrame/);
  assert.doesNotMatch(shell, /profileLayoutFrameComponent|Profile layout pending/);
  assert.match(shell, /profile-layout-frame__identity/);
  assert.match(shell, /profile-layout-frame__strip/);
  assert.match(dailyRoll, /profile-daily-roll--sleek/);
  assert.match(dailyRoll, /profile-daily-roll--modern/);
  assert.match(shell, /isOwner=\{isOwnProfile\}/);
  assert.match(shell, /compact=\{true\}/);
  assert.match(shell, /links=\{openingLinks\}/);
  assert.match(shell, /continuationLinks/);
  assert.match(shell, /buildProfileRenderSnapshot/);
  assert.match(renderModel, /getProfileLayoutLinkPartitions/);
  assert.match(renderModel, /continuationSocialLinks/);
  assert.match(renderModel, /continuationNavigationLinks/);
  assert.match(renderModel, /hasBelowFoldRoll = showRoll[\s\S]*layoutVariant === 'portfolio'/);
  assert.match(shell, /\{#if renderProfileMore\}[\s\S]*<div id="profile-more"/);
  assert.match(renderModel, /hasLowerExpression = hasProfileMusic/);
  const mediaDeleteMigration = await read('supabase/migrations/20260812160000_profile_media_delete_token_guard.sql');
  assert.match(mediaDeleteMigration, /v_selected := v_selected OR EXISTS/);
  assert.doesNotMatch(mediaDeleteMigration, /v_selected := EXISTS/);
  assert.match(shell, /profilePresentationLayoutVariant === 'portfolio' \? 'Explore profile' : \(continuationLinks\.length \? 'Links' : 'More'\)/);
  assert.match(shell, /profile-shell__more-cue--continuation/);
  assert.match(frame, /profile-shell-page--minimal\) \.profile-layout-frame \{ --profile-layout-width: 300px; \}/);
  assert.doesNotMatch(frame, /profile-shell-page--minimal\)[^{]*\{[^}]*margin-left/);
  assert.doesNotMatch(shell, /links=\{visibleLinks\}/);
  assert.match(shell, /profile-border-effect--content/);
  assert.match(dailyRoll, /profile-daily-roll--' \+ variant/);
  assert.match(preview, /profile-studio-preview__stage/);
  assert.doesNotMatch(preview, /logical-canvas|1440|previewScale|transform: scale/);
  assert.doesNotMatch(frame, /role="tab"|presenceLabel|daily color profile/);
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
  assert.match(customize, /<ProfileAppearanceEditor[\s\S]*layoutVariant="compact"/);
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

test('public viewport and compact roll contracts do not inherit legacy offsets', async () => {
  const [shell, roll, identity, music] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileRoll.svelte'),
    read('src/lib/IdentityCard.svelte'),
    read('src/lib/ProfileMusic.svelte')
  ]);
  assert.doesNotMatch(shell, /4\.75rem/);
  assert.match(shell, /--profile-viewport-offset: 0px/);
  assert.match(shell, /calc\(100dvh - var\(--profile-viewport-offset/);
  assert.match(roll, /profile-roll--quiet\.profile-roll--compact:not\(\.profile-roll--presentation\)/);
  assert.match(identity, /identity-card__links--labeled/);
  assert.match(identity, /socialLinks/);
  assert.match(identity, /navigationLinks/);
  assert.match(identity, /identity-card--layout-minimal \.identity-card__metadata \{ font-size: \.7rem; \}/);
  assert.match(identity, /identity-card--layout-compact :global\(\.identity-card__avatar\).*64px/);
  assert.match(identity, /identity-card--layout-minimal :global\(\.identity-card__avatar\).*82px/);
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
  assert.match(canvas, /--identity-name-size/);
  assert.match(renderer, /MAX_CANVAS_WIDTH = 1024/);
  assert.match(renderer, /MAX_CANVAS_HEIGHT = 256/);
});

test('public profile does not inject filler bio copy or obsolete handle styles', async () => {
  const [shell, identity, homepage, shop] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/IdentityCard.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/ShopStudioPreview.svelte')
  ]);
  assert.doesNotMatch(shell + homepage + shop, /No bio added yet/);
  assert.doesNotMatch(identity, /identity-card__handle-row|identity-card__handle/);
});

test('story-stack migration ownership maps to portfolio consistently', async () => {
  const migration = await read('supabase/migrations/20260811150000_profile_layout_catalog_replacement.sql');
  assert.match(migration, /profile_layout_story_stack' THEN 'profile_layout_portfolio'/);
  assert.doesNotMatch(migration, /profile_layout_story_stack' THEN 'profile_layout_compact'/);
});
