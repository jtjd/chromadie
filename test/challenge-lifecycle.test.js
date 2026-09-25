import test from 'node:test';
import assert from 'node:assert/strict';

import { createChallengeLifecycle } from '../src/lib/challengeLifecycle.js';

function createHarness(loadChallenge) {
  const calls = [];
  const state = { challengeData: { id: 'challenge-1' } };
  const lifecycle = createChallengeLifecycle({
    loadChallenge,
    setChallengeData: value => {
      calls.push(value);
      state.challengeData = value;
    }
  });
  return { lifecycle, calls, state };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

test('challenge lookup projects canonical success data and uses the route fallback sender', async () => {
  const { lifecycle, calls, state } = createHarness(async id => {
    assert.equal(id, 'challenge-42');
    return {
      success: true,
      challenge: {
        id: 'challenge-42',
        target_score: 7300,
        target_hex: '#12ABEF',
        sender_username: null
      }
    };
  });

  await lifecycle.load('challenge-42', 'NeonUser');

  assert.deepEqual(state.challengeData, {
    id: 'challenge-42',
    score: 7300,
    hex: '#12ABEF',
    fromUsername: 'NeonUser',
    loading: false,
    error: null
  });
  assert.equal(calls.length, 1);
});

test('challenge lookup preserves the server sender and maps failed results', async () => {
  const success = createHarness(async () => ({
    success: true,
    challenge: {
      id: 'challenge-43',
      target_score: 51,
      target_hex: '#ABCDEF',
      sender_username: 'CanonicalSender'
    }
  }));
  await success.lifecycle.load('challenge-43', 'RouteFallback');
  assert.equal(success.state.challengeData.fromUsername, 'CanonicalSender');

  const failure = new Error('Challenge expired.');
  const failed = createHarness(async () => ({ success: false, error: failure }));
  await failed.lifecycle.load('challenge-missing', 'RouteFallback');
  assert.deepEqual(failed.state.challengeData, {
    id: 'challenge-missing',
    fromUsername: 'RouteFallback',
    loading: false,
    error: 'Challenge expired.'
  });
});

test('a rejected current challenge lookup resolves to the unavailable state', async () => {
  const failed = createHarness(async () => {
    throw new Error('Network unavailable.');
  });

  await assert.doesNotReject(failed.lifecycle.load('challenge-offline', 'NeonUser'));
  assert.deepEqual(failed.state.challengeData, {
    id: 'challenge-offline',
    fromUsername: 'NeonUser',
    loading: false,
    error: 'Network unavailable.'
  });
});

test('a rejected superseded challenge lookup cannot replace the newer result', async () => {
  const requests = [];
  const failedRequest = deferred();
  const currentRequest = deferred();
  const { lifecycle, state, calls } = createHarness(id => {
    const request = id === 'older' ? failedRequest : currentRequest;
    requests.push(id);
    return request.promise;
  });

  const older = lifecycle.load('older');
  const current = lifecycle.load('current');
  currentRequest.resolve({
    success: true,
    challenge: { id: 'current', target_score: 12, target_hex: '#123456' }
  });
  await current;
  failedRequest.reject(new Error('Old lookup failed.'));
  await assert.doesNotReject(older);

  assert.deepEqual(requests, ['older', 'current']);
  assert.equal(calls.length, 1);
  assert.equal(state.challengeData.id, 'current');
  assert.equal(state.challengeData.score, 12);
});

test('a lookup invalidated by route change or dismissal cannot update challenge state', async () => {
  let finishLookup;
  const { lifecycle, calls, state } = createHarness(
    () => new Promise(resolve => { finishLookup = resolve; })
  );

  const pending = lifecycle.load('old-challenge');
  lifecycle.invalidate();
  finishLookup({
    success: true,
    challenge: { id: 'old-challenge', target_score: 99, target_hex: '#000000' }
  });
  await pending;

  assert.deepEqual(state.challengeData, { id: 'challenge-1' });
  assert.deepEqual(calls, []);
});

test('a newer challenge lookup supersedes an older response', async () => {
  const finish = [];
  const { lifecycle, state } = createHarness(
    id => new Promise(resolve => { finish.push({ id, resolve }); })
  );

  const older = lifecycle.load('older');
  const newer = lifecycle.load('newer');
  finish[0].resolve({ success: true, challenge: { id: 'older', target_score: 1, target_hex: '#111111' } });
  finish[1].resolve({ success: true, challenge: { id: 'newer', target_score: 2, target_hex: '#222222' } });
  await Promise.all([older, newer]);

  assert.equal(state.challengeData.id, 'newer');
  assert.equal(state.challengeData.score, 2);
});
