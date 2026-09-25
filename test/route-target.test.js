import test from 'node:test';
import assert from 'node:assert/strict';

import { ACCOUNT_STATES } from '../src/lib/authState.js';
import { resolveRouteTarget } from '../src/lib/routeTarget.js';

const staticComponents = Object.freeze({
  notFound: 'NotFound',
  accountUnavailable: 'AccountUnavailable',
  routeLoading: 'RouteLoading'
});

const defaultState = Object.freeze({
  routeMode: 'app',
  view: 'home',
  tab: 'today',
  progressionTab: 'journey',
  isAuthenticated: false,
  sessionState: null,
  authInitialized: true,
  accountState: ACCOUNT_STATES.SIGNED_OUT,
  profileError: null,
  selectedUsername: null,
  selectedId: null,
  legacyProfile: false,
  visualFixture: '',
  guestActive: false,
  challenge: null,
  authTab: 'login',
  authNext: '',
  authUsername: '',
  aliasResolving: false,
  username: 'Guest',
  logoutInProgress: false
});

function target(overrides = {}, components = staticComponents) {
  return resolveRouteTarget(
    { ...defaultState, ...overrides },
    components.notFound,
    components.accountUnavailable,
    components.routeLoading
  );
}

test('static route targets use the supplied components and preserve status labels', () => {
  assert.deepEqual(target({ routeMode: 'not-found' }), {
    componentKey: 'not-found',
    staticComponent: 'NotFound',
    componentProps: {},
    loadingLabel: 'Opening page'
  });

  assert.deepEqual(target({ aliasResolving: true }), {
    componentKey: 'profile-alias-loading',
    staticComponent: 'RouteLoading',
    componentProps: { label: 'Opening profile alias' },
    loadingLabel: 'Opening profile alias'
  });

  assert.deepEqual(target({ view: 'profile-settings', accountState: ACCOUNT_STATES.PROFILE_ERROR }), {
    componentKey: 'profile-settings-error',
    staticComponent: 'AccountUnavailable',
    componentProps: {},
    loadingLabel: 'Loading account'
  });
});

test('auth and information routes preserve their lazy loader contracts', () => {
  assert.deepEqual(target({
    routeMode: 'auth',
    authTab: 'signup',
    authNext: '/profile/settings',
    authUsername: 'chromadie'
  }), {
    loaderKey: 'authPage',
    componentKey: 'auth-page:signup:/profile/settings:chromadie',
    componentProps: { initialTab: 'signup', next: '/profile/settings', initialUsername: 'chromadie' },
    loadingLabel: 'Opening sign up'
  });

  for (const [routeMode, loaderKey] of [
    ['privacy', 'privacy'],
    ['terms', 'terms'],
    ['how-to-play', 'howToPlay']
  ]) {
    assert.deepEqual(target({ routeMode }), {
      loaderKey,
      componentKey: routeMode,
      componentProps: {},
      loadingLabel: 'Opening information'
    });
  }
});

test('app views preserve lazy keys, route props, and challenge identity', () => {
  assert.deepEqual(target({
    view: 'home',
    isAuthenticated: true,
    accountState: ACCOUNT_STATES.AUTHENTICATED,
    username: 'NeonUser',
    logoutInProgress: true
  }), {
    loaderKey: 'home',
    componentKey: 'home',
    componentProps: {
      isAuthenticated: true,
      accountState: ACCOUNT_STATES.AUTHENTICATED,
      username: 'NeonUser',
      logoutInProgress: true
    },
    loadingLabel: 'Opening ChromaDie'
  });

  const routeCases = [
    ['pricing', 'pricing', 'pricing', {}, 'Opening pricing'],
    ['prototype', 'prototype', 'prototype', {}, 'Opening prototype'],
    ['leaderboard', 'leaderboard', 'leaderboard:rivals', { initialTab: 'rivals' }, 'Opening discovery'],
    ['progression', 'progression', 'progression:history', { initialTab: 'history' }, 'Opening progress']
  ];

  for (const [view, loaderKey, componentKey, componentProps, loadingLabel] of routeCases) {
    const state = {
      view,
      ...(view === 'leaderboard' ? { tab: 'rivals' } : {}),
      ...(view === 'progression' ? { progressionTab: 'history' } : {})
    };
    assert.deepEqual(target(state), { loaderKey, componentKey, componentProps, loadingLabel });
  }

  assert.equal(target({ view: 'game' }).componentKey, 'not-found');
  assert.equal(target({ view: 'game', challenge: { id: 'challenge-42' } }).componentKey, 'game:challenge-42');
});

test('profile settings and profile routes respect owner and account states', () => {
  assert.deepEqual(target({
    view: 'profile-settings',
    isAuthenticated: true,
    logoutInProgress: true
  }), {
    loaderKey: 'profileSettings',
    componentKey: 'profile-settings',
    componentProps: { logoutInProgress: true },
    loadingLabel: 'Opening profile settings'
  });

  assert.deepEqual(target({
    view: 'profile-settings',
    accountState: ACCOUNT_STATES.PROFILE_LOADING
  }), {
    componentKey: 'profile-settings-loading',
    staticComponent: 'RouteLoading',
    componentProps: { label: 'Loading your account' },
    loadingLabel: 'Loading your account'
  });

  assert.deepEqual(target({
    view: 'profile',
    sessionState: { user: { id: 'owner-1' } },
    authInitialized: true,
    profileError: { message: 'offline' }
  }), {
    componentKey: 'account-error:profile',
    staticComponent: 'AccountUnavailable',
    componentProps: {},
    loadingLabel: 'Loading account'
  });

  assert.deepEqual(target({
    view: 'profile',
    isAuthenticated: true,
    selectedUsername: 'NeonUser',
    visualFixture: 'owner'
  }), {
    loaderKey: 'profileShell',
    componentKey: 'profile:shell:NeonUser:owner',
    componentProps: { profileUsername: 'NeonUser', userId: null, visualFixture: 'owner' },
    loadingLabel: 'Opening profile'
  });

  assert.deepEqual(target({
    view: 'profile',
    selectedId: 'user-2',
    legacyProfile: true
  }), {
    loaderKey: 'profileLegacy',
    componentKey: 'profile:legacy:user-2:',
    componentProps: { profileUsername: null, userId: 'user-2' },
    loadingLabel: 'Opening profile'
  });

  assert.deepEqual(target({
    view: 'profile',
    accountState: ACCOUNT_STATES.SIGNED_OUT,
    guestActive: true
  }), {
    loaderKey: 'guestProfile',
    componentKey: 'guest-profile:true',
    componentProps: { guestActive: true },
    loadingLabel: 'Opening a profile preview'
  });
});

test('unresolved app states stay on the shared loading component', () => {
  assert.deepEqual(target({ view: 'profile', accountState: ACCOUNT_STATES.BOOTING, authInitialized: false }), {
    componentKey: 'route-loading:profile',
    staticComponent: 'RouteLoading',
    componentProps: { label: 'Loading your account' },
    loadingLabel: 'Loading page'
  });
});
