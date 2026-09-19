const MAX_RETRIES = 3;

/** Bounded recovery, with every callback invalidated on scene change/teardown. */
export function createAtmosphereRecovery({ canRecover, getVideo, setPosterFallback }) {
  let retryTimer = 0, frame = 0, retryCount = 0, generation = 0;
  let destroyed = false;
  function clear() {
    window.clearTimeout(retryTimer);
    window.cancelAnimationFrame(frame);
    retryTimer = 0; frame = 0;
    generation += 1;
  }
  function play(reload = false) {
    const current = generation;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      if (destroyed || current !== generation || !canRecover()) return;
      const video = getVideo();
      if (!video) return;
      if (reload) video.load?.();
      video.play?.().catch?.(() => {
        if (!destroyed && current === generation) schedule();
      });
    });
  }
  function schedule() {
    if (destroyed || !canRecover() || retryTimer) return;
    if (retryCount >= MAX_RETRIES) { setPosterFallback(true); return; }
    retryCount += 1;
    clear();
    retryTimer = window.setTimeout(() => {
      retryTimer = 0;
      if (destroyed || !canRecover()) return;
      setPosterFallback(false);
      play(true);
    }, Math.min(2400, 450 * retryCount));
  }
  return {
    recover() {
      if (destroyed || !canRecover() || frame || retryTimer) return;
      if (retryCount >= MAX_RETRIES) return;
      setPosterFallback(false); play();
    },
    stalled: schedule,
    ready() { clear(); retryCount = 0; setPosterFallback(false); },
    destroy() { destroyed = true; clear(); }
  };
}
