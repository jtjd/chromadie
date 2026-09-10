import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Customize state gaps have explicit parent reset, confirmation, status, and retry contracts', async () => {
  const [settings, shell, prompt, header, workspace, cosmetics] = await Promise.all([
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileStudioShell.svelte'),
    read('src/lib/ProfileStudioDirtyPrompt.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileCosmeticsEditor.svelte')
  ]);

  assert.match(settings, /async function discardAllStagedChanges\(\)/);
  assert.match(settings, /getPersistedProfileStudioState\(/);
  assert.match(settings, /workspace\?\.resetChanges\?\.\('customize'\)/);
  assert.match(settings, /sectionErrors = \{ \.\.\.sectionErrors, \[sectionId\]: '' \}/);
  assert.match(settings, /loadSectionComponent\(sectionId, \{ force: true \}\)/);
  assert.match(settings, /finally \{\n\s+\/\/ Always release the local mutation lock/);
  assert.match(shell, /title="Reset published changes\?"/);
  assert.match(shell, /message="This replaces the saved draft with your published profile\./);
  assert.match(shell, /on:discard=\{confirmReset\}/);
  assert.match(prompt, /export let confirmLabel = 'Discard'/);
  assert.match(header, /saving \? 'Publishing…' : dirty \? 'Unpublished changes' : 'Published'/);
  assert.match(workspace, /export let sectionErrors = \{\}/);
  assert.match(workspace, /sectionretry/);
  assert.match(cosmetics, /applyCosmeticChanges\(/);
});
