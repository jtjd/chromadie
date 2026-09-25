import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPasswordResetFeedback,
  getSignInErrorMessage,
  getSignupFeedback
} from '../src/lib/authMessages.js';

test('signup does not reveal whether an email address is already registered', () => {
  const duplicate = getSignupFeedback({ error: { message: 'User already registered' } });
  const newAccount = getSignupFeedback({ data: { user: { id: 'new-user' }, session: null }, error: null });

  assert.deepEqual(duplicate, newAccount);
  assert.equal(duplicate.kind, 'notice');
  assert.doesNotMatch(duplicate.message, /already registered|already exists/i);
});

test('password reset gives account-state errors the same response as successful requests', () => {
  const missingAccount = getPasswordResetFeedback({ message: 'User not found' });
  const accepted = getPasswordResetFeedback(null);

  assert.deepEqual(missingAccount, accepted);
  assert.equal(missingAccount.kind, 'notice');
});

test('sign-in does not distinguish unconfirmed, missing, or invalid credentials', () => {
  const expected = 'Invalid email or password. Double-check both and try again.';
  assert.equal(getSignInErrorMessage({ message: 'Email not confirmed' }), expected);
  assert.equal(getSignInErrorMessage({ message: 'Invalid login credentials' }), expected);
  assert.equal(getSignInErrorMessage({ message: 'User not found' }), expected);
});
