import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createDefaultProfileContent,
  getVisibleProfileContent,
  normalizeProfileContent,
  PROFILE_CONTENT_LIMITS
} from '../src/lib/profileContent.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile content is bounded, structured, and safe by default', () => {
  const defaults = createDefaultProfileContent();
  assert.deepEqual(defaults, {
    version: 1,
    about: { visible: true, heading: 'About', body: '' },
    projects: []
  });

  const normalized = normalizeProfileContent({
    version: 1,
    about: { visible: true, heading: '<b>About</b>', body: 'Line one\nLine two\u0000' },
    projects: [
      { title: 'Chromadie', description: 'Daily colors', url: 'https://chromadie.com', visible: true },
      { title: 'Unsafe', description: 'No script', url: 'javascript:alert(1)', visible: true },
      { title: 'Too many', url: 'https://example.com', visible: true },
      { title: 'Four', url: 'https://example.com/4', visible: true },
      { title: 'Dropped', url: 'https://example.com/5', visible: true }
    ]
  });

  assert.equal(normalized.about.heading, '<b>About</b>');
  assert.equal(normalized.about.body, 'Line one\nLine two');
  assert.equal(normalized.projects.length, PROFILE_CONTENT_LIMITS.projects);
  assert.equal(normalized.projects[1].url, '');
  assert.deepEqual(normalized.projects.map(project => project.order), [0, 1, 2, 3]);
  assert.ok(normalized.projects.every(project => Number.isFinite(project.order)));
  assert.deepEqual(getVisibleProfileContent(normalized).projects.map(project => project.title), ['Chromadie', 'Too many', 'Four']);
});

test('content renderer and editor stay inside the structured public boundary', async () => {
  const [content, shell, renderModel, settings, registry, migration] = await Promise.all([
    read('src/lib/ProfileContent.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profileRenderModel.js'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('supabase/migrations/20260808140000_profile_content_regions.sql')
  ]);
  assert.match(content, /getVisibleProfileContent/);
  assert.match(content, /rel="noopener noreferrer"/);
  assert.doesNotMatch(content, /innerHTML|iframe|new Function|eval\s*\(/);
  assert.match(shell, /<ProfileContent/);
  assert.match(renderModel, /getVisibleProfileContent/);
  assert.doesNotMatch(registry, /ProfileContentEditor\.svelte/);
  assert.match(migration, /normalize_profile_content/);
  assert.match(migration, /p_section NOT IN \('appearance', 'composition', 'content'\)/);
  assert.match(migration, /profile_content_patch/);
  assert.match(settings, /publish_profile_studio_v2/);
});

test('content renderer omits the default empty About surface', async () => {
  const content = await read('src/lib/ProfileContent.svelte');
  assert.match(content, /hasAboutContent/);
  assert.match(content, /visible\.about\.body \|\| visible\.about\.markdown \|\| visible\.about\.ast/);
  assert.match(content, /About me/);
});
