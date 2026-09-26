import { aurora, orbit, lanterns, retro } from './studySkies.js';
import { jellyfish, grove, moths, pond } from './studyNature.js';
import { opal, kinetic } from './studyAbstract.js';

export const STUDY_PAINTERS = Object.freeze({
  'aurora-veil': aurora, 'abyssal-bloom': jellyfish, 'astral-orbit': orbit,
  'lantern-festival': lanterns, 'firefly-grove': grove, 'opal-tide': opal,
  'retro-horizon': retro, 'lunar-moths': moths, 'koi-reverie': pond, 'kinetic-studio': kinetic
});

export function drawAtmosphereStudy(c, key, w, h, time = 0) {
  c.clearRect(0, 0, w, h);
  if (!Object.hasOwn(STUDY_PAINTERS, key) || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
  c.save();
  STUDY_PAINTERS[key](c, w, h, Number.isFinite(time) ? time : 0);
  c.restore();
}
