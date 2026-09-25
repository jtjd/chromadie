/**
 * Run the current account's initial Roll snapshot through the presentation
 * adapter. The component supplies freshness checks and owns the Svelte state.
 *
 * @param {{userId?: string | null, isRequestCurrent?: () => boolean, isSnapshotCurrent?: () => boolean, loadAuthenticated: (userId: string, isCurrent: () => boolean) => Promise<any>, loadGuest: (isCurrent: () => boolean) => Promise<any>, applySnapshot: (snapshot: any, mode: 'authenticated' | 'guest') => void, onError?: (error: any) => void, onFinally?: () => void}} options
 * @returns {Promise<{status: 'loaded', snapshot: any} | {status: 'stale'} | {status: 'failed', error: any}>}
 */
export async function runInitialRollHydration({
  userId = null,
  isRequestCurrent = () => true,
  isSnapshotCurrent = isRequestCurrent,
  loadAuthenticated,
  loadGuest,
  applySnapshot,
  onError = () => {},
  onFinally = () => {}
}) {
  try {
    const mode = userId ? 'authenticated' : 'guest';
    const snapshot = userId
      ? await loadAuthenticated(userId, isSnapshotCurrent)
      : await loadGuest(isSnapshotCurrent);

    if (!isSnapshotCurrent() || snapshot?.isCurrent !== true) return { status: 'stale' };

    applySnapshot(snapshot, mode);
    return { status: 'loaded', snapshot };
  } catch (error) {
    if (!isRequestCurrent()) return { status: 'stale' };
    onError(error);
    return { status: 'failed', error };
  } finally {
    if (isRequestCurrent()) onFinally();
  }
}
