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
  const [shell, profile, border, registry] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/Profile.svelte'),
    read('src/lib/profile-border/ProfileBorderEffect.svelte'),
    read('src/lib/profile-border/profileBorders.js')
  ]);
  assert.match(shell, /--profile-accent/);
  assert.match(shell, /ProfileBorderEffect/);
  assert.match(profile, /ProfileBorderEffect/);
  assert.match(registry, /PROFILE_BORDER_KEYS/);
  assert.match(border, /prefers-reduced-motion/);
  assert.match(border, /@keyframes profile-border-chroma/);
  assert.match(border, /@keyframes profile-border-prism/);
  assert.doesNotMatch(border, /profile-border-spectrum|filter:\s*hue-rotate/);
  assert.doesNotMatch(border, /@keyframes profile-border-glitch[\s\S]*transform/);
  assert.doesNotMatch(border, /@keyframes profile-border-crystal[\s\S]*opacity/);
  assert.doesNotMatch(border, /@keyframes profile-border-neon[\s\S]*opacity/);
  assert.doesNotMatch(shell + profile + border, /ProfileAtmosphere|profile_bg/);
});

test('profile appearance tokens stay on the identity card and out of the roll UI', async () => {
  const [shell, appearanceStyle] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profileAppearanceStyle.js')
  ]);

  assert.match(shell, /const profileShellStyle = '--profile-accent: var\(--color-accent-roll\)/);
  assert.match(shell, /getProfileAppearanceStyle\(effectiveProfileConfig\)/);
  assert.match(shell, /getProfileCanvasStyle\(effectiveProfileConfig\)/);
  assert.match(shell, /style=\{profilePageStyle\} aria-busy/);
  assert.match(shell, /data-profile-region="identity" style=\{profileCardStyle\}/);
  assert.match(appearanceStyle, /--profile-background-paint/);
  assert.match(appearanceStyle, /function rgbaFromHex/);
  assert.match(appearanceStyle, /--profile-highlight/);
  assert.match(getProfileAppearanceStyle(createDefaultProfileConfig()), /--profile-surface-fill:rgba\(17, 20, 27, 0\.64\)/);
  assert.match(getProfileCanvasStyle(createDefaultProfileConfig()), /--profile-background-paint:#07080B/);
  assert.match(getProfileCanvasStyle(createDefaultProfileConfig()), /--profile-surface-blur:20px/);
  assert.match(shell, /const rollModule = Object\.freeze\(\{ size: 'wide' \}\)/);
  assert.doesNotMatch(shell, /<main[\s\S]*?profileBackground/);
});
