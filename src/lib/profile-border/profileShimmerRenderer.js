/*
 * Source-backed rounded-border shimmer controller.
 *
 * The public reference implementation advances ten radial highlights around a
 * rounded rectangle at 210px/s. This module keeps that geometry finite and
 * code-owned while pausing work when the layer is hidden or offscreen.
 */

export const PROFILE_SHIMMER_OFFSETS = Object.freeze([0, 8, 17, 29, 44, 62, 84, 110, 140, 174]);
export const PROFILE_SHIMMER_SPEED = 210;

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

/** @param {{ width?: number, height?: number, radius?: number, borderWidth?: number }} [options] */
export function getProfileShimmerGeometry({ width, height, radius = 25, borderWidth = 2 } = {}) {
  const safeWidth = Math.max(0, finiteNumber(Number(width), 0));
  const safeHeight = Math.max(0, finiteNumber(Number(height), 0));
  const safeBorderWidth = Math.max(0, finiteNumber(Number(borderWidth), 2));
  const innerWidth = Math.max(0, safeWidth - safeBorderWidth);
  const innerHeight = Math.max(0, safeHeight - safeBorderWidth);
  const safeRadius = Math.min(
    Math.max(0, finiteNumber(Number(radius), 25) - safeBorderWidth / 2),
    innerWidth / 2,
    innerHeight / 2
  );
  const perimeter = 2 * (innerWidth + innerHeight - 4 * safeRadius) + 2 * Math.PI * safeRadius;

  return Object.freeze({
    width: safeWidth,
    height: safeHeight,
    radius: safeRadius,
    borderWidth: safeBorderWidth,
    perimeter: Math.max(0, perimeter)
  });
}

/**
 * Return a point on the same clockwise rounded-rectangle path used by the
 * inspected border layer. Distance zero starts on the upper straight edge.
 */
export function getProfileShimmerPoint(geometry, distance) {
  const {
    width,
    height,
    radius,
    borderWidth,
    perimeter
  } = geometry || {};
  if (!Number.isFinite(perimeter) || perimeter <= 0) {
    return { x: Math.max(0, width || 0) / 2, y: Math.max(0, height || 0) / 2 };
  }

  const halfBorder = borderWidth / 2;
  const right = width - halfBorder;
  const bottom = height - halfBorder;
  const topStraight = Math.max(0, right - halfBorder - 2 * radius);
  const sideStraight = Math.max(0, bottom - halfBorder - 2 * radius);
  let remaining = ((Number(distance) || 0) % perimeter + perimeter) % perimeter;

  if (remaining <= topStraight) return { x: halfBorder + radius + remaining, y: halfBorder };

  const quarterArc = Math.PI * radius / 2;
  if (radius > 0 && (remaining -= topStraight) <= quarterArc) {
    const angle = -Math.PI / 2 + remaining / radius;
    return {
      x: right - radius + Math.cos(angle) * radius,
      y: halfBorder + radius + Math.sin(angle) * radius
    };
  }

  if ((remaining -= quarterArc) <= sideStraight) {
    return { x: right, y: halfBorder + radius + remaining };
  }

  if (radius > 0 && (remaining -= sideStraight) <= quarterArc) {
    const angle = remaining / radius;
    return {
      x: right - radius + Math.cos(angle) * radius,
      y: bottom - radius + Math.sin(angle) * radius
    };
  }

  if ((remaining -= quarterArc) <= topStraight) {
    return { x: right - radius - remaining, y: bottom };
  }

  if (radius > 0 && (remaining -= topStraight) <= quarterArc) {
    const angle = Math.PI / 2 + remaining / radius;
    return {
      x: halfBorder + radius + Math.cos(angle) * radius,
      y: bottom - radius + Math.sin(angle) * radius
    };
  }

  if ((remaining -= quarterArc) <= sideStraight) {
    return { x: halfBorder, y: bottom - radius - remaining };
  }

  remaining -= sideStraight;
  const angle = Math.PI + (radius > 0 ? remaining / radius : 0);
  return {
    x: halfBorder + radius + Math.cos(angle) * radius,
    y: halfBorder + radius + Math.sin(angle) * radius
  };
}

function readCssNumber(styles, property, fallback) {
  const value = Number.parseFloat(styles?.getPropertyValue?.(property));
  return Number.isFinite(value) ? value : fallback;
}

/** @param {any} [options] */
export function createProfileShimmerController({
  host,
  layer,
  enabled = true,
  requestAnimationFrame = globalThis.requestAnimationFrame,
  cancelAnimationFrame = globalThis.cancelAnimationFrame,
  getComputedStyle = globalThis.getComputedStyle,
  ResizeObserver = globalThis.ResizeObserver,
  IntersectionObserver = globalThis.IntersectionObserver,
  document = globalThis.document
} = {}) {
  let active = Boolean(enabled);
  let visible = true;
  let inViewport = true;
  let documentVisible = !document?.hidden;
  let animationFrame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let geometry = null;
  let resizeObserver = null;
  let intersectionObserver = null;
  let destroyed = false;

  const schedule = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : callback => setTimeout(() => callback(Date.now()), 16);
  const cancel = typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : clearTimeout;

  function shouldRun() {
    return !destroyed && active && visible && inViewport && documentVisible;
  }

  function syncGeometry() {
    if (!host || !layer) return;
    const styles = typeof getComputedStyle === 'function' ? getComputedStyle(host) : null;
    geometry = getProfileShimmerGeometry({
      width: host.clientWidth,
      height: host.clientHeight,
      borderWidth: readCssNumber(styles, '--profile-border-width', 2),
      radius: readCssNumber(styles, '--profile-border-radius', 25)
    });
    writePoints();
  }

  function writePoints() {
    if (!geometry?.perimeter || !layer?.style?.setProperty) return;
    PROFILE_SHIMMER_OFFSETS.forEach((offset, index) => {
      const point = getProfileShimmerPoint(geometry, elapsed - offset);
      layer.style.setProperty(`--profile-shimmer-x-${index}`, `${point.x}px`);
      layer.style.setProperty(`--profile-shimmer-y-${index}`, `${point.y}px`);
    });
  }

  function frame(time) {
    animationFrame = 0;
    if (!shouldRun()) return;
    const delta = lastTime > 0 ? Math.max(0, time - lastTime) : 0;
    lastTime = time;
    elapsed += delta / 1000 * PROFILE_SHIMMER_SPEED;
    writePoints();
    animationFrame = schedule(frame);
  }

  function stop() {
    lastTime = 0;
    if (animationFrame) {
      cancel(animationFrame);
      animationFrame = 0;
    }
  }

  function start() {
    if (!shouldRun() || animationFrame) return;
    animationFrame = schedule(frame);
  }

  function update(next = {}) {
    if (Object.prototype.hasOwnProperty.call(next, 'enabled')) active = Boolean(next.enabled);
    if (Object.prototype.hasOwnProperty.call(next, 'visible')) visible = Boolean(next.visible);
    if (Object.prototype.hasOwnProperty.call(next, 'inViewport')) inViewport = Boolean(next.inViewport);
    if (active) start();
    else stop();
  }

  function handleVisibilityChange() {
    documentVisible = !document?.hidden;
    if (documentVisible) start();
    else stop();
  }

  syncGeometry();
  if (typeof ResizeObserver === 'function' && host) {
    resizeObserver = new ResizeObserver(syncGeometry);
    resizeObserver.observe(host);
  }
  document?.addEventListener?.('visibilitychange', handleVisibilityChange);
  if (typeof IntersectionObserver === 'function' && host) {
    intersectionObserver = new IntersectionObserver(entries => {
      inViewport = Boolean(entries?.[0]?.isIntersecting);
      if (inViewport) start();
      else stop();
    }, { threshold: 0.01 });
    intersectionObserver.observe(host);
  }
  update({ enabled: active });

  return {
    update,
    syncGeometry,
    destroy() {
      destroyed = true;
      stop();
      resizeObserver?.disconnect?.();
      intersectionObserver?.disconnect?.();
      document?.removeEventListener?.('visibilitychange', handleVisibilityChange);
    }
  };
}
