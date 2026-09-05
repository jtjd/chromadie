import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { loadOwnerHistoryPage } from '../src/lib/progressionRecordData.js';
import { parseRouteLocation, viewToCanonicalPath } from '../src/lib/routes.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('progression record tabs are canonical and invalid tabs return to Journey', () => {
  assert.equal(parseRouteLocation('/progression', '?tab=achievements').progressionTab, 'achievements');
  assert.equal(parseRouteLocation('/progression', '?tab=collection').progressionTab, 'collection');
  assert.equal(parseRouteLocation('/progression', '?tab=history').progressionTab, 'history');
  assert.equal(parseRouteLocation('/progression', '?tab=private').progressionTab, 'journey');
  assert.equal(viewToCanonicalPath('progression', { progressionTab: 'journey' }), '/progression');
  assert.equal(viewToCanonicalPath('progression', { progressionTab: 'history' }), '/progression?tab=history');
});

test('owner history loader uses the bounded cursor contract and normalizes unsafe fields', async () => {
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return {
        data: {
          success: true,
          items: [{ id: 'event-1', eventType: 'roll', occurredAt: '2026-09-01T00:00:00Z', hex: '#aabbcc', score: '42', rarity: 'Rare', identity: 'Blue', conditionCount: 3 }],
          hasMore: true,
          nextCursor: { occurredAt: '2026-09-01T00:00:00Z', id: 'event-1' }
        },
        error: null
      };
    }
  };
  const result = await loadOwnerHistoryPage(client, { occurredAt: '2026-09-02T00:00:00Z', id: 'event-2' });
  assert.deepEqual(calls, [{
    name: 'get_my_profile_history',
    args: { p_limit: 40, p_before_occurred_at: '2026-09-02T00:00:00Z', p_before_id: 'event-2' }
  }]);
  assert.equal(result.items[0].hex, '#AABBCC');
  assert.equal(result.items[0].score, 42);
  assert.equal(result.hasMore, true);
});

test('owner progression record RPCs are authenticated, bounded, and do not add storage', async () => {
  const migration = await read('supabase/migrations/20260904100000_owner_progression_record.sql');
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_my_profile_history/);
  assert.match(migration, /LIMIT v_limit \+ 1/);
  assert.match(migration, /LEAST\(40/);
  assert.match(migration, /\(e\.occurred_at, e\.id\) < \(p_before_occurred_at, p_before_id\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_my_condition_collection/);
  assert.match(migration, /LIMIT 512/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_my_profile_history.* TO authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_my_condition_collection\(\) TO authenticated/);
  assert.doesNotMatch(migration, /CREATE TABLE|ALTER TABLE|INSERT INTO|UPDATE public\./);
});

test('progression detail modules stay behind route-local lazy imports', async () => {
  const page = await read('src/lib/ProgressionPage.svelte');
  assert.match(page, /import\('\.\/ProgressionAchievements\.svelte'\)/);
  assert.match(page, /import\('\.\/ProgressionCollection\.svelte'\)/);
  assert.match(page, /import\('\.\/ProgressionHistory\.svelte'\)/);
  assert.match(page, /ProgressionUnlockQueue/);
  assert.doesNotMatch(page, /timelineEvents=\{\[\]\}/);
});
