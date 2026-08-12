import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_LAYOUT_DEFINITIONS,
  PROFILE_LAYOUT_KEYS,
  resolveProfileLayoutPreviewVariant,
  resolveProfileLayoutVariant
} from '../src/lib/profile-layout/profileLayouts.js';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import { createProfileTemplatePatch } from '../src/lib/profileTemplates.js';
import { PROFILE_LINK_DEFINITIONS, PROFILE_LINK_TYPES, isProfileSocialLink } from '../src/lib/profileLinkTypes.js';

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
  const [frame, dailyRoll, shell, preview] = await Promise.all([
    read('src/lib/ProfileLayoutFrame.svelte'),
    read('src/lib/ProfileDailyRoll.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileStudioPreview.svelte')
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
  assert.match(shell, /profile-border-effect--content/);
  assert.match(dailyRoll, /profile-daily-roll--' \+ variant/);
  assert.match(preview, /profile-studio-preview__stage/);
  assert.doesNotMatch(preview, /logical-canvas|1440|previewScale|transform: scale/);
  assert.doesNotMatch(frame, /role="tab"|presenceLabel|daily color profile/);
  assert.doesNotMatch(preview, /@container profile-preview \(max-width: 31rem\)/);
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
    read('src/lib/HomepageProfilePreview.svelte'),
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
