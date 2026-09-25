import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAchievementDefinitionsCache,
  loadAchievementDefinitions
} from '../src/lib/achievementData.js';

test('rejected achievement definition requests are cleared and can be retried', async () => {
  clearAchievementDefinitionsCache();
  let attempts = 0;
  const supabaseClient = {
    from(table) {
      assert.equal(table, 'achievements');
      return {
        select() {
          attempts += 1;
          if (attempts === 1) return Promise.reject(new Error('temporary database failure'));
          return Promise.resolve({ data: [{ id: 'first-roll' }], error: null });
        }
      };
    }
  };

  const failed = await loadAchievementDefinitions(supabaseClient);
  assert.equal(failed.data, null);
  assert.equal(failed.error.message, 'temporary database failure');

  const retried = await loadAchievementDefinitions(supabaseClient);
  assert.deepEqual(retried.data, [{ id: 'first-roll' }]);
  assert.equal(retried.error, null);
  assert.equal(attempts, 2);

  clearAchievementDefinitionsCache();
});
