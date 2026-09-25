import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { runRollTextShare } from '../src/lib/rollTextShare.js';

const game = await readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8');

function createSnapshot(overrides = {}) {
  return {
    requestId: 7,
    accountId: null,
    authenticated: false,
    accountMode: 'guest',
    score: 42,
    shareHex: '#12ABEF',
    rarity: 'Rare',
    earnedLine: '',
    senderUsername: null,
    appOrigin: 'https://chm.lol/',
    ...overrides
  };
}

function createAdapters(overrides = {}) {
  const events = [];
  const state = { copied: false };
  return {
    events,
    state,
    adapters: {
      isCurrent: () => true,
      createChallengeLink: async payload => {
        events.push(['challenge', payload]);
        return { success: false };
      },
      writeText: async text => events.push(['copy', text]),
      track: (name, payload) => events.push(['track', name, payload]),
      toast: (message, type) => events.push(['toast', message, type]),
      onCopied: () => {
        events.push(['copied']);
        state.copied = true;
      },
      ...overrides
    }
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('Game passes a click-time roll snapshot and keeps browser effects behind its adapter', async () => {
  assert.match(game, /let rollTextShareAttemptId = 0/);
  assert.match(game, /shareAttemptId === rollTextShareAttemptId[\s\S]*?shareRequestId === rollRequestId/);
  const timers = [];
  const challengeCalls = [];
  const clipboardCalls = [];
  const analyticsCalls = [];
  const toastCalls = [];
  let captured;
  const state = {
    rollRequestId: 12,
    rollTextShareAttemptId: 0,
    $session: { user: { id: 'account-a' } },
    $isAuthenticated: true,
    $profile: { username: 'Alice', lifetime_ep: 5000 },
    $authUser: null,
    score: 4321,
    displayColor: '#abcdef',
    rarity: 'Epic',
    newMilestones: [
      { name: 'First Streak', reward: { name: 'Spectrum Aura' } },
      { name: 'Daily Return' }
    ],
    supabase: { client: 'current' },
    navigator: { clipboard: { writeText: text => clipboardCalls.push(text) } },
    copied: false,
    getRank: ep => ({ name: ep >= 5000 ? 'Chroma' : 'New' }),
    normalizeHexColor: value => value.toUpperCase(),
    getRollAccountMode: () => 'authenticated',
    getAppOrigin: () => 'https://chm.lol/',
    createChallengeLink: (client, payload) => {
      challengeCalls.push({ client, payload });
      return { success: true, shareUrl: '/c/current' };
    },
    trackProductEvent: (name, payload) => analyticsCalls.push({ name, payload }),
    addToast: (message, type) => toastCalls.push({ message, type }),
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    copiedFeedbackVersion: 0,
    runRollTextShare: async (snapshot, effects) => { captured = { snapshot, effects }; }
  };
  vm.createContext(state);
  vm.runInContext(game.slice(game.indexOf('  async function shareResultsText()'), game.indexOf('  function prefersReducedMotion()')), state);

  await vm.runInContext('shareResultsText()', state);

  assert.equal(captured.snapshot.requestId, 12);
  assert.equal(captured.snapshot.accountId, 'account-a');
  assert.equal(captured.snapshot.authenticated, true);
  assert.equal(captured.snapshot.accountMode, 'authenticated');
  assert.equal(captured.snapshot.score, 4321);
  assert.equal(captured.snapshot.shareHex, '#ABCDEF');
  assert.equal(captured.snapshot.rarity, 'Epic');
  assert.equal(captured.snapshot.earnedLine, 'Unlocked: Spectrum Aura, Daily Return');
  assert.equal(captured.snapshot.senderUsername, 'Alice');
  assert.equal(captured.snapshot.appOrigin, 'https://chm.lol/');

  assert.equal(captured.effects.isCurrent(), true);
  await captured.effects.createChallengeLink({ score: 4321, hex: '#ABCDEF', senderUsername: 'Alice' });
  assert.deepEqual(challengeCalls[0].client, { client: 'current' });
  assert.equal(challengeCalls[0].payload.hex, '#ABCDEF');
  await captured.effects.writeText('copy this result');
  assert.deepEqual(clipboardCalls, ['copy this result']);
  captured.effects.track('progression_share_started', { surface: 'roll' });
  captured.effects.toast('share failed', 'error');
  captured.effects.onCopied();
  captured.effects.onCopied();
  assert.deepEqual(analyticsCalls, [{ name: 'progression_share_started', payload: { surface: 'roll' } }]);
  assert.deepEqual(toastCalls, [{ message: 'share failed', type: 'error' }]);
  assert.equal(state.copied, true);
  assert.equal(timers[0].delay, 2000);
  assert.equal(timers[1].delay, 2000);
  timers[0].callback();
  assert.equal(state.copied, true, 'an older copy timer does not clear newer feedback');
  timers[1].callback();
  assert.equal(state.copied, false);

  const firstShareEffects = captured.effects;
  state.newMilestones = [];
  await vm.runInContext('shareResultsText()', state);
  assert.equal(captured.snapshot.earnedLine, 'Rank: Chroma');
  assert.equal(firstShareEffects.isCurrent(), false, 'starting a later share invalidates earlier feedback');
  assert.equal(captured.effects.isCurrent(), true);

  state.rollRequestId += 1;
  assert.equal(captured.effects.isCurrent(), false);
});

test('guest text share uses the displayed color and app CTA without creating a challenge', async () => {
  const harness = createAdapters({
    createChallengeLink: () => assert.fail('guest shares do not create challenges')
  });

  const result = await runRollTextShare(createSnapshot(), harness.adapters);

  assert.deepEqual(result, {
    status: 'copied',
    text: '🎲 ChromaDie Daily Roll\n#12ABEF • 42 pts • Rare\nPlay ChromaDie: https://chm.lol/'
  });
  assert.deepEqual(harness.events, [
    ['track', 'progression_share_started', { surface: 'roll', accountMode: 'guest', method: 'clipboard' }],
    ['copy', result.text],
    ['copied']
  ]);
  assert.equal(harness.state.copied, true);
});

test('authenticated text share uses the server challenge URL and click-time unlock line', async () => {
  const harness = createAdapters({
    createChallengeLink: async payload => {
      harness.events.push(['challenge', payload]);
      return { success: true, shareUrl: '/c/abc123' };
    }
  });
  const snapshot = createSnapshot({
    accountId: 'account-a',
    authenticated: true,
    accountMode: 'authenticated',
    score: 1500,
    shareHex: '#AABBCC',
    rarity: 'Epic',
    earnedLine: 'Unlocked: Bravest',
    senderUsername: 'Alice'
  });

  const result = await runRollTextShare(snapshot, harness.adapters);

  assert.deepEqual(harness.events, [
    ['challenge', { score: 1500, hex: '#AABBCC', senderUsername: 'Alice' }],
    ['track', 'progression_share_started', { surface: 'roll', accountMode: 'authenticated', method: 'clipboard' }],
    ['copy', '🎲 ChromaDie Daily Roll\n#AABBCC • 1,500 pts • Epic\nUnlocked: Bravest\nChallenge me: https://chm.lol/c/abc123'],
    ['copied']
  ]);
  assert.equal(result.status, 'copied');
});

test('authenticated challenge failure warns and still copies the Play fallback', async () => {
  const harness = createAdapters();
  const result = await runRollTextShare(createSnapshot({
    accountId: 'account-a',
    authenticated: true,
    accountMode: 'authenticated',
    senderUsername: 'Alice',
    earnedLine: 'Rank: Chroma'
  }), harness.adapters);

  assert.equal(result.status, 'copied');
  assert.equal(result.text, '🎲 ChromaDie Daily Roll\n#12ABEF • 42 pts • Rare\nRank: Chroma\nPlay ChromaDie: https://chm.lol/');
  assert.deepEqual(harness.events, [
    ['challenge', { score: 42, hex: '#12ABEF', senderUsername: 'Alice' }],
    ['toast', 'The result was copied without a challenge link because the server could not create one.', 'error'],
    ['track', 'progression_share_started', { surface: 'roll', accountMode: 'authenticated', method: 'clipboard' }],
    ['copy', result.text],
    ['copied']
  ]);
});

test('an older same-roll challenge failure cannot warn or copy after a newer share succeeds', async () => {
  let currentShareAttempt = 0;
  const olderAttempt = ++currentShareAttempt;
  const olderChallenge = deferred();
  let markOlderChallengeStarted;
  const olderChallengeStarted = new Promise(resolve => { markOlderChallengeStarted = resolve; });
  const older = createAdapters({
    isCurrent: () => olderAttempt === currentShareAttempt,
    createChallengeLink: payload => {
      older.events.push(['challenge', payload]);
      markOlderChallengeStarted();
      return olderChallenge.promise;
    }
  });
  const olderPending = runRollTextShare(createSnapshot({
    accountId: 'account-a',
    authenticated: true,
    accountMode: 'authenticated'
  }), older.adapters);
  await olderChallengeStarted;

  const newerAttempt = ++currentShareAttempt;
  const newer = createAdapters({
    isCurrent: () => newerAttempt === currentShareAttempt,
    createChallengeLink: async payload => {
      newer.events.push(['challenge', payload]);
      return { success: true, shareUrl: '/c/new' };
    }
  });
  assert.equal((await runRollTextShare(createSnapshot({
    accountId: 'account-a',
    authenticated: true,
    accountMode: 'authenticated'
  }), newer.adapters)).status, 'copied');

  olderChallenge.resolve({ success: false });
  assert.deepEqual(await olderPending, { status: 'stale' });
  assert.deepEqual(older.events, [['challenge', { score: 42, hex: '#12ABEF', senderUsername: null }]]);
  assert.equal(newer.events.some(([type]) => type === 'copied'), true);
});

test('a stale challenge completion never tracks, warns, or copies', async () => {
  let finishChallenge;
  let current = true;
  const harness = createAdapters({
    isCurrent: () => current,
    createChallengeLink: payload => {
      harness.events.push(['challenge', payload]);
      return new Promise(resolve => { finishChallenge = resolve; });
    }
  });
  const pending = runRollTextShare(createSnapshot({
    accountId: 'account-a',
    authenticated: true,
    accountMode: 'authenticated'
  }), harness.adapters);

  current = false;
  finishChallenge({ success: true, shareUrl: '/c/stale' });

  assert.deepEqual(await pending, { status: 'stale' });
  assert.deepEqual(harness.events, [['challenge', { score: 42, hex: '#12ABEF', senderUsername: null }]]);
});

test('a stale clipboard success cannot update copied state', async () => {
  let finishCopy;
  let current = true;
  const harness = createAdapters({
    isCurrent: () => current,
    writeText: text => {
      harness.events.push(['copy-started', text]);
      return new Promise(resolve => { finishCopy = resolve; });
    }
  });
  const pending = runRollTextShare(createSnapshot(), harness.adapters);

  await Promise.resolve();
  current = false;
  finishCopy();

  assert.deepEqual(await pending, { status: 'stale' });
  assert.equal(harness.state.copied, false);
});

test('a stale clipboard rejection does not show an error on the replacement result', async () => {
  let rejectCopy;
  let current = true;
  const harness = createAdapters({
    isCurrent: () => current,
    writeText: () => new Promise((resolve, reject) => { rejectCopy = reject; })
  });
  const pending = runRollTextShare(createSnapshot(), harness.adapters);

  await Promise.resolve();
  current = false;
  rejectCopy(new Error('clipboard unavailable'));

  assert.deepEqual(await pending, { status: 'stale' });
  assert.equal(harness.events.some(([type]) => type === 'toast'), false);
});

test('a current clipboard failure reports the existing retry message', async () => {
  const harness = createAdapters({
    writeText: async () => { throw new Error('clipboard unavailable'); }
  });

  const result = await runRollTextShare(createSnapshot(), harness.adapters);

  assert.deepEqual(result, { status: 'copy-failed' });
  assert.deepEqual(harness.events.at(-1), ['toast', 'Could not copy the result. Please try again.', 'error']);
  assert.equal(harness.state.copied, false);
});
