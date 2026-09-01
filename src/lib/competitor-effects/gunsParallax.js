/*
 * Guns' populated profiles pass a 1,000px perspective, 700ms transition, and
 * ten-degree X/Y tilt envelope to their parallax wrapper. This helper keeps
 * the pointer math bounded and independently testable.
 */

export const GUNS_PARALLAX_MAX_ANGLE_X = 10;
export const GUNS_PARALLAX_MAX_ANGLE_Y = 10;
export const GUNS_PARALLAX_TRANSITION_MS = 700;

export function getGunsParallaxRotation(rect, point) {
  if (!rect || !point || !(rect.width > 0) || !(rect.height > 0)) return null;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const normalizedX = Math.max(-1, Math.min(1, (Number(point.clientX) - centerX) / (rect.width / 2)));
  const normalizedY = Math.max(-1, Math.min(1, (Number(point.clientY) - centerY) / (rect.height / 2)));
  const rotateX = -normalizedY * GUNS_PARALLAX_MAX_ANGLE_X;
  const rotateY = normalizedX * GUNS_PARALLAX_MAX_ANGLE_Y;
  return {
    rotateX: rotateX === 0 ? 0 : rotateX,
    rotateY: rotateY === 0 ? 0 : rotateY
  };
}
