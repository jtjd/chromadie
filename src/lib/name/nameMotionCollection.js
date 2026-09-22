// Canonical labels, timing and catalog copy for the authored collection.
const gesture = (label, durationMs, description, collection = 'Prism', rarity = 'Rare') =>
  Object.freeze({ label, durationMs, description, collection, rarity });
export const NAME_MOTION_COLLECTION = Object.freeze({
  'kinetic-echo': gesture("Ribbon Waltz", 7200, "Satin ribbon loops beneath the name.", 'Prism', 'Epic'),
  'neon-particle': gesture("Firebrand", 6800, "Amber flames release rising embers.", 'Signal', 'Anomaly'),
  'ion-sweep': gesture("Sword Flourish", 6600, "A sword sweeps a golden arc.", 'Signal', 'Epic'),
  'phase-fracture': gesture("Ink Impact", 7000, "A scarlet brush scatters wet ink.", 'Static Bloom', 'Epic'),
  'letterpress': gesture("Wax Seal", 7600, "A wax seal reveals a gold star.", 'Archive'),
  'cherry-blossom': gesture("Cherry Blossom", 8200, "A blossom releases tumbling petals."),
  'butterfly-kiss': gesture("Butterfly Kiss", 8400, "A butterfly lands and takes flight."),
  'bubble-bath': gesture("Bubble Bath", 7600, "Soap bubbles wobble and pop."),
  'kitten-paws': gesture("Kitten Paws", 7800, "Rosy paw prints tiptoe across letters."),
  'dandelion-wish': gesture("Dandelion Wish", 9000, "Dandelion seeds sail on a breeze.", 'Archive'),
  'rose-romance': gesture("Rose Romance", 9000, "A leafy stem blooms into a rose.", 'Prism', 'Epic'),
  'raven-feather': gesture("Raven Feather", 8400, "A raven feather drifts through the air.", 'Static Bloom', 'Epic'),
  'falling-ace': gesture("Falling Ace", 7600, "An ace tumbles in, flips, and flicks away.", 'Archive', 'Epic'),
  'crown-glint': gesture("Crown Glint", 8000, "A gold crown catches glints.", 'Signal', 'Epic'),
  'meteor-skip': gesture("Meteor Skip", 7000, "A comet skips with golden rings.", 'Signal', 'Epic'),
  'laurel-grow': gesture("Laurel Grow", 9200, "Laurels grow and turn gold.", 'Archive', 'Epic'),
  'paper-plane': gesture("Paper Plane", 8500, "A paper plane loops past the name.", 'Archive'),
  'tide-pool': gesture("Tide Pool", 8600, "A turquoise wave lifts the letters."),
  'firefly-dance': gesture("Firefly Dance", 9400, "Fireflies dance with warm pulses."),
  'confetti-parade': gesture("Confetti Parade", 8000, "Confetti tumbles as the letters bounce.")
});
export const NEW_NAME_MOTION_KEYS = Object.freeze(Object.keys(NAME_MOTION_COLLECTION).slice(5));
