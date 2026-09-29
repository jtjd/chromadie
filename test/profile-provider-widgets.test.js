import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getProfileWidgetInputUrl,
  getVisibleProfileWidgets,
  normalizeProfileWidgets,
  parseProfileWidgetUrl,
  parseYouTubeUrl,
  profileWidgetEmbedUrl
} from '../src/lib/profileWidgets.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const spotifyId = '1234567890123456789012';
const youtubeId = 'dQw4w9WgXcQ';

test('provider widget URLs are strict and map to fixed official embeds', () => {
  assert.deepEqual(parseProfileWidgetUrl('spotify', `https://open.spotify.com/track/${spotifyId}`), { type: 'track', id: spotifyId });
  assert.deepEqual(parseYouTubeUrl(`https://www.youtube.com/watch?v=${youtubeId}`), { type: 'video', id: youtubeId });
  assert.deepEqual(parseYouTubeUrl(`https://youtu.be/${youtubeId}`), { type: 'video', id: youtubeId });
  assert.equal(profileWidgetEmbedUrl('spotify', 'track', spotifyId), `https://open.spotify.com/embed/track/${spotifyId}?theme=0`);
  assert.equal(profileWidgetEmbedUrl('youtube', 'video', youtubeId), `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`);
  assert.equal(getProfileWidgetInputUrl({ provider: 'youtube', type: 'video', id: youtubeId }), `https://www.youtube.com/watch?v=${youtubeId}`);

  for (const value of [
    `http://www.youtube.com/watch?v=${youtubeId}`,
    `https://youtube.com/watch?v=${youtubeId}`,
    `https://www.youtube.com/watch?v=${youtubeId}&si=tracking`,
    `https://www.youtube.com/shorts/${youtubeId}`,
    `https://youtu.be/${youtubeId}#fragment`,
    `https://www.youtube.com/watch?v=short`
  ]) assert.equal(parseYouTubeUrl(value), null);
});

test('provider widgets are bounded, unique, visible-aware, and legacy compatible', () => {
  const normalized = normalizeProfileWidgets([
    { provider: 'youtube', type: 'video', id: youtubeId, visible: true },
    { provider: 'youtube', type: 'video', id: 'aaaaaaaaaaa', visible: true },
    { provider: 'spotify', type: 'track', id: spotifyId, visible: false },
    { provider: 'unknown', type: 'video', id: youtubeId, visible: true }
  ]);
  assert.deepEqual(normalized.map(widget => `${widget.provider}:${widget.type}:${widget.id}`), [
    `youtube:video:${youtubeId}`,
    `spotify:track:${spotifyId}`
  ]);
  assert.deepEqual(getVisibleProfileWidgets(normalized).map(widget => widget.provider), ['youtube']);
  assert.deepEqual(normalizeProfileWidgets([], { spotify_type: 'album', spotify_id: spotifyId }).map(widget => widget.provider), ['spotify']);
  assert.deepEqual(normalizeProfileWidgets([{ provider: 'youtube', type: 'video', id: 'bad' }]), []);
});

test('provider widgets remain a storage compatibility contract with no active profile integration', async () => {
  const [shell, registry, migration, headers, pageFunction, music, expression] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('supabase/migrations/20260808150000_profile_provider_widgets.sql'),
    read('public/_headers'),
    read('functions/_publicPage.js'),
    read('src/lib/ProfileMusic.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte')
  ]);
  assert.doesNotMatch(shell, /ProfileWidgets|spotify|youtube-nocookie|<iframe/i);
  assert.doesNotMatch(registry, /ProfileWidgetEditor/);
  assert.doesNotMatch(music, /spotify|youtube-nocookie|<iframe/i);
  assert.doesNotMatch(expression, /profile-expression-editor__compact-spotify|Spotify URL|Connect Spotify/);
  assert.match(migration, /normalize_profile_widgets/);
  assert.match(migration, /p_section NOT IN \('appearance', 'composition', 'content', 'widgets'\)/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.normalize_profile_widgets/);
  assert.doesNotMatch(headers, /open\.spotify\.com|youtube-nocookie\.com/);
  assert.doesNotMatch(pageFunction, /open\.spotify\.com|youtube-nocookie\.com/);
});
