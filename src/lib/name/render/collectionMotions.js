import { getPaintedTextSurface } from './textSurface.js';
import { clamp, envelope } from './collectionArt.js';
import { cherryBlossom, butterflyKiss, dandelionWish, roseRomance, ravenFeather, laurelGrow, fireflyDance } from './collectionNature.js';
import { swordFlourish, waxSeal, fallingAce, crownGlint, paperPlane, kittenPaws, bubbleBath } from './collectionObjects.js';
import { ribbonWaltz, firebrand, inkImpact, meteorSkip, tidePool, confettiParade } from './collectionEnergy.js';

const gestures = {
  'kinetic-echo': ribbonWaltz,
  'neon-particle': firebrand,
  'ion-sweep': swordFlourish,
  'phase-fracture': inkImpact,
  letterpress: waxSeal,
  'cherry-blossom': cherryBlossom,
  'butterfly-kiss': butterflyKiss,
  'bubble-bath': bubbleBath,
  'kitten-paws': kittenPaws,
  'dandelion-wish': dandelionWish,
  'rose-romance': roseRomance,
  'raven-feather': ravenFeather,
  'falling-ace': fallingAce,
  'crown-glint': crownGlint,
  'meteor-skip': meteorSkip,
  'laurel-grow': laurelGrow,
  'paper-plane': paperPlane,
  'tide-pool': tidePool,
  'firefly-dance': fireflyDance,
  'confetti-parade': confettiParade
};

// Small passing subjects keep their silhouettes while crossing the lettering.
// Broad washes, plants, ribbons and framing ornaments stay behind the name.
const foreground = new Set(['neon-particle', 'ion-sweep', 'butterfly-kiss', 'bubble-bath',
  'raven-feather', 'falling-ace', 'paper-plane', 'firefly-dance', 'confetti-parade']);

function paintName(ctx, model, drawBase) {
  const surface = getPaintedTextSurface(ctx, model, drawBase);
  if (surface) ctx.drawImage(surface.canvas, surface.left, 0, surface.width, surface.height);
  else drawBase(ctx, model);
}

export function drawCollectionMotion(ctx, model, drawBase) {
  const gesture = gestures[model.motion.key];
  if (!gesture) return false;
  if (!ctx?.drawImage || !ctx?.fillRect || !ctx?.beginPath || !ctx?.ellipse) {
    drawBase(ctx, model);
    return true;
  }
  // Scene geometry has a 38px design baseline. Fit its vertical breathing room
  // and horizontal end details even on compact, single-character name canvases.
  const scale = Math.min(clamp(model.metrics.fontSize / 38, .5, 1.45), model.height / 76, model.width / 88);
  const width = clamp(Math.min(model.metrics.width / scale, model.width / scale - 40), 48, 300);
  const passesInFront = foreground.has(model.motion.key);
  if (passesInFront) paintName(ctx, model, drawBase);
  ctx.save();
  ctx.translate(model.metrics.x, model.metrics.y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // All scene paint helpers multiply this opacity, closing the clock's wrap
  // with a quiet interval rather than resetting visible particles in place.
  const opacity = envelope(model.progress, .025, .94, .09);
  ctx.globalAlpha *= opacity;
  if (opacity > 0) gesture(ctx, model, width);
  ctx.restore();

  if (!passesInFront) paintName(ctx, model, drawBase);
  return true;
}
