import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteAccount } from '../src/lib/accountDeletion.js';

test('Account deletion returns a recoverable error after a rejected transport', async () => {
  const result = await deleteAccount({ functions: { invoke: async () => { throw new Error('Failed to fetch'); } } });
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'network_error');
});

test('Account deletion preserves successful canonical results', async () => {
  const result = await deleteAccount({ functions: { invoke: async (_name, args) => {
    assert.equal(args.body.confirm, 'DELETE');
    return { data: { success: true, already_deleted: true }, error: null };
  } } });
  assert.equal(result.success, true);
  assert.equal(result.alreadyDeleted, true);
});
