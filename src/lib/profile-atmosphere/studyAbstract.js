import { TAU, gradient, glow, ellipse } from './studyPrimitives.js';

export function opal(c, w, h, t) {
  const s = Math.min(w, h);
  glow(c, 0, h * .45, s * .8, '#125fc4', .13);
  glow(c, w, h * .6, s * .7, '#c247ad', .12);
  for (let side = 0; side < 2; side++) {
    c.save(); c.translate(side ? w : 0, 0); c.scale(side ? -1 : 1, 1);
    // Closely spaced isochromes describe a folded pearlescent surface.
    for (let j = 0; j < 56; j++) {
      const depth = j / 55;
      c.beginPath();
      for (let k = 0; k <= 64; k++) {
        const u = k / 64, y = u * h;
        const phase = u * 7.5 + side * 2 + t * .12;
        const x = w * (.015 + depth * .19 + Math.sin(phase + depth * 2.5) * .075 * Math.sin(u * Math.PI));
        if (!k) c.moveTo(x, y); else c.lineTo(x, y);
      }
      const hue = (178 + depth * 235 + side * 50 + Math.sin(t * .12) * 16) % 360;
      c.strokeStyle = gradient(c, 0, 0, w * .22, h, [
        [0, `hsla(${hue},85%,65%,0)`], [.2, `hsla(${hue},85%,65%,.5)`],
        [.43, `hsla(${(hue + 55) % 360},80%,85%,.8)`], [.5, `hsla(${hue},80%,35%,.3)`],
        [.68, `hsla(${(hue + 130) % 360},90%,68%,.65)`], [1, `hsla(${hue},85%,65%,0)`]
      ]);
      c.lineWidth = Math.max(1, w * .0016); c.stroke();
    }
    c.restore();
  }
}

export function kinetic(c, w, h, t) {
  const s = Math.min(w / 900, h / 650, 1.2);
  glow(c, w * .03, h * .8, Math.min(w, h) * .5, '#2459e0', .1);
  // Suspended asymmetric mobiles. Flat print colors are intentional here.
  for (let side = 0; side < 2; side++) {
    c.save(); c.translate(w * (side ? .87 : .13), h * (side ? .1 : .02)); c.scale(s, s);
    c.rotate(Math.sin(t * .24 + side * 2) * .035);
    c.strokeStyle = '#a4b5d866'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -100); c.lineTo(0, 120); c.moveTo(-72, 120); c.lineTo(72, 120); c.stroke();
    for (const arm of [-1, 1]) {
      c.save(); c.translate(arm * 72, 120); c.rotate(Math.sin(t * .31 + arm + side) * .09);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, arm < 0 ? 115 : 210); c.stroke();
      if (arm < 0) {
        ellipse(c, 0, 142, 34, 34, side ? '#fabe32' : '#ff713b');
        c.fillStyle = side ? '#2d66ed' : '#c5df44'; c.fillRect(-31, 188, 62, 10);
      } else {
        c.fillStyle = side ? '#ff713b' : '#326beb'; c.beginPath(); c.arc(0, 248, 47, Math.PI, TAU); c.closePath(); c.fill();
        c.strokeStyle = '#c6e343'; c.lineWidth = 9; c.beginPath(); c.arc(0, 266, 25, 0, Math.PI); c.stroke();
      }
      c.restore();
    }
    c.restore();
  }
  for (let side = 0; side < 2; side++) {
    c.save(); c.translate(w * (side ? .9 : .1), h * .86); c.scale(s, s); c.rotate(Math.sin(t * .16 + side) * .06);
    for (let j = 0; j < 8; j++) {
      c.strokeStyle = side ? '#ff713b' : '#326beb'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, 25 + j * 9, -.3, Math.PI * 1.35); c.stroke();
    }
    ellipse(c, side ? -30 : 30, -35, 17, 17, '#c6e343'); c.restore();
  }
}
