/*
 * One animation clock is shared by all mounted Name canvases. The clock only
 * knows about callbacks; visibility and reduced-motion policy stay with the
 * component that owns each renderer.
 */

function getBrowserAnimationApi() {
  if (typeof globalThis === 'undefined') return {};
  return {
    requestAnimationFrame: typeof globalThis.requestAnimationFrame === 'function'
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : null,
    cancelAnimationFrame: typeof globalThis.cancelAnimationFrame === 'function'
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : null
  };
}

/**
 * @param {{ requestAnimationFrame?: (callback: (time: number) => void) => any, cancelAnimationFrame?: (handle: any) => void }} [options]
 */
export function createNameAnimationClock({ requestAnimationFrame, cancelAnimationFrame } = {}) {
  const browserApi = getBrowserAnimationApi();
  const requestFrame = requestAnimationFrame || browserApi.requestAnimationFrame;
  const cancelFrame = cancelAnimationFrame || browserApi.cancelAnimationFrame;
  const registrations = new Set();
  let frameHandle = null;
  let frameCount = 0;
  let destroyed = false;

  function schedule() {
    if (destroyed || frameHandle !== null || !requestFrame || registrations.size === 0) return;
    frameHandle = requestFrame(onFrame);
  }

  function onFrame(time) {
    frameHandle = null;
    if (destroyed) return;
    frameCount += 1;
    [...registrations].forEach(callback => {
      try {
        callback(Number.isFinite(time) ? time : 0);
      } catch (error) {
        // One failed cosmetic must not stop every other mounted renderer.
        queueMicrotask(() => { throw error; });
      }
    });
    schedule();
  }

  function register(callback) {
    if (destroyed || typeof callback !== 'function') return () => {};
    registrations.add(callback);
    schedule();
    return () => {
      registrations.delete(callback);
      if (registrations.size === 0 && frameHandle !== null && cancelFrame) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }
    };
  }

  function stats() {
    return Object.freeze({
      activeCount: registrations.size,
      frameCount,
      isScheduled: frameHandle !== null,
      destroyed
    });
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    registrations.clear();
    if (frameHandle !== null && cancelFrame) cancelFrame(frameHandle);
    frameHandle = null;
  }

  return Object.freeze({ register, stats, destroy });
}

export const nameAnimationClock = createNameAnimationClock();

export function registerNameAnimation(callback) {
  return nameAnimationClock.register(callback);
}

export function getNameAnimationClockStats() {
  return nameAnimationClock.stats();
}
