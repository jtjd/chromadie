// Keep a restrained 3D cue at rest without reproducing the heavy left lean of
// the previous ten-degree base rotation.
export const PROFILE_MOTION_RESTING = Object.freeze({ x: 2, y: -4 });
export const PROFILE_MOTION_RESTING_TRANSFORM = 'rotateY(-4deg) rotateX(2deg)';

function canUseMotion() {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth <= 930) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true;
}

// Do not tune, clamp, smooth, reinterpret, or replace the /60 formula during
// implementation. The supplied reference behavior is the acceptance target.
function pointerTransform(event, inputSurface, surfaceElement) {
  if (inputSurface === 'container') {
    const bounds = surfaceElement?.getBoundingClientRect?.();
    if (!bounds || !bounds.width || !bounds.height) return PROFILE_MOTION_RESTING_TRANSFORM;
    const xAxis = (bounds.width / 2 - (event.clientX - bounds.left)) / 60;
    const yAxis = (bounds.height / 2 - (event.clientY - bounds.top)) / 60;
    return `rotateY(${xAxis}deg) rotateX(${-yAxis}deg)`;
  }

  const xAxis = (window.innerWidth / 2 - event.clientX) / 60;
  const yAxis = (window.innerHeight / 2 - event.clientY) / 60;
  return `rotateY(${xAxis}deg) rotateX(${-yAxis}deg)`;
}

/**
 * @param {{motionElement?: HTMLElement|null, surfaceElement?: HTMLElement|null, inputSurface?: string, enabled?: boolean}} options
 */
export function createProfileMotionController({
  motionElement,
  surfaceElement = null,
  inputSurface = 'viewport',
  enabled = true
} = {}) {
  let currentSurface = surfaceElement;
  let currentInputSurface = inputSurface === 'container' ? 'container' : 'viewport';
  let requestedEnabled = enabled === true;
  let active = false;

  const reset = () => {
    if (motionElement) motionElement.style.transform = PROFILE_MOTION_RESTING_TRANSFORM;
  };

  const disable = () => {
    if (motionElement) motionElement.style.transform = 'none';
  };

  const pointerMove = event => {
    if (!active || event.pointerType === 'touch' || !canUseMotion()) return;
    const surface = currentSurface || motionElement?.parentElement;
    if (currentInputSurface === 'container' && !surface) return;
    if (motionElement) motionElement.style.transform = pointerTransform(event, currentInputSurface, surface);
  };

  const viewportPointerOut = event => {
    if (!event.relatedTarget) reset();
  };

  const leave = () => reset();

  const blur = () => reset();

  const finePointerQuery = typeof window !== 'undefined' ? window.matchMedia?.('(hover: hover) and (pointer: fine)') : null;
  const desktopQuery = typeof window !== 'undefined' ? window.matchMedia?.('(min-width: 931px)') : null;
  const reducedMotionQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;

  function unbind(surface = currentSurface) {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerout', viewportPointerOut);
      window.removeEventListener('blur', blur);
    }
    surface?.removeEventListener?.('pointermove', pointerMove);
    surface?.removeEventListener?.('pointerleave', leave);
  }

  function sync() {
    unbind();
    active = requestedEnabled && canUseMotion();
    if (!active) {
      disable();
      return;
    }

    reset();
    if (typeof window === 'undefined') return;
    window.addEventListener('blur', blur);
    if (currentInputSurface === 'container') {
      currentSurface?.addEventListener?.('pointermove', pointerMove, { passive: true });
      currentSurface?.addEventListener?.('pointerleave', leave, { passive: true });
    } else {
      window.addEventListener('pointermove', pointerMove, { passive: true });
      window.addEventListener('pointerout', viewportPointerOut, { passive: true });
    }
  }

  const mediaChange = () => sync();
  finePointerQuery?.addEventListener?.('change', mediaChange);
  desktopQuery?.addEventListener?.('change', mediaChange);
  reducedMotionQuery?.addEventListener?.('change', mediaChange);

  function update(next = {}) {
    const nextSurface = Object.prototype.hasOwnProperty.call(next, 'surfaceElement')
      ? next.surfaceElement
      : currentSurface;
    const nextInputSurface = next.inputSurface
      ? (next.inputSurface === 'container' ? 'container' : 'viewport')
      : currentInputSurface;
    const surfaceChanged = nextSurface !== currentSurface || nextInputSurface !== currentInputSurface;
    if (surfaceChanged) unbind();
    if (Object.prototype.hasOwnProperty.call(next, 'enabled')) requestedEnabled = next.enabled === true;
    currentInputSurface = nextInputSurface;
    currentSurface = nextSurface;
    sync();
  }

  function destroy() {
    unbind();
    finePointerQuery?.removeEventListener?.('change', mediaChange);
    desktopQuery?.removeEventListener?.('change', mediaChange);
    reducedMotionQuery?.removeEventListener?.('change', mediaChange);
    active = false;
    disable();
  }

  sync();
  return Object.freeze({ update, reset, destroy });
}
