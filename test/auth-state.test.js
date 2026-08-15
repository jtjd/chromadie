import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_STATES, isSameAuthenticatedAccount, resolveAccountState } from '../src/lib/authState.js';

const userSession = { user: { id: 'user-1' } };

test('account state distinguishes bootstrap, signed-out, loading, error, and authenticated', () => {
  assert.equal(resolveAccountState({ initialized: false }), ACCOUNT_STATES.BOOTING);
  assert.equal(resolveAccountState({ initialized: true, session: null }), ACCOUNT_STATES.SIGNED_OUT);
  assert.equal(resolveAccountState({ initialized: true, session: userSession, profileReady: false, profileLoadFailed: false }), ACCOUNT_STATES.PROFILE_LOADING);
  assert.equal(resolveAccountState({ initialized: true, session: userSession, profileReady: true, profileLoadFailed: true }), ACCOUNT_STATES.PROFILE_ERROR);
  assert.equal(resolveAccountState({ initialized: true, session: userSession, profileReady: true, profileLoadFailed: false, profile: { id: 'user-1' } }), ACCOUNT_STATES.AUTHENTICATED);
  assert.equal(resolveAccountState({ initialized: true, session: userSession, profileReady: true, profileLoadFailed: false, profile: { id: 'other' } }), ACCOUNT_STATES.PROFILE_ERROR);
});

test('auth session replacement preserves only the same hydrated account', () => {
  assert.equal(isSameAuthenticatedAccount(userSession, { id: 'user-1' }), true);
  assert.equal(isSameAuthenticatedAccount({ user: { id: 'user-2' } }, { id: 'user-1' }), false);
  assert.equal(isSameAuthenticatedAccount(userSession, null), false);
  assert.equal(isSameAuthenticatedAccount(null, { id: 'user-1' }), false);
});
