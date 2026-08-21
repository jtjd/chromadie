const DEFAULT_SIZE = { width: 1, height: 1 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function roundedRectPoints(width, height, padding, radius, segments = 5) {
  const left = padding;
  const top = padding;
  const right = Math.max(left, width - padding);
  const bottom = Math.max(top, height - padding);
  const safeRadius = Math.min(radius, (right - left) / 2, (bottom - top) / 2);
  const corners = [
    [right - safeRadius, top + safeRadius, -Math.PI / 2],
    [right - safeRadius, bottom - safeRadius, 0],
    [left + safeRadius, bottom - safeRadius, Math.PI / 2],
    [left + safeRadius, top + safeRadius, Math.PI]
  ];
  const points = [];
  corners.forEach(([centerX, centerY, startAngle]) => {
    for (let index = 0; index < segments; index += 1) {
      const angle = startAngle + (index / segments) * Math.PI / 2;
      points.push({
        x: centerX + Math.cos(angle) * safeRadius,
        y: centerY + Math.sin(angle) * safeRadius
      });
    }
  });
  return points;
}

function bendPoints(points, pointer, reach, strength) {
  if (!pointer) return points;
  return points.map(point => {
    const dx = pointer.x - point.x;
    const dy = pointer.y - point.y;
    const distance = Math.hypot(dx, dy);
    if (!distance || distance >= reach) return point;
    const influence = (1 - distance / reach) ** 2;
    return {
      x: point.x + dx * influence * strength,
      y: point.y + dy * influence * strength
    };
  });
}

function constrainPoints(points, width, height, padding) {
  return points.map(point => ({
    x: clamp(point.x, padding, Math.max(padding, width - padding)),
    y: clamp(point.y, padding, Math.max(padding, height - padding))
  }));
}

function closedSpline(points) {
  if (!points.length) return '';
  const commands = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  points.forEach((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const nextNext = points[(index + 2) % points.length];
    const controlOne = {
      x: point.x + (next.x - previous.x) / 6,
      y: point.y + (next.y - previous.y) / 6
    };
    const controlTwo = {
      x: next.x - (nextNext.x - point.x) / 6,
      y: next.y - (nextNext.y - point.y) / 6
    };
    commands.push(
      `C ${controlOne.x.toFixed(2)} ${controlOne.y.toFixed(2)} `
      + `${controlTwo.x.toFixed(2)} ${controlTwo.y.toFixed(2)} `
      + `${next.x.toFixed(2)} ${next.y.toFixed(2)}`
    );
  });
  commands.push('Z');
  return commands.join(' ');
}

export function createElasticFramePaths(width = DEFAULT_SIZE.width, height = DEFAULT_SIZE.height, pointer = null) {
  const safeWidth = Math.max(1, Number(width) || DEFAULT_SIZE.width);
  const safeHeight = Math.max(1, Number(height) || DEFAULT_SIZE.height);
  const outer = constrainPoints(bendPoints(
    roundedRectPoints(safeWidth, safeHeight, 4, Math.min(24, safeHeight * 0.16)),
    pointer,
    112,
    0.2
  ), safeWidth, safeHeight, 4);
  const inner = constrainPoints(bendPoints(
    roundedRectPoints(safeWidth, safeHeight, 7, Math.min(19, safeHeight * 0.13)),
    pointer,
    104,
    0.11
  ), safeWidth, safeHeight, 7);
  return Object.freeze({ outer: closedSpline(outer), inner: closedSpline(inner) });
}

/**
 * Pointer-responsive perimeter controller for the Elastic Frame. It owns no
 * catalog data and never changes the element's layout box; only the two
 * code-owned SVG paths are updated.
 */
/** @param {any} options */
export function createElasticFrameController({ host, setPaths, enabled = true } = {}) {
  let active = enabled === true;
  let destroyed = false;
  let frame = 0;
  let pointer = null;
  let size = DEFAULT_SIZE;
  let resizeObserver;
  let intersectionObserver;
  let mediaQuery;
  let visible = true;

  const readSize = () => {
    const rect = host?.getBoundingClientRect?.() || {};
    size = {
      width: Math.max(1, Number(rect.width) || 1),
      height: Math.max(1, Number(rect.height) || 1)
    };
  };

  const render = () => {
    frame = 0;
    if (destroyed) return;
    readSize();
    setPaths?.(
      createElasticFramePaths(size.width, size.height, active && visible ? pointer : null),
      size
    );
  };

  const schedule = () => {
    if (frame || destroyed) return;
    frame = requestAnimationFrame(render);
  };

  const pointerMove = event => {
    if (!active || !visible || event.pointerType === 'touch') return;
    const rect = host?.getBoundingClientRect?.();
    if (!rect || !rect.width || !rect.height) return;
    pointer = {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height)
    };
    schedule();
  };

  const pointerLeave = () => {
    pointer = null;
    schedule();
  };

  const reducedChange = event => {
    if (event?.matches) {
      pointer = null;
      active = false;
    }
    schedule();
  };

  const update = next => {
    if (destroyed) return;
    if (Object.prototype.hasOwnProperty.call(next || {}, 'enabled')) active = next.enabled === true;
    if (!active) pointer = null;
    schedule();
  };

  readSize();
  setPaths?.(createElasticFramePaths(size.width, size.height, null), size);
  host?.addEventListener?.('pointermove', pointerMove, { passive: true });
  host?.addEventListener?.('pointerleave', pointerLeave, { passive: true });
  mediaQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
  if (mediaQuery?.matches) active = false;
  mediaQuery?.addEventListener?.('change', reducedChange);
  if (typeof ResizeObserver === 'function' && host) {
    resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(host);
  }
  if (typeof IntersectionObserver === 'function' && host) {
    intersectionObserver = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
      if (!visible) pointer = null;
      schedule();
    }, { rootMargin: '120px' });
    intersectionObserver.observe(host);
  }

  return Object.freeze({
    update,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      host?.removeEventListener?.('pointermove', pointerMove);
      host?.removeEventListener?.('pointerleave', pointerLeave);
      mediaQuery?.removeEventListener?.('change', reducedChange);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  });
}
