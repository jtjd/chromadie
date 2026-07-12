import test from 'node:test';
import assert from 'node:assert/strict';
import { signOutCurrentBrowser } from '../src/lib/authSession.js';

test('logout succeeds only after Supabase confirms session removal', async () => {
  const calls = [];
  const success = await signOutCurrentBrowser({
    async signOut(options) {
      calls.push(options || null);
      return { error: null };
    }
  });
  assert.equal(success.error, null);
  assert.deepEqual(calls, [null]);
});

test('logout falls back to local session removal after a network revoke failure', async () => {
  const calls = [];
  const result = await signOutCurrentBrowser({
    async signOut(options) {
      calls.push(options || null);
      return options?.scope === 'local' ? { error: null } : { error: new Error('offline') };
    }
  });
  assert.equal(result.error, null);
  assert.equal(result.usedLocalFallback, true);
  assert.deepEqual(calls, [null, { scope: 'local' }]);
});

test('logout reports failure when neither global nor local removal succeeds', async () => {
  const failure = new Error('storage blocked');
  const result = await signOutCurrentBrowser({ async signOut() { return { error: failure }; } });
  assert.equal(result.error, failure);
});

test('logout still attempts local cleanup when the network call throws', async () => {
  const calls = [];
  const result = await signOutCurrentBrowser({
    async signOut(options) {
      calls.push(options || null);
      if (!options) throw new Error('network unavailable');
      return { error: null };
    }
  });
  assert.equal(result.error, null);
  assert.equal(result.usedLocalFallback, true);
  assert.deepEqual(calls, [null, { scope: 'local' }]);
});
