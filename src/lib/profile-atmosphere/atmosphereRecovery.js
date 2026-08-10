const MAX_RETRIES = 3;

/**
 * Keep recovery state outside the Svelte render path. Atmosphere media can
 * stall independently of the dashboard, so this small controller owns the
 * bounded retry timer and lets the component only project poster state.
 */
export function createAtmosphereRecovery({ canRecover, getVideo, setPosterFallback }) {
  let retryTimer;
  let retryCount = 0;

  function clear() {
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer = null;
  }

  function schedule() {
    if (!canRecover() || retryCount >= MAX_RETRIES) {
      setPosterFallback(true);
      return;
    }

    retryCount += 1;
    clear();
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      if (!canRecover()) return;
      setPosterFallback(false);
      window.requestAnimationFrame(() => {
        const video = getVideo();
        if (!video) return;
        video.load?.();
        video.play?.().catch?.(schedule);
      });
    }, Math.min(2400, 450 * retryCount));
  }

  function recover() {
    if (!canRecover()) return;
    clear();
    setPosterFallback(false);
    window.requestAnimationFrame(() => {
      const video = getVideo();
      if (!video) return;
      video.play?.().catch?.(schedule);
    });
  }

  return {
    recover,
    stalled: schedule,
    ready() {
      retryCount = 0;
      setPosterFallback(false);
    },
    destroy: clear
  };
}
