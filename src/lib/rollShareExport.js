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

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0d';
  ctx.fillRect(0, 0, W, H);

  const backdrop = ctx.createLinearGradient(0, 0, W, H);
  backdrop.addColorStop(0, 'rgba(139, 124, 246, 0.18)');
  backdrop.addColorStop(0.55, 'rgba(10, 10, 13, 0.15)');
  backdrop.addColorStop(1, 'rgba(46, 211, 201, 0.10)');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, W, H);

  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, '#ff4d4d');
  accent.addColorStop(0.2, '#ffab2e');
  accent.addColorStop(0.4, '#ffe14d');
  accent.addColorStop(0.6, '#6ee787');
  accent.addColorStop(0.8, '#4d7dff');
  accent.addColorStop(1, '#a15cff');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 10);

  const cardX = 56;
  const cardY = 56;
  const cardW = 1088;
  const cardH = 518;
  const radius = 34;

  ctx.beginPath();
  ctx.moveTo(cardX + radius, cardY);
  ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, radius);
  ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, radius);
  ctx.arcTo(cardX, cardY + cardH, cardX, cardY, radius);
  ctx.arcTo(cardX, cardY, cardX + cardW, cardY, radius);
  ctx.closePath();
  ctx.fillStyle = 'rgba(15, 16, 22, 0.92)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px "Cabinet Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('ChromaDie', 96, 132);

  ctx.fillStyle = '#767b8c';
  ctx.font = '600 20px Inter, sans-serif';
  ctx.fillText('Daily Roll', 96, 164);

  const orbGlow = ctx.createRadialGradient(262, 326, 18, 262, 326, 150);
  orbGlow.addColorStop(0, cardColor);
  orbGlow.addColorStop(0.58, `${cardColor}CC`);
  orbGlow.addColorStop(0.82, `${cardColor}66`);
  orbGlow.addColorStop(1, `${cardColor}00`);
  ctx.fillStyle = orbGlow;
  ctx.beginPath();
  ctx.arc(262, 326, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = cardColor;
  ctx.beginPath();
  ctx.arc(262, 326, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '700 28px Inter, sans-serif';
  ctx.fillText(cardColor.toUpperCase(), 262, 482);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 92px "Cabinet Grotesk", sans-serif';
  ctx.fillText(scoreText, 460, 320);
  ctx.fillStyle = '#767b8c';
  ctx.font = '500 24px Inter, sans-serif';
  ctx.fillText('Entropy Points', 460, 368);
  ctx.fillStyle = RARITY_COLORS[rarity] || '#ffffff';
  ctx.font = '700 30px "Cabinet Grotesk", sans-serif';
  ctx.fillText((rarity || 'Common').toUpperCase(), 460, 420);
  ctx.fillStyle = '#767b8c';
  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillText('Can you beat my color?', 460, 476);
  ctx.fillStyle = '#8b7cf6';
  ctx.font = '600 18px Inter, sans-serif';
  ctx.fillText(String(origin || '').replace(/^https?:\/\//, ''), 460, 514);

  ctx.restore();
  return exportCanvas;
}
export function canvasToPngBlob(canvas) {
  if (!canvas?.toBlob) return Promise.resolve(null);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
