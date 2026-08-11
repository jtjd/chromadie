import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const daily = await read('src/lib/HomeDailyResult.svelte');
const profileShell = await read('src/lib/ProfileShell.svelte');
const dashboard = await read('src/lib/ProfileDashboardShell.svelte');
const dashboardActions = await read('src/lib/ProfileDashboardActions.svelte');
const preview = await read('src/lib/ProfileStudioPreview.svelte');
const identity = await read('src/lib/IdentityCard.svelte');
const header = await read('src/lib/SiteModeHeader.svelte');
const studioHeader = await read('src/lib/ProfileStudioHeader.svelte');
const shareDialog = await read('src/lib/ProfileShareDialog.svelte');
const discovery = await read('src/lib/DiscoveryHub.svelte');
const foundations = await read('src/styles/foundations.css');

test('homepage daily result gives the medium-width roll and readout enough room', () => {
  assert.match(daily, /grid-template-columns: minmax\(16rem, 1fr\) minmax\(12rem, 0\.8fr\)/);
  assert.doesNotMatch(daily, /grid-template-columns: 8rem minmax\(0, 1fr\)/);
  assert.match(daily, /@media \(max-width: 36rem\)/);
  assert.match(daily, /\.home-daily__readout \{[^}]*justify-items: start/);
});

test('public profiles leave wheel scrolling to the browser', () => {
  assert.match(profileShell, /scroll-snap-type: y proximity/);
  assert.match(profileShell, /scroll-snap-stop: normal/);
  assert.doesNotMatch(profileShell, /handleProfileWheel/);
  assert.doesNotMatch(profileShell, /addEventListener\('wheel'/);
});

test('Profile Studio preview is bounded on short-height screens and respects safe areas', () => {
  assert.match(dashboard, /min-height: min\(20rem, calc\(100dvh - 5rem\)\)/);
  assert.match(dashboard, /@media \(max-height: 32rem\)/);
  assert.match(dashboard, /env\(safe-area-inset-bottom\)/);
  assert.match(preview, /env\(safe-area-inset-bottom\)/);
  assert.match(preview, /min-height: min\(22rem, calc\(100dvh - 12rem\)\)/);
});

test('narrow identity cards use container-aware stacked layouts and readable bios', () => {
  assert.match(identity, /container: identity-card \/ inline-size/);
  assert.match(identity, /@container identity-card \(max-width: 24rem\)/);
  assert.match(identity, /\.identity-card__bio--typewriter[^}]*white-space: normal/);
  assert.match(identity, /\.identity-card--layout-split-signal[^}]*flex-direction: column/);
});

test('profile mobile header keeps edit visible and moves account actions into the menu', () => {
  assert.match(header, /\.site-mode-header--profile \.site-mode-header__account \{ display: none/);
  assert.match(header, /\.site-mode-header--profile \.site-mode-header__mobile-menu \{ display: block/);
  assert.match(header, /\.site-mode-header--profile \.site-mode-header__mobile-context \{ display: none/);
  assert.match(studioHeader, /\.profile-studio-header__toolbar-actions :is\(a, button\) \{ flex: 1 1 0; min-height: 2\.75rem/);
  assert.match(dashboardActions, /\.profile-dashboard-actions__buttons button \{ flex: 1 1 0; min-width: 0; min-height: 2\.75rem/);
});

test('share dialog has the same focus and scroll management contract as other dialogs', () => {
  assert.match(shareDialog, /focusFirstElement/);
  assert.match(shareDialog, /restoreFocus/);
  assert.match(shareDialog, /trapFocus/);
  assert.match(shareDialog, /document\.body\.style\.overflow/);
  assert.match(shareDialog, /tabindex="-1"/);
});

test('editable controls use a mobile-safe text size without enlarging binary controls', () => {
  assert.match(foundations, /@media \(max-width: 48rem\)/);
  assert.match(foundations, /input:not\(\[type=['"]checkbox['"]\]\)/);
  assert.match(foundations, /font-size: 1rem !important/);
  assert.match(foundations, /:not\(\[type=['"]range['"]\]\)/);
});

test('Discovery reduces mobile card density and enlarges touch controls', () => {
  assert.match(discovery, /@media \(max-width: 36rem\)/);
  assert.match(discovery, /:global\(\.discovery-card__stats\) \{ display: none/);
  assert.match(discovery, /:global\(\.discovery-card__cta\) \{ display: inline-flex; min-height: 2\.75rem/);
  assert.match(discovery, /:global\(\.discovery-card__share\), :global\(\.discovery-card__icon-button\) \{ min-height: 2\.75rem/);
});
