/**
 * Preview geometry is context-owned.  A compact fitting-room control must not
 * inherit the catalog stage, and the persistent dashboard preview must not
 * inherit either one.
 */
export const PROFILE_RENDER_CONTEXTS = Object.freeze({
  LIVE_PROFILE: 'live-profile',
  CATALOG: 'catalog',
  EFFECT_CARD: 'effect-card',
  NAME_CONTROL: 'name-control'
});

export const PROFILE_RENDER_CONTEXT_SET = new Set(Object.values(PROFILE_RENDER_CONTEXTS));

/** @param {any} value @param {any} fallback */
export function resolveProfileRenderContext(value, fallback = PROFILE_RENDER_CONTEXTS.LIVE_PROFILE) {
  return PROFILE_RENDER_CONTEXT_SET.has(value) ? value : fallback;
}

export function getProfileRenderGeometry(context) {
  const resolved = resolveProfileRenderContext(context);
  if (resolved === PROFILE_RENDER_CONTEXTS.CATALOG) {
    return { aspectRatio: '16 / 9', minHeight: '0', bleed: 'contained', motion: 'interactive' };
  }
  if (resolved === PROFILE_RENDER_CONTEXTS.EFFECT_CARD) {
    return { aspectRatio: 'auto', minHeight: '4.25rem', bleed: 'contained', motion: 'preview' };
  }
  if (resolved === PROFILE_RENDER_CONTEXTS.NAME_CONTROL) {
    return { aspectRatio: 'auto', minHeight: '2.9rem', bleed: 'visible', motion: 'static-signature' };
  }
  return { aspectRatio: 'auto', minHeight: '0', bleed: 'visible', motion: 'profile' };
}
