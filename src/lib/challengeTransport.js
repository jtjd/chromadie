export const CHALLENGE_FUNCTION = 'challenge-link';

export function normalizeChallengeError(error, fallbackMessage = 'Unable to process the challenge.') {
  const message = typeof error === 'string'
    ? error
    : error?.message || error?.error || error?.msg || fallbackMessage;

  return {
    message,
    code: 'challenge_error'
  };
}
