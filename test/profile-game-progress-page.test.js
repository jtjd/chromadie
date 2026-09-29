import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getProfilePages } from '../src/lib/profile-layout/profilePages.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the profile card is page one and the optional progress view is page two', () => {
  assert.deepEqual(getProfilePages(), [{ key: 'hero', label: 'Profile' }]);
  assert.deepEqual(getProfilePages({ hasProgressPage: true }), [
    { key: 'hero', label: 'Profile' },
    { key: 'progress', label: 'Progress' }
  ]);
});

test('the progress page follows the profile surface and the old More renderers are absent', async () => {
  const [shell, page, layoutEditor, music, controls, scrollController] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profile-layout/ProfileGameProgressPage.svelte'),
    read('src/lib/ProfileReferenceLayoutEditor.svelte'),
    read('src/lib/ProfileMusic.svelte'),
    read('src/lib/ProfileAudioControls.svelte'),
    read('src/lib/profile-layout/profilePageScrollController.js')
  ]);

  assert.match(shell, /<ProfileGameProgressPage/);
  assert.match(shell, /data-profile-page="hero"/);
  assert.match(shell, /profile-shell-page--progress-enabled/);
  assert.match(shell, /\.profile-shell-page--progress-enabled:not\(\.profile-shell-page--preview\)\s*\{\s*height:\s*100dvh/);
  assert.match(shell, /\.profile-shell-page--progress-enabled:not\(\.profile-shell-page--preview\) \.profile-shell__approved-canvas\s*\{\s*display:\s*contents/);
  assert.match(shell, /import\('\.\/profile-layout\/profilePageScrollController\.js'\)/);
  assert.match(shell, /aria-label="Profile pages"/);
  assert.match(shell, /handleProfilePageKeydown/);
  assert.match(shell, /\['ArrowDown', 'PageDown', ' '\]/);
  assert.match(shell, /\['ArrowUp', 'PageUp'\]/);
  assert.doesNotMatch(shell, /ProfileContent|ProfileWidgets|ProfileTimeline|ProfileCollection/);
  assert.match(layoutEditor, /Game progress page/);
  assert.match(layoutEditor, /setProfileProgressPageVisible/);
  assert.match(page, /data-profile-page="progress"/);
  assert.match(page, /ProfileBorderEffect/);
  assert.match(page, /profile\?\.total_rolls/);
  assert.match(page, /profile\?\.current_streak/);
  assert.match(page, /profile\?\.longest_streak/);
  assert.match(page, /recent colors are available/);
  assert.match(page, /prefersReducedMotion/);
  assert.match(scrollController, /data-profile-page/);
  assert.doesNotMatch(music, /spotify|youtube-nocookie|<iframe/i);
  assert.doesNotMatch(controls, /profile-audio-control__progress/);
  assert.match(controls, /profile-audio-control__volume/);
  assert.match(controls, /dispatch\('toggle'\)/);
});
