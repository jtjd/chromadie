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
  assert.equal(normalized.projects.length, 5);
  assert.ok(normalized.projects.length <= PROFILE_CONTENT_LIMITS.projects);
  assert.equal(normalized.projects[1].url, '');
  assert.deepEqual(normalized.projects.map(project => project.order), [0, 1, 2, 3, 4]);
  assert.ok(normalized.projects.every(project => Number.isFinite(project.order)));
  assert.deepEqual(getVisibleProfileContent(normalized).projects.map(project => project.title), ['Chromadie', 'Too many', 'Four', 'Dropped']);
});

test('legacy About and project data stays normalized but has no active public or Studio surface', async () => {
  const [shell, renderModel, customize, registry, lazyComponents, migration] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profileRenderModel.js'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/profile-studio/lazyComponents.js'),
    read('supabase/migrations/20260808140000_profile_content_regions.sql')
  ]);
  const configurationWrites = await read('src/lib/profile-studio/configurationWrites.js');
  assert.doesNotMatch(shell, /ProfileContent|ProfileWidgets|About me|profile-content/);
  assert.doesNotMatch(customize, /contentComponent|widgetComponent|ProfileContentEditor|ProfileWidgetEditor/);
  assert.doesNotMatch(registry, /ProfileContentEditor|ProfileWidgetEditor/);
  assert.doesNotMatch(lazyComponents, /profile-content|profile-widgets/);
  assert.match(renderModel, /normalizeProfileContent/);
  assert.match(renderModel, /visibleContent: \{ about: null, projects: \[\] \}/);
  assert.match(migration, /normalize_profile_content/);
  assert.match(migration, /p_section NOT IN \('appearance', 'composition', 'content'\)/);
  assert.match(migration, /profile_content_patch/);
  assert.match(configurationWrites, /publish_profile_studio_v2/);
});

test('legacy project records remain available to configuration migration without being rendered', async () => {
  const renderModel = await read('src/lib/profileRenderModel.js');
  const shell = await read('src/lib/ProfileShell.svelte');
  assert.match(renderModel, /content: profileContent/);
  assert.doesNotMatch(shell, /<ProfileContent/);
});
