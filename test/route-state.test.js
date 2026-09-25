import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseRouteLocation } from '../src/lib/routes.js';
import { resolveRouteState } from '../src/lib/routeState.js';

const appSource = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');

test('auth route projection carries bounded standalone auth state and clears profile context', () => {
  const parsed = parseRouteLocation('/signup', '?next=%2Fprofile%2Fsettings&username=NeonUser');
  assert.deepEqual(resolveRouteState(parsed), {
    routeMode: 'auth',
    view: 'auth',
    leaderboardTab: 'today',
    progressionTab: 'journey',
    authRouteTab: 'signup',
    authRouteNext: '/profile/settings',
    authRouteUsername: 'NeonUser',
    selectedProfileUsername: null,
    profileRouteKind: null,
    selectedUserId: null,
    aliasResolving: false,
    aliasToResolve: null,
    legacyProfile: false,
    challengeData: null,
    challengeToLoad: null
  });
});

test('alias projection keeps an unresolved profile shell and returns a separate lookup intent', () => {
  const state = resolveRouteState(parseRouteLocation('/a/Neon_Handle'));
  assert.equal(state.routeMode, 'app');
  assert.equal(state.view, 'profile');
  assert.equal(state.profileRouteKind, 'alias');
  assert.equal(state.selectedProfileUsername, null);
  assert.equal(state.selectedUserId, null);
  assert.equal(state.aliasResolving, true);
  assert.equal(state.aliasToResolve, 'Neon_Handle');
  assert.equal(state.challengeData, null);
});

test('canonical and compatibility usernames retain identity and legacy state', () => {
  const canonical = resolveRouteState(parseRouteLocation('/NeonUser'));
  assert.equal(canonical.view, 'profile');
  assert.equal(canonical.selectedProfileUsername, 'NeonUser');
  assert.equal(canonical.profileRouteKind, 'root');
  assert.equal(canonical.legacyProfile, false);

  const compatibility = resolveRouteState(parseRouteLocation('/u/NeonUser', '?legacy=1'));
  assert.equal(compatibility.view, 'profile');
  assert.equal(compatibility.selectedProfileUsername, 'NeonUser');
  assert.equal(compatibility.profileRouteKind, 'compatibility');
  assert.equal(compatibility.legacyProfile, true);
});

test('challenge projection creates only a loading placeholder and an explicit lookup intent', () => {
  const state = resolveRouteState(parseRouteLocation('/c/challenge-42', '?from=NeonUser'));
  assert.deepEqual(state.challengeData, {
    id: 'challenge-42',
    fromUsername: 'NeonUser',
    loading: true,
    error: null
  });
  assert.deepEqual(state.challengeToLoad, {
    challengeId: 'challenge-42',
    fallbackFrom: 'NeonUser'
  });
  assert.equal(state.view, 'game');
  assert.equal(state.selectedUserId, null);

  const legacyQuery = resolveRouteState(parseRouteLocation('/', '?view=game&challenge=old&hex=%23ffffff'));
  assert.equal(legacyQuery.view, 'home');
  assert.equal(legacyQuery.challengeData, null);
  assert.equal(legacyQuery.challengeToLoad, null);
});

test('ordinary app projection preserves selected IDs, tabs, and profile compatibility flags', () => {
  const profileState = resolveRouteState(parseRouteLocation('/', '?view=profile&profile=owner-2&legacy=1'));
  assert.equal(profileState.view, 'profile');
  assert.equal(profileState.selectedUserId, 'owner-2');
  assert.equal(profileState.legacyProfile, true);

  const tabbedState = resolveRouteState(parseRouteLocation('/leaderboard', '?tab=monthly'));
  assert.equal(tabbedState.view, 'leaderboard');
  assert.equal(tabbedState.leaderboardTab, 'monthly');
  assert.equal(tabbedState.selectedUserId, null);
});

test('first render and mounted navigation share the same route-state projection', () => {
  assert.match(appSource, /const initialRouteState = initialRoute \? resolveRouteState\(initialRoute\) : null;/);
  assert.match(appSource, /let view = initialRouteState\?\.view \|\| 'home';/);
  assert.match(appSource, /let challengeData = initialRouteState\?\.challengeData \|\| null;/);
  assert.match(appSource, /let selectedProfileUsername = initialRouteState\?\.selectedProfileUsername \|\| null;/);
  assert.match(appSource, /let aliasResolving = initialRouteState\?\.aliasResolving \|\| false;/);
  assert.match(appSource, /const nextRouteState = resolveRouteState\(parsed\);/);
  assert.match(appSource, /if \(nextRouteState\.aliasToResolve\) void loadProfileAlias/);
  assert.match(appSource, /if \(nextRouteState\.challengeToLoad\) \{/);
});

test('App keeps request invalidation, URL repair, and async reads outside pure route projection', () => {
  assert.match(appSource, /import \{ resolveRouteState \} from '\.\/lib\/routeState\.js'/);
  assert.match(appSource, /invalidateChallengeLoad\(\);\s+invalidateProfileAliasLoad\(\);/);
  assert.match(appSource, /const nextRouteState = resolveRouteState\(parsed\)/);
  assert.match(appSource, /loadProfileAlias\(nextRouteState\.aliasToResolve\)/);
  assert.match(appSource, /loadChallengeById\([\s\S]*?nextRouteState\.challengeToLoad\.challengeId/);
  assert.match(appSource, /import\('\.\/lib\/profileAliasLifecycle\.js'\)/);
  assert.match(appSource, /import\('\.\/lib\/challengeLifecycle\.js'\)/);
  assert.match(appSource, /challengeLifecycleGeneration \+= 1;\s+challengeLifecycle\?\.invalidate\(\)/);
  assert.match(appSource, /aliasResolutionGeneration \+= 1;\s+profileAliasLifecycle\?\.invalidate\(\)/);
  assert.doesNotMatch(appSource, /from '\.\/lib\/challengeLifecycle\.js'/);
  assert.doesNotMatch(appSource, /from '\.\/lib\/profileAliasLifecycle\.js'/);
  const challengeLoadSource = appSource.slice(
    appSource.indexOf('async function loadChallengeById('),
    appSource.indexOf('function syncRoute()')
  );
  assert.match(challengeLoadSource, /await lifecycle\.load\(challengeId, fallbackFrom\)/);
  assert.doesNotMatch(challengeLoadSource, /result\.success|target_score|sender_username/);
  assert.match(challengeLoadSource, /catch \{[\s\S]*?generation !== challengeLifecycleGeneration/);
  assert.match(challengeLoadSource, /Challenge could not be loaded\. Refresh and try again\./);
  const challengeClearSource = appSource.slice(
    appSource.indexOf('function clearChallengeState()'),
    appSource.indexOf('function shouldClearChallengeBeforeNavigation()')
  );
  assert.match(challengeClearSource, /invalidateChallengeLoad\(\)/);
  assert.match(challengeClearSource, /getChallengeClearPath\(window\.location\.href\)/);
  assert.match(appSource, /window\.history\.replaceState\(\{\}, '', '\/profile\/settings#customize-appearance'\)/);
  const aliasLoadSource = appSource.slice(
    appSource.indexOf('async function loadProfileAlias('),
    appSource.indexOf('function invalidateChallengeLoad()')
  );
  assert.match(aliasLoadSource, /await lifecycle\.load\(alias\)/);
  assert.match(aliasLoadSource, /generation !== aliasResolutionGeneration/);
  assert.match(aliasLoadSource, /try \{[\s\S]*?const lifecycle = await getProfileAliasLifecycle\(\);[\s\S]*?if \(generation !== aliasResolutionGeneration\) return;[\s\S]*?result = await lifecycle\.load\(alias\);\s+\} catch \{/);
  assert.match(aliasLoadSource, /catch \{[\s\S]*?Failed module or lookup loading resolves to its normal not-found state\.[\s\S]*?\}\s+if \(generation !== aliasResolutionGeneration \|\| result\.status === 'stale'\) return;/);
  assert.match(aliasLoadSource, /window\.history\.replaceState\(\{\}, '', `\$\{result\.canonicalPath\}\$\{window\.location\.search\}\$\{window\.location\.hash\}`\)/);
  assert.match(aliasLoadSource, /parseRoute\(\)/);
});
