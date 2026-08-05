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
  const ids = ['overview', 'customize', 'profile-identity', 'profile-media', 'profile-layout', 'profile-social', 'profile-collection', 'progression', 'account'];
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
  const [layout, appearance, migration, sqlTest] = await Promise.all([
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('supabase/migrations/20260805100000_profile_appearance_dashboard.sql'),
    read('supabase/tests/launch_security.sql')
  ]);
  assert.match(layout, /p_section: 'composition'/);
  assert.match(layout, /compositionPatch/);
  assert.match(layout, /Reload server version/);
  assert.doesNotMatch(layout, /save_profile_configuration['"]/);
  assert.doesNotMatch(layout, /publish_profile_configuration['"]/);
  assert.doesNotMatch(layout, /Signature color|Ambient color|colorEffectsEnabled/);
  assert.match(appearance, /invalidHex/);
  assert.match(appearance, /Reload server version/);
  assert.match(appearance, /disabled=\{!dirty \|\| saving \|\| invalidHex\}/);
  assert.match(migration, /'draft', v_record\.draft_config/);
  assert.match(migration, /'published', v_record\.published_config/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.profile_composition_patch/);
  assert.match(sqlTest, /config_composition_save/);
  assert.match(sqlTest, /composition save accepted appearance or effect keys/);
  assert.match(sqlTest, /config_composition_publish/);
});

test('preview renders bounded media and never exposes mutations', async () => {
  const [settings, shell, music] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileMusic.svelte')
  ]);
  assert.match(settings, /previewCollectionItems/);
  assert.match(settings, /previewScores/);
  assert.match(shell, /\{#if backgroundSrc\}/);
  assert.match(shell, /profile-shell-page--preview \.profile-shell__media-background \{ position: absolute/);
  assert.match(shell, /if \(previewMode \|\| !targetProfile\?\.id/);
  assert.match(shell, /\{#if !previewMode && !isOwnProfile\}/);
  assert.match(shell, /deferMedia=\{previewMode\}/);
  assert.match(music, /autoplay=\{!deferMedia\}/);
  assert.match(music, /loading="lazy"/);
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
