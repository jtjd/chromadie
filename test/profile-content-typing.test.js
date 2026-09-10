import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { normalizeProfileConfig } from '../src/lib/profileConfig.js';
import { normalizeProfileContent, PROFILE_CONTENT_LIMITS } from '../src/lib/profileContent.js';

test('Project URL and title retain incomplete typed text; public projection still normalizes', async () => {
  const source = await readFile(new URL('../src/lib/ProfileContentEditor.svelte', import.meta.url), 'utf8');
  const context = vm.createContext({
    draft: normalizeProfileConfig({}), normalizeProfileConfig, normalizeProfileContent,
    PROFILE_CONTENT_LIMITS, draftConfig: {}, publishedConfig: {},
    emitDirty() {}, dispatch() {},
    EMPTY_PROJECT: {}, emptyProject: {}
  });
  vm.runInContext(source.slice(source.indexOf('  function normalizeDraft'), source.indexOf('  $: isDirty')), context);
  vm.runInContext(source.slice(source.indexOf('  function updateContent'), source.indexOf('  function updateAbout')), context);
  context.updateContent({ projects: [{ title: 'My project ', url: 'h', description: 'In progress ' }] });
  assert.equal(context.draft.content.projects[0].url, 'h');
  assert.equal(context.draft.content.projects[0].title, 'My project ');
  assert.equal(normalizeProfileContent(context.draft.content).projects[0].url, '');
  context.updateContent({ projects: [{ ...context.draft.content.projects[0], url: 'https://example.com' }] });
  assert.equal(normalizeProfileContent(context.draft.content).projects[0].url, 'https://example.com');
});
