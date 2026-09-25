import { drawText, rgba, withTextMask } from './primitives.js';
import { drawLuminousMaterial } from './luminousMaterials.js';

// drawMaterial in nameRenderer supplies an isolated, reusable text surface.
// Surface light follows materialProgress independently from glyph motion.
export function drawComposableMaterial(ctx, model) {
  const { material, metrics, baseColor, todayColor } = model;
  const [first, second = first, third = first] = material.colors;
  if (drawLuminousMaterial(ctx, model)) return;
  switch (material.key) {
    case 'plain':
      drawText(ctx, model, baseColor || first);
      return;
    case 'crt-phosphor': {
      // Preserve the approved Cathode Bloom face, glow and scan spacing.
      const size = metrics.fontSize;
      const left = metrics.x - metrics.rawWidth / 2;
      const top = metrics.y - size * .52;
      ctx.save?.();
      ctx.shadowColor = second;
      ctx.shadowBlur = Math.min(10, size * .18);
      drawText(ctx, model, first);
      ctx.restore?.();
      withTextMask(ctx, model, target => {
        target.shadowBlur = 0;
        target.shadowOffsetX = 0;
        target.shadowOffsetY = 0;
        target.fillStyle = rgba(third, .75);
        const step = Math.max(3, size * .12);
        for (let y = top; y < top + size; y += step) target.fillRect?.(left, y, metrics.rawWidth, Math.max(.7, step * .28));
      });
      return;
    }
    case 'halo-edge':
      // Preserve Soft Halo's approved fill and fixed glow.
      ctx.save?.();
      ctx.shadowColor = rgba(first, .86);
      ctx.shadowBlur = 16.5;
      drawText(ctx, model, baseColor || first);
      ctx.restore?.();
      return;
    default:
      drawText(ctx, model, baseColor || todayColor);
  }
}
