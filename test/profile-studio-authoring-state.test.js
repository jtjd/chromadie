import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  isProfileConfigurationWritable,
  mergeProfileStudioContext
} from '../src/lib/profile-studio/authoringState.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('a failed configuration refresh preserves the visible snapshot but closes authoring', () => {
  const profileConfig = {
    version: 2,
    draft: { links: [{ label: 'Keep me', url: 'https://example.com' }] },
    published: { links: [] },
    updatedAt: '2026-09-04T12:00:00.000Z'
  };
  const current = {
    profileId: 'user-1',
    profileConfig,
    configurationUnavailable: false
  };
  const failedRefresh = {
    profileId: 'user-1',
    profileConfig: null,
    configurationUnavailable: true,
    dataWarning: "Profile customization couldn't be loaded. Retry before making changes."
  };

  const merged = mergeProfileStudioContext(current, failedRefresh);
  assert.equal(merged.profileConfig, profileConfig);
  assert.equal(merged.configurationUnavailable, true);
  assert.equal(isProfileConfigurationWritable(merged), false);
  assert.equal(isProfileConfigurationWritable(current), true);

  const accountSwitch = mergeProfileStudioContext(current, {
    profileId: 'user-2',
    profileConfig: null,
    configurationUnavailable: true
  });
  assert.equal(accountSwitch.profileConfig, null);
});

test('Profile Studio keeps every configuration write path behind the authoritative-read gate', async () => {
  const [settings, shell, workspace] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioShell.svelte'),
    read('src/lib/ProfileStudioWorkspace.svelte')
  ]);

  assert.match(settings, /configurationWriteAvailable = isProfileConfigurationWritable\(context\)/);
  assert.match(settings, /if \(!configurationWriteAvailable\) \{/);
  assert.match(settings, /publish_profile_studio_v2/);
  assert.match(settings, /p_expected_updated_at: context\.profileConfig\?\.updatedAt \|\| null/);
  assert.match(shell, /disabled=\{!dirty \|\| mobileSaving \|\| !configurationReady\}/);
  assert.match(shell, /disabled=\{mobileSaving \|\| !configurationReady\}/);
  assert.match(workspace, /configurationBlocked/);
  assert.match(workspace, /configurationretry/);
});
