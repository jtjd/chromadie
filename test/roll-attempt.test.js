import test from 'node:test';
import assert from 'node:assert/strict';
import { executeRollAttempt } from '../src/lib/rollAttempt.js';

const result = { success: true, hex: '#123456', score: 42, rarity: 'Common' };
const canonical = { hex: '#123456', score: 42, rarity: 'Common', badges: [] };

test('a failed request reports the failure without starting guest persistence or reveal', async () => {
  const events = [];
  const error = new Error('Server denied the roll.');
  const attempt = await executeRollAttempt({
    request: async () => { events.push('request'); return { data: null, error }; },
    requestDate: '2026-09-22',
    saveGuestBeforeReveal: () => events.push('persist'),
    reveal: async () => { events.push('reveal'); return canonical; },
    onFailure: failure => events.push(['failure', failure]),
    applyConfirmedResult: () => { events.push('apply'); return {}; },
    onComplete: () => events.push('complete')
  });

  assert.deepEqual(attempt, { status: 'failed', error });
  assert.deepEqual(events, ['request', ['failure', error]]);
});

test('an attempt made stale while its request is pending stops before applying the result', async () => {
  const events = [];
  let current = true;
  const attempt = await executeRollAttempt({
    request: async () => { current = false; return { data: result }; },
    isCurrent: () => current,
    requestDate: '2026-09-22',
    reveal: async () => { events.push('reveal'); return canonical; },
    applyConfirmedResult: () => { events.push('apply'); return {}; },
    onStale: () => events.push('stale')
  });

  assert.deepEqual(attempt, { status: 'stale' });
  assert.deepEqual(events, ['stale']);
});

test('a guest result is saved for its request day before an interruptible reveal', async () => {
  const events = [];
  let finishReveal;
  let signalReveal;
  let current = true;
  const revealStarted = new Promise(resolve => { signalReveal = resolve; });
  const pending = executeRollAttempt({
    request: async () => { events.push('request'); return { data: result }; },
    isCurrent: () => current,
    requestDate: '2026-09-21',
    saveGuestBeforeReveal: (data, date) => events.push(['save-before', data.hex, date]),
    reveal: () => {
      events.push('reveal');
      return new Promise(resolve => { finishReveal = resolve; signalReveal(); });
    },
    applyConfirmedResult: () => { events.push('apply'); return {}; },
    completeGuestResult: () => events.push('complete-guest'),
    onStale: () => events.push('stale')
  });

  await revealStarted;
  assert.deepEqual(events, ['request', ['save-before', '#123456', '2026-09-21'], 'reveal']);
  current = false;
  finishReveal(null);
  assert.deepEqual(await pending, { status: 'stale' });
  assert.deepEqual(events, ['request', ['save-before', '#123456', '2026-09-21'], 'reveal', 'stale']);
});

test('a confirmed guest attempt applies and stores the result after reveal, then completes', async () => {
  const events = [];
  const rollData = { date: '2026-09-22', hex: '#123456', score: 42 };
  const attempt = await executeRollAttempt({
    request: async () => { events.push('request'); return { data: result }; },
    requestDate: '2026-09-22',
    saveGuestBeforeReveal: () => events.push('save-before'),
    reveal: async () => { events.push('reveal'); return canonical; },
    applyConfirmedResult: (data, confirmed) => {
      events.push(['apply', data, confirmed]);
      return rollData;
    },
    completeGuestResult: data => events.push(['save-final', data]),
    onComplete: value => events.push(['complete', value])
  });

  assert.equal(attempt.status, 'completed');
  assert.equal(attempt.canonical, canonical);
  assert.equal(attempt.rollData, rollData);
  assert.deepEqual(events.map(event => Array.isArray(event) ? event[0] : event), [
    'request', 'save-before', 'reveal', 'apply', 'save-final', 'complete'
  ]);
});

test('a rejected reveal completes from the already-confirmed server result', async () => {
  const events = [];
  const error = new Error('Reveal animation failed.');
  const rollData = { date: '2026-09-22', hex: '#123456', score: 42 };
  const attempt = await executeRollAttempt({
    request: async () => ({ data: result }),
    requestDate: '2026-09-22',
    saveGuestBeforeReveal: () => events.push('save-before'),
    reveal: async () => { throw error; },
    onRevealFailure: failure => events.push(['reveal-failure', failure]),
    applyConfirmedResult: (data, confirmed, date) => {
      events.push(['apply', data.hex, confirmed.hex, date]);
      return rollData;
    },
    completeGuestResult: data => events.push(['save-final', data]),
    onComplete: value => events.push(['complete', value])
  });

  assert.equal(attempt.status, 'completed');
  assert.deepEqual(events.map(event => Array.isArray(event) ? event[0] : event), [
    'save-before', 'reveal-failure', 'apply', 'save-final', 'complete'
  ]);
  assert.deepEqual(events.find(event => Array.isArray(event) && event[0] === 'reveal-failure'), ['reveal-failure', error]);
  assert.deepEqual(events.find(event => Array.isArray(event) && event[0] === 'apply'), ['apply', '#123456', '#123456', '2026-09-22']);
});

test('a stale reveal rejection does not report feedback or apply an older result', async () => {
  const events = [];
  let current = true;
  const attempt = await executeRollAttempt({
    request: async () => ({ data: result }),
    isCurrent: () => current,
    requestDate: '2026-09-22',
    reveal: async () => {
      current = false;
      throw new Error('Late reveal failure.');
    },
    onRevealFailure: () => events.push('reveal-failure'),
    applyConfirmedResult: () => events.push('apply'),
    onStale: () => events.push('stale')
  });

  assert.deepEqual(attempt, { status: 'stale' });
  assert.deepEqual(events, ['stale']);
});

test('an authenticated attempt applies its result before refresh and finalizes after refresh', async () => {
  const events = [];
  const rollData = { date: '2026-09-22', hex: '#123456', score: 42 };
  const attempt = await executeRollAttempt({
    request: async () => { events.push('request'); return { data: result }; },
    requestUserId: 'account-1',
    requestDate: '2026-09-22',
    saveGuestBeforeReveal: () => assert.fail('authenticated results must not use guest persistence'),
    reveal: async () => { events.push('reveal'); return canonical; },
    applyConfirmedResult: () => { events.push('apply'); return rollData; },
    refreshAccount: async userId => { events.push(['refresh', userId]); return 'refreshed'; },
    onAccountRefresh: refreshed => events.push(['refresh-complete', refreshed]),
    onComplete: value => events.push(['complete', value])
  });

  assert.equal(attempt.status, 'completed');
  assert.deepEqual(events.map(event => Array.isArray(event) ? event[0] : event), [
    'request', 'reveal', 'apply', 'refresh', 'refresh-complete', 'complete'
  ]);
});

test('a stale authenticated refresh stops notifications and attempt completion', async () => {
  const events = [];
  let current = true;
  const attempt = await executeRollAttempt({
    request: async () => { events.push('request'); return { data: result }; },
    isCurrent: () => current,
    requestUserId: 'account-1',
    requestDate: '2026-09-22',
    reveal: async () => { events.push('reveal'); return canonical; },
    applyConfirmedResult: () => { events.push('apply'); return { score: 42 }; },
    refreshAccount: async userId => { events.push(['refresh', userId]); current = false; return 'refreshed'; },
    onAccountRefresh: () => events.push('refresh-notice'),
    onComplete: () => events.push('complete'),
    onStale: () => events.push('stale')
  });

  assert.deepEqual(attempt, { status: 'stale' });
  assert.deepEqual(events.map(event => Array.isArray(event) ? event[0] : event), [
    'request', 'reveal', 'apply', 'refresh', 'stale'
  ]);
  assert.equal(events.some(event => event === 'refresh-notice' || event === 'complete'), false);
});
