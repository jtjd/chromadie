import {
  createLinearGradient,
  drawText,
  mixColors,
  rgba,
  strokeText,
  withTextMask
} from './primitives.js';

export function drawComposableMaterial(ctx, model) {
  const { material, metrics, progress, todayColor, baseColor } = model;
  const [first = '#F7FBFF', second = '#CDD2FF', third = '#FFFFFF'] = material.colors;

  switch (material.key) {
    case 'plain':
      drawText(ctx, model, baseColor || mixColors(first, todayColor, 0.12));
      return;
    case 'glass-emboss':
      drawText(ctx, model, 'rgba(218,232,255,.14)');
      strokeText(ctx, model, rgba(second, 0.82), Math.max(0.8, metrics.fontSize * 0.035));
      ctx.save?.();
      ctx.shadowColor = rgba(second, 0.42);
      ctx.shadowBlur = metrics.fontSize * 0.32;
      strokeText(ctx, model, rgba(third, 0.35), Math.max(0.5, metrics.fontSize * 0.02), 1, 0, -1);
      ctx.restore?.();
      return;
    case 'carbon-cut':
      ctx.save?.();
      ctx.shadowColor = 'rgba(0,0,0,.82)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
      drawText(ctx, model, second);
      ctx.restore?.();
      strokeText(ctx, model, first, Math.max(0.8, metrics.fontSize * 0.04));
      return;
    case 'neon-tube':
      ctx.save?.();
      ctx.shadowColor = rgba(todayColor, 0.78);
      ctx.shadowBlur = metrics.fontSize * 0.58;
      strokeText(ctx, model, first, Math.max(1, metrics.fontSize * 0.045));
      ctx.restore?.();
      strokeText(ctx, model, '#FFFFFF', Math.max(0.6, metrics.fontSize * 0.025));
      return;
    case 'velvet-ink': {
      drawText(ctx, model, first);
      // Keep the intentionally dark velvet fill legible without turning it
      // into a bright solid. The warm rim also reads at compact card scale.
      strokeText(ctx, model, rgba(second, 0.68), Math.max(0.7, metrics.fontSize * 0.026));
      const highlight = createLinearGradient(ctx, ['rgba(255,180,210,0)', 'rgba(255,180,210,.52)', 'rgba(255,180,210,0)'], 0, 0, metrics.width * 0.35, 0, 'rgba(255,180,210,.3)');
      withTextMask(ctx, model, target => {
        target.fillStyle = highlight;
        const left = (progress * 1.5 - 0.25) * model.width;
        target.fillRect?.(left, 0, Math.max(1, model.width * 0.24), model.height);
      });
      return;
    }
    case 'engraved-stone':
      ctx.save?.();
      ctx.shadowColor = rgba(third, 0.2);
      ctx.shadowOffsetY = -1;
      drawText(ctx, model, first);
      ctx.restore?.();
      strokeText(ctx, model, rgba(third, 0.55), Math.max(0.55, metrics.fontSize * 0.022), 1, -1, -1);
      ctx.save?.();
      ctx.shadowColor = 'rgba(0,0,0,.82)';
      ctx.shadowOffsetY = 2;
      strokeText(ctx, model, second, Math.max(0.7, metrics.fontSize * 0.03));
      ctx.restore?.();
      return;
    case 'crt-phosphor':
      ctx.save?.();
      ctx.shadowColor = rgba(second, 0.8);
      ctx.shadowBlur = metrics.fontSize * 0.3;
      drawText(ctx, model, first);
      ctx.restore?.();
      withTextMask(ctx, model, target => {
        target.fillStyle = 'rgba(0,0,0,.3)';
        for (let y = 0; y < model.height; y += 3) target.fillRect?.(0, y, model.width, 1);
      });
      return;
    case 'blueprint-ink':
      drawText(ctx, model, first);
      strokeText(ctx, model, second, Math.max(0.5, metrics.fontSize * 0.024));
      withTextMask(ctx, model, target => {
        target.globalAlpha = 0.45;
        target.strokeStyle = material.colors[2] || '#6EB1E3';
        target.lineWidth = 0.7;
        target.beginPath?.();
        target.moveTo?.(metrics.x - metrics.width / 2, metrics.y + 4);
        target.lineTo?.(metrics.x + metrics.width / 2, metrics.y + 4);
        target.stroke?.();
      });
      return;
    default:
      drawText(ctx, model, mixColors('#F7FBFF', todayColor, 0.1));
  }
}
