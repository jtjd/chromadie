import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile(new URL('../src/lib/HomePage.svelte', import.meta.url), 'utf8');
const showcase = await readFile(new URL('../src/lib/HomeRollShowcase.svelte', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');
const guestProfile = await readFile(new URL('../src/lib/GuestProfileOnboarding.svelte', import.meta.url), 'utf8');

test('the homepage explains the daily identity loop with a direct claim action', () => {
  assert.match(home, /A public profile built through one daily color roll/);
  assert.match(home, /Roll once a day to collect colors, earn EP, unlock cosmetics/);
  assert.match(home, /Claim your username/);
  assert.match(home, /dispatch\('claim'/);
  assert.match(home, /chm\.lol\//);
  assert.match(home, /View your profile/);
  assert.match(home, /One roll each day/);
  assert.match(home, /Roll a color/);
  assert.match(home, /Get discovered/);
  assert.doesNotMatch(home, /HomepageLiveProfiles/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /HomeRollShowcase/);
  assert.match(home, /@fontsource-variable\/spline-sans/);
  assert.match(home, /@fontsource\/ibm-plex-mono/);
  assert.match(showcase, /import IdentityCard from '.\/IdentityCard\.svelte'/);
  assert.match(showcase, /<IdentityCard/);
  assert.match(showcase, /showToday=\{false\}/);
  assert.match(showcase, /Live public profile/);
  assert.match(showcase, /resets in 08:42:16/);
  assert.match(showcase, /home-showcase__daily/);
  assert.doesNotMatch(showcase, /border-prism-anim|frame-diamond-anim|name-spectrum-anim|roll-sparkles-anim|orb-shape-diamond/);
});

test('the application mounts the homepage, signup flow, and global footer', () => {
  assert.match(app, /import HomePage from '.\/lib\/HomePage\.svelte'/);
  assert.match(app, /\{#if view === 'home'\}/);
  assert.match(app, /on:signup=\{\(\) => openAuthModal\('signup'\)\}/);
  assert.match(app, /\{#if !profileModeVisible && !homeModeVisible\}\s*<ProfileAtmosphere/);
  assert.match(app, /class:app-shell--home=\{homeModeVisible\}/);
  assert.match(app, /<footer class="site-footer">/);
  assert.match(app, /\.site-footer \{\s*position: relative;\s*z-index: 1;/s);
  assert.match(app, /Privacy Policy/);
  assert.match(app, /How to Play/);
});

test('the signed-out profile route opens the guest onboarding roll', () => {
  assert.match(app, /import GuestProfileOnboarding from '.\/lib\/GuestProfileOnboarding\.svelte'/);
  assert.match(app, /<GuestProfileOnboarding guestActive/);
  assert.match(guestProfile, /This could be your profile/);
  assert.match(guestProfile, /See today’s roll/);
  assert.match(guestProfile, /guest-onboarding/);
  assert.match(guestProfile, /IdentityCard/);
  assert.match(guestProfile, /ProfileRoll/);
  assert.match(guestProfile, /Create your profile/);
});
