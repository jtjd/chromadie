import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('dashboard navigation has one canonical ordered IA and safe mobile drawer behavior', async () => {
  const [settings, contract, shell] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/dashboardContract.js'),
    read('src/lib/ProfileDashboardShell.svelte')
  ]);
  const studio = [contract, settings].join('\n');
  const app = await read('src/App.svelte');
  const ids = ['overview', 'customize', 'links', 'premium', 'profile-insights', 'profile-notifications', 'profile-social', 'progression', 'account'];
  let previous = -1;
  for (const id of ids) {
    const index = studio.indexOf("id: '" + id + "'");
    assert.ok(index > previous, id + ' should follow the previous dashboard section');
    previous = index;
  }
  for (const alias of ['identity', 'expression', 'layout', 'social', 'collection', 'appearance']) {
    assert.match(studio, new RegExp(alias + ": '[^']+'"));
  }
  assert.match(settings, /history\.pushState/);
  assert.match(settings, /popstate/);
  assert.match(settings, /beforeunload/);
  assert.match(settings, /chromadie:navigation-request/);
  assert.match(app, /chromadie:navigation-request/);
  assert.match(shell, /profileGroupExpanded/);
  assert.match(shell, /inert=/);
  assert.match(shell, /bodyOverflowBeforeDrawer/);
  assert.match(shell, /profile-dashboard-shell__owner/);
  assert.match(shell, /View profile/);
  assert.doesNotMatch(shell, /Sign out|Theme selector/i);
  assert.match(shell, /profile-dashboard-shell__mode-toggle/);
  assert.match(shell, /aria-label=\{colorMode === 'dark' \? 'Use light mode' : 'Use dark mode'\}/);
});

test('section editors stage bounded drafts for the aggregate dashboard action', async () => {
  const [layout, appearance, migration, sqlTest, settings, actions] = await Promise.all([
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('supabase/migrations/20260805100000_profile_appearance_dashboard.sql'),
    read('supabase/tests/launch_security.sql'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileDashboardActions.svelte')
  ]);
  assert.match(layout, /export function getDraftConfig/);
  assert.match(layout, /export function validateDraft/);
  assert.doesNotMatch(layout, /Reload server version|save_profile_configuration_section|publish_profile_configuration_section/);
  assert.doesNotMatch(layout, /Signature color|Ambient color|colorEffectsEnabled/);
  assert.match(layout, /function hasDraftChanges\(\)/);
  assert.match(layout, /emitDirty\(true\)/);
  assert.match(layout, /emitDirty\(false\)/);
  assert.doesNotMatch(layout, /dispatch\('dirty', \{ dirty: isDirty \}\)/);
  assert.match(appearance, /invalidHex/);
  assert.match(appearance, /export function getDraftAppearance/);
  assert.doesNotMatch(appearance, /Reload server version|save_profile_configuration_section|publish_profile_configuration_section|profile-appearance-editor__actions/);
  assert.match(settings, /save_profile_configuration_v2/);
  assert.match(settings, /publish_profile_studio_v2/);
  assert.match(actions, /Publish profile/);
  assert.match(actions, /--dashboard-action-save: var\(--ctp-green/);
  assert.match(actions, /profile-dashboard-actions__publish \{[^}]*var\(--dashboard-action-save/);
  assert.match(appearance, /appearance-editor__color-input:focus-within/);
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
  const [settings, preview, shell, music] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileMusic.svelte')
  ]);
  const studioPreview = [settings, preview].join('\n');
  assert.match(studioPreview, /previewCollectionItems/);
  assert.match(studioPreview, /previewScores/);
  assert.match(settings, /createProfileStudioPreviewModel/);
  assert.match(settings, /void loadPreviewComponent\(\)/);
  assert.match(settings, /slot="preview"/);
  assert.doesNotMatch(settings, /function openPreview/);
  assert.doesNotMatch(studioPreview, /profile-preview-drawer__backdrop/);
  assert.match(shell, /\$: backgroundSrc = getProfileMediaUrl/);
  assert.match(shell, /<img class="profile-shell__media-image" src=\{backgroundSrc\}/);
  assert.doesNotMatch(shell, /profilePageMediaStyle|profile-page-media-image/);
  assert.doesNotMatch(shell, /profile-shell__media-background/);
  assert.match(shell, /profile-shell__page-atmosphere-layer/);
  assert.match(shell, /profile-shell__page-cursor-layer/);
  assert.match(shell, /background: var\(--profile-background-paint, var\(--color-canvas-deep\)\);/);
  assert.match(shell, /\.profile-shell__media-image,[\s\S]*\.profile-shell__media-video/);
  assert.match(shell, /<div class="profile-shell__surface-backdrop"/);
  assert.doesNotMatch(shell, /<div class="profile-shell__card-media-background"|<div class="profile-shell__surface-media-background"/);
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
  const [appearanceStyle, identityCard, preview, editor, shell, atmosphere, viteConfig] = await Promise.all([
    read('src/lib/profileAppearanceStyle.js'),
    read('src/lib/IdentityCard.svelte'),
    read('src/lib/ShopStudioPreview.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profile-atmosphere/AtmosphereLayer.svelte'),
    read('vite.config.js')
  ]);
  assert.match(appearanceStyle, /function rgbaFromHex/);
  assert.match(appearanceStyle, /--profile-surface-blur:\$\{appearance\.surface\.blur\}px/);
  assert.match(appearanceStyle, /--profile-surface-fill:\$\{rgbaFromHex/);
  assert.match(identityCard, /background: var\(--profile-surface-fill/);
  assert.match(identityCard, /backdrop-filter: blur\(var\(--profile-surface-blur/);
  assert.match(identityCard, /@supports \(backdrop-filter: blur\(0\)\) \{[\s\S]*\.identity-card \{ backdrop-filter: blur\(var\(--profile-surface-blur/);
  assert.match(shell, /profile-border-effect\.profile-shell__identity-boundary\) \{ isolation: auto;/);
  assert.match(shell, /:global\(\.profile-atmosphere\.profile-shell__page-atmosphere-layer\) \{ isolation: auto; \}/);
  assert.match(shell, /<div class="profile-shell__surface-backdrop" aria-hidden="true"><\/div>/);
  assert.match(shell, /\.profile-shell__surface-backdrop \{[\s\S]*background: rgba\(0, 0, 0, 0\.001\);[\s\S]*backdrop-filter: blur\(var\(--profile-surface-blur/);
  assert.match(shell, /@supports \(backdrop-filter: blur\(0\)\) \{[\s\S]*\.profile-shell__surface-backdrop \{ backdrop-filter: blur\(var\(--profile-surface-blur/);
  assert.doesNotMatch(viteConfig, /csso|restructure: false/);
  assert.match(shell, /\.profile-shell__approved-canvas,\s+\.profile-shell__opening\.profile-shell__approved-opening \{ z-index: auto; \}/);
  assert.doesNotMatch(shell, /profile-shell__surface-media|profile-shell__surface-video|profile-shell__surface-atmosphere-layer|profile-shell__surface-backdrop::before/);
  assert.match(shell, /profile-atmosphere\.profile-shell__card-atmosphere-layer\) \{ isolation: auto; \}/);
  assert.doesNotMatch(shell, /profile-atmosphere\.profile-shell__card-atmosphere-layer\) \{[^}]*filter: blur\(var\(--profile-surface-blur/);
  assert.doesNotMatch(shell, /profile-shell__surface-media-background \{[\s\S]*filter: blur\(var\(--profile-surface-blur/);
  assert.match(preview, /studio-profile-card :global\(\.studio-atmosphere-layer\) \{ z-index: 0; opacity: \.82; isolation: auto; filter: blur\(var\(--profile-surface-blur/);
  assert.match(preview, /studio-profile-card__background \{ position: absolute; inset: 0; z-index: 0; background-position: center; background-size: cover; filter: blur\(var\(--profile-surface-blur/);
  assert.match(atmosphere, /\.profile-atmosphere \{[^}]*isolation: auto;/);
  assert.match(identityCard, /color: var\(--profile-text/);
  assert.match(identityCard, /color: var\(--profile-highlight/);
  assert.match(preview, /border: var\(--profile-border-width/);
  assert.match(preview, /background: var\(--profile-surface-fill/);
  assert.match(editor, /appearance-editor__color-grid/);
  assert.match(editor, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)/);
  assert.doesNotMatch(editor, /Highlight|Background gradient|Border color|appearance-editor__style-grid/);
});

test('dirty prompt is keyboard-complete and editor reload actions remain reachable', async () => {
  const [settings, dirtyPrompt, appearance, layout] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioDirtyPrompt.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileEditor.svelte')
  ]);
  const dirtySource = [settings, dirtyPrompt].join('\n');
  assert.match(dirtySource, /focusPrimary/);
  assert.match(dirtySource, /requestAnimationFrame\(\(\) => dirtyPromptComponent\?\.focusPrimary\?\.\(\)\)/);
  assert.match(settings, /trapFocus\(event, dirtyPromptComponent\?\.getDialog\?\.\(\)\)/);
  assert.match(settings, /event\.key === 'Escape'/);
  assert.match(settings, /stayOnPage\(\)/);
  assert.match(settings, /restoreFocus\(previous\)/);
  assert.doesNotMatch(appearance, /reloadServerVersion|on:click=\{reloadServerVersion\}/);
  assert.doesNotMatch(layout, /reloadServerVersion|on:click=\{reloadServerVersion\}/);
  assert.match(settings, /on:publish=\{publishDashboard\}/);
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
