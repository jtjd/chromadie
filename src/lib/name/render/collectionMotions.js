import { getPaintedTextSurface, getNameGlyphLayout, drawSurfaceGlyph } from './textSurface.js';
import { createLinearGradient, mixColors, seededNoise as hashNoise } from './primitives.js';
import { getParticleEnvelope } from './motionTiming.js';

const TAU = Math.PI * 2;
// Spread adjacent particle indices before hashing to avoid correlated clusters.
const seededNoise = (seed, index) => hashNoise(seed, index * 7919 + 104729);
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
const envelope = (p, start = 0.06, end = 0.88) => smooth((p - start) / 0.12) * (1 - smooth((p - (end - 0.2)) / 0.2));
function stroke(c, color, width, points) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath();
  points(c); c.stroke();
}
function dot(c, x, y, r, color) {
  if (r <= 0) return;
  c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function oval(c, x, y, rx, ry, angle, color) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), angle, 0, TAU); c.fill();
}
function polygon(c, points, color) {
  c.fillStyle = color; c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fill();
}
function glint(c, x, y, r, color = '#FFF5CF') {
  polygon(c, [[x-r,y],[x-r*.2,y-r*.2],[x,y-r],[x+r*.2,y-r*.2],[x+r,y],[x+r*.2,y+r*.2],[x,y+r],[x-r*.2,y+r*.2]], color);
}
function leaf(c, x, y, size, angle, color) {
  c.save(); c.translate(x,y); c.rotate(angle); c.fillStyle=color;
  c.beginPath(); c.moveTo(0,0); c.bezierCurveTo(size*.2,-size*.7,size*.9,-size*.6,size,0);
  c.bezierCurveTo(size*.6,size*.45,size*.2,size*.3,0,0); c.fill(); c.restore();
}

// Local artwork coordinates are in font-relative units. The bounded stage is
// independent of name length, so single-character identities get full gestures.
function ribbon(c, p, w) {
  const q=smooth((p-.08)/.65), a=envelope(p); c.globalAlpha=a;
  const count=64, head=q*count;
  for(let i=1;i<=head;i++) {
    const t=i/count, prev=(i-1)/count;
    const point=u=>[-w*.52+w*1.04*u, 17+Math.sin(u*TAU*1.5-p*3)*5];
    const [x,y]=point(t), [xx,yy]=point(prev);
    stroke(c, Math.cos(t*TAU*1.5-p*3)>0?'#FF548B':'#A31952', 3.5, c=>{c.moveTo(xx,yy);c.lineTo(x,y);});
    stroke(c,'#FFC1CE',.65,c=>{c.moveTo(xx,yy-1);c.lineTo(x,y-1);});
  }
  if(q>0 && q<1) { const x=-w*.52+w*1.04*q,y=17+Math.sin(q*TAU*1.5-p*3)*5;
    polygon(c,[[x,y-2],[x+7,y-5],[x+5,y],[x+7,y+3],[x,y+2]],'#FF7DA7'); }
}
function fire(c,p,w,seed) {
  c.globalAlpha=envelope(p,.03,.94);
  for(let i=0;i<9;i++) {
    const x=(i/8-.5)*w*.9, flicker=.5+.5*Math.sin(p*TAU*4+i*2.1), h=4+flicker*9;
    c.fillStyle=createLinearGradient(c,['#FFCE46','#F75B1B','#CE232A'],0,12-h,0,20,'#FF8527');
    c.beginPath();c.moveTo(x-3,18);c.bezierCurveTo(x-6,13,x+3,13-h,x+1,12-h);
    c.bezierCurveTo(x+1,16-h,x+7,14,x+3,18);c.closePath();c.fill();
    oval(c,x,17,1.3,2+flicker*2,0,'#FFF2A0');
    const life=(p*1.8+seededNoise(seed,i+9))%1;
    c.save();c.globalAlpha*=getParticleEnvelope(life);dot(c,x+Math.sin(life*5+i)*4,12-life*36,.7,'#FFD05A');c.restore();
  }
}
function sword(c,p,w) {
  const q=clamp((p-.12)/.37), fade=envelope(p,.1,.76);c.globalAlpha=fade;
  const reach=Math.min(w*.53,82);
  // A sweeping blade arc, not a light bar across the letter material.
  stroke(c,'#9C7137',1,c=>{c.ellipse(0,6,reach,15,-.08,Math.PI*.12,Math.PI*(.12+q*.8));});
  stroke(c,'#E8EDF5',2.1,c=>{c.ellipse(0,6,reach,14,-.08,Math.PI*.12,Math.PI*(.12+q*.8));});
  if(q>0 && q<1) {
    const angle=Math.PI*(.12+q*.8),x=Math.cos(angle)*reach,y=6+Math.sin(angle)*14;
    c.save();c.translate(x,y);c.rotate(angle+Math.PI*.5);
    polygon(c,[[0,-14],[-1.8,4],[0,7],[1.8,4]],'#F3F5FF');polygon(c,[[0,-14],[0,7],[1.8,4]],'#8A9EBB');
    stroke(c,'#FFD063',1.7,c=>{c.moveTo(-4,5);c.lineTo(4,5);});stroke(c,'#80624A',2,c=>{c.moveTo(0,6);c.lineTo(0,11);});c.restore();
  }
  const hit=clamp((p-.47)/.19);if(hit>0&&hit<1) {
    c.globalAlpha*=1-hit;for(let i=0;i<5;i++){const a=i*TAU/5;stroke(c,'#FFCE68',1,c=>{c.moveTo(-reach+Math.cos(a)*hit*4,10+Math.sin(a)*hit*4);c.lineTo(-reach+Math.cos(a)*(4+hit*9),10+Math.sin(a)*(4+hit*9));});}
  }
}
function ink(c,p,w,seed) {
  const q=smooth((p-.12)/.16);c.globalAlpha=envelope(p,.1,.9);
  for(let i=0;i<7;i++) {
    const y=14+i*.8, edge=seededNoise(seed,i+72)*6;
    stroke(c,i%2?'#FF3D49':'#A80C2F',1.6,c=>{c.moveTo(-w*.49,y);c.bezierCurveTo(-w*.18,y-2,w*.12,y+4,-w*.49+(w-edge)*q,y-1);});
  }
  for(let i=0;i<12;i++){const life=clamp((p-.24)/.27),a=seededNoise(seed,i)*TAU,d=life*(4+seededNoise(seed,i+20)*13);
    c.save();c.globalAlpha*=1-life;oval(c,w*.42+Math.cos(a)*d,14+Math.sin(a)*d,1.5-i*.07,.6,a,'#FF4654');c.restore();}
}
function seal(c,p,w) {
  const q=smooth((p-.08)/.2);c.globalAlpha=envelope(p);c.save();c.translate(w*.42,9);c.scale(.55+q*.45,.55+q*.45);
  const points=Array.from({length:32},(_,i)=>{const a=i*TAU/32,r=i%2?9:10;return[Math.cos(a)*r,Math.sin(a)*r];});
  polygon(c,points,createLinearGradient(c,['#FF6358','#C31D3B','#79172F'],0,-10,0,10,'#DE2948'));
  stroke(c,'#FF9A71',.8,c=>c.arc(0,0,6.8,0,TAU));
  c.globalAlpha*=smooth((p-.25)/.12);glint(c,0,0,4.5,'#FFD77F');c.restore();
}
function blossom(c,p,w) {
  c.globalAlpha=envelope(p,.03,.94);const bloom=smooth((p-.04)/.24),drift=smooth((p-.46)/.4);
  for(let i=0;i<5;i++) {
    const a=i*TAU/5-Math.PI*.5;
    c.save();c.translate(-w*.43+Math.cos(a)*5*bloom+drift*(18+i*5),-14+Math.sin(a)*5*bloom+drift*(12+Math.sin(i)*6));c.rotate(a+drift*(i-2));
    c.scale(bloom*1.25,bloom*1.25);c.fillStyle=i%2?'#FF8DC3':'#FF4F9E';c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-2,-5,3,-9,6,-5);c.lineTo(5,-3);c.lineTo(7,-3);c.bezierCurveTo(8,2,3,5,0,0);c.fill();
    stroke(c,'#FFD0E7',.65,c=>{c.moveTo(1,0);c.lineTo(5,-3);});c.restore();
  }
  c.globalAlpha*=1-drift;dot(c,-w*.43,-14,2.1,'#FFE379');
}
function butterfly(c,p,w) {
  const enter=smooth(p/.28),leave=smooth((p-.58)/.3),x=-w*.55+enter*w*.24+leave*w*.65,y=-17-Math.sin(p*TAU)*5;
  c.globalAlpha=envelope(p,.01,.95);c.save();c.translate(x,y);c.rotate(-.25+leave*.6);c.scale(1.3,1.3);
  const flap=.22+.78*Math.abs(Math.sin(p*TAU*(p>.28&&p<.58?2:7)));
  for(const side of [-1,1]) {
    c.save();c.scale(side*flap,1);
    oval(c,4,-3,5.5,6,-.5,'#AB66FF');oval(c,3,3,4.2,4.2,.5,'#F875D9');
    oval(c,5,-4,2.4,3,-.5,'#E0BCFF');dot(c,5,4,1.3,'#FFD893');c.restore();
  }
  stroke(c,'#EDD4FF',1.2,c=>{c.moveTo(0,-5);c.lineTo(0,6);});
  stroke(c,'#EDD4FF',.6,c=>{c.moveTo(0,-4);c.quadraticCurveTo(-1,-9,-3,-8);c.moveTo(0,-4);c.quadraticCurveTo(1,-9,3,-8);});c.restore();
}
function bubbles(c,p,w) {
  for(let i=0;i<5;i++) {
    const life=(p-.035-i*.095)/.42;if(life<=0||life>=1)continue;
    const x=(i/4-.5)*w*.85+Math.sin(life*5+i)*3,y=15-life*38,r=(6+i%3)*(.8+life*.2);
    c.globalAlpha=Math.sin(life*Math.PI)**.5;
    if(life<.79) {
      stroke(c,['#89E9FF','#F9A5E9','#B8A3FF'][i%3],.8,c=>c.arc(x,y,r,0,TAU));
      stroke(c,'#FFFFFF',1.1,c=>c.arc(x,y,r*.7,Math.PI*1.1,Math.PI*1.55));
      stroke(c,'#FFC775',.7,c=>c.arc(x,y,r*.92,.2,1.25));
    } else { const pop=(life-.79)/.21;for(let j=0;j<5;j++)dot(c,x+Math.cos(j*TAU/5)*r*(1+pop),y+Math.sin(j*TAU/5)*r*(1+pop),.65*(1-pop),'#C9F0FF'); }
  }
}
function paws(c,p,w) {
  for(let i=0;i<7;i++) {
    const life=(p-.06-i*.07)/.35;if(life<=0||life>=1)continue;
    c.globalAlpha=getParticleEnvelope(life);c.save();c.translate((i/6-.5)*w*.86,-16+(i%2)*7);c.rotate(i%2?.35:-.2);c.scale(1.35,1.35);
    oval(c,0,1,2.7,2.1,0,'#FF7BAE');for(let j=0;j<4;j++)oval(c,(j-1.5)*1.7,-2.4-Math.sin(j*Math.PI/3)*1.2,.85,1.2,(j-1.5)*.2,'#FFC0DB');c.restore();
  }
}
function dandelion(c,p,w) {
  c.globalAlpha=envelope(p,.02,.96);const x=-w*.43,y=1;
  stroke(c,'#A9C782',.8,c=>{c.moveTo(x-3,23);c.quadraticCurveTo(x+2,12,x,y);});
  for(let i=0;i<9;i++) {
    const a=i*TAU/9,fly=smooth((p-.23-i*.023)/.45),sx=x+Math.cos(a)*6+fly*(w*.65+i*2),sy=y+Math.sin(a)*6-fly*(13+Math.sin(i)*9);
    c.save();c.globalAlpha*=1-fly*.7;c.translate(sx,sy);c.rotate(a*.2+fly*.8);
    stroke(c,'#EEE9CC',.6,c=>{c.moveTo(0,4);c.lineTo(0,-1);for(let j=0;j<5;j++){c.moveTo(0,-1);c.lineTo((j-2)*1.4,-4+Math.abs(j-2)*.7);}});dot(c,0,4,.7,'#B29150');c.restore();
  }
}
function rose(c,p,w) {
  const q=smooth((p-.04)/.4);c.globalAlpha=envelope(p,.02,.96);
  stroke(c,'#56BA75',1.2,c=>{c.moveTo(-w*.42,21);c.bezierCurveTo(-w*.15,12,w*.2,24,-w*.42+w*.83*q,16);});
  for(let i=0;i<4;i++){const grow=smooth((p-.12-i*.055)/.15);leaf(c,(i/4-.4)*w,18,7*grow,i%2?-1:-2.3,'#3CBF81');}
  const bloom=smooth((p-.36)/.22);c.save();c.translate(w*.4,13);c.scale(bloom*1.4,bloom*1.4);
  for(let i=0;i<7;i++){const a=i*2.4,r=5-i*.5;oval(c,Math.cos(a)*r*.6,Math.sin(a)*r*.6,r,3.7,a,i%2?'#F32F66':'#A9093F');}
  stroke(c,'#FF94A6',.75,c=>{c.arc(0,0,2.4,.2,4.8);c.arc(.6,0,4,3.4,5.5);});c.restore();
}
function feather(c,p,w) {
  c.globalAlpha=envelope(p);c.save();c.translate(w*.3+Math.sin(p*TAU)*8,-19+p*36);c.rotate(-.75+Math.sin(p*TAU)*.42);
  oval(c,0,0,5,12,-.03,'#263A54');
  for(let i=0;i<14;i++) {
    const t=i/13,y=-12+t*25,r=Math.sin(t*Math.PI)*6;
    stroke(c,i%3?'#7993AF':'#C5D4E4',.8,c=>{c.moveTo(0,y+3);c.quadraticCurveTo(-r*.7,y+1,-r,y-2);c.moveTo(0,y+3);c.quadraticCurveTo(r*.7,y,r*.8,y-3);});
  }
  stroke(c,'#D0D6E2',.9,c=>{c.moveTo(0,-13);c.quadraticCurveTo(-1,2,1,18);});c.restore();
}
function ace(c,p,w) {
  const arrive=smooth((p-.03)/.3),depart=smooth((p-.64)/.23);c.globalAlpha=envelope(p,.02,.96);c.save();
  c.translate(w*.4+depart*15,-25+arrive*31-depart*25);c.rotate(-.8+arrive*.95+depart*1.6);
  const flip=Math.cos(clamp((p-.22)/.22)*Math.PI);c.scale(Math.max(.07,Math.abs(flip)),1);
  polygon(c,[[-7,-10],[7,-10],[7,10],[-7,10]],'#FFF0D2');
  if(flip>0){polygon(c,[[-5,-8],[5,-8],[5,8],[-5,8]],'#B62043');for(let i=-1;i<=1;i++)stroke(c,'#F493A3',.55,c=>{c.moveTo(-5,i*4-3);c.lineTo(5,i*4+3);});}
  else {c.fillStyle='#242231';c.beginPath();c.moveTo(0,-5);c.bezierCurveTo(-9,1,-3,6,0,2);c.bezierCurveTo(3,6,9,1,0,-5);c.fill();polygon(c,[[0,1],[-2,6],[2,6]],'#242231');dot(c,-4,-7,.8,'#242231');dot(c,4,7,.8,'#242231');}c.restore();
}
function crown(c,p) {
  const drop=1-smooth((p-.03)/.24);c.globalAlpha=envelope(p,.02,.96);c.save();c.translate(0,-21-drop*6);c.rotate(Math.sin(p*TAU*2)*drop*.2);c.scale(1.2,1.2);
  polygon(c,[[-9,4],[-11,-5],[-5,-1],[0,-8],[5,-1],[11,-5],[9,4]],createLinearGradient(c,['#FFF2B0','#F6BB36','#B56C1F'],0,-8,0,4,'#F6BB36'));
  stroke(c,'#FFEAA1',1,c=>{c.moveTo(-8,2);c.lineTo(8,2);});dot(c,0,-1,1.5,'#E74C60');
  for(let i=0;i<3;i++){const life=(p-.3-i*.09)/.2;if(life>0&&life<1)glint(c,(i-1)*8,-5,3.6*Math.sin(life*Math.PI));}c.restore();
}
function meteor(c,p,w) {
  const q=clamp((p-.05)/.65),x=(q-.5)*w,y=14-Math.abs(Math.sin(q*Math.PI*3))*19;c.globalAlpha=envelope(p,.03,.87);
  for(let i=7;i>0;i--)dot(c,x-i*2,y-i*.5,2.6*(1-i/9),i%2?'#F48035':'#FFC457');dot(c,x,y,2.2,'#FFF1AB');
  for(let i=1;i<=2;i++){const hit=(q-i/3)*5;if(hit>0&&hit<1){c.save();c.globalAlpha*=1-hit;stroke(c,'#FFCC64',1,c=>c.ellipse((i/3-.5)*w,15,3+hit*11,1+hit*3,0,0,TAU));c.restore();}}
}
function laurel(c,p,w) {
  c.globalAlpha=envelope(p,.03,.97);const growth=smooth((p-.05)/.55);
  for(const side of [-1,1]) {
    c.save();c.scale(side,1);const x=Math.min(w*.5+4,85);
    stroke(c,'#C8AE57',.8,c=>{c.moveTo(x-9,22);c.quadraticCurveTo(x+7,12,x-2,22-growth*43);});
    for(let i=0;i<6;i++){const g=smooth((growth-i*.12)/.26),y=18-i*5.3,xx=x+Math.sin(i*.6)*3;
      leaf(c,xx,y,6*g,-.9,mixColors('#75B778','#E5BF58',smooth((p-.53)/.18)));leaf(c,xx,y,5*g,-2.6,mixColors('#A4CD80','#F8D680',smooth((p-.53)/.18)));}c.restore();
  }
}
function plane(c,p,w) {
  const q=clamp((p-.04)/.78),pos=t=>[Math.sin(t*TAU)*w*.3+(t-.5)*w*.55,-16+Math.sin(t*TAU*2)*7];c.globalAlpha=envelope(p,.02,.96);
  c.setLineDash([1,3]);stroke(c,'#A5BDD1',.65,c=>{for(let i=0;i<=q*80;i++){const [x,y]=pos(i/80);i?c.lineTo(x,y):c.moveTo(x,y);}});c.setLineDash([]);
  const [x,y]=pos(q),[xx,yy]=pos(q+.002);c.save();c.translate(x,y);c.rotate(Math.atan2(yy-y,xx-x));
  polygon(c,[[9,0],[-7,-5],[-3,0],[-7,5]],'#FFF1CD');polygon(c,[[9,0],[-3,0],[-7,5]],'#A7BED7');stroke(c,'#FFFFFF',.7,c=>{c.moveTo(-3,0);c.lineTo(9,0);});c.restore();
}
function tide(c,p,w) {
  c.globalAlpha=envelope(p,.03,.96);const travel=smooth((p-.06)/.72),head=(travel-.5)*w;
  c.fillStyle=createLinearGradient(c,['#9CFFDE','#25CAB7','#247FB0'],0,11,0,23,'#25CAB7');
  c.beginPath();c.moveTo(-w*.5,23);c.lineTo(head+10,23);c.bezierCurveTo(head+16,13,head+5,7,head+1,13);c.bezierCurveTo(head+10,9,head+10,20,head-2,18);
  for(let i=0;i<=30;i++){const x=head-(head+w*.5)*i/30;c.lineTo(x,19+Math.sin(x*.12+p*12)*1.4);}c.closePath();c.fill();
  stroke(c,'#CEFFF0',.85,c=>{c.moveTo(head-2,18);c.bezierCurveTo(head+10,20,head+10,9,head+1,13);});
  for(let i=0;i<8;i++){const x=-w*.45+i*w*.11;if(x<head)dot(c,x,20+Math.sin(i+p*12),.65,'#D5FFF1');}
}
function fireflies(c,p,w) {
  c.globalAlpha=envelope(p,.02,.98);
  for(let i=0;i<3;i++){const t=p*TAU+i*2.1,x=Math.sin(t*.8+i)*w*.42,y=Math.cos(t*1.3+i)*20,pulse=.35+.65*(.5+.5*Math.sin(t*2+i))**3;
    c.save();c.globalAlpha*=pulse;dot(c,x,y,5,'#D8FF5420');dot(c,x,y,2.7,'#E7FF6538');
    oval(c,x-1.5,y-1,2,.65,-.5,'#B4DDA5');oval(c,x+1.5,y-1,2,.65,.5,'#B4DDA5');dot(c,x,y,1.1,'#FAFF98');c.restore();}
}
function confetti(c,p,w,seed) {
  const q=(p-.06)/.72;if(q<=0||q>=1)return;c.globalAlpha=getParticleEnvelope(q);
  const colors=['#FF598C','#FFCF45','#6BE1AF','#A78BFF','#FF8853'];
  for(let i=0;i<18;i++){const n=seededNoise(seed,i+51),side=i%2?1:-1,x=side*w*.39+side*(-12-n*48)*q,y=13-(48+n*32)*q+52*q*q;
    c.save();c.translate(x,y);c.rotate(q*(i%3+1)*4+i);c.scale(Math.cos(q*TAU+i)*.7+.3,1);c.fillStyle=colors[i%5];
    if(i%3===0){stroke(c,colors[i%5],1.2,c=>{c.moveTo(-2,-2);c.quadraticCurveTo(3,-3,1,1);c.quadraticCurveTo(-1,3,3,3);});}else c.fillRect(-1.5,-2.5,3,5);c.restore();}
}
const gestures={
  'kinetic-echo':ribbon,'neon-particle':fire,'ion-sweep':sword,'phase-fracture':ink,letterpress:seal,
  'cherry-blossom':blossom,'butterfly-kiss':butterfly,'bubble-bath':bubbles,'kitten-paws':paws,'dandelion-wish':dandelion,
  'rose-romance':rose,'raven-feather':feather,'falling-ace':ace,'crown-glint':crown,'meteor-skip':meteor,
  'laurel-grow':laurel,'paper-plane':plane,'tide-pool':tide,'firefly-dance':fireflies,'confetti-parade':confetti
};
export function drawCollectionMotion(ctx, model, drawBase) {
  const key=model.motion.key;if(!Object.hasOwn(gestures,key))return false;
  const animateLetters = key === 'tide-pool' || key === 'confetti-parade';
  const surface = animateLetters ? getPaintedTextSurface(ctx, model, drawBase) : null;
  if (surface) {
    const glyphs = getNameGlyphLayout(ctx, model);
    const strength = envelope(model.progress, .04, .9) * model.metrics.fontSize / 38;
    glyphs.forEach((glyph, index) => {
      const phase = model.progress * TAU * 2 - index * .55;
      const offset = key === 'tide-pool' ? Math.sin(phase) * 2.2 * strength
        : -(Math.max(0, Math.sin(phase)) ** 2) * 3.2 * strength;
      drawSurfaceGlyph(ctx, surface, glyph, 0, offset, index === 0, index === glyphs.length - 1);
    });
  } else drawBase(ctx,model);
  // Shared compositor handles static/reduced modes before this entry point.
  // Minimal test/SSR contexts safely retain their complete base name.
  if(!ctx.ellipse||!ctx.bezierCurveTo||!ctx.setLineDash)return true;
  const m=model.metrics,scale=Math.min(1.5,m.fontSize/38,(model.height-4)/66);
  const width=Math.min(170,Math.max(40,m.width/scale));
  ctx.save();ctx.translate(m.x,m.y);ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
  gestures[key](ctx,model.progress,width,model.seed);ctx.restore();return true;
}
