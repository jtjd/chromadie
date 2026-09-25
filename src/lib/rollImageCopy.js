/**
 * Create currentness predicates that represent both the roll and one copy
 * attempt. Starting another copy invalidates effects from an earlier attempt.
 *
 * @returns {{begin: (isResultCurrent: () => boolean) => () => boolean, invalidate: () => void}}
 */
export function createRollImageCopyFreshness() {
  let generation = 0;

  function begin(isResultCurrent) {
    const attemptGeneration = ++generation;
    return () => attemptGeneration === generation && isResultCurrent();
  }

  function invalidate() {
    generation += 1;
  }

  return { begin, invalidate };
}

/**
 * Copy one confirmed roll image while suppressing effects from stale attempts.
 * The caller adapts the canvas renderer, browser clipboard, and UI feedback.
 *
 * @param {{
 *   result: any,
 *   isCurrent: () => boolean,
 *   buildCanvas: (result: any) => Promise<any>,
 *   canvasToBlob: (canvas: any) => Promise<any>,
 *   writeClipboard: (blob: any) => Promise<void>,
 *   onCopied?: () => void,
 *   onError?: (error: any) => void,
 *   onFailure?: () => void
 * }} options
 * @returns {Promise<{status: 'stale' | 'unavailable' | 'copied'} | {status: 'failed', error: any}>}
 */
export async function runRollImageCopy({
  result,
  isCurrent,
  buildCanvas,
  canvasToBlob,
  writeClipboard,
  onCopied = () => {},
  onError = () => {},
  onFailure = () => {}
}) {
  if (!isCurrent()) return { status: 'stale' };
  if (!result) return { status: 'unavailable' };

  try {
    const canvas = await buildCanvas(result);
    if (!isCurrent()) return { status: 'stale' };
    if (!canvas) return { status: 'unavailable' };

    const blob = await canvasToBlob(canvas);
    if (!isCurrent()) return { status: 'stale' };
    if (!blob) return { status: 'unavailable' };

    await writeClipboard(blob);
    if (!isCurrent()) return { status: 'stale' };

    onCopied();
    return { status: 'copied' };
  } catch (error) {
    if (!isCurrent()) return { status: 'stale' };

    onError(error);
    onFailure();
    return { status: 'failed', error };
  }
}
