import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PROFILE_APPEARANCE_DEFAULTS,
  createDefaultProfileConfig,
  normalizeProfileAppearance,
  normalizeProfileConfig
} from '../src/lib/profileConfig.js';
import { getNameFrameModel } from '../src/lib/name/nameRenderer.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('appearance v1 is bounded and independent from daily roll color', () => {
  const defaults = createDefaultProfileConfig('#12abef');
  assert.equal(defaults.appearance.colors.accent, '#CDD2FF');
  assert.equal(defaults.signatureColor, '#12ABEF');
  assert.equal(defaults.appearance.colors.background, PROFILE_APPEARANCE_DEFAULTS.colors.background);

  const normalized = normalizeProfileAppearance({
    colors: { username: '#abcdef', accent: '#010203', background: 'url(javascript:bad)' },
    surface: { opacity: 140, blur: -2 },
    gradient: { enabled: true, angle: 999 },
    border: { width: 9, radius: -1, opacity: 120 }
  });
  assert.equal(normalized.colors.username, '#ABCDEF');
  assert.equal(normalized.colors.accent, '#010203');
  assert.equal(normalized.colors.background, '#07080B');
  assert.equal(normalized.surface.opacity, 100);
  assert.equal(normalized.surface.blur, 0);
  assert.equal(normalized.gradient.angle, 360);
  assert.equal(normalized.border.width, 4);
  assert.equal(normalized.border.radius, 0);
  assert.equal(normalized.border.opacity, 100);

  const config = normalizeProfileConfig({ ...defaults, appearance: normalized, signatureColor: '#ABCDEF' });
  assert.equal(config.appearance.colors.accent, '#010203');
  assert.equal(config.signatureColor, '#010203');

  const frame = getNameFrameModel({ text: 'Chromadie', todayColor: '#112233', baseColor: '#F4F6FB' });
  assert.equal(frame.todayColor, '#112233');
  assert.equal(frame.baseColor, '#F4F6FB');
});

test('dashboard uses the shared header and section RPC contract', async () => {
  const [app, settings, appearance, layout, migration, shell] = await Promise.all([
    read('src/App.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileEditor.svelte'),
    read('supabase/migrations/20260805100000_profile_appearance_dashboard.sql'),
    read('src/lib/ProfileDashboardShell.svelte')
  ]);
  assert.match(app, /\{#if !profileModeVisible\}/);
  assert.match(settings, /<ProfileAccountSettings/);
  assert.match(settings, /id: 'customize'/);
  assert.match(settings, /customize: 'customize'/);
  assert.match(settings, /id: 'profile-identity'/);
  assert.match(settings, /id: 'profile-media'/);
  assert.match(settings, /id: 'profile-layout'/);
  assert.match(settings, /id: 'profile-social'/);
  assert.match(settings, /id: 'profile-collection'/);
  assert.match(settings, /popstate/);
  assert.match(settings, /history\.pushState/);
  assert.match(settings, /import\('\.\/ProfileShell\.svelte'\)/);
  assert.match(appearance, /save_profile_configuration_section/);
  assert.match(appearance, /publish_profile_configuration_section/);
  assert.match(layout, /p_section: 'composition'/);
  assert.match(layout, /save_profile_configuration_section/);
  assert.match(layout, /publish_profile_configuration_section/);
  assert.doesNotMatch(layout, /save_profile_configuration['"]/);
  assert.doesNotMatch(layout, /Signature color|Ambient color|colorEffectsEnabled/);
  assert.match(migration, /UPDATE public\.profile_configurations/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /p_expected_updated_at/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.save_profile_configuration_section/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.publish_profile_configuration_section/);
  assert.match(migration, /profile_composition_patch/);
  assert.match(migration, /'layoutVariant'/);
  assert.match(migration, /'modules'/);
  assert.match(migration, /'links'/);
  assert.match(shell, /profile-dashboard-shell__group/);
  assert.match(shell, /inert=/);
  assert.match(shell, /trapFocus\(event, drawer\)/);
});
