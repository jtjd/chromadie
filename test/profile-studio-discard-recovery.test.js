import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import { applyProfileStudioDraftPatch, getPersistedProfileStudioState } from '../src/lib/profile-studio/draftModel.js';

test('discard restores the complete staged profile state from the persisted draft without a write', () => {
  const persisted = createDefaultProfileConfig('#123456');
  persisted.layoutVariant = 'compact';
  persisted.appearance.colors.surface = '#111111';
  const staged = applyProfileStudioDraftPatch(persisted, {
    scope: 'appearance',
    detail: { appearance: { colors: { surface: '#abcdef' } } }
  });
  const state = getPersistedProfileStudioState(
    { draft: persisted, published: persisted },
    { bio: 'persisted bio' }
  );

  assert.equal(staged.appearance.colors.surface, '#ABCDEF');
  assert.equal(state.studioDraft.appearance.colors.surface, '#111111');
  assert.equal(state.studioIdentityDraft.bio, 'persisted bio');
  assert.equal(state.cosmeticPreviewLoadout, null);
});
