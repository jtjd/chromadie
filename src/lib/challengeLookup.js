import { CHALLENGE_FUNCTION, normalizeChallengeError } from './challengeTransport.js';

export async function loadChallengeLink(supabase, challengeId) {
  const { data, error } = await supabase.functions.invoke(CHALLENGE_FUNCTION, {
    body: {
      action: 'get',
      id: challengeId
    }
  });

  if (error) {
    return {
      success: false,
      error: normalizeChallengeError(error)
    };
  }

  if (!data?.success) {
    return {
      success: false,
      error: normalizeChallengeError(data?.error, 'Challenge not found.')
    };
  }

  return {
    success: true,
    challenge: data.challenge
  };
}
