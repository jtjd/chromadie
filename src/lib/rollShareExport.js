import { normalizeHexColor } from './utils.js';

const RARITY_COLORS = Object.freeze({
  Anomaly: '#ff6bd6',
  Legendary: '#ff9a66',
  Mythic: '#ff6bd6',
  Epic: '#a15cff',
  Rare: '#3b82f6',
  Uncommon: '#10b981',
  Common: '#ffffff',
  Trash: '#767b8c'
});

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function rgba(hex, alpha) {
  const normalized = normalizeHexColor(hex).slice(1);
  const channels = [0, 2, 4].map(offset => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  return `rgba(${channels.join(', ')}, ${alpha})`;
}

export async function buildRollShareCardCanvas({
  score = 0,
  rarity = 'Common',
  color = '#222222',
  origin = '',
  documentRef = typeof document === 'undefined' ? null : document
} = {}) {
  if (!documentRef) return null;

  if (documentRef.fonts?.ready) {
    try {
      await documentRef.fonts.ready;
    } catch {
      // Font loading failure should not block image generation.
    }
  }

  const exportCanvas = documentRef.createElement('canvas');
  exportCanvas.width = 1200;
  exportCanvas.height = 630;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return null;

  const W = exportCanvas.width;
  const H = exportCanvas.height;
  const scoreText = Number(score || 0).toLocaleString();
  const cardColor = normalizeHexColor(color || '#222222');
  const rarityColor = RARITY_COLORS[rarity] || '#ffffff';

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0e0e10';
  ctx.fillRect(0, 0, W, H);

  const atmosphere = ctx.createRadialGradient(950, 86, 10, 950, 86, 520);
  atmosphere.addColorStop(0, rgba(cardColor, .18));
  atmosphere.addColorStop(1, rgba(cardColor, 0));
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = cardColor;
  ctx.fillRect(0, 0, W, 8);

  const cardX = 48;
  const cardY = 48;
  const cardW = 1104;
  const cardH = 534;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = '#161619';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, .1)';
  ctx.stroke();

  ctx.fillStyle = cardColor;
  drawRoundedRect(ctx, 88, 96, 44, 5, 2.5);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f5f5f6';
  ctx.font = '700 40px Inter, sans-serif';
  ctx.fillText('ChromaDie', 88, 150);
  ctx.fillStyle = '#8d8c92';
  ctx.font = '600 18px Inter, sans-serif';
  ctx.fillText('Daily roll', 88, 180);

  drawRoundedRect(ctx, 88, 230, 222, 222, 22);
  ctx.fillStyle = cardColor;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, .22)';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f5f6';
  ctx.font = '700 28px Inter, sans-serif';
  ctx.fillText(cardColor, 199, 492);
  ctx.fillStyle = '#8d8c92';
  ctx.font = '600 15px Inter, sans-serif';
  ctx.fillText('RESULT COLOR', 199, 522);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#8d8c92';
  ctx.font = '700 16px Inter, sans-serif';
  ctx.fillText('TODAY\'S SCORE', 408, 252);
  ctx.fillStyle = '#f5f5f6';
  ctx.font = '700 94px Inter, sans-serif';
  ctx.fillText(scoreText, 408, 350);
  ctx.fillStyle = '#8d8c92';
  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillText('score', 410, 386);

  drawRoundedRect(ctx, 408, 422, 190, 38, 19);
  ctx.fillStyle = rgba(rarityColor, .15);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(rarityColor, .65);
  ctx.stroke();
  ctx.fillStyle = rarityColor;
  ctx.font = '700 17px Inter, sans-serif';
  ctx.fillText((rarity || 'Common').toUpperCase(), 428, 447);

  ctx.fillStyle = '#8d8c92';
  ctx.font = '500 19px Inter, sans-serif';
  ctx.fillText('A new color for your profile.', 408, 505);
  ctx.fillStyle = cardColor;
  ctx.font = '600 16px Inter, sans-serif';
  ctx.fillText(String(origin || '').replace(/^https?:\/\//, ''), 408, 540);

  ctx.restore();
  return exportCanvas;
}
export function canvasToPngBlob(canvas) {
  if (!canvas?.toBlob) return Promise.resolve(null);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
