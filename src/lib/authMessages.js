const SIGNUP_NOTICE = 'If an account can be created with that email, check your inbox for next steps.';
const RESET_NOTICE = 'If that account exists, we sent a reset link to your inbox.';
const SIGN_IN_ERROR = 'Invalid email or password. Double-check both and try again.';
const ACCOUNT_STATE_ERROR = /already registered|already exists|user exists|email not confirmed|user not found|account not found|email address not found|invalid (?:login )?credentials|no user found/i;

const messageOf = error => typeof error === 'string'
  ? error
  : error?.message || error?.error_description || error?.error || '';

export function getFriendlyAuthError(authError, fallback) {
  const message = messageOf(authError);
  if (!message || message === '{}') return fallback;
  if (ACCOUNT_STATE_ERROR.test(message)) return SIGN_IN_ERROR;
  if (/username/i.test(message) && /available|moderation/i.test(message)) {
    return 'That username is not available. Please choose another one.';
  }
  if (/captcha/i.test(message)) return 'Please complete the security check.';
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a moment and try again.';
  if (/password/i.test(message)) return message;
  return message;
}

export function getSignupFeedback({ data = null, error = null } = {}) {
  if (error && !ACCOUNT_STATE_ERROR.test(messageOf(error))) {
    return { kind: 'error', message: getFriendlyAuthError(error, 'Could not create your account.') };
  }
  if (!error && data?.session) return { kind: 'authenticated', message: '' };
  return { kind: 'notice', message: SIGNUP_NOTICE };
}

export function getPasswordResetFeedback(error = null) {
  if (error && !ACCOUNT_STATE_ERROR.test(messageOf(error))) {
    return { kind: 'error', message: getFriendlyAuthError(error, 'Could not send the reset email.') };
  }
  return { kind: 'notice', message: RESET_NOTICE };
}

export function getSignInErrorMessage(error) {
  if (ACCOUNT_STATE_ERROR.test(messageOf(error))) return SIGN_IN_ERROR;
  return getFriendlyAuthError(error, 'Could not sign you in.');
}
