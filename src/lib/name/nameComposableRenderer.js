/*
 * The composable draw branches are not needed by current legacy/default
 * production profiles. Keep their implementation in one lazy code-owned
 * module so the first route does not pay for the future catalog before an
 * explicit composable loadout is requested.
 */

let materialRenderer = null;
let motionRenderer = null;
let composableRenderersPromise = null;

/** @param {{ drawMaterial?: (...args: any[]) => unknown, drawMotion?: (...args: any[]) => unknown }} [renderers] */
function registerCodeOwnedNameRenderers(renderers = {}) {
  const { drawMaterial, drawMotion } = renderers;
  if (typeof drawMaterial === 'function') materialRenderer = drawMaterial;
  if (typeof drawMotion === 'function') motionRenderer = drawMotion;
}

export function getCodeOwnedNameRenderers() {
  return Object.freeze({ material: materialRenderer, motion: motionRenderer });
}

export function loadCodeOwnedNameRenderers() {
  if (!composableRenderersPromise) {
    composableRenderersPromise = Promise.all([
      import('./render/composableMaterials.js'),
      import('./render/composableMotions.js')
    ]).then(([materials, motions]) => {
      registerCodeOwnedNameRenderers({
        drawMaterial: materials.drawComposableMaterial,
        drawMotion: motions.drawComposableMotion
      });
      return getCodeOwnedNameRenderers();
    }).catch(error => {
      composableRenderersPromise = null;
      throw error;
    });
  }
  return composableRenderersPromise;
}
