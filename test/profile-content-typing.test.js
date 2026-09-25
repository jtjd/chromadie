import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import { normalizeProfileContent, PROFILE_CONTENT_LIMITS } from '../src/lib/profileContent.js';
import {
  normalizeProfileContentDraft,
  updateProfileContentDraft
} from '../src/lib/profile-studio/contentDraft.js';

test('incomplete HTTPS input stays visible while editing; public projection still rejects it', () => {
  const draft = normalizeProfileContentDraft({}, {}, {});
  const updated = updateProfileContentDraft(draft, {
    projects: [{ title: 'My project ', url: 'h', description: 'In progress ' }]
  }, {}, {});

  assert.equal(updated.content.projects[0].url, 'h');
  assert.equal(updated.content.projects[0].title, 'My project ');
  assert.equal(normalizeProfileContent(updated.content).projects[0].url, '');

  const valid = updateProfileContentDraft(updated, {
    projects: [{ ...updated.content.projects[0], url: 'https://example.com' }]
  }, {}, {});
  assert.equal(normalizeProfileContent(valid.content).projects[0].url, 'https://example.com');
});

test('typed profile content remains bounded by canonical field limits', () => {
  const draft = normalizeProfileContentDraft({}, {}, {});
  const title = 't'.repeat(PROFILE_CONTENT_LIMITS.projectTitle + 4);
  const description = 'd'.repeat(PROFILE_CONTENT_LIMITS.projectDescription + 4);
  const url = `https://${'x'.repeat(PROFILE_CONTENT_LIMITS.projectUrl + 16)}`;
  const updated = updateProfileContentDraft(draft, {
    projects: [{ title, description, url }]
  }, {}, {});

  assert.equal(updated.content.projects[0].title, title.slice(0, PROFILE_CONTENT_LIMITS.projectTitle));
  assert.equal(updated.content.projects[0].description, description.slice(0, PROFILE_CONTENT_LIMITS.projectDescription));
  assert.equal(updated.content.projects[0].url, url.slice(0, PROFILE_CONTENT_LIMITS.projectUrl));
});

test('draft normalization preserves explicit value, draft, then published fallback order', () => {
  const configWithProject = title => {
    const config = createDefaultProfileConfig();
    config.content.projects = [{ title, url: `https://${title.toLowerCase()}.example` }];
    return config;
  };
  const draftConfig = configWithProject('Draft');
  const publishedConfig = configWithProject('Published');
  const explicitConfig = configWithProject('Explicit');

  assert.equal(normalizeProfileContentDraft(null, draftConfig, publishedConfig).content.projects[0].title, 'Draft');
  assert.equal(normalizeProfileContentDraft(null, null, publishedConfig).content.projects[0].title, 'Published');
  assert.equal(normalizeProfileContentDraft(explicitConfig, draftConfig, publishedConfig).content.projects[0].title, 'Explicit');
});

test('Profile Content editor wires the production draft helper and keeps editor effects local', async () => {
  const source = await readFile(new URL('../src/lib/ProfileContentEditor.svelte', import.meta.url), 'utf8');
  assert.match(source, /import \{ normalizeProfileContentDraft, updateProfileContentDraft \} from '\.\/profile-studio\/contentDraft\.js'/);
  assert.match(source, /draft = updateProfileContentDraft\(draft, next, draftConfig, publishedConfig\)/);
  assert.match(source, /emitDirty\(true\);[\s\S]*dispatch\('configpreview', \{ config: draft \}\)/);
  assert.doesNotMatch(source, /function normalizeDraft|draft\.content\.projects = draft\.content\.projects\.map/);
});
