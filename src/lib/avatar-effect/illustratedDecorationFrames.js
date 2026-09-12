const frames = Object.freeze({
  // Normalized source coordinates for the circular portrait opening.
  'moonlit-clouds': Object.freeze({ x: .524, y: .438, radius: .345 }),
  'enchanted-garden': Object.freeze({ x: .538, y: .438, radius: .3125 }),
  'prismatic-fracture': Object.freeze({ x: .507, y: .493, radius: .338 }),
  'sakura-neko': Object.freeze({ x: .503, y: .480, radius: .340 }),
  'cloud-bunny': Object.freeze({ x: .517, y: .541, radius: .345 }),
  'crimson-ronin': Object.freeze({ x: .507, y: .500, radius: .338 }),
  'midnight-oni': Object.freeze({ x: .500, y: .510, radius: .333 }),
  // Koi is visually weighted low, so its source opening rides higher.
  'koi-current': Object.freeze({ x: .500, y: .530, radius: .352 })
});
const defaultFrame = Object.freeze({ x: .5, y: .5, radius: .35 });

export function getIllustratedDecorationFrame(key) {
  return frames[key] || defaultFrame;
}

export const ILLUSTRATED_DECORATION_FRAMES = frames;
