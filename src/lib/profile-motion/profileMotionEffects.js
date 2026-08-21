const HALO_SHELLS = Object.freeze([
  Object.freeze({ lag: 0.16, damping: 0.73, multiplier: 22 }),
  Object.freeze({ lag: 0.1, damping: 0.79, multiplier: 34 }),
  Object.freeze({ lag: 0.055, damping: 0.84, multiplier: 48 })
]);

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function localPointer(host, event) {
  const rect = host?.getBoundingClientRect?.();
  if (!rect || !rect.width || !rect.height || !Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) return null;
  return {
    x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
    y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    width: rect.width,
    height: rect.height
  };
}

/** @param {any} options */
function createLifecycle({ host, enabled, onFrame, onVisibilityChange, onReducedMotion } = {}) {
  let active = enabled === true;
  let visible = true;
  let reduced = false;
  let frame = 0;
  let destroyed = false;
  let resizeObserver;
  let intersectionObserver;
  let mediaQuery;

  const schedule = () => {
    if (frame || destroyed || !active || reduced || !visible) return;
    frame = requestAnimationFrame(timestamp => {
      frame = 0;
      if (!destroyed && active && !reduced && visible) onFrame?.(timestamp);
    });
  };

  const visibility = nextVisible => {
    visible = nextVisible;
    onVisibilityChange?.(visible);
    if (visible) schedule();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  const reducedChange = event => {
    reduced = Boolean(event?.matches);
    onReducedMotion?.(reduced);
    if (reduced && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  mediaQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
  reduced = Boolean(mediaQuery?.matches);
  mediaQuery?.addEventListener?.('change', reducedChange);
  if (typeof ResizeObserver === 'function' && host) {
    resizeObserver = new ResizeObserver(() => schedule());
    resizeObserver.observe(host);
  }
  if (typeof IntersectionObserver === 'function' && host) {
    intersectionObserver = new IntersectionObserver(entries => {
      visibility(entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0));
    }, { rootMargin: '160px' });
    intersectionObserver.observe(host);
  }

  return {
    setEnabled(nextEnabled) {
      active = nextEnabled === true;
      if (!active && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (active) schedule();
    },
    schedule,
    isReduced: () => reduced,
    isVisible: () => visible,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      mediaQuery?.removeEventListener?.('change', reducedChange);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/** @param {any} options */
export function createHaloOffsetController({ host, shells = [], enabled = true } = {}) {
  const states = HALO_SHELLS.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
  let pointer = null;
  let destroyed = false;
  let lifecycle;

  const draw = () => {
    const nextPointer = pointer;
    const normalizedX = nextPointer ? (nextPointer.x / Math.max(1, nextPointer.width) - 0.5) * 2 : 0;
    const normalizedY = nextPointer ? (nextPointer.y / Math.max(1, nextPointer.height) - 0.5) * 2 : 0;
    let moving = false;
    states.forEach((state, index) => {
      const settings = HALO_SHELLS[index];
      const targetX = normalizedX * settings.multiplier;
      const targetY = normalizedY * settings.multiplier * 0.78;
      state.vx = (state.vx + (targetX - state.x) * settings.lag) * settings.damping;
      state.vy = (state.vy + (targetY - state.y) * settings.lag) * settings.damping;
      state.x += state.vx;
      state.y += state.vy;
      if (Math.abs(state.x - targetX) > 0.04 || Math.abs(state.y - targetY) > 0.04 || Math.abs(state.vx) > 0.04 || Math.abs(state.vy) > 0.04) moving = true;
      const shell = shells[index];
      if (shell) shell.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0)`;
    });
    if (moving) lifecycle?.schedule();
  };

  const pointerMove = event => {
    if (event.pointerType === 'touch') return;
    pointer = localPointer(host, event);
    lifecycle?.schedule();
  };
  const pointerLeave = () => {
    pointer = null;
    lifecycle?.schedule();
  };

  host?.addEventListener?.('pointermove', pointerMove, { passive: true });
  host?.addEventListener?.('pointerleave', pointerLeave, { passive: true });
  lifecycle = createLifecycle({
    host,
    enabled,
    onFrame: draw
  });
  draw();

  return Object.freeze({
    update(next = {}) {
      if (Object.prototype.hasOwnProperty.call(next, 'enabled')) lifecycle?.setEnabled(next.enabled);
      if (next.enabled === false) pointer = null;
      if (next.enabled === false) draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      host?.removeEventListener?.('pointermove', pointerMove);
      host?.removeEventListener?.('pointerleave', pointerLeave);
      lifecycle?.destroy();
      shells.forEach(shell => {
        if (shell) shell.style.transform = '';
      });
    }
  });
}

/** @param {any} options */
export function createWavefrontController({ host, motionElement, ring, enabled = true } = {}) {
  let lifecycle;
  let destroyed = false;
  let active = enabled === true;
  let wave = null;
  let pieces = [];
  let pieceAnchors = [];

  const collectPieces = () => {
    if (!motionElement?.querySelectorAll) return [];
    const found = motionElement.querySelectorAll('.profile-reference-card > *, .profile-full-bleed > *');
    pieces = [...found].slice(0, 32);
    const hostRect = host?.getBoundingClientRect?.();
    pieceAnchors = pieces.map(piece => {
      const rect = piece.getBoundingClientRect?.();
      return rect && hostRect
        ? { x: rect.left - hostRect.left + rect.width / 2, y: rect.top - hostRect.top + rect.height / 2 }
        : null;
    });
    return pieces;
  };

  const setRing = (x, y, radius, opacity) => {
    if (!ring) return;
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    ring.style.width = `${Math.max(1, radius * 2)}px`;
    ring.style.height = `${Math.max(1, radius * 2)}px`;
    ring.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    ring.style.transform = 'translate(-50%, -50%)';
  };

  const resetPieces = () => {
    pieces.forEach(piece => {
      piece.style.translate = '';
    });
  };

  const draw = timestamp => {
    if (!wave) return;
    if (!pieces.length) collectPieces();
    const elapsed = Math.max(0, timestamp - wave.startedAt);
    const progress = Math.min(1, elapsed / 900);
    const radius = progress * Math.max(220, Math.min(360, Math.hypot(wave.width, wave.height) * 0.58));
    setRing(wave.x, wave.y, radius, (1 - progress) * 0.76);
    pieces.forEach((piece, index) => {
      const anchor = pieceAnchors[index];
      if (!anchor) return;
      const centerX = anchor.x;
      const centerY = anchor.y;
      const dx = centerX - wave.x;
      const dy = centerY - wave.y;
      const distance = Math.hypot(dx, dy);
      const band = Math.max(0, 1 - Math.abs(distance - radius) / 48);
      if (!band || !distance) {
        piece.style.translate = '0px 0px';
        return;
      }
      const displacement = band * 12 * (1 - progress * 0.35);
      piece.style.translate = `${(dx / distance * displacement).toFixed(2)}px ${(dy / distance * displacement).toFixed(2)}px`;
    });
    if (progress >= 1) {
      wave = null;
      resetPieces();
      setRing(0, 0, 0, 0);
      return;
    }
    lifecycle?.schedule();
  };

  const launch = event => {
    if (!active || lifecycle?.isReduced?.() || lifecycle?.isVisible?.() === false) return;
    if (event?.pointerType === 'mouse' && event.button !== 0) return;
    const point = event?.clientX === undefined
      ? (() => {
          const rect = host?.getBoundingClientRect?.() || {};
          return { x: finite(rect.width, 0) / 2, y: finite(rect.height, 0) / 2, width: finite(rect.width, 0), height: finite(rect.height, 0) };
        })()
      : localPointer(host, event);
    if (!point) return;
    collectPieces();
    resetPieces();
    wave = { x: point.x, y: point.y, width: point.width, height: point.height, startedAt: performance.now() };
    lifecycle?.schedule();
  };

  const keyLaunch = event => {
    if (event.key === 'Enter' || event.key === ' ') launch();
  };

  host?.addEventListener?.('pointerdown', launch, { passive: true });
  host?.addEventListener?.('keydown', keyLaunch);
  lifecycle = createLifecycle({
    host,
    enabled,
    onFrame: draw,
    onReducedMotion: reduced => {
      if (!reduced) return;
      wave = null;
      resetPieces();
      setRing(0, 0, 0, 0);
    }
  });

  return Object.freeze({
    update(next = {}) {
      if (Object.prototype.hasOwnProperty.call(next, 'enabled')) {
        active = next.enabled === true;
        lifecycle?.setEnabled(active);
        if (next.enabled === false) {
          wave = null;
          resetPieces();
          setRing(0, 0, 0, 0);
        }
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      host?.removeEventListener?.('pointerdown', launch);
      host?.removeEventListener?.('keydown', keyLaunch);
      lifecycle?.destroy();
      resetPieces();
      setRing(0, 0, 0, 0);
    }
  });
}
