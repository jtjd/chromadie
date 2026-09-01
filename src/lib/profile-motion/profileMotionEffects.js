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

function localPointerForTarget(host, target, event) {
  const hostRect = host?.getBoundingClientRect?.();
  const targetRect = target?.getBoundingClientRect?.() || hostRect;
  if (!hostRect || !targetRect || !targetRect.width || !targetRect.height || !Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) return null;
  return {
    x: Math.max(0, Math.min(targetRect.width, event.clientX - targetRect.left)),
    y: Math.max(0, Math.min(targetRect.height, event.clientY - targetRect.top)),
    width: targetRect.width,
    height: targetRect.height
  };
}

function targetBoundsInHost(host, target) {
  const hostRect = host?.getBoundingClientRect?.();
  const targetRect = target?.getBoundingClientRect?.() || hostRect;
  if (!hostRect || !targetRect) return null;
  return {
    left: finite(targetRect.left) - finite(hostRect.left),
    top: finite(targetRect.top) - finite(hostRect.top),
    width: Math.max(0, finite(targetRect.width)),
    height: Math.max(0, finite(targetRect.height))
  };
}

function targetBorderRadius(target) {
  if (!target || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return '';
  return window.getComputedStyle(target).borderRadius || '';
}

/** @param {any} options */
function createLifecycle({ host, resizeElements = [], enabled, onFrame, onResize, onVisibilityChange, onReducedMotion } = {}) {
  let active = enabled === true;
  let visible = true;
  let reduced = false;
  let frame = 0;
  let destroyed = false;
  let resizeObserver;
  let resizeTargets = [];
  /** @type {(elements?: any[]) => void} */
  let resizeTargetSetter = () => {};
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
    resizeObserver = new ResizeObserver(() => {
      onResize?.();
      schedule();
    });
    resizeTargetSetter = elements => {
      resizeTargets.forEach(element => resizeObserver.unobserve?.(element));
      resizeTargets = [...new Set([host, ...(Array.isArray(elements) ? elements : [])].filter(Boolean))];
      resizeTargets.forEach(element => resizeObserver.observe(element));
    };
    resizeTargetSetter(resizeElements);
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
    setResizeElements(elements = []) {
      resizeTargetSetter(elements);
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
export function createHaloOffsetController({ host, targetElement = null, shells = [], enabled = true } = {}) {
  const states = HALO_SHELLS.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
  let pointer = null;
  let destroyed = false;
  let lifecycle;
  let currentTarget = targetElement || host;

  const syncShellBounds = () => {
    const bounds = targetBoundsInHost(host, currentTarget);
    if (!bounds) return;
    const radius = targetBorderRadius(currentTarget);
    shells.forEach(shell => {
      if (!shell?.style) return;
      shell.style.left = `${bounds.left}px`;
      shell.style.top = `${bounds.top}px`;
      shell.style.right = 'auto';
      shell.style.bottom = 'auto';
      shell.style.width = `${bounds.width}px`;
      shell.style.height = `${bounds.height}px`;
      if (radius) shell.style.borderRadius = radius;
    });
  };

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
    pointer = localPointerForTarget(host, currentTarget, event) || localPointer(host, event);
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
    resizeElements: [currentTarget],
    enabled,
    onResize: syncShellBounds,
    onFrame: draw
  });
  syncShellBounds();
  draw();

  return Object.freeze({
    update(next = {}) {
      if (Object.prototype.hasOwnProperty.call(next, 'targetElement')) {
        currentTarget = next.targetElement || host;
        lifecycle?.setResizeElements([currentTarget]);
        syncShellBounds();
      }
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
        if (!shell) return;
        shell.style.transform = '';
        shell.style.left = '';
        shell.style.top = '';
        shell.style.right = '';
        shell.style.bottom = '';
        shell.style.width = '';
        shell.style.height = '';
        shell.style.borderRadius = '';
      });
    }
  });
}

/** @param {any} options */
export function createWavefrontController({ host, motionElement, targetElement = null, ring, enabled = true } = {}) {
  let lifecycle;
  let destroyed = false;
  let active = enabled === true;
  let wave = null;
  let pieces = [];
  let pieceAnchors = [];
  let currentTarget = targetElement || host;

  const collectPieces = () => {
    const surface = currentTarget?.querySelectorAll ? currentTarget : motionElement;
    if (!surface?.querySelectorAll) return [];
    const found = surface.querySelectorAll('.profile-reference-card > *, .profile-full-bleed > *, .profile-portfolio > *');
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
          const bounds = targetBoundsInHost(host, currentTarget) || { left: 0, top: 0, width: 0, height: 0 };
          return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, width: bounds.width, height: bounds.height };
        })()
      : (() => {
          const targetPoint = localPointerForTarget(host, currentTarget, event);
          const bounds = targetBoundsInHost(host, currentTarget);
          return targetPoint && bounds
            ? { ...targetPoint, x: bounds.left + targetPoint.x, y: bounds.top + targetPoint.y }
            : localPointer(host, event);
        })();
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
    resizeElements: [currentTarget],
    enabled,
    onResize: collectPieces,
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
      if (Object.prototype.hasOwnProperty.call(next, 'targetElement')) {
        currentTarget = next.targetElement || host;
        lifecycle?.setResizeElements([currentTarget]);
        pieces = [];
        pieceAnchors = [];
      }
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
