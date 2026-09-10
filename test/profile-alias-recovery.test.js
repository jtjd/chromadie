import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMyProfileAliases, createProfileAlias, deleteProfileAlias } from '../src/lib/profileAliases.js';

test('Alias reads distinguish a failed server response from an empty library', async () => {
  const result = await loadMyProfileAliases({ rpc: async () => ({ data: { success: false, error: 'Session expired' } }) });
  assert.equal(result.error, 'Session expired');
});

test('Alias reads, creation, and deletion recover after transport rejection', async () => {
  const client = { rpc: async () => { throw new Error('Offline'); } };
  for (const result of [
    await loadMyProfileAliases(client),
    await createProfileAlias(client, 'audit_alias'),
    await deleteProfileAlias(client, 'audit_alias')
  ]) assert.equal(result.error, 'Offline');
});
