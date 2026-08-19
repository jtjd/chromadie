export const ROLL_REVEAL_STEPS = Object.freeze([
  Object.freeze({ id: 'spectrum', label: 'Read the spectrum', progress: 12 }),
  Object.freeze({ id: 'hue', label: 'Lock the hue', progress: 38 }),
  Object.freeze({ id: 'tone', label: 'Lock the tone', progress: 64 }),
  Object.freeze({ id: 'conditions', label: 'Count conditions', progress: 88 }),
  Object.freeze({ id: 'complete', label: 'Color locked', progress: 100 })
]);

const HEX_CHANNEL_PATTERN = /^#?([0-9a-f]{6})$/i;

export function getRevealHex(value, lockedChannels = 0) {
  const match = String(value || '').trim().match(HEX_CHANNEL_PATTERN);
  if (!match) return '#------';

  const channels = match[1].match(/../g) || [];
  const safeLockedChannels = Math.max(0, Math.min(channels.length, Number(lockedChannels) || 0));
  return `#${channels.map((channel, index) => index < safeLockedChannels ? channel.toUpperCase() : '--').join('')}`;
}

export function getRollRevealTiming({ dedicated = false, reducedMotion = false } = {}) {
  if (reducedMotion) {
    return Object.freeze({ warmup: 0, channel: 0, condition: 0, settle: 0 });
  }

  return dedicated
    ? Object.freeze({ warmup: 240, channel: 220, condition: 180, settle: 140 })
    : Object.freeze({ warmup: 360, channel: 300, condition: 240, settle: 180 });
}
