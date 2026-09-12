// Warm living lights: independently phased abdomen pulses, translucent wings,
// and a compact white-hot core. No flashing or frame-random particle noise.
export function drawFirefly(context, { x, y, width, rotation, time, phase, still = false }) {
  const pulse = still ? .8 : .45 + .55 * ((Math.sin(time * .0014 + phase) + 1) / 2) ** 2;
  const unit = width / 100;
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  const halo = context.createRadialGradient(0, 2 * unit, 0, 0, 2 * unit, 27 * unit);
  halo.addColorStop(0, `rgba(230,255,100,${pulse * .55})`);
  halo.addColorStop(.3, `rgba(185,245,52,${pulse * .24})`);
  halo.addColorStop(1, 'rgba(160,220,30,0)');
  context.fillStyle = halo;
  context.beginPath(); context.arc(0, 2 * unit, 27 * unit, 0, Math.PI * 2); context.fill();
  context.strokeStyle = 'rgba(237,247,192,.5)';
  context.lineWidth = .7 * unit;
  for (const side of [-1, 1]) {
    context.beginPath(); context.ellipse(side * 4 * unit, -3 * unit, 3 * unit, 7 * unit, side * .45, 0, Math.PI * 2); context.stroke();
  }
  context.fillStyle = '#364222';
  context.beginPath(); context.ellipse(0, -4 * unit, 2 * unit, 5 * unit, 0, 0, Math.PI * 2); context.fill();
  context.shadowColor = '#d8ff53'; context.shadowBlur = 9 * unit * pulse;
  context.fillStyle = `rgba(235,255,126,${.65 + pulse * .35})`;
  context.beginPath(); context.ellipse(0, 3 * unit, 3 * unit, 4.5 * unit, 0, 0, Math.PI * 2); context.fill();
  context.shadowBlur = 0; context.fillStyle = '#fffedb';
  context.beginPath(); context.arc(0, 2 * unit, 1.4 * unit, 0, Math.PI * 2); context.fill();
  context.restore();
}
