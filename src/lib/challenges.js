import { CHALLENGE_FUNCTION, normalizeChallengeError } from './challengeTransport.js';

/**
 * @param {any} supabase
 * @param {{score?: number, hex?: string, senderUsername?: string | null}} options
 */
export async function createChallengeLink(supabase, { score, hex, senderUsername = null } = {}) {
  const { data, error } = await supabase.functions.invoke(CHALLENGE_FUNCTION, {
    body: {
      action: 'create',
      score,
      hex,
      sender_username: senderUsername
    }
  })

  if (error) {
    return {
      success: false,
      error: normalizeChallengeError(error)
    }
  }

  if (!data?.success) {
    return {
      success: false,
      error: normalizeChallengeError(data?.error)
    }
  }

  return {
    success: true,
    challenge: data.challenge,
    shareUrl: data.share_url
  }
}
