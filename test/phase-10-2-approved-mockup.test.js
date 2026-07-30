import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { PROFILE_MUSIC_ENABLED } from '../src/lib/profileFeatures.js';
import { PUBLIC_PROFILE_SELECT } from '../src/lib/profileData.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('approved mockup translation and parity gate exist before visual convergence', async () => {
  const map = await read('docs/APPROVED_MOCKUP_TRANSLATION.md');
  const gate = await read('checklists/APPROVED_MOCKUP_PARITY_GATE.md');

  for (const heading of [
    'Ambient background',
    'Minimal chm.lol header',
    'Identity card',
    'Avatar',
    'Display name',
    'Handle',
    'Profile URL',
    'Bio',
    'Founder or earned status',
    'Social links',
    'Today’s color',
    'Next-roll state',
    'Featured collection',
    'Music bar',
    'Share action',
    'Edit action',
    'Mobile composition'
  ]) {
    assert.match(map, new RegExp(`\\| ${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')} \\|`));
  }

  for (const action of ['translate', 'adapt', 'preserve existing', 'defer to Phase 11', 'reject from production']) {
    assert.match(map, new RegExp(`\\| ${action.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')} \\|`));
  }

  assert.match(gate, /1920×1080/);
  assert.match(gate, /1440×900/);
  assert.match(gate, /1280×720/);
  assert.match(gate, /390×844/);
  assert.match(gate, /Real roll authority is preserved/);
});

test('approved profile composition uses production adapters without prototype authority', async () => {
  const app = await read('src/App.svelte');
  const shell = await read('src/lib/ProfileShell.svelte');
  const settings = await read('src/lib/ProfileSettings.svelte');
  const header = await read('src/lib/SiteModeHeader.svelte');
  const roll = await read('src/lib/ProfileRoll.svelte');
  const atmosphere = await read('src/lib/ProfileAtmosphere.svelte');
  const identity = await read('src/lib/IdentityCard.svelte');
  const collection = await read('src/lib/FeaturedCollection.svelte');
  const music = await read('src/lib/ProfileMusic.svelte');

  assert.match(app, /profileModeVisible/);
  assert.match(app, /getProfileVisualFixture/);
  assert.match(app, /<SiteModeHeader/);
  assert.match(app, /isProfileMode=\{profileModeVisible\}/);
  assert.match(app, /<ProfileSettings/);
  assert.match(app, /setRoute\('profile-settings'\)/);
  assert.match(shell, /<ProfileAtmosphere/);
  assert.match(shell, /<IdentityCard/);
  assert.match(shell, /<FeaturedCollection/);
  assert.match(shell, /<ProfileMusic/);
  assert.match(shell, /visualFixture={visualFixture}/);
  assert.match(shell, /on:colorchange=\{handleRollColor\}/);
  assert.doesNotMatch(shell, /profile-shell-warning.*Profile interactions are temporarily unavailable/s);
  assert.match(header, /navigator\.share/);
  assert.match(header, /navigator\.clipboard/);
  assert.match(roll, /requestRoll\(supabase, isReroll\)/);
  assert.match(roll, /visualFixture === 'pre-roll'/);
  assert.match(roll, /fixtureResult/);
  assert.match(roll, /dispatch\('colorchange'/);
  assert.match(atmosphere, /--atmosphere-accent/);
  assert.match(identity, /if bio/);
  assert.match(shell, /profileBio/);
  assert.match(shell, /getProfileStoryVisible/);
  assert.match(settings, /<ProfileEditor/);
  assert.match(collection, /collectedCount\}\/{totalCount}/);
  assert.match(music, /data-music-state="fixture"/);
  assert.match(music, /visualFixture/);
  assert.equal(PUBLIC_PROFILE_SELECT.includes('email'), false);
  assert.equal(PROFILE_MUSIC_ENABLED, false);

  for (const source of [app, shell, settings, header, atmosphere, identity, collection, music]) {
    assert.doesNotMatch(source, /from ['"](?:react|next|@\/)/i);
    assert.doesNotMatch(source, /Math\.random\(|navigator\.clipboard\.writeText\(`https?:\/\/example|profile\.handle\s*:\s*['"]gripgod/);
  }
});

test('optional profile warnings stay out of the default visual hierarchy', async () => {
  const shell = await read('src/lib/ProfileShell.svelte');
  const settings = await read('src/lib/ProfileSettings.svelte');
  const profileData = await read('src/lib/profileData.js');

  assert.match(profileData, /dataWarning/);
  assert.match(settings, /context\.dataWarning/);
  assert.match(settings, /profile-settings-page__warning/);
  assert.doesNotMatch(shell, /<p class="profile-shell-warning"/);
});
