import { seededNoise, smoothstep } from './primitives.js';

const CIPHER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const SCRAMBLE_CYCLE_MS = 4800;

export function getScrambleCharacter(character, index, count, time, seed) {
  // Leave the full identity readable for most of the loop, including entry.
  const elapsed = ((Number(time) || 0) % SCRAMBLE_CYCLE_MS + SCRAMBLE_CYCLE_MS) % SCRAMBLE_CYCLE_MS;
  const local = elapsed - 2700;
  const start = count > 1 ? index / (count - 1) * 360 : 0;
  if (local < start || local >= start + 640 || !/^[\p{L}\p{N}]$/u.test(character)) return character;
  const tick = Math.floor((local - start) / 70);
  const position = Math.floor(seededNoise(seed, index * 997 + tick * 131) * CIPHER.length) % CIPHER.length;
  const candidate = CIPHER[position];
  return character === character.toLowerCase() ? candidate.toLowerCase() : candidate;
}

// Zero at both ends with a soft attack; no teleporting bright particles at wrap.
export function getParticleEnvelope(life) {
  return smoothstep(life / 0.18) * (1 - smoothstep((life - 0.35) / 0.65));
}
