import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDefaultProfileConfig, normalizeProfileConfig } from '../src/lib/profileConfig.js';
import { getNamePreviewLoadoutForSlot } from '../src/lib/name/nameLoadout.js';
import { getProfileAppearanceStyle } from '../src/lib/profileAppearanceStyle.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('name fitting-room previews compose progressively from one baseline', () => {
  const loadout = {
    name_font: 'name_font_permanent_marker',
    name_material: 'name_material_chroma_shift',
    name_motion: 'name_motion_type_in'
  };
  assert.deepEqual(getNamePreviewLoadoutForSlot(loadout, 'name_font'), {
    fontKey: loadout.name_font,
    materialKey: '',
    motionKey: ''
  });
  assert.deepEqual(getNamePreviewLoadoutForSlot(loadout, 'name_material'), {
    fontKey: loadout.name_font,
    materialKey: loadout.name_material,
    motionKey: ''
  });
  assert.deepEqual(getNamePreviewLoadoutForSlot(loadout, 'name_motion'), {
    fontKey: loadout.name_font,
    materialKey: loadout.name_material,
    motionKey: loadout.name_motion
  });
  assert.deepEqual(getNamePreviewLoadoutForSlot(loadout, 'name_motion', 'haunt-rainbow'), {
    fontKey: loadout.name_font,
    materialKey: loadout.name_material,
    motionKey: 'haunt-rainbow'
  });
});

test('background treatment is normalized and projected to both profile renderers', () => {
  const normalized = normalizeProfileConfig({
    ...createDefaultProfileConfig(),
    appearance: {
      ...createDefaultProfileConfig().appearance,
      background: { blur: 99, imageOpacity: -4, overlayColor: '#12abef', overlayOpacity: 48 }
    }
  });
  assert.deepEqual(normalized.appearance.background, {
    blur: 40,
    imageOpacity: 0,
    overlayColor: '#12ABEF',
    overlayOpacity: 48
  });
  const style = getProfileAppearanceStyle(normalized);
  assert.match(style, /--profile-background-blur:40px/);
  assert.match(style, /--profile-background-image-opacity:0/);
  assert.match(style, /--profile-background-overlay-opacity:0\.48/);
});

test('Profile Studio stabilization keeps preview and media mutations on explicit boundaries', async () => {
  const [workspace, preview, shell, identity, cursor, atmosphere, nameCanvas, richMedia, customize, mediaWorkspace, settings, migration] = await Promise.all([
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/IdentityCard.svelte'),
    read('src/lib/cursor-trail/CursorTrailLayer.svelte'),
    read('src/lib/profile-atmosphere/AtmosphereLayer.svelte'),
    read('src/lib/name/NameEffectCanvas.svelte'),
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileMediaWorkspace.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('supabase/migrations/20260810120000_profile_studio_stabilization.sql')
  ]);

  assert.match(workspace, /on:expressionchange=\{forward\}/);
  assert.match(customize, /on:expressionchange=\{forward\}/);
  assert.match(settings, /function updateExpression\(event\)/);
  assert.match(settings, /configurationPreview = configurationPreview/);
  assert.match(preview, /\{previewDevice\}/);
  assert.match(preview, /canvas--mobile[\s\S]*height: min\(42rem/);
  assert.match(preview, /profile-studio-preview__stage/);
  assert.doesNotMatch(preview, /logical-canvas|1440|previewScale|transform: scale/);
  assert.match(shell, /profile-shell-page--preview-mobile/);
  assert.match(shell, /profile-shell__media-overlay/);
  assert.match(shell, /profile-shell__media-image/);
  assert.match(shell, /profile-shell__media-overlay/);
  assert.match(identity, /identity-card--preview-mobile/);
  assert.match(cursor, /inputMode = 'window'/);
  assert.match(cursor, /inputMode === 'demo'/);
  assert.match(cursor, /function demoPoint/);
  assert.match(cursor, /resolvedInputMode === 'demo' && !reducedMotion\) startLoop/);
  assert.match(cursor, /function updateHostVisibility/);
  assert.match(atmosphere, /IntersectionObserver/);
  assert.match(atmosphere, /pageshow/);
  assert.match(atmosphere, /on:stalled=\{handleVideoStall\}/);
  assert.match(atmosphere, /mounted && motionActive && videoElement/);
  assert.match(atmosphere, /function updateHostVisibility/);
  assert.match(atmosphere, /resizeObserver = new ResizeObserver/);
  assert.match(atmosphere, /video\?\.currentTime === 0 && video\?\.readyState < 3/);
  assert.match(nameCanvas, /loadoutValue\(loadout, 'fontKey'/);
  assert.match(nameCanvas, /loadoutValue\(loadout, 'materialKey'/);
  assert.match(nameCanvas, /loadoutValue\(loadout, 'motionKey'/);
  assert.match(nameCanvas, /function updateHostVisibility/);
  assert.match(nameCanvas, /function getLogicalHostSize/);
  assert.match(nameCanvas, /renderer\.resize\([\s\S]*size\.width/);
  assert.match(nameCanvas, /updateVisibility\(entry\.contentRect\.width > 0 && entry\.contentRect\.height > 0\)/);
  assert.match(await read('src/lib/ShopItemPreview.svelte'), /item\?\.slot === 'name_motion' \? 'animated'/);
  assert.match(richMedia, /stage_my_profile_media_replacement/);
  assert.match(richMedia, /commit_my_profile_media_replacement/);
  assert.match(richMedia, /await removeAsset\(activeCursor\)/);
  assert.match(customize, /ProfileMediaWorkspace/);
  assert.match(mediaWorkspace, /data-media-workspace-layout="reference"/);
  assert.match(mediaWorkspace, /grid-template-columns: minmax\(12rem, \.9fr\) minmax\(12rem, \.9fr\) minmax\(0, 1\.5fr\)/);
  assert.match(mediaWorkspace, /profile-background-treatment[\s\S]*grid-column: 2 \/ -1/);
  assert.match(migration, /normalize_profile_appearance/);
  assert.match(migration, /stage_my_profile_media_replacement/);
  assert.match(migration, /commit_my_profile_media_replacement/);
  assert.match(migration, /Only the active cursor can be replaced/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.stage_my_profile_media_replacement/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.commit_my_profile_media_replacement[\s\S]*TO authenticated/);
});
