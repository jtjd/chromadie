export function createScoreCountUpController({ windowRef = null, now = () => Date.now() } = {}) {
  let frame = null;
  let pendingResolve = null;

  function getWindow() {
    return windowRef || (typeof window === 'undefined' ? null : window);
  }

  function cancel() {
    const browserWindow = getWindow();
    if (frame !== null && typeof browserWindow?.cancelAnimationFrame === 'function') {
      browserWindow.cancelAnimationFrame(frame);
    }
    frame = null;
    if (pendingResolve) {
      pendingResolve(false);
      pendingResolve = null;
    }
  }

  function animate({
    targetScore,
    isCurrent,
    duration,
    reducedMotion = false,
    isSkipped = () => false,
    onValue = value => value,
    onProgress = value => value
  }) {
    cancel();
    const browserWindow = getWindow();
    const safeTarget = Math.max(0, Number(targetScore) || 0);
    if (reducedMotion || typeof browserWindow?.requestAnimationFrame !== 'function') {
      onValue(safeTarget);
      onProgress(1);
      return Promise.resolve(isCurrent());
    }

    return new Promise(resolve => {
      pendingResolve = resolve;
      const startedAt = now();
      const update = () => {
        if (!isCurrent()) {
          frame = null;
          pendingResolve = null;
          resolve(false);
          return;
        }

        const progress = Math.min(1, (now() - startedAt) / Math.max(1, duration));
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        onValue(Math.floor(safeTarget * easedProgress));
        onProgress(progress);

        if (progress >= 1 || isSkipped()) {
          onValue(safeTarget);
          frame = null;
          pendingResolve = null;
          resolve(true);
          return;
        }
        frame = browserWindow.requestAnimationFrame(update);
      };
      frame = browserWindow.requestAnimationFrame(update);
    });
  }

  return { animate, cancel };
}
