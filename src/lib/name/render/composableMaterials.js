import { createLinearGradient, drawText, mixColors, rgba, strokeText, withTextMask } from './primitives.js';

// Material lighting is anchored to the glyph box, never to motion progress.
// A motion may supply a moving palette while the finish retains its structure.
export function drawComposableMaterial(ctx, model) {
  const { material, metrics, baseColor, todayColor } = model;
  const [first, second = first, third = first] = material.colors;
  const size = metrics.fontSize;
  const left = metrics.x - metrics.rawWidth / 2;
  const top = metrics.y - size * 0.52;
  const gradient = colors => createLinearGradient(ctx, colors, 0, top, 0, top + size, first);
  const rim = Math.max(0.55, Math.min(1.25, size * 0.024));
  const depth = Math.max(0.7, Math.min(2.5, size * 0.055));
  const texture = draw => withTextMask(ctx, model, target => {
    target.shadowBlur = 0;
    target.shadowOffsetX = 0;
    target.shadowOffsetY = 0;
    draw(target);
  });

  switch (material.key) {
    case 'plain':
      drawText(ctx, model, baseColor || first);
      return;
    case 'glass-emboss':
      strokeText(ctx, model, second, rim * 2, 1, depth, depth);
      drawText(ctx, model, gradient([first, second, third, first]));
      texture(target => {
        target.fillStyle = rgba('#FFFFFF', 0.36);
        target.beginPath?.();
        target.moveTo?.(left, top);
        target.lineTo?.(left + metrics.rawWidth * 0.75, top);
        target.lineTo?.(left + metrics.rawWidth * 0.3, top + size * 0.52);
        target.lineTo?.(left, top + size * 0.72);
        target.closePath?.();
        target.fill?.();
      });
      strokeText(ctx, model, rgba(first, 0.92), rim);
      return;
    case 'carbon-cut':
      strokeText(ctx, model, third, rim * 2, 1, depth, depth);
      drawText(ctx, model, gradient([third, second, second, first]));
      texture(target => {
        target.strokeStyle = rgba(first, 0.48);
        target.lineWidth = Math.max(0.55, size * 0.018);
        const step = Math.max(4, size * 0.16);
        target.beginPath?.();
        for (let x = left - size; x < left + metrics.rawWidth + size; x += step) {
          target.moveTo?.(x, top);
          target.lineTo?.(x + size, top + size);
        }
        target.stroke?.();
      });
      strokeText(ctx, model, first, rim);
      return;
    case 'neon-tube':
      ctx.save?.();
      ctx.shadowColor = first;
      ctx.shadowBlur = Math.min(16, size * 0.32);
      strokeText(ctx, model, first, rim * 3);
      ctx.restore?.();
      drawText(ctx, model, rgba(third, 0.9));
      strokeText(ctx, model, first, rim * 1.8);
      strokeText(ctx, model, second, Math.max(0.55, rim * 0.65));
      return;
    case 'velvet-ink':
      strokeText(ctx, model, second, rim * 2, 1, 0, depth);
      drawText(ctx, model, gradient([second, first, third, first, second]));
      texture(target => {
        target.fillStyle = rgba(first, 0.28);
        for (let y = top; y < top + size; y += Math.max(2, size * 0.075)) {
          target.fillRect?.(left, y, metrics.rawWidth, 0.65);
        }
      });
      strokeText(ctx, model, rgba(third, 0.8), rim * 0.7);
      return;
    case 'engraved-stone':
      // A warm mineral face with a hard carved lip and angular incisions.
      strokeText(ctx, model, third, rim * 2, 1, -depth, -depth);
      strokeText(ctx, model, second, rim * 2, 1, depth, depth);
      drawText(ctx, model, gradient([third, first, first, second]));
      texture(target => {
        target.strokeStyle = rgba(second, 0.7);
        target.lineWidth = Math.max(0.6, size * 0.025);
        target.beginPath?.();
        for (let x = left; x < left + metrics.rawWidth; x += Math.max(9, size * 0.65)) {
          target.moveTo?.(x, top + size * 0.2);
          target.lineTo?.(x + size * 0.19, top + size * 0.47);
          target.lineTo?.(x + size * 0.05, top + size * 0.8);
        }
        target.stroke?.();
      });
      return;
    case 'crt-phosphor':
      ctx.save?.();
      ctx.shadowColor = second;
      ctx.shadowBlur = Math.min(10, size * 0.18);
      drawText(ctx, model, first);
      ctx.restore?.();
      texture(target => {
        target.fillStyle = rgba(third, 0.75);
        const step = Math.max(3, size * 0.12);
        for (let y = top; y < top + size; y += step) target.fillRect?.(left, y, metrics.rawWidth, Math.max(0.7, step * 0.28));
      });
      return;
    case 'blueprint-ink':
      drawText(ctx, model, mixColors(first, third, 0.3));
      texture(target => {
        target.strokeStyle = rgba(second, 0.78);
        target.lineWidth = Math.max(0.5, size * 0.013);
        const step = Math.max(4, size * 0.18);
        target.beginPath?.();
        for (let x = left; x < left + metrics.rawWidth; x += step) {
          target.moveTo?.(x, top); target.lineTo?.(x, top + size);
        }
        for (let y = top; y < top + size; y += step) {
          target.moveTo?.(left, y); target.lineTo?.(left + metrics.rawWidth, y);
        }
        target.stroke?.();
      });
      strokeText(ctx, model, second, rim);
      return;
    case 'halo-edge':
      // Retain Soft Halo's approved fill and fixed glow.
      ctx.save?.();
      ctx.shadowColor = rgba(first, 0.86);
      ctx.shadowBlur = 16.5;
      drawText(ctx, model, baseColor || first);
      ctx.restore?.();
      return;
    default:
      drawText(ctx, model, baseColor || todayColor);
  }
}
