const CHALLENGE_FUNCTION = 'challenge-link'

function normalizeError(error, fallbackMessage = 'Unable to process the challenge.') {
  const message = typeof error === 'string'
    ? error
    : error?.message || error?.error || error?.msg || fallbackMessage

  return {
    message,
    code: 'challenge_error'
  }
}

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
      error: normalizeError(error)
    }
  }

  if (!data?.success) {
    return {
      success: false,
      error: normalizeError(data?.error)
    }
  }

  return {
    success: true,
    challenge: data.challenge,
    shareUrl: data.share_url
  }
}

export async function loadChallengeLink(supabase, challengeId) {
  const { data, error } = await supabase.functions.invoke(CHALLENGE_FUNCTION, {
    body: {
      action: 'get',
      id: challengeId
    }
  })

  if (error) {
    return {
      success: false,
      error: normalizeError(error)
    }
  }

  if (!data?.success) {
    return {
      success: false,
      error: normalizeError(data?.error, 'Challenge not found.')
    }
  }

  return {
    success: true,
    challenge: data.challenge
  }
}
