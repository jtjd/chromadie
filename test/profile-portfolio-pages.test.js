import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getProfilePortfolioPages } from '../src/lib/profile-layout/profilePortfolioPages.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('portfolio navigation only includes pages backed by visible profile modules', () => {
  assert.deepEqual(getProfilePortfolioPages(), [
    { key: 'hero', label: 'Profile' }
  ]);
  assert.deepEqual(getProfilePortfolioPages({ hasProfileContent: true }), [
    { key: 'hero', label: 'Profile' },
    { key: 'content', label: 'About' }
  ]);
  assert.deepEqual(getProfilePortfolioPages({ hasProfileMusic: true, widgetCount: 2 }), [
    { key: 'hero', label: 'Profile' },
    { key: 'media', label: 'Media' }
  ]);
  assert.deepEqual(getProfilePortfolioPages({ hasProfileContent: true, widgetCount: 1, hasProfileStory: true }), [
    { key: 'hero', label: 'Profile' },
    { key: 'content', label: 'About' },
    { key: 'media', label: 'Media' },
    { key: 'story', label: 'Story' }
  ]);
});

test('portfolio pages and audio controls retain the bounded profile contracts', async () => {
  const [shell, continuation, music, controls] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profile-layout/ProfilePortfolioContinuation.svelte'),
    read('src/lib/ProfileMusic.svelte'),
    read('src/lib/ProfileAudioControls.svelte')
  ]);

  assert.match(shell, /profile-shell__portfolio-pagination/);
  assert.match(shell, /scroll-snap-type: y mandatory/);
  assert.match(shell, /scrollToPortfolioPage/);
  assert.match(continuation, /data-profile-portfolio-page="content"/);
  assert.match(continuation, /data-profile-portfolio-page="media"/);
  assert.match(continuation, /data-profile-portfolio-page="story"/);
  assert.match(continuation, /placement="inline"/);
  assert.match(music, /on:timeupdate=\{handleTimeUpdate\}/);
  assert.match(music, /on:seek=\{handleSeek\}/);
  assert.match(controls, /profile-audio-control__progress/);
  assert.match(controls, /profile-audio-control__volume-button/);
  assert.match(controls, /dispatch\('previous'\)/);
  assert.match(controls, /dispatch\('next'\)/);
});
