import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_STATES as STATES } from '../src/lib/authState.js';
import { acceptRollPageEvent, createRollPageContext, deriveRollAccountPresentation } from '../src/lib/rollPageContext.js';
import { scoreCandidateColorV6 } from '../src/lib/scoringV6.js';

const session = { user: { id: 'owner' } };
const profile = { id: 'owner', username: 'Player', current_streak: 2, total_rolls: 36, lifetime_ep: 2000000 };
const result = { accountKey: 'owner', phase: 'results', identity: 'Azure', hex: '#5EBAE3', score: 38697 };

test('a result arriving before account hydration never identifies an account as a guest', () => {
  const event = acceptRollPageEvent(createRollPageContext(), result, 'owner');
  const loading = { ...event, ...deriveRollAccountPresentation(STATES.PROFILE_LOADING, session, null) };
  assert.equal(loading.signedOut, false);
  assert.equal(loading.isAuthenticated, false);
  const hydrated = { ...event, ...deriveRollAccountPresentation(STATES.AUTHENTICATED, session, profile) };
  assert.equal(hydrated.signedOut, false);
  assert.equal(hydrated.isAuthenticated, true);
  assert.equal(hydrated.currentStreak, 2);
  assert.equal(hydrated.totalRolls, 36);
  assert.equal(hydrated.score, result.score);
});

test('profile-first hydration and same-account token refresh retain the confirmed result', () => {
  const account = deriveRollAccountPresentation(STATES.AUTHENTICATED, session, profile);
  const event = acceptRollPageEvent(createRollPageContext(), result, account.accountKey);
  const refreshed = deriveRollAccountPresentation(STATES.AUTHENTICATED, { ...session, access_token: 'renewed' }, profile);
  assert.deepEqual(refreshed, account);
  assert.equal(event.phase, 'results');
});

test('booting, failed profile reads, and mismatched identities never expose signup or another profile statistics', () => {
  for (const state of [STATES.BOOTING, STATES.PROFILE_LOADING, STATES.PROFILE_ERROR]) {
    const account = deriveRollAccountPresentation(state, session, profile);
    assert.equal(account.signedOut, false);
    assert.equal(account.totalRolls, 0);
  }
  assert.equal(deriveRollAccountPresentation(STATES.AUTHENTICATED, session, { ...profile, id: 'other' }).isAuthenticated, false);
  assert.equal(deriveRollAccountPresentation(STATES.SIGNED_OUT, null, null).signedOut, true);
});

test('late results from guests, other accounts, and signed-out accounts are rejected', () => {
  const empty = createRollPageContext();
  for (const [event, accountKey] of [[result, 'guest'], [result, 'other'], [{ ...result, accountKey: 'guest' }, 'owner']]) {
    assert.equal(acceptRollPageEvent(empty, event, accountKey), empty);
  }
  assert.equal(acceptRollPageEvent(empty, { ...result, accountKey: 'guest' }, 'guest').phase, 'results');
});

test('homepage examples describe patterns present in the canonical v6 scorer', () => {
  const conditions = hex => scoreCandidateColorV6(...[0, 2, 4].map(i => Number.parseInt(hex.slice(i, i + 2), 16))).conditions;
  assert.ok(conditions('111111').some(c => /six|repeat|monodigit/i.test(c.name + ' ' + c.description)));
  assert.ok(conditions('123321').some(c => /palindrome/i.test(c.name + ' ' + c.description)));
  assert.ok(conditions('FF0000').some(c => c.id === 'pure_red'));
});
