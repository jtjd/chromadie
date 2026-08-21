import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Studio navigation has one canonical ordered IA and safe compact menu behavior', async () => {
  const [settings, contract, shell] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/dashboardContract.js'),
    read('src/lib/ProfileStudioShell.svelte')
  ]);
  const studio = [contract, settings].join('\n');
  const app = await read('src/App.svelte');
  const ids = ['overview', 'customize', 'premium', 'profile-insights', 'profile-notifications', 'profile-social', 'account'];
  let previous = -1;
  for (const id of ids) {
    const index = studio.indexOf("id: '" + id + "'");
    assert.ok(index > previous, id + ' should follow the previous dashboard section');
    previous = index;
  }
  for (const alias of ['identity', 'expression', 'layout', 'social', 'collection', 'appearance']) {
    assert.match(studio, new RegExp(alias + ": '[^']+'"));
  }
  assert.match(contract, /\{ id: 'links', label: 'Links'/);
  assert.match(settings, /history\.pushState/);
  assert.match(settings, /popstate/);
  assert.match(settings, /beforeunload/);
  assert.match(settings, /chromadie:navigation-request/);
  assert.match(app, /chromadie:navigation-request/);
  assert.match(app, /view === 'progression'/);
  assert.match(contract, /PROFILE_STUDIO_PRIMARY_SECTION_IDS/);
  assert.match(shell, /getProfileStudioNavigation/);
  assert.match(shell, /profile-studio-shell__more-menu/);
  assert.match(shell, /aria-haspopup="menu"/);
  assert.match(shell, /View profile/);
  assert.doesNotMatch(shell, /Sign out|Theme selector|colorMode|sidebar|drawer/i);
});

test('section editors stage bounded drafts for the aggregate dashboard action', async () => {
  const [layout, appearance, migration, sqlTest, settings, shell] = await Promise.all([
    read('src/lib/ProfileLinksEditor.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('supabase/migrations/20260805100000_profile_appearance_dashboard.sql'),
    read('supabase/tests/launch_security.sql'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioShell.svelte')
  ]);
  assert.doesNotMatch(layout, /export function getDraftConfig/);
  assert.match(layout, /export function validateDraft/);
  assert.doesNotMatch(layout, /Reload server version|save_profile_configuration_section|publish_profile_configuration_section/);
  assert.doesNotMatch(layout, /Signature color|Ambient color|colorEffectsEnabled/);
  assert.match(layout, /\$:\s*isDirty\s*=\s*!areProfileConfigsEqual/);
  assert.match(layout, /emitDirty\(\);/);
  assert.match(layout, /areProfileConfigsEqual/);
  assert.match(layout, /emitDirty\(false\)/);
  assert.doesNotMatch(layout, /dispatch\('dirty', \{ dirty: isDirty \}\)/);
  assert.match(appearance, /invalidHex/);
  assert.match(appearance, /export function getDraftAppearance/);
  assert.doesNotMatch(appearance, /Reload server version|save_profile_configuration_section|publish_profile_configuration_section|profile-appearance-editor__actions/);
  assert.match(settings, /save_profile_configuration_v2/);
  assert.match(settings, /publish_profile_studio_v2/);
  assert.match(shell, /profile-studio-shell__publish[\s\S]*Publish profile/);
  assert.match(shell, /--studio-accent/);
  assert.match(appearance, /appearance-editor__color-input:focus-within/);
  assert.match(migration, /'draft', v_record\.draft_config/);
  assert.match(migration, /'published', v_record\.published_config/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.profile_composition_patch/);
  assert.match(sqlTest, /config_composition_save/);
  assert.match(sqlTest, /composition save accepted appearance or effect keys/);
  assert.match(sqlTest, /config_composition_publish/);
  assert.match(layout, /Public links/);
  assert.match(layout, /Complete each link with a label and a valid HTTPS URL/);
  assert.match(layout, /return validateLinks\(\)/);
  assert.match(settings, /let studioDraft = null/);
  assert.match(settings, /applyProfileStudioDraftPatch/);
});

test('Customize previews the draft card appearance and media', async () => {
  const preview = await read('src/lib/ProfileStudioPreview.svelte');
  assert.match(preview, /previewRenderSnapshot/);
  assert.match(preview, /ProfileReferenceCard/);
  assert.match(preview, /ProfileFullBleedLayout/);
  assert.match(preview, /inputSurface="container"/);
  assert.doesNotMatch(preview, /ProfileEnvironmentLayer/);
  assert.doesNotMatch(preview, /studio-profile-card|studio-atmosphere-layer|studio-cursor-layer/);
});

test('preview renders bounded media and never exposes mutations', async () => {
  const [settings, preview, shell, card, environment, music] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/ProfileEnvironmentLayer.svelte'),
    read('src/lib/ProfileMusic.svelte')
  ]);
  const studioPreview = [settings, preview].join('\n');
  assert.match(studioPreview, /previewCollectionItems/);
  assert.match(studioPreview, /previewScores/);
  assert.match(settings, /createProfileStudioPreviewModel/);
  assert.match(settings, /import\('\.\/ProfileStudioPreview\.svelte'\)/);
  assert.doesNotMatch(settings, /import\('\.\/ProfileShell\.svelte'\)|PreviewDockComponent|previewComponent/);
  assert.match(settings, /slot="preview"/);
  assert.doesNotMatch(settings, /function openPreview/);
  assert.doesNotMatch(studioPreview, /profile-preview-drawer__backdrop/);
  assert.match(settings, /previewRenderSnapshot=\{previewRenderSnapshot\}/);
  assert.match(preview, /ProfileReferenceCard/);
  assert.match(preview, /inputSurface="container"/);
  assert.doesNotMatch(preview, /ProfileEnvironmentLayer/);
  assert.doesNotMatch(preview, /ProfileShell|profile-shell-page|overflow-y:\s*auto/);
  assert.match(environment, /backgroundImageUrl/);
  assert.match(environment, /<img class="profile-environment__image" src=\{backgroundSrc\}/);
  assert.doesNotMatch(shell, /profilePageMediaStyle|profile-page-media-image/);
  assert.doesNotMatch(shell, /profile-shell__media-background/);
  assert.match(shell, /ProfileEnvironmentLayer/);
  assert.match(environment, /AtmosphereLayer/);
  assert.match(environment, /CursorTrailLayer/);
  assert.match(shell, /background: var\(--profile-background-paint, var\(--color-canvas-deep\)\);/);
  assert.match(environment, /\.profile-environment__image,[\s\S]*\.profile-environment__video/);
  assert.match(card, /profile-border-effect--content/);
  assert.doesNotMatch(shell, /<div class="profile-shell__card-media-background"|<div class="profile-shell__surface-media-background"/);
  assert.doesNotMatch(shell, /profile-shell__card-atmosphere-layer|profile-shell__card-cursor-layer/);
  assert.doesNotMatch(shell, /<ProfileBorderEffect[\s\S]*\{#if atmosphereKey && previewMode\}/);
  assert.match(shell, /if \(previewMode \|\| !targetProfile\?\.id/);
  assert.match(shell, /\{#if !previewMode && !isOwnProfile\}/);
  assert.match(shell, /deferMedia=\{previewMode\}/);
  assert.match(music, /autoplay=\{false\}/);
  assert.match(music, /loading="lazy"/);
});

test('appearance controls are consumed by the identity card and Studio renderer', async () => {
  const [appearanceStyle, identityCard, studioPreview, editor, shell, environment, atmosphere, viteConfig] = await Promise.all([
    read('src/lib/profileAppearanceStyle.js'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileEnvironmentLayer.svelte'),
    read('src/lib/profile-atmosphere/AtmosphereLayer.svelte'),
    read('vite.config.js')
  ]);
  assert.match(appearanceStyle, /function rgbaFromHex/);
  assert.match(appearanceStyle, /--profile-surface-blur:\$\{appearance\.surface\.blur\}px/);
  assert.match(appearanceStyle, /--profile-surface-fill:\$\{rgbaFromHex/);
  assert.match(identityCard, /background: var\(--profile-surface-fill/);
  assert.match(identityCard, /backdrop-filter: blur\(var\(--profile-surface-blur/);
  assert.match(identityCard, /container: profile-reference-card \/ inline-size/);
  assert.match(shell, /ProfileReferenceCard/);
  assert.match(environment, /profile-environment__overlay/);
  assert.match(identityCard, /<ProfileBorderEffect/);
  assert.doesNotMatch(shell, /profile-shell__surface-backdrop/);
  assert.doesNotMatch(viteConfig, /csso|restructure: false/);
  assert.match(shell, /\.profile-shell__approved-canvas,\s+\.profile-shell__opening\.profile-shell__approved-opening \{ z-index: auto; \}/);
  assert.doesNotMatch(shell, /profile-shell__surface-media|profile-shell__surface-video|profile-shell__surface-atmosphere-layer|profile-shell__surface-backdrop::before/);
  assert.match(studioPreview, /ProfileReferenceCard/);
  assert.doesNotMatch(shell, /profile-atmosphere\.profile-shell__card-atmosphere-layer/);
  assert.doesNotMatch(shell, /profile-shell__surface-media-background \{[\s\S]*filter: blur\(var\(--profile-surface-blur/);
  assert.match(environment, /background-position|object-fit: cover/);
  assert.match(atmosphere, /\.profile-atmosphere \{[^}]*isolation: auto;/);
  assert.match(identityCard, /color: var\(--profile-text/);
  assert.match(identityCard, /color: var\(--profile-reference-accent/);
  assert.match(identityCard, /border-radius: var\(--profile-border-radius, 20px\)/);
  assert.doesNotMatch(identityCard, /identity-card__|profile-card__head|headerValue/);
  assert.match(editor, /appearance-editor__color-grid/);
  assert.match(editor, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)/);
  assert.doesNotMatch(editor, /Highlight|Background gradient|Border color|appearance-editor__style-grid/);
});

test('dirty prompt is keyboard-complete and editor reload actions remain reachable', async () => {
  const [settings, dirtyPrompt, appearance, layout] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioDirtyPrompt.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileLinksEditor.svelte')
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
