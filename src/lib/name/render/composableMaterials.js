import {
  createLinearGradient,
  drawText,
  mixColors,
  rgba,
  strokeText,
  withTextMask
} from './primitives.js';

function linearMaterial(ctx, model, colors, offset = 0, vertical = false) {
  const width = Math.max(model.width, model.metrics.width + 24);
  const progressOffset = (model.progress - 0.5) * width * 1.35 + offset;
  const gradient = vertical
    ? createLinearGradient(ctx, colors, 0, -model.height, 0, model.height, colors[0])
    : createLinearGradient(ctx, colors, -width + progressOffset, 0, width + progressOffset, 0, colors[0]);
  drawText(ctx, model, gradient);
}

export function drawComposableMaterial(ctx, model) {
  const { material, metrics, progress, todayColor } = model;
  const [first = '#F7FBFF', second = '#CDD2FF', third = '#FFFFFF'] = material.colors;
  const textWidth = Math.max(model.width, metrics.width + 24);

  switch (material.key) {
    case 'plain':
      drawText(ctx, model, mixColors(first, todayColor, 0.12));
      return;
    case 'polished-chrome':
      linearMaterial(ctx, model, material.colors, progress * textWidth * 0.45);
      return;
    case 'copper-press':
      ctx.save?.();
      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowOffsetY = 2;
      linearMaterial(ctx, model, material.colors, 0, true);
      ctx.restore?.();
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
    case 'fine-outline':
      strokeText(ctx, model, first, Math.max(0.7, metrics.fontSize * 0.045));
      return;
    case 'ink-bleed':
      ctx.save?.();
      ctx.shadowColor = rgba(second, 0.36);
      ctx.shadowBlur = 1.5;
      drawText(ctx, model, first);
      drawText(ctx, model, rgba(second, 0.35), 0.3, 0.9, 0.5);
      ctx.restore?.();
      return;
    case 'pearl-foil':
      linearMaterial(ctx, model, material.colors, progress * textWidth * 0.35, true);
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
    case 'frosted-edge':
      ctx.save?.();
      ctx.shadowColor = rgba(third, 0.35);
      ctx.shadowBlur = metrics.fontSize * 0.34;
      drawText(ctx, model, first);
      ctx.restore?.();
      strokeText(ctx, model, rgba(second, 0.72), Math.max(0.5, metrics.fontSize * 0.022));
      return;
    case 'holographic-film':
      linearMaterial(ctx, model, material.colors, progress * textWidth);
      return;
    case 'cut-paper':
      drawText(ctx, model, rgba(first, 0.8), 1, 3, 3);
      drawText(ctx, model, second);
      return;
    case 'neon-tube':
      ctx.save?.();
      ctx.shadowColor = rgba(todayColor, 0.78);
      ctx.shadowBlur = metrics.fontSize * 0.58;
      strokeText(ctx, model, first, Math.max(1, metrics.fontSize * 0.045));
      ctx.restore?.();
      strokeText(ctx, model, '#FFFFFF', Math.max(0.6, metrics.fontSize * 0.025));
      return;
    case 'liquid-mercury': {
      const shift = Math.sin(progress * Math.PI * 2) * textWidth * 0.18;
      linearMaterial(ctx, model, material.colors, shift + textWidth * 0.16);
      withTextMask(ctx, model, target => {
        target.fillStyle = rgba(todayColor, 0.12);
        target.fillRect?.(0, 0, model.width, model.height);
      });
      return;
    }
    case 'oil-slick':
      linearMaterial(ctx, model, material.colors, progress * textWidth * 1.2);
      // The static catalog frame can land on the deepest part of the slick;
      // keep a restrained amber edge so the Epic treatment never vanishes.
      strokeText(ctx, model, rgba(material.colors[3] || '#D9AD64', 0.5), Math.max(0.55, metrics.fontSize * 0.02));
      return;
    case 'thermal-ink': {
      const thermal = [first, second, third, material.colors[3] || '#F3D34A', todayColor];
      linearMaterial(ctx, model, thermal, progress * textWidth * 0.8);
      return;
    }
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
    case 'embroidered-thread':
      drawText(ctx, model, first);
      strokeText(ctx, model, second, Math.max(0.6, metrics.fontSize * 0.03), 0.8);
      withTextMask(ctx, model, target => {
        target.strokeStyle = rgba(third, 0.42);
        target.lineWidth = Math.max(0.5, metrics.fontSize * 0.025);
        for (let line = 0; line < 12; line += 1) {
          const y = metrics.y - metrics.fontSize * 0.8 + line * metrics.fontSize * 0.075;
          target.beginPath?.();
          target.moveTo?.(metrics.x - metrics.width / 2, y);
          target.lineTo?.(metrics.x + metrics.width / 2, y + 2);
          target.stroke?.();
        }
      });
      return;
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
    case 'gold-leaf':
      linearMaterial(ctx, model, material.colors, 0, true);
      withTextMask(ctx, model, target => {
        target.fillStyle = 'rgba(28,15,2,.45)';
        for (let index = 0; index < 18; index += 1) {
          const x = metrics.x - metrics.width / 2 + ((index * 37) % 100) / 100 * metrics.width;
          const y = metrics.y - metrics.fontSize * 0.82 + ((index * 19) % 90) / 90 * metrics.fontSize * 0.9;
          target.fillRect?.(x, y, 1 + (index % 3), 1);
        }
      });
      return;
    case 'chroma-glass': {
      const daily = mixColors(todayColor, second, 0.34);
      const glass = createLinearGradient(ctx, [daily, ...material.colors.slice(1)], -textWidth, 0, textWidth, 0, daily);
      drawText(ctx, model, glass);
      ctx.save?.();
      ctx.shadowColor = rgba(todayColor, 0.68);
      ctx.shadowBlur = metrics.fontSize * 0.34;
      strokeText(ctx, model, rgba('#FFE0EE', 0.82), Math.max(0.7, metrics.fontSize * 0.035));
      ctx.restore?.();
      return;
    }
    case 'ceramic-glaze':
      ctx.save?.();
      ctx.shadowColor = 'rgba(255,220,195,.38)';
      ctx.shadowBlur = metrics.fontSize * 0.2;
      linearMaterial(ctx, model, material.colors, 0, true);
      ctx.restore?.();
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
