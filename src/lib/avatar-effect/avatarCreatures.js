// Authored in a 100 × 100 illustration space; +x is the right wing,
// -y is the head. These same curves supply the SVG studies and canvas rig.
const butterfly = {
  wing: 'M 3 -9 C 13 -23 33 -43 44 -36 C 54 -29 45 -9 34 0 C 29 4 21 5 14 5 C 29 4 40 12 35 25 C 31 38 17 35 10 25 C 6 19 4 11 3 4 Z',
  folded: 'M 3 -9 C 7 -26 14 -48 25 -43 C 36 -38 29 -15 23 -4 C 20 1 15 5 10 7 C 22 8 28 17 23 29 C 19 40 11 35 7 25 C 4 19 3 11 3 4 Z',
  veins: 'M 5 -6 Q 23 -21 41 -31 M 6 -2 Q 22 -8 36 -10 M 6 8 Q 20 12 29 25',
  body: 'M 0 -16 C 4 -16 4 -9 3 -5 C 5 3 3 19 0 26 C -3 19 -5 3 -3 -5 C -4 -9 -4 -16 0 -16 Z',
  antenna: 'M -2 -13 Q -5 -26 -11 -25 M 2 -13 Q 5 -26 11 -25',
  fill: '#f6fbff', edge: '#b6cfed', detail: '#99b5d4', bodyFill: '#536883'
};
const bat = {
  wing: 'M 5 -8 C 14 -19 22 -24 30 -21 Q 39 -19 48 -30 C 44 -13 47 -4 49 3 Q 38 -5 32 12 Q 23 2 18 21 Q 12 10 5 15 Z',
  folded: 'M 5 -8 C 10 -20 16 -33 23 -31 Q 26 -30 30 -40 C 28 -20 35 -9 36 0 Q 26 -5 24 13 Q 16 5 14 22 Q 10 13 5 15 Z',
  veins: 'M 6 -6 Q 21 -17 30 -21 M 7 -5 Q 27 -11 32 12 M 7 -3 Q 17 0 18 21',
  body: 'M -7 -12 L -8 -25 L -2 -18 Q 0 -19 2 -18 L 8 -25 L 7 -12 C 11 -5 8 10 4 16 L 0 24 L -4 16 C -8 10 -11 -5 -7 -12 Z',
  antenna: '', fill: '#654378', edge: '#c3a4d5', detail: '#9770aa', bodyFill: '#24192e'
};
export const CREATURE_ART = Object.freeze({ 'butterfly-orbit': Object.freeze(butterfly), 'bat-orbit': Object.freeze(bat) });

// Closed is intentionally a narrow readable wing, never a zero-width flash.
export function getCreaturePose(effectKey, time, phase = 0) {
  const bat = effectKey === 'bat-orbit';
  const frequency = bat ? 3.3 : 2.15;
  const cycle = ((time * .001 * frequency + phase) % 1 + 1) % 1;
  // Brisk closing stroke, longer recovery. Smooth endpoints avoid a hinge snap.
  const stroke = cycle < .36 ? cycle / .36 : 1 - (cycle - .36) / .64;
  const fold = stroke * stroke * (3 - 2 * stroke);
  const lag = Math.sin(cycle * Math.PI * 2 - .55);
  return { fold, bat, spread: 1 - fold * (bat ? .54 : .76), lift: fold * (bat ? -13 : -19), flex: lag * (bat ? 5 : 3), bob: Math.sin(cycle * Math.PI * 2) * .6 };
}

// Tiny fixed vocabulary of code-owned vector commands; no user SVG or markup.
const pathTokens = new Map();
function trace(context, path, map, folded = path, fold = 0) {
  if (!pathTokens.has(path)) pathTokens.set(path, path.match(/[MCQLZ]|-?\d+(?:\.\d+)?/g) || []);
  const tokens = pathTokens.get(path);
  if (!pathTokens.has(folded)) pathTokens.set(folded, folded.match(/[MCQLZ]|-?\d+(?:\.\d+)?/g) || []);
  const closed = pathTokens.get(folded);
  const coordinate = i => Number(tokens[i]) + (Number(closed[i]) - Number(tokens[i])) * fold;
  let index = 0;
  context.beginPath();
  while (index < tokens.length) {
    const command = tokens[index++];
    const count = { M: 1, L: 1, Q: 2, C: 3, Z: 0 }[command];
    const points = [];
    for (let p = 0; p < count; p++) points.push(...map(coordinate(index++), coordinate(index++)));
    if (command === 'M') context.moveTo(...points);
    else if (command === 'L') context.lineTo(...points);
    else if (command === 'Q') context.quadraticCurveTo(...points);
    else if (command === 'C') context.bezierCurveTo(...points);
    else context.closePath();
  }
}

export function mapCreatureWing(x, y, side, pose) {
  const reach = Math.min(1, x / 49);
  // The authored paths handle closure; only distal points receive follow-through.
  const trailing = Math.max(0, Math.min(1, (y + 12) / 40));
  return [side * x, y + pose.flex * reach * reach * (pose.bat ? trailing : .5)];
}

export function drawAvatarCreature(context, effectKey, { x, y, width, rotation = 0, alpha = 1, pose = getCreaturePose(effectKey, 0), glow = true, bank = 0 }) {
  const art = CREATURE_ART[effectKey];
  if (!art) return;
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.scale(width / 100, width / 100);
  context.globalAlpha = alpha;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  for (const side of [-1, 1]) {
    const map = (px, py) => {
      const [wx, wy] = mapCreatureWing(px, py, side, pose);
      return [wx * (1 + side * bank * .18), wy + side * bank * px * .18];
    };
    trace(context, art.wing, map, art.folded, pose.fold);
    context.fillStyle = art.fill;
    context.shadowColor = effectKey === 'butterfly-orbit' ? 'rgba(220,237,255,.55)' : 'transparent';
    context.shadowBlur = glow && effectKey === 'butterfly-orbit' ? width * .065 : 0;
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = art.edge;
    context.lineWidth = 1.3;
    context.stroke();
    // Veins follow the wing envelope without crossing its folded outline.
    trace(context, art.veins, (px, py) => map(px * (1 - pose.fold * .42), py - pose.fold * Math.max(0, px - 5) * .12));
    context.strokeStyle = art.detail;
    context.lineWidth = 1.1;
    context.stroke();
  }
  trace(context, art.body, (px, py) => [px, py]);
  context.fillStyle = art.bodyFill;
  context.fill();
  if (effectKey === 'bat-orbit') {
    context.strokeStyle = art.edge;
    context.lineWidth = 1.1;
    context.stroke();
  }
  if (art.antenna) {
    trace(context, art.antenna, (px, py) => [px, py]);
    context.strokeStyle = art.bodyFill;
    context.lineWidth = 1.8;
    context.stroke();
  }
  context.restore();
}
