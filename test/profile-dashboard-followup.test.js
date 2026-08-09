import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('dashboard navigation has one canonical ordered IA and safe mobile drawer behavior', async () => {
  const [settings, shell] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileDashboardShell.svelte')
  ]);
  const app = await read('src/App.svelte');
  const ids = ['customize', 'links', 'premium', 'overview', 'profile-insights', 'profile-notifications', 'profile-social', 'progression', 'account'];
  let previous = -1;
  for (const id of ids) {
    const index = settings.indexOf("id: '" + id + "'");
    assert.ok(index > previous, id + ' should follow the previous dashboard section');
    previous = index;
  }
  for (const alias of ['identity', 'expression', 'layout', 'social', 'collection', 'appearance']) {
    assert.match(settings, new RegExp(alias + ": '[^']+'"));
  }
  assert.match(settings, /history\.pushState/);
  assert.match(settings, /popstate/);
  assert.match(settings, /beforeunload/);
  assert.match(settings, /chromadie:navigation-request/);
  assert.match(app, /chromadie:navigation-request/);
  assert.match(shell, /profileGroupExpanded/);
  assert.match(shell, /inert=/);
  assert.match(shell, /bodyOverflowBeforeDrawer/);
  assert.doesNotMatch(shell, /sidebar-foot|profile-dashboard-shell__account|Sign out|View profile/);
});

test('section editors publish only their own contract and preserve conflicts', async () => {
  const [layout, appearance, migration, sqlTest, settings] = await Promise.all([
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('supabase/migrations/20260805100000_profile_appearance_dashboard.sql'),
    read('supabase/tests/launch_security.sql'),
    read('src/lib/ProfileSettings.svelte')
  ]);
  assert.match(layout, /p_section: 'composition'/);
  assert.match(layout, /compositionPatch/);
  assert.match(layout, /Reload server version/);
  assert.match(layout, /data\?\.code === 'conflict'/);
  assert.doesNotMatch(layout, /data\?\.error === 'conflict'/);
  assert.doesNotMatch(layout, /save_profile_configuration['"]/);
  assert.doesNotMatch(layout, /publish_profile_configuration['"]/);
  assert.doesNotMatch(layout, /Signature color|Ambient color|colorEffectsEnabled/);
  assert.match(layout, /function hasDraftChanges\(\)/);
  assert.match(layout, /emitDirty\(true\)/);
  assert.match(layout, /emitDirty\(false\)/);
  assert.doesNotMatch(layout, /dispatch\('dirty', \{ dirty: isDirty \}\)/);
  assert.match(layout, /hasUnpublishedChanges/);
  assert.match(layout, /disabled=\{saving \|\| \(!isDirty && !hasUnpublishedChanges\)\}/);
  assert.match(appearance, /invalidHex/);
  assert.match(appearance, /Reload server version/);
  assert.match(appearance, /data\?\.code === 'conflict'/);
  assert.doesNotMatch(appearance, /data\?\.error === 'conflict'/);
  assert.match(appearance, /hasUnpublishedChanges/);
  assert.match(appearance, /action === 'publish' && !dirty && !hasUnpublishedChanges/);
  assert.match(appearance, /disabled=\{saving \|\| invalidHex \|\| \(!dirty && !hasUnpublishedChanges\)\}/);
  assert.match(appearance, /disabled=\{saving \|\| \(!dirty && !invalidHex\)\}/);
  assert.match(migration, /'draft', v_record\.draft_config/);
  assert.match(migration, /'published', v_record\.published_config/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.profile_composition_patch/);
  assert.match(sqlTest, /config_composition_save/);
  assert.match(sqlTest, /composition save accepted appearance or effect keys/);
  assert.match(sqlTest, /config_composition_publish/);
  assert.match(layout, /function setModuleSize/);
  assert.match(layout, /Fixed system surface/);
  assert.match(layout, /Complete each link with a label and an HTTPS URL/);
  assert.match(settings, /configurationPreview = configurationPreview/);
});

test('collection fitting room previews the draft card appearance and media', async () => {
  const preview = await read('src/lib/ShopStudioPreview.svelte');
  assert.match(preview, /profileConfig\?\.draft \|\| profileConfig\?\.published/);
  assert.match(preview, /getProfileAppearanceStyle\(previewProfileConfig\)/);
  assert.match(preview, /previewBackgroundSrc/);
  assert.match(preview, /style=\{previewCardStyle\}/);
  assert.match(preview, /studio-profile-card[\s\S]*studio-atmosphere-layer/);
  assert.match(preview, /studio-profile-card[\s\S]*studio-cursor-layer/);
});

test('preview renders bounded media and never exposes mutations', async () => {
  const [settings, shell, music] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileMusic.svelte')
  ]);
  assert.match(settings, /previewCollectionItems/);
  assert.match(settings, /previewScores/);
  assert.match(settings, /previewProfile = context\?\.targetProfile/);
  assert.match(settings, /void loadPreviewComponent\(\)/);
  assert.match(settings, /slot="preview"/);
  assert.doesNotMatch(settings, /function openPreview/);
  assert.doesNotMatch(settings, /profile-preview-drawer__backdrop/);
  assert.match(shell, /\{#if backgroundSrc && !previewMode\}/);
  assert.match(shell, /profile-shell__media-background/);
  assert.match(shell, /profile-shell__page-atmosphere-layer/);
  assert.match(shell, /profile-shell__page-cursor-layer/);
  assert.match(shell, /\{#if backgroundSrc && previewMode\}/);
  assert.match(shell, /profile-shell__card-media-background/);
  assert.match(shell, /profile-shell__card-atmosphere-layer/);
  assert.match(shell, /profile-shell__card-cursor-layer/);
  assert.match(shell, /<ProfileBorderEffect[\s\S]*\{#if atmosphereKey && previewMode\}/);
  assert.match(shell, /if \(previewMode \|\| !targetProfile\?\.id/);
  assert.match(shell, /\{#if !previewMode && !isOwnProfile\}/);
  assert.match(shell, /deferMedia=\{previewMode\}/);
  assert.match(music, /autoplay=\{!deferMedia\}/);
  assert.match(music, /loading="lazy"/);
});

test('appearance controls are consumed by the identity card and fitting-room renderer', async () => {
  const [appearanceStyle, identityCard, preview, editor, shell, atmosphere] = await Promise.all([
    read('src/lib/profileAppearanceStyle.js'),
    read('src/lib/IdentityCard.svelte'),
    read('src/lib/ShopStudioPreview.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profile-atmosphere/AtmosphereLayer.svelte')
  ]);
  assert.match(appearanceStyle, /function rgbaFromHex/);
  assert.match(appearanceStyle, /--profile-surface-blur:\$\{appearance\.surface\.blur\}px/);
  assert.match(appearanceStyle, /--profile-surface-fill:\$\{rgbaFromHex/);
  assert.match(identityCard, /background: var\(--profile-surface-fill/);
  assert.match(identityCard, /backdrop-filter: blur\(var\(--profile-surface-blur/);
  assert.match(shell, /profile-border-effect\.profile-shell__identity-boundary\) \{ isolation: auto;/);
  assert.match(shell, /:global\(\.profile-atmosphere\.profile-shell__page-atmosphere-layer\) \{ isolation: auto; \}/);
  assert.match(shell, /profile-atmosphere\.profile-shell__card-atmosphere-layer\),[\s\S]*profile-atmosphere\.profile-shell__surface-atmosphere-layer\) \{ isolation: auto; filter: blur\(var\(--profile-surface-blur/);
  assert.match(shell, /profile-shell__surface-backdrop/);
  assert.match(shell, /profile-shell__surface-media-background \{ position: absolute; inset: -6%; z-index: 0; background-position: center; background-size: cover; filter: blur\(var\(--profile-surface-blur/);
  assert.match(shell, /profile-atmosphere\.profile-shell__surface-atmosphere-layer\)/);
  assert.match(preview, /studio-profile-card :global\(\.studio-atmosphere-layer\) \{ z-index: 0; opacity: \.82; isolation: auto; filter: blur\(var\(--profile-surface-blur/);
  assert.match(preview, /studio-profile-card__background \{ position: absolute; inset: 0; z-index: 0; background-position: center; background-size: cover; filter: blur\(var\(--profile-surface-blur/);
  assert.match(atmosphere, /\.profile-atmosphere \{[^}]*isolation: auto;/);
  assert.match(identityCard, /color: var\(--profile-text/);
  assert.match(identityCard, /color: var\(--profile-highlight/);
  assert.match(preview, /border: var\(--profile-border-width/);
  assert.match(preview, /background: var\(--profile-surface-fill/);
  assert.match(editor, /Surface opacity controls how much of the background shows through/);
});

test('dirty prompt is keyboard-complete and editor reload actions remain reachable', async () => {
  const [settings, appearance, layout] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileEditor.svelte')
  ]);
  assert.match(settings, /dirtyPromptPrimary/);
  assert.match(settings, /requestAnimationFrame\(\(\) => dirtyPromptPrimary\?\.focus\(\)\)/);
  assert.match(settings, /trapFocus\(event, dirtyPrompt\)/);
  assert.match(settings, /event\.key === 'Escape'/);
  assert.match(settings, /stayOnPage\(\)/);
  assert.match(settings, /restoreFocus\(previous\)/);
  assert.match(appearance, /on:click=\{reloadServerVersion\}/);
  assert.match(layout, /on:click=\{reloadServerVersion\}/);
});

test('legacy profile reuses the account deletion contract and mounted editor copy stays functional', async () => {
  const paths = [
    'src/lib/Profile.svelte',
    'src/lib/ProfileStudioOverview.svelte',
    'src/lib/IdentityEditor.svelte',
    'src/lib/ProfileExpressionEditor.svelte',
    'src/lib/ProfileSocial.svelte',
    'src/lib/ProfileCosmeticsEditor.svelte',
    'src/lib/ProfileProgression.svelte'
  ];
  const contents = await Promise.all(paths.map(read));
  const [legacy, overview, identity, media, social, collection, progression] = contents;
  assert.match(legacy, /ProfileAccountSettings/);
  assert.doesNotMatch(legacy, /deleteAccount|deletePhrase|handleDeleteAccount/);
  for (const source of [overview, identity, media, social, collection, progression]) {
    assert.doesNotMatch(source, /profile-settings-page__eyebrow/);
  }
  assert.doesNotMatch(overview, /Your profile is the game|The page remembers|Built through play/);
  assert.doesNotMatch(progression, /Let the profile remember the work|View live profile/);
});
