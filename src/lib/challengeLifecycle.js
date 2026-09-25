import { loadChallengeLink } from './challengeLookup.js';
import { normalizeChallengeError } from './challengeTransport.js';

/**
 * Coordinate challenge result loading after the challenge route is entered.
 * The App dynamically imports this adapter so regular routes do not download
 * challenge-only code.
 *
 * @param {{supabaseClient?: any, setChallengeData: (value: any) => void, loadChallenge?: (challengeId: string) => Promise<any>}} options
 */
export function createChallengeLifecycle({
  supabaseClient,
  setChallengeData,
  loadChallenge = challengeId => loadChallengeLink(supabaseClient, challengeId)
}) {
  let requestId = 0;

  function invalidate() {
    requestId += 1;
  }

  async function load(challengeId, fallbackFrom = null) {
    const currentRequestId = ++requestId;
    let result;
    try {
      result = await loadChallenge(challengeId);
    } catch (error) {
      if (currentRequestId !== requestId) return;
      setChallengeData({
        id: challengeId,
        fromUsername: fallbackFrom || null,
        loading: false,
        error: normalizeChallengeError(error, 'Challenge could not be loaded. Refresh and try again.').message
      });
      return;
    }

    if (currentRequestId !== requestId) return;

    if (!result.success || !result.challenge) {
      setChallengeData({
        id: challengeId,
        fromUsername: fallbackFrom || null,
        loading: false,
        error: result.error?.message || 'Challenge not found.'
      });
      return;
    }

    setChallengeData({
      id: result.challenge.id,
      score: result.challenge.target_score,
      hex: result.challenge.target_hex,
      fromUsername: result.challenge.sender_username || fallbackFrom || null,
      loading: false,
      error: null
    });
  }

  return { invalidate, load };
}
