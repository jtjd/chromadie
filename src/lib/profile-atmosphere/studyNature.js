import { TAU, fract, seeds, gradient, glow, ellipse, stars } from './studyPrimitives.js';

export function jellyfish(c, w, h, t) {
  glow(c, w * .02, h * .1, Math.min(w, h) * .8, '#0968bd', .23);
  glow(c, w * .97, h * .75, Math.min(w, h) * .7, '#8235d9', .16);
  for (let i = 0; i < 7; i++) {
    const p = seeds[i], x = w * (i % 2 ? .84 + p.x * .1 : .03 + p.x * .13);
    const y = (1.25 - fract(p.y + t * (.005 + p.z * .004)) * 1.6) * h;
    const r = (25 + p.z * 40) * Math.min(1, w / 620);
    const pulse = Math.sin(t * 1.2 + p.phase), rx = r * (1 + .09 * pulse);
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * .19 + p.phase) * .13);
    glow(c, 0, 0, r * 2, i % 2 ? '#b557e5' : '#21a9e3', .18);
    // Filaments hang from the bell and trail with phase-lagged undulation.
    for (let j = 0; j < 12; j++) {
      c.beginPath();
      for (let k = 0; k <= 24; k++) {
        const u = k / 24, px = (j / 11 - .5) * rx * 1.5 + Math.sin(u * 7 - t * .85 + j * .6) * r * u * .3;
        const py = r * .1 + u * r * (2 + seeds[j].z);
        if (!k) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.strokeStyle = gradient(c, 0, 0, 0, r * 3, [[0, '#baefffb0'], [.4, i % 2 ? '#e384f87a' : '#52cfff88'], [1, '#788dff00']]);
      c.lineWidth = j % 3 ? .65 : 1.3; c.stroke();
    }
    c.fillStyle = gradient(c, 0, -r, 0, r * .3, [[0, '#d5fbffb0'], [.25, '#6cbce344'], [.8, '#344fd930'], [1, '#93e7ff90']]);
    c.beginPath(); c.moveTo(-rx, r * .2); c.bezierCurveTo(-rx, -r * 1.15, rx, -r * 1.15, rx, r * .2);
    c.bezierCurveTo(rx * .5, r * .43, -rx * .5, r * .43, -rx, r * .2); c.fill();
    c.strokeStyle = '#a3ecffb0'; c.lineWidth = 1; c.stroke();
    for (let j = -2; j <= 2; j++) {
      c.strokeStyle = '#caf9ff55'; c.beginPath(); c.moveTo(0, -r * .64);
      c.quadraticCurveTo(j * rx * .27, -r * .3, j * rx * .4, r * .22); c.stroke();
    }
    ellipse(c, 0, -r * .13, r * .18, r * .24, '#f3c8ff70'); c.restore();
  }
  for (let i = 0; i < 44; i++) {
    const p = seeds[i]; c.globalAlpha = .12 + p.z * .25;
    ellipse(c, p.x * w, fract(p.y - t * .009) * h, .6 + p.z, .6 + p.z, '#8be5ff');
  }
}

export function grove(c, w, h, t) {
  glow(c, w * .08, h * .8, Math.min(w, h) * .7, '#137d63', .18);
  glow(c, w * .88, h * .2, Math.min(w, h) * .6, '#91a92c', .1);
  // Opposing fern silhouettes with individual pinnae and fine illuminated veins.
  for (let side = 0; side < 2; side++) {
    for (let j = 0; j < 5; j++) {
      c.save(); c.translate(side ? w : 0, h * (j < 3 ? 1.06 : .08));
      c.scale(side ? -1 : 1, j < 3 ? 1 : -1);
      c.rotate(-.1 + j * .16 + Math.sin(t * .24 + j) * .02);
      const length = Math.min(h * .52, w * .58) * (.75 + j * .12);
      c.strokeStyle = '#47956b70'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(length * .28, -length * .6, length * .23, -length); c.stroke();
      for (let k = 1; k < 19; k++) {
        const u = k / 20, px = length * (.56 * u - .33 * u * u), py = -length * u;
        const leaf = length * .2 * Math.sin(u * Math.PI) * (1 - u * .5);
        for (const dir of [-1, 1]) {
          c.fillStyle = gradient(c, px, py, px + dir * leaf, py - leaf * .35, [[0, '#0b302a'], [.55, j % 2 ? '#267a57aa' : '#155848cc'], [1, '#70b87899']]);
          c.beginPath(); c.moveTo(px, py);
          c.bezierCurveTo(px + dir * leaf * .3, py - leaf * .5, px + dir * leaf * .8, py - leaf * .2, px + dir * leaf, py - leaf * .6);
          c.quadraticCurveTo(px + dir * leaf * .8, py + leaf * .16, px, py); c.fill();
          c.strokeStyle = '#7ab76a35'; c.lineWidth = .5; c.beginPath(); c.moveTo(px, py); c.lineTo(px + dir * leaf * .9, py - leaf * .45); c.stroke();
        }
      }
      c.restore();
    }
  }
  for (let i = 0; i < 40; i++) {
    const p = seeds[i], x = (p.x + Math.sin(t * .18 + p.phase) * .022) * w;
    const y = (p.y + Math.cos(t * .15 + p.phase) * .028) * h;
    const light = .15 + .75 * (.5 + .5 * Math.sin(t * .75 + p.phase)) ** 3;
    glow(c, x, y, 7 + p.z * 12, '#c6f251', light * .32);
    c.globalAlpha = light; ellipse(c, x, y, 1 + p.z, .7 + p.z, '#efffba');
  }
  c.globalAlpha = 1;
}

function moth(c, x, y, s, phase, t) {
  c.save(); c.translate(x, y); c.rotate(.25 * Math.sin(phase + t * .2));
  c.scale(s * (.8 + .2 * Math.cos(t * 1.8 + phase)), s);
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1);
    c.fillStyle = gradient(c, 0, 0, 1.3, -.8, [[0, '#4b526e'], [.3, '#aaa5bd'], [.7, '#d4ddce'], [1, '#f0ead4']]);
    c.beginPath(); c.moveTo(0, -.1); c.bezierCurveTo(.3, -.7, .8, -1, 1.4, -.85);
    c.bezierCurveTo(1.3, -.15, .85, .25, .38, .21);
    c.bezierCurveTo(1.1, .45, .65, .9, .5, 1.45);
    c.bezierCurveTo(.2, 1.1, .35, .6, 0, .35); c.closePath(); c.fill();
    c.strokeStyle = '#f7e4bf80'; c.lineWidth = .025; c.stroke();
    for (let j = 0; j < 4; j++) {
      c.strokeStyle = '#43475b55'; c.lineWidth = .015; c.beginPath(); c.moveTo(.08, 0); c.lineTo(1.25 - j * .2, -.75 + j * .23); c.stroke();
    }
    ellipse(c, .71, -.3, .14, .11, '#50516d', -.4);
    ellipse(c, .71, -.3, .07, .06, '#dabd83');
    c.strokeStyle = '#e0d8c2'; c.lineWidth = .025; c.beginPath(); c.moveTo(.02, -.25); c.quadraticCurveTo(.3, -.5, .22, -.6); c.stroke(); c.restore();
  }
  ellipse(c, 0, .08, .065, .36, '#e6dfd1'); c.restore();
}

export function moths(c, w, h, t) {
  glow(c, w * .5, 0, Math.min(w, h) * .7, '#8d92cc', .12);
  stars(c, w, h, t, '#e1d5b8', 45);
  const radius = Math.min(w * .023, 15), gap = radius * 3.4;
  for (let i = -3; i <= 3; i++) {
    const x = w * .5 + i * gap, y = h * .09 + Math.abs(i) * radius * .45;
    c.save(); c.translate(x, y); c.rotate(i < 0 ? Math.PI : 0);
    c.strokeStyle = '#c8bf9980'; c.lineWidth = .7; c.beginPath(); c.arc(0, 0, radius, 0, TAU); c.stroke();
    if (!i) { ellipse(c, 0, 0, radius * .82, radius * .82, '#dfd7c2'); glow(c, 0, 0, radius * 2.2, '#d8c79b', .2); }
    else {
      c.fillStyle = '#d3ccaf'; c.beginPath(); c.arc(0, 0, radius * .83, -Math.PI / 2, Math.PI / 2);
      c.ellipse(0, 0, radius * (.15 + Math.abs(i) * .18), radius * .83, 0, Math.PI / 2, -Math.PI / 2, true); c.fill();
    }
    c.restore();
  }
  for (let i = 0; i < 8; i++) {
    const p = seeds[i], x = w * (i % 2 ? .87 : .13) + Math.sin(t * .15 + p.phase) * w * .055;
    const y = h * (.25 + p.y * .66) + Math.cos(t * .19 + p.phase) * 14;
    moth(c, x, y, (13 + p.z * 18) * Math.min(1, w / 650), p.phase, t);
  }
  c.strokeStyle = '#d5c79930'; c.lineWidth = .65;
  for (const side of [.045, .955]) {
    c.beginPath(); c.moveTo(w * side, h * .2); c.lineTo(w * side, h * .82); c.stroke();
    for (const py of [.18, .84]) { c.save(); c.translate(w * side, h * py); c.rotate(Math.PI / 4); c.strokeRect(-3, -3, 6, 6); c.restore(); }
  }
}

function koi(c, x, y, s, angle, t, variant) {
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(s, s);
  // Tail and side fins move independently of the slowly turning body.
  const sway = Math.sin(t * 1.6 + variant) * .22;
  c.fillStyle = '#e3dace90'; c.beginPath(); c.moveTo(-.65, 0);
  c.quadraticCurveTo(-1.15, -.15 + sway, -1.4, -.5 + sway); c.quadraticCurveTo(-1.13, sway, -1.45, .5 + sway);
  c.quadraticCurveTo(-1.05, .2 + sway, -.65, 0); c.fill();
  for (const side of [-1, 1]) {
    c.beginPath(); c.moveTo(.25, side * .15); c.quadraticCurveTo(-.25, side * .8, -.4, side * .44); c.lineTo(-.2, 0); c.fill();
  }
  c.beginPath(); c.moveTo(.95, 0); c.bezierCurveTo(.65, -.48, -.2, -.38, -.85, 0); c.bezierCurveTo(-.2, .38, .65, .48, .95, 0);
  c.fillStyle = gradient(c, 0, -.4, 0, .4, [[0, '#899f9d'], [.4, '#fff4d9'], [.65, '#e6e8d8'], [1, '#658888']]); c.fill();
  c.save(); c.clip();
  for (let i = 0; i < 4; i++) ellipse(c, .55 - i * .35, Math.sin(i * 4 + variant) * .17, .19, .17, i === variant % 4 ? '#293944' : '#e65029', i);
  c.restore();
  ellipse(c, .69, -.16, .035, .04, '#18262b'); ellipse(c, .69, .16, .035, .04, '#18262b');
  c.strokeStyle = '#fff4d980'; c.lineWidth = .018; c.beginPath(); c.moveTo(-.5, 0); c.quadraticCurveTo(0, -.04, .48, 0); c.stroke(); c.restore();
}

export function pond(c, w, h, t) {
  glow(c, w * .1, h * .72, Math.min(w, h) * .8, '#118e91', .18);
  glow(c, w * .9, h * .2, Math.min(w, h) * .65, '#207e64', .15);
  for (let i = 0; i < 8; i++) {
    const p = seeds[i], x = w * (i % 2 ? .87 : .1), y = h * p.y;
    for (let j = 0; j < 3; j++) {
      const u = fract(t * .055 + j / 3 + p.z);
      c.strokeStyle = '#8fddd8'; c.globalAlpha = (1 - u) * .16; c.lineWidth = .8;
      c.beginPath(); c.ellipse(x, y, 8 + u * Math.min(w * .19, 110), 4 + u * 50, -.25, 0, TAU); c.stroke();
    }
  }
  c.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {
    const p = seeds[i], x = w * (i % 2 ? .94 - p.z * .08 : .03 + p.z * .08), y = h * (.07 + p.y * .86);
    const r = (17 + p.z * 20) * Math.min(1, w / 600);
    c.save(); c.translate(x, y); c.rotate(p.phase + Math.sin(t * .15 + p.phase) * .035);
    c.fillStyle = gradient(c, -r, -r, r, r, [[0, '#5fa878'], [.4, '#26715c'], [1, '#0c3d3d']]);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, .2, TAU - .15); c.closePath(); c.fill();
    c.strokeStyle = '#a3d89844'; c.lineWidth = .6;
    for (let j = 1; j < 10; j++) { const a = j * TAU / 10; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * .94, Math.sin(a) * r * .94); c.stroke(); }
    c.restore();
  }
  for (let i = 0; i < 5; i++) {
    const p = seeds[i], a = t * .075 + p.phase;
    const x = w * (i % 2 ? .83 : .16) + Math.cos(a) * w * .065;
    const y = h * (.25 + p.y * .58) + Math.sin(a) * h * .085;
    const angle = Math.atan2(Math.cos(a) * h * .085, -Math.sin(a) * w * .065);
    koi(c, x, y, (23 + p.z * 22) * Math.min(1, w / 600), angle, t, i);
  }
}
