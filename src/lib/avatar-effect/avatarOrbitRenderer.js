const TAU = Math.PI * 2;
const FOCAL_LENGTH = 5.6;
const ORBIT_OVERSCAN = 1.56;
const BUTTERFLY_LATITUDES = Object.freeze([0.18, -0.10, 0.08, -0.18, 0.14, -0.06, 0.04, -0.14]);
const BAT_PLANES = Object.freeze([
  Object.freeze({ tiltX: -0.65, tiltZ: 0.20, node: 0.10, speed: 0.296 }),
  Object.freeze({ tiltX: -0.24, tiltZ: -0.50, node: 1.34, speed: 0.311 }),
  Object.freeze({ tiltX: 0.29, tiltZ: 0.43, node: 2.48, speed: 0.292 }),
  Object.freeze({ tiltX: 0.62, tiltZ: -0.18, node: 3.70, speed: 0.306 })
]);

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function add(a, b) {
  return vector(a.x + b.x, a.y + b.y, a.z + b.z);
}

function scale(a, amount) {
  return vector(a.x * amount, a.y * amount, a.z * amount);
}

function length(a) {
  return Math.hypot(a.x, a.y, a.z);
}

function normalize(a, fallback = vector(0, 1, 0)) {
  const magnitude = length(a);
  return magnitude > 0.0001 ? scale(a, 1 / magnitude) : fallback;
}

function cross(a, b) {
  return vector(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

function rotateX(point, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return vector(point.x, point.y * cosine - point.z * sine, point.y * sine + point.z * cosine);
}

function rotateY(point, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return vector(point.x * cosine + point.z * sine, point.y, -point.x * sine + point.z * cosine);
}

function rotateZ(point, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return vector(point.x * cosine - point.y * sine, point.x * sine + point.y * cosine, point.z);
}

function cameraPoint(point, camera) {
  let result = rotateY(point, camera.yaw);
  result = rotateX(result, camera.pitch);
  return result;
}

function project(point, camera, centerX, centerY, scaleFactor) {
  const transformed = cameraPoint(point, camera);
  const depthScale = FOCAL_LENGTH / Math.max(1.2, FOCAL_LENGTH - transformed.z);
  return {
    x: centerX + transformed.x * scaleFactor * depthScale,
    y: centerY - transformed.y * scaleFactor * depthScale,
    depth: transformed.z,
    scale: depthScale
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function localWingPoint(state, side, tangentAmount, verticalAmount, normalAmount, span) {
  const flapAngle = state.flap * side;
  const flappedVertical = verticalAmount * Math.cos(flapAngle) - normalAmount * Math.sin(flapAngle);
  const flappedNormal = verticalAmount * Math.sin(flapAngle) + normalAmount * Math.cos(flapAngle);
  const bankedVertical = flappedVertical * Math.cos(state.bank) - flappedNormal * Math.sin(state.bank);
  const bankedNormal = flappedVertical * Math.sin(state.bank) + flappedNormal * Math.cos(state.bank);
  return add(
    state.position,
    add(
      scale(state.tangent, tangentAmount * span),
      add(
        scale(state.binormal, bankedVertical * span * side),
        scale(state.normal, bankedNormal * span)
      )
    )
  );
}

function localBodyPoint(state, tangentAmount, verticalAmount, normalAmount, span) {
  const bankedVertical = verticalAmount * Math.cos(state.bank) - normalAmount * Math.sin(state.bank);
  const bankedNormal = verticalAmount * Math.sin(state.bank) + normalAmount * Math.cos(state.bank);
  return add(
    state.position,
    add(
      scale(state.tangent, tangentAmount * span),
      add(scale(state.binormal, bankedVertical * span), scale(state.normal, bankedNormal * span))
    )
  );
}

function makeButterflyState(index, time) {
  const baseLatitude = BUTTERFLY_LATITUDES[index % BUTTERFLY_LATITUDES.length];
  const phase = index / 8 * TAU;
  const theta = time * 0.000305 + phase;
  const latitude = baseLatitude + Math.sin(theta * 1.15 + phase) * 0.032;
  const radius = 1.105 + (index % 2) * 0.018;
  const cosLatitude = Math.cos(latitude);
  const position = vector(
    cosLatitude * Math.cos(theta) * radius,
    Math.sin(latitude) * radius,
    cosLatitude * Math.sin(theta) * radius
  );
  const nextTheta = theta + 0.002;
  const nextLatitude = baseLatitude + Math.sin(nextTheta * 1.15 + phase) * 0.032;
  const nextPosition = vector(
    Math.cos(nextLatitude) * Math.cos(nextTheta) * radius,
    Math.sin(nextLatitude) * radius,
    Math.cos(nextLatitude) * Math.sin(nextTheta) * radius
  );
  const normal = normalize(position, vector(0, 0, 1));
  const tangent = normalize(add(nextPosition, scale(position, -1)), vector(1, 0, 0));
  const binormal = normalize(cross(normal, tangent), vector(0, 1, 0));
  return {
    position,
    normal,
    tangent,
    binormal,
    phase,
    flap: Math.sin(time * (0.00208 + (index % 3) * 0.0002) + phase * 2.2) * 0.95,
    bank: Math.sin(time * 0.0008 + phase) * 0.25,
    size: 0.158 + (index % 4) * 0.01
  };
}

function makeBatOrbitPoint(plane, theta, radius, bobPhase) {
  let position = vector(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
  position = rotateX(position, plane.tiltX);
  position = rotateZ(position, plane.tiltZ);
  position = rotateY(position, plane.node);
  const radial = 1 + Math.sin(theta * 1.12 + bobPhase) * 0.01;
  position = scale(position, radial);
  position.y += Math.sin(theta * 1.45 + bobPhase) * 0.022;
  return position;
}

function makeBatState(index, time) {
  const planeIndex = index % BAT_PLANES.length;
  const slot = Math.floor(index / BAT_PLANES.length);
  const plane = BAT_PLANES[planeIndex];
  const phase = slot / 6 * TAU + planeIndex * 0.29;
  const theta = time * plane.speed * 0.001 + phase;
  const radius = 1.10 + (index % 4) * 0.02;
  const bobPhase = index * 0.87;
  const position = makeBatOrbitPoint(plane, theta, radius, bobPhase);
  const normal = normalize(position, vector(0, 0, 1));
  const next = makeBatOrbitPoint(plane, theta + 0.002, radius, bobPhase);
  const tangent = normalize(add(next, scale(position, -1)), vector(1, 0, 0));
  const binormal = normalize(cross(normal, tangent), vector(0, 1, 0));
  return {
    position,
    normal,
    tangent,
    binormal,
    phase,
    flap: Math.sin(time * (0.00315 + (index % 4) * 0.00014) + phase * 1.7) * 0.8,
    bank: Math.sin(time * 0.00068 + bobPhase) * 0.09,
    size: 0.315 + (index % 4) * 0.014
  };
}

function screenWingPoint(state, side, camera, centerX, centerY, scaleFactor, tangentAmount, verticalAmount, normalAmount, span = state.size) {
  return project(localWingPoint(state, side, tangentAmount, verticalAmount, normalAmount, span), camera, centerX, centerY, scaleFactor);
}

function smoothClosedPath(context, points) {
  if (!points.length) return;
  const last = points[points.length - 1];
  const firstMid = { x: (last.x + points[0].x) / 2, y: (last.y + points[0].y) / 2 };
  context.moveTo(firstMid.x, firstMid.y);
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
    context.quadraticCurveTo(point.x, point.y, midpoint.x, midpoint.y);
  });
  context.closePath();
}

function createButterflyWingGradient(context, points) {
  if (!context.createLinearGradient) return 'rgba(255,255,255,.92)';
  const gradient = context.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
  gradient.addColorStop?.(0, 'rgba(255,255,255,.98)');
  gradient.addColorStop?.(.45, 'rgba(246,250,255,.96)');
  gradient.addColorStop?.(1, 'rgba(224,236,248,.90)');
  return gradient;
}

function drawButterflyWing(context, points, alpha, scaleFactor) {
  const centerX = points.reduce((total, point) => total + point.x, 0) / points.length;
  const centerY = points.reduce((total, point) => total + point.y, 0) / points.length;
  const glow = context.createRadialGradient?.(centerX, centerY, 0, centerX, centerY, 22 * scaleFactor);
  if (glow) {
    glow.addColorStop?.(0, 'rgba(255,255,255,.22)');
    glow.addColorStop?.(.46, 'rgba(255,255,255,.09)');
    glow.addColorStop?.(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, centerY, 22 * scaleFactor, 0, TAU);
    context.fill();
  }
  context.beginPath();
  smoothClosedPath(context, points);
  context.globalAlpha = alpha;
  context.fillStyle = createButterflyWingGradient(context, points);
  context.fill();
  context.save();
  context.globalAlpha = alpha * .42;
  context.shadowColor = 'rgba(255,255,255,.72)';
  context.shadowBlur = 8 * scaleFactor;
  context.strokeStyle = 'rgba(255,255,255,.72)';
  context.lineWidth = Math.max(1, 2 * scaleFactor);
  context.stroke();
  context.restore();
  context.globalAlpha = alpha;
  context.strokeStyle = 'rgba(255,255,255,.94)';
  context.lineWidth = Math.max(.45, .75 * scaleFactor);
  context.stroke();
  context.globalAlpha = 1;
}

function drawButterfly(context, state, camera, centerX, centerY, scaleFactor) {
  const center = project(state.position, camera, centerX, centerY, scaleFactor);
  const projectedScale = center.scale;
  const alpha = clamp(.60 + (center.depth + 1) * .22, .58, 1);
  const span = state.size;
  const tail = project(localWingPoint(state, 1, -.11, 0, 0, span), camera, centerX, centerY, scaleFactor);
  const thorax = project(localWingPoint(state, 1, .01, 0, 0, span), camera, centerX, centerY, scaleFactor);
  const head = project(localWingPoint(state, 1, .10, 0, 0, span), camera, centerX, centerY, scaleFactor);
  const upperLocal = [
    [0, 0, 0], [.07, .15, .18], [.13, .29, .22], [.14, .41, .18], [.09, .50, .08],
    [-.01, .51, -.02], [-.09, .43, -.10], [-.11, .29, -.15], [-.07, .13, -.11]
  ];
  const lowerLocal = [
    [0, 0, -.01], [.02, .10, -.04], [0, .19, -.11], [-.04, .27, -.20], [-.10, .29, -.31],
    [-.15, .22, -.34], [-.16, .12, -.27], [-.12, .05, -.17], [-.06, .02, -.08]
  ];

  for (const side of [-1, 1]) {
    const upper = upperLocal.map(([x, y, z]) => screenWingPoint(state, side, camera, centerX, centerY, scaleFactor, x, y, z, span));
    const lower = lowerLocal.map(([x, y, z]) => screenWingPoint(state, side, camera, centerX, centerY, scaleFactor, x, y, z, span));
    drawButterflyWing(context, upper, alpha, projectedScale);
    drawButterflyWing(context, lower, alpha * .96, projectedScale);
    context.save();
    context.globalAlpha = alpha * .42;
    context.strokeStyle = 'rgba(235,243,250,.86)';
    context.lineWidth = Math.max(.45, .82 * projectedScale);
    context.beginPath();
    context.moveTo(thorax.x, thorax.y);
    context.lineTo(upper[1].x, upper[1].y);
    context.moveTo(thorax.x, thorax.y);
    context.lineTo(upper[3].x, upper[3].y);
    context.moveTo(thorax.x, thorax.y);
    context.lineTo(lower[2].x, lower[2].y);
    context.stroke();
    context.restore();
    const spotA = project(localWingPoint(state, side, .06, .18, .04, span), camera, centerX, centerY, scaleFactor);
    const spotB = project(localWingPoint(state, side, -.06, .10, -.14, span), camera, centerX, centerY, scaleFactor);
    context.fillStyle = 'rgba(255,255,255,.30)';
    context.beginPath();
    context.arc(spotA.x, spotA.y, Math.max(.7, 1.5 * projectedScale), 0, TAU);
    context.fill();
    context.beginPath();
    context.arc(spotB.x, spotB.y, Math.max(.55, 1 * projectedScale), 0, TAU);
    context.fill();
  }

  const halo = context.createRadialGradient?.(center.x, center.y, 0, center.x, center.y, 26 * projectedScale);
  if (halo) {
    halo.addColorStop?.(0, 'rgba(255,255,255,.18)');
    halo.addColorStop?.(.42, 'rgba(255,255,255,.08)');
    halo.addColorStop?.(1, 'rgba(255,255,255,0)');
    context.fillStyle = halo;
    context.beginPath();
    context.arc(center.x, center.y, 26 * projectedScale, 0, TAU);
    context.fill();
  }
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = 'rgba(220,232,242,.96)';
  context.lineCap = 'round';
  context.lineWidth = Math.max(.9, 1.8 * projectedScale);
  context.beginPath();
  context.moveTo(tail.x, tail.y);
  context.lineTo(thorax.x, thorax.y);
  context.lineTo(head.x, head.y);
  context.stroke();
  context.fillStyle = 'rgba(255,255,255,.98)';
  context.beginPath();
  context.arc(head.x, head.y, Math.max(.9, 1.35 * projectedScale), 0, TAU);
  context.fill();
  const antennaLeft = project(localWingPoint(state, 1, .15, .02, .03, span), camera, centerX, centerY, scaleFactor);
  const antennaRight = project(localWingPoint(state, 1, .15, -.02, .03, span), camera, centerX, centerY, scaleFactor);
  context.strokeStyle = 'rgba(240,247,255,.88)';
  context.lineWidth = Math.max(.45, .9 * projectedScale);
  context.beginPath();
  context.moveTo(head.x, head.y);
  context.quadraticCurveTo((head.x + antennaLeft.x) / 2, head.y - 2.4 * projectedScale, antennaLeft.x, antennaLeft.y);
  context.moveTo(head.x, head.y);
  context.quadraticCurveTo((head.x + antennaRight.x) / 2, head.y - 2.4 * projectedScale, antennaRight.x, antennaRight.y);
  context.stroke();
  context.restore();
}

function drawBatWing(context, state, side, centerX, centerY, camera, scaleFactor) {
  const span = state.size;
  const point = (x, y, z) => project(localWingPoint(state, side, x, y, z, span), camera, centerX, centerY, scaleFactor);
  const root = point(.072, .018, 0);
  const notch = point(.145, .040, -.030);
  const shoulder = point(.126, .102, .016);
  const crown = point(.108, .252, .060);
  const outer = point(.040, .465, .070);
  const tip = point(-.050, .645, .030);
  const innerOne = point(-.102, .505, -.008);
  const pointOne = point(-.188, .398, -.042);
  const valleyOne = point(-.112, .304, -.054);
  const pointTwo = point(-.208, .224, -.064);
  const valleyTwo = point(-.120, .148, -.056);
  const pointThree = point(-.192, .080, -.047);
  const innerTwo = point(-.086, .034, -.025);
  context.save();
  context.globalAlpha = .72 + clamp((project(root, camera, centerX, centerY, scaleFactor).depth + 1) * .12, 0, .28);
  context.beginPath();
  context.moveTo(root.x, root.y);
  context.quadraticCurveTo(notch.x, notch.y, shoulder.x, shoulder.y);
  context.bezierCurveTo(crown.x, crown.y, outer.x, outer.y, tip.x, tip.y);
  context.lineTo(innerOne.x, innerOne.y);
  context.lineTo(pointOne.x, pointOne.y);
  context.lineTo(valleyOne.x, valleyOne.y);
  context.lineTo(pointTwo.x, pointTwo.y);
  context.lineTo(valleyTwo.x, valleyTwo.y);
  context.lineTo(pointThree.x, pointThree.y);
  context.quadraticCurveTo(innerTwo.x, innerTwo.y, root.x, root.y);
  context.closePath();
  context.shadowColor = 'rgba(120,138,165,.16)';
  context.shadowBlur = 2.6 * tip.scale;
  context.fillStyle = 'rgba(1,2,4,.998)';
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(120,138,165,.14)';
  context.lineWidth = Math.max(.30, .48 * tip.scale);
  context.stroke();
  context.restore();
}

function drawBatBody(context, state, centerX, centerY, camera, scaleFactor) {
  const span = state.size;
  const points = [
    [.165, -.032, .010], [.112, -.043, .004], [.132, -.012, .003], [.102, 0, 0],
    [.132, .012, .003], [.112, .043, .004], [.165, .032, .010], [.058, .050, 0],
    [-.075, .036, -.006], [-.245, 0, -.030], [-.075, -.036, -.006], [.058, -.050, 0]
  ].map(([x, y, z]) => project(localBodyPoint(state, x, y, z, span), camera, centerX, centerY, scaleFactor));
  context.save();
  context.globalAlpha = clamp(.72 + (points[0].depth + 1) * .12, .70, 1);
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => context.lineTo(point.x, point.y));
  context.closePath();
  context.fillStyle = 'rgba(1,2,4,.998)';
  context.fill();
  context.restore();
}

function drawBat(context, state, camera, centerX, centerY, scaleFactor) {
  drawBatWing(context, state, -1, centerX, centerY, camera, scaleFactor);
  drawBatWing(context, state, 1, centerX, centerY, camera, scaleFactor);
  drawBatBody(context, state, centerX, centerY, camera, scaleFactor);
}

function drawScene(context, effectKey, width, height, time, pointer) {
  if (!context || !width || !height) return;
  context.back.clearRect(0, 0, width, height);
  context.front.clearRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  // The canvases intentionally overscan the avatar slot by 156%. Convert back
  // to the real slot radius so the orbit remains decorative instead of
  // dominating the user's avatar silhouette.
  const scaleFactor = Math.min(width, height) * 0.32;
  const camera = {
    yaw: pointer ? ((pointer.x / Math.max(1, pointer.width) - 0.5) * 0.46) : 0,
    pitch: pointer ? ((pointer.y / Math.max(1, pointer.height) - 0.5) * -0.34) : 0
  };
  const states = [];
  const count = effectKey === 'butterfly-orbit' ? 8 : 24;
  for (let index = 0; index < count; index += 1) {
    const state = effectKey === 'butterfly-orbit'
      ? makeButterflyState(index, time)
      : makeBatState(index, time);
    state.projected = project(state.position, camera, centerX, centerY, scaleFactor);
    states.push(state);
  }
  states.sort((left, right) => left.projected.depth - right.projected.depth);
  states.forEach(state => {
    const target = state.projected.depth < 0 ? context.back : context.front;
    if (effectKey === 'butterfly-orbit') drawButterfly(target, state, camera, centerX, centerY, scaleFactor);
    else drawBat(target, state, camera, centerX, centerY, scaleFactor);
  });
}

/** @param {any} options */
export function createAvatarOrbitController({ host, backCanvas, frontCanvas, effectKey, enabled = true } = {}) {
  const back = backCanvas?.getContext?.('2d', { alpha: true });
  const front = frontCanvas?.getContext?.('2d', { alpha: true });
  if (!host || !back || !front) return Object.freeze({ update() {}, destroy() {} });

  let key = effectKey === 'bat-orbit' ? 'bat-orbit' : 'butterfly-orbit';
  let active = enabled === true;
  let visible = true;
  let reduced = false;
  let destroyed = false;
  let frame = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let pointer = null;
  let mediaQuery;
  let resizeObserver;
  let intersectionObserver;

  const clear = () => {
    back.clearRect(0, 0, width, height);
    front.clearRect(0, 0, width, height);
  };

  const resize = () => {
    const rect = host.getBoundingClientRect?.() || {};
    const hostWidth = Math.max(1, Number(host.clientWidth) || Number(rect.width) || 1);
    const hostHeight = Math.max(1, Number(host.clientHeight) || Number(rect.height) || 1);
    width = hostWidth * ORBIT_OVERSCAN;
    height = hostHeight * ORBIT_OVERSCAN;
    const offsetX = (hostWidth - width) / 2;
    const offsetY = (hostHeight - height) / 2;
    dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
    [backCanvas, frontCanvas].forEach(canvas => {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.left = `${offsetX}px`;
      canvas.style.top = `${offsetY}px`;
      canvas.style.right = 'auto';
      canvas.style.bottom = 'auto';
    });
    back.setTransform(dpr, 0, 0, dpr, 0, 0);
    front.setTransform(dpr, 0, 0, dpr, 0, 0);
    clear();
    draw(0);
  };

  const draw = time => {
    if (destroyed) return;
    const scene = { back, front };
    drawScene(scene, key, width, height, reduced || !active ? 0 : time, pointer);
  };

  const schedule = () => {
    if (frame || destroyed || !active || reduced || !visible) return;
    frame = requestAnimationFrame(timestamp => {
      frame = 0;
      draw(timestamp);
      schedule();
    });
  };

  const pointerMove = event => {
    if (event.pointerType === 'touch') return;
    const rect = host.getBoundingClientRect?.();
    if (!rect || !rect.width || !rect.height) return;
    pointer = {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      width: rect.width,
      height: rect.height
    };
    draw(reduced || !active ? 0 : performance.now());
  };
  const pointerLeave = () => {
    pointer = null;
    draw(reduced || !active ? 0 : performance.now());
  };
  const visibilityChange = () => {
    visible = document.visibilityState === 'visible';
    if (!visible) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clear();
    } else {
      draw(reduced || !active ? 0 : performance.now());
      schedule();
    }
  };
  const reducedChange = event => {
    reduced = Boolean(event?.matches);
    if (reduced && frame) cancelAnimationFrame(frame);
    frame = 0;
    draw(0);
    if (!reduced) schedule();
  };

  host.addEventListener?.('pointermove', pointerMove, { passive: true });
  host.addEventListener?.('pointerleave', pointerLeave, { passive: true });
  document.addEventListener?.('visibilitychange', visibilityChange);
  mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  reduced = Boolean(mediaQuery?.matches);
  mediaQuery?.addEventListener?.('change', reducedChange);
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  }
  if (typeof IntersectionObserver === 'function') {
    intersectionObserver = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
      if (!visible) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        clear();
      } else {
        resize();
        schedule();
      }
    }, { rootMargin: '120px' });
    intersectionObserver.observe(host);
  }
  resize();
  schedule();

  return Object.freeze({
    update(next = {}) {
      if (destroyed) return;
      if (next.effectKey === 'butterfly-orbit' || next.effectKey === 'bat-orbit') key = next.effectKey;
      if (Object.prototype.hasOwnProperty.call(next, 'enabled')) active = next.enabled === true;
      draw(reduced || !active ? 0 : performance.now());
      if (active) schedule();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      host.removeEventListener?.('pointermove', pointerMove);
      host.removeEventListener?.('pointerleave', pointerLeave);
      document.removeEventListener?.('visibilitychange', visibilityChange);
      mediaQuery?.removeEventListener?.('change', reducedChange);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clear();
    }
  });
}
