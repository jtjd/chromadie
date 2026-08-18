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
  assert.equal(defaults.appearance.useNameFontAcrossProfile, false);

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

  assert.equal(normalizeProfileAppearance({ useNameFontAcrossProfile: true }).useNameFontAcrossProfile, true);
  assert.equal(normalizeProfileAppearance({ useNameFontAcrossProfile: 'true' }).useNameFontAcrossProfile, false);

  const config = normalizeProfileConfig({ ...defaults, appearance: normalized, signatureColor: '#ABCDEF' });
  assert.equal(config.appearance.colors.accent, '#010203');
  assert.equal(config.signatureColor, '#010203');

  const frame = getNameFrameModel({ text: 'Chromadie', todayColor: '#112233', baseColor: '#F4F6FB' });
  assert.equal(frame.todayColor, '#112233');
  assert.equal(frame.baseColor, '#F4F6FB');
});

test('profile-wide Name Font scope stays bounded to the public profile tree', async () => {
  const [migration, cosmetics, customize, shell, preview] = await Promise.all([
    read('supabase/migrations/20260816130000_profile_wide_name_font_scope.sql'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileStudioPreview.svelte')
  ]);

  assert.match(migration, /useNameFontAcrossProfile/);
  assert.match(migration, /jsonb_typeof\(v_input->'useNameFontAcrossProfile'\) = 'boolean'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.unequip_item/);
  assert.match(migration, /jsonb_set\(coalesce\(v_record\.draft_config/);
  assert.match(migration, /published_config_v2 = public\.profile_configuration_v2_from_v1/);
  assert.match(cosmetics, /Apply across profile/);
  assert.match(cosmetics, /Includes bio and profile content/);
  assert.match(cosmetics, /isCustomNameFontKey/);
  assert.match(customize, /on:studiopatch=/);
  assert.match(shell, /profile-shell-page--profile-wide-name-font/);
  assert.match(shell, /requestNameFontLoad/);
  assert.match(shell, /:global\(\*\) \{[\s\S]*font-family: var\(--profile-font-family\) !important/);
  assert.match(preview, /profile-studio-preview__stage--profile-wide-name-font/);
  assert.match(preview, /requestNameFontLoad/);
});

test('dashboard uses its self-contained shell and aggregate profile action contract', async () => {
  const [app, settings, contract, registry, workspace, preview, header, appearance, layout, migration, shell] = await Promise.all([
    read('src/App.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/dashboardContract.js'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileStudioHeader.svelte'),
    read('src/lib/ProfileAppearanceEditor.svelte'),
    read('src/lib/ProfileLinksEditor.svelte'),
    read('supabase/migrations/20260808220000_profile_configuration_v2.sql'),
    read('src/lib/ProfileStudioShell.svelte')
  ]);
  const studio = [settings, contract, registry, workspace, preview, header].join('\n');
  assert.match(app, /\{#if !profileModeVisible && !homeModeVisible\}/);
  assert.match(registry, /id: 'account', destination: 'account',[\s\S]*ProfileAccountSettings\.svelte/);
  assert.match(studio, /id: 'customize'/);
  assert.match(studio, /id: 'links'/);
  assert.match(studio, /id: 'premium'/);
  assert.match(studio, /groupLabel: 'Account'/);
  assert.match(studio, /customize: 'customize'/);
  assert.match(studio, /LEGACY_SECTION_ROUTES/);
  assert.match(studio, /id: 'profile-social'/);
  assert.match(studio, /popstate/);
  assert.match(studio, /history\.pushState/);
  assert.match(studio, /import\('\.\/ProfileStudioPreview\.svelte'\)/);
  assert.match(studio, /ProfileReferenceCard/);
  assert.match(studio, /inputSurface="container"/);
  assert.doesNotMatch(studio, /import\('\.\/ProfileShell\.svelte'\)|renderSnapshot=\{previewRenderSnapshot\}/);
  assert.doesNotMatch(appearance, /save_profile_configuration_section|publish_profile_configuration_section/);
  assert.doesNotMatch(layout, /save_profile_configuration_section|publish_profile_configuration_section/);
  assert.match(settings, /save_profile_configuration_v2/);
  assert.match(settings, /publish_profile_studio_v2/);
  assert.match(settings, /on:publish=\{publishDashboard\}/);
  assert.match(shell, /profile-studio-shell__publish[\s\S]*Publish profile/);
  assert.match(shell, /dispatch\('reset'\)/);
  assert.doesNotMatch(appearance, /Highlight|Background gradient|Border color|appearance-gradient|appearance-border/);
  assert.doesNotMatch(layout, /save_profile_configuration['"]/);
  assert.doesNotMatch(layout, /Signature color|Ambient color|colorEffectsEnabled/);
  assert.match(migration, /UPDATE public\.profile_configurations/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /p_expected_updated_at/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.save_profile_configuration_v2/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.publish_profile_configuration_v2/);
  assert.match(migration, /profile_configuration_v2_from_v1/);
  assert.doesNotMatch(shell, /profile-studio-shell__primary-nav/);
  assert.match(shell, /profile-studio-shell__menu-trigger/);
  assert.match(shell, /profile-studio-shell__more-menu/);
  assert.match(shell, /aria-haspopup="menu"/);
  assert.match(shell, /slot name="preview"/);
  assert.match(shell, /prefers-reduced-motion/);
});
