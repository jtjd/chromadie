import { normalizeCanonicalRoll } from './rollState.js';

/**
 * Coordinate the asynchronous stages around one already-authoritative roll.
 * The caller owns eligibility, Svelte state, and each stage's side effects;
 * this module preserves their order and stops stale attempts at boundaries.
 *
 * @param {{
 *   request: () => Promise<{data?: any, error?: any}>,
 *   isCurrent?: () => boolean,
 *   requestUserId?: string | null,
 *   requestDate: string,
 *   saveGuestBeforeReveal: (data: any, requestDate: string) => void,
 *   reveal: (data: any) => Promise<any>,
 *   onRevealFailure?: (error: any, data: any, canonical: any) => void,
 *   onFailure: (error: any) => void,
 *   applyConfirmedResult: (data: any, canonical: any, requestDate: string) => any,
 *   completeGuestResult: (rollData: any) => void,
 *   refreshAccount: (userId: string) => Promise<any>,
 *   onAccountRefresh: (result: any) => void,
 *   onStale?: () => void,
 *   onComplete?: (result: {canonical: any, rollData: any}) => void
 * }} options
 * @returns {Promise<{status: 'failed', error: any} | {status: 'stale'} | {status: 'completed', canonical: any, rollData: any}>}
 */
export async function executeRollAttempt({
  request,
  isCurrent = () => true,
  requestUserId = null,
  requestDate,
  saveGuestBeforeReveal = () => {},
  reveal,
  onRevealFailure = () => {},
  onFailure = () => {},
  applyConfirmedResult,
  completeGuestResult = () => {},
  refreshAccount = async () => null,
  onAccountRefresh = () => {},
  onStale = () => {},
  onComplete = () => {}
}) {
  /** @returns {{status: 'stale'}} */
  const stale = () => {
    onStale();
    return { status: 'stale' };
  };

  const response = await request();
  if (!isCurrent()) return stale();

  const data = response?.data || null;
  const failure = response?.error || (!data || !data.success
    ? new Error(data?.error || 'An error occurred while rolling. Please try again.')
    : null);
  if (failure) {
    onFailure(failure);
    return { status: 'failed', error: failure };
  }

  if (!requestUserId) saveGuestBeforeReveal(data, requestDate);

  let canonical;
  try {
    canonical = await reveal(data);
  } catch (error) {
    if (!isCurrent()) return stale();
    canonical = normalizeCanonicalRoll(data);
    onRevealFailure(error, data, canonical);
  }
  if (!canonical || !isCurrent()) return stale();

  const rollData = applyConfirmedResult(data, canonical, requestDate);
  if (!isCurrent()) return stale();

  if (!requestUserId) {
    completeGuestResult(rollData);
  } else {
    const refreshResult = await refreshAccount(requestUserId);
    if (!isCurrent()) return stale();
    onAccountRefresh(refreshResult);
  }

  onComplete({ canonical, rollData });
  return { status: 'completed', canonical, rollData };
}
