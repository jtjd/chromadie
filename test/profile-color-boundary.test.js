import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PROFILE_BORDER_KEYS,
  getProfileBorderDefinition,
  isProfileBorderKey,
} from '../src/lib/profile-border/profileBorders.js';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import { getProfileAppearanceStyle, getProfileCanvasStyle } from '../src/lib/profileAppearanceStyle.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all retained Profile Border keys resolve through the finite registry', () => {
  assert.equal(PROFILE_BORDER_KEYS.length, 9);
  for (const key of PROFILE_BORDER_KEYS) {
    assert.equal(isProfileBorderKey(key), true);
    assert.equal(getProfileBorderDefinition(key)?.key, key);
  }
});

test('profile color presentation remains bounded and the retained border is shared', async () => {
  const [shell, profile, card, border, registry] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/Profile.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/profile-border/ProfileBorderEffect.svelte'),
    read('src/lib/profile-border/profileBorders.js')
  ]);
  assert.match(shell, /--profile-accent/);
  assert.match(shell, /ProfileReferenceCard/);
  assert.match(card, /ProfileBorderEffect/);
  assert.match(profile, /ProfileBorderEffect/);
  assert.match(registry, /PROFILE_BORDER_KEYS/);
  assert.match(border, /prefers-reduced-motion/);
  assert.match(border, /profile-border-effect--none[\s\S]*--border-accent: transparent/);
  assert.match(border, /@keyframes profile-border-chroma/);
  assert.match(border, /@keyframes profile-border-prism/);
  assert.doesNotMatch(border, /profile-border-spectrum|filter:\s*hue-rotate/);
  assert.doesNotMatch(border, /@keyframes profile-border-glitch[\s\S]*transform/);
  assert.doesNotMatch(border, /@keyframes profile-border-crystal[\s\S]*opacity/);
  assert.doesNotMatch(border, /@keyframes profile-border-neon[\s\S]*opacity/);
  assert.doesNotMatch(shell + profile + border, /ProfileAtmosphere|profile_bg/);
});

test('profile appearance tokens stay on the identity card and out of the roll UI', async () => {
  const [shell, card, appearanceStyle, renderModel, border] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/profileAppearanceStyle.js'),
    read('src/lib/profileRenderModel.js'),
    read('src/lib/profile-border/ProfileBorderEffect.svelte')
  ]);

  assert.match(shell, /const profileShellStyle = '--profile-accent: var\(--color-accent-roll\)/);
  assert.match(renderModel, /getProfileAppearanceStyle\(configuration\)/);
  assert.match(renderModel, /getProfileCanvasStyle\(configuration\)/);
  assert.match(shell, /style=\{profilePageStyle\} data-profile-render-model="v1"/);
  assert.match(shell, /profileBorderKey=\{cosmetics\?\.profile_border\}/);
  assert.match(shell, /surfaceStyle=\{profileCardStyle\}/);
  assert.match(card, /<ProfileBorderEffect[\s\S]*borderKey=\{profileBorderKey\}[\s\S]*surfaceStyle=\{surfaceStyle\}/);
  assert.match(border, /style=\{surfaceStyle\} data-profile-border=.*data-profile-surface/);
  assert.match(appearanceStyle, /--profile-background-paint/);
  assert.match(appearanceStyle, /function rgbaFromHex/);
  assert.match(appearanceStyle, /--profile-highlight/);
  assert.match(getProfileAppearanceStyle(createDefaultProfileConfig()), /--profile-surface-fill:rgba\(17, 20, 27, 0\.64\)/);
  assert.match(getProfileCanvasStyle(createDefaultProfileConfig()), /--profile-background-paint:#07080B/);
  assert.match(shell, /const rollModule = Object\.freeze\(\{ size: 'wide' \}\)/);
  assert.doesNotMatch(shell, /<main[\s\S]*?profileBackground/);
});
