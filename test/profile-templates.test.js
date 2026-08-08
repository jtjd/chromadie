import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createDefaultProfileConfig,
  normalizeProfileConfig
} from '../src/lib/profileConfig.js';
import {
  FREE_PROFILE_TEMPLATE_KEYS,
  PREMIUM_EXPRESSION_ENTITLEMENT_KEY,
  PROFILE_TEMPLATE_DEFINITIONS,
  createProfileTemplatePatch,
  isPremiumExpressionUnlocked,
  normalizeProfileTemplateKey
} from '../src/lib/profileTemplates.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('template registry is finite, structured, and preserves the free foundation', () => {
  assert.deepEqual(FREE_PROFILE_TEMPLATE_KEYS, ['signal', 'editorial', 'archive']);
  assert.equal(PROFILE_TEMPLATE_DEFINITIONS.atelier.tier, 'premium');
  assert.equal(PROFILE_TEMPLATE_DEFINITIONS.atelier.requiresEntitlement, PREMIUM_EXPRESSION_ENTITLEMENT_KEY);
  assert.equal(Object.keys(PROFILE_TEMPLATE_DEFINITIONS).length, 4);

  for (const definition of Object.values(PROFILE_TEMPLATE_DEFINITIONS)) {
    assert.equal(definition.modules.length, 8);
    assert.equal(new Set(definition.modules.map(module => module.id)).size, 8);
    assert.equal(definition.modules.every(module => ['wide', 'medium', 'narrow'].includes(module.size)), true);
  }

  const patch = createProfileTemplatePatch('editorial');
  assert.equal(patch.templateKey, 'editorial');
  assert.equal(patch.layoutVariant, 'editorial');
  assert.equal('links' in patch, false);
  assert.equal('appearance' in patch, false);
  assert.equal(normalizeProfileTemplateKey('not-real'), 'signal');
  assert.equal(normalizeProfileTemplateKey('custom', 'custom'), 'custom');
  assert.equal(isPremiumExpressionUnlocked(['other']), false);
  assert.equal(isPremiumExpressionUnlocked([PREMIUM_EXPRESSION_ENTITLEMENT_KEY]), true);
});

test('profile config carries a backward-compatible template marker without changing safe defaults', () => {
  const defaults = createDefaultProfileConfig('#123456');
  assert.equal(defaults.templateKey, 'signal');
  assert.equal(normalizeProfileConfig({ ...defaults, templateKey: 'archive', layoutVariant: 'focus' }).templateKey, 'archive');
  assert.equal(normalizeProfileConfig({ ...defaults, templateKey: 'unsafe-template' }).templateKey, 'signal');
  assert.equal(normalizeProfileConfig({ ...defaults, templateKey: 'custom' }).templateKey, 'custom');
});

test('template application preserves user-owned expression and premium authority', async () => {
  const [picker, editor, settings, migration, docs] = await Promise.all([
    read('src/lib/ProfileTemplatePicker.svelte'),
    read('src/lib/ProfileEditor.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('supabase/migrations/20260808180000_profile_templates.sql'),
    read('docs/milestones/DASHBOARD_PARITY_M7_TEMPLATES_PREMIUM_EXPRESSION.md').catch(() => '')
  ]);

  assert.match(picker, /createProfileTemplatePatch/);
  assert.match(picker, /Premium expression/);
  assert.match(editor, /ProfileTemplatePicker/);
  assert.match(editor, /templateKey: value\.templateKey/);
  assert.match(editor, /p_section: 'composition'/);
  assert.match(settings, /entitlements=\{\$profileEntitlements\}/);
  assert.match(migration, /ALTER FUNCTION public\.normalize_profile_configuration\(jsonb, text\)/);
  assert.match(migration, /'templateKey'/);
  assert.match(migration, /'atelier_plus'/);
  assert.match(migration, /profile_entitlements/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.profile_composition_patch\(jsonb\)/);
  assert.doesNotMatch(migration, /INSERT INTO public\.profile_entitlements/);
  assert.doesNotMatch(editor, /innerHTML|new Function|eval\s*\(/);
  assert.notEqual(docs, '');
});
