// Painted forms move around authored anchors. No global spin, random startup,
// texture noise, or whole-frame scaling. Both geometry and lighting loop at 16s.
import { getAvatarEffectDefinition } from './avatarEffects.js';
export const DECORATION_LOOP_SECONDS = 16;
export const vertexSource = `
precision mediump float;
attribute vec2 point;
varying vec2 uv;
uniform float time;
uniform float kind;
float influence(vec2 p, vec2 anchor, float width) {
  vec2 d = p-anchor; return exp(-dot(d,d)/width);
}
void main() {
  uv=point;
  vec2 p=point;
  float t=time*6.28318530718/16.0;
  if(kind<0.5) {
    // Slow rolling cloud banks with counter-motion, the moon stays anchored.
    float left=influence(p,vec2(.19,.72),.038);
    float right=influence(p,vec2(.80,.80),.030);
    float lower=influence(p,vec2(.50,.87),.028);
    p+=vec2(.013*sin(t),.011*cos(t))*left;
    p+=vec2(.012*cos(t+1.3),.009*sin(t+1.3))*right;
    p.y+=.010*sin(2.0*t+.8)*lower;
  } else if(kind<1.5) {
    // The two flowers open in offset breaths; stems bend from their roots.
    vec2 a=vec2(.24,.67), b=vec2(.75,.72);
    p+=(point-a)*(.10*sin(t+.4))*influence(point,a,.015);
    p+=(point-b)*(.085*sin(t+2.4))*influence(point,b,.017);
    float leaf=influence(point,vec2(.25,.22),.024);
    p.x+=.012*sin(t+1.0)*leaf;
    p.y+=.008*sin(t+1.8)*leaf;
    p.x+=.010*sin(t+3.3)*influence(point,vec2(.82,.33),.017);
  } else if(kind<2.5) {
    // Crystals separate by a few pixels and settle, never orbiting the face.
    float a=influence(p,vec2(.22,.77),.027);
    float b=influence(p,vec2(.78,.22),.030);
    p+=vec2(-.006,.008)*sin(t+.5)*a;
    p+=vec2(.008,-.006)*sin(t+2.1)*b;
    p.x+=.007*sin(t+4.0)*influence(p,vec2(.80,.75),.012);
  } else if(kind<3.5) {
    // Cat ear flicks have a quick lift and soft return; the bow follows later.
    float flick=pow(max(0.0,sin(t)),8.0);
    p.x+=.020*flick*influence(p,vec2(.24,.16),.018);
    p.y-=.012*flick*influence(p,vec2(.24,.16),.018);
    p.x-=.016*pow(max(0.0,sin(t+1.1)),8.0)*influence(p,vec2(.80,.16),.018);
    p.y+=.012*sin(2.0*t+.8)*influence(p,vec2(.78,.79),.032);
    p.x+=.008*sin(2.0*t+p.y*6.0)*influence(p,vec2(.17,.65),.025);
  } else if(kind<4.5) {
    // Floppy ear tips lag behind their roots, clouds rise in counterphase.
    p.y+=.018*sin(t+.5)*influence(p,vec2(.16,.33),.025);
    p.x+=.012*sin(t+1.5)*influence(p,vec2(.49,.17),.020);
    p.y+=.009*sin(t+3.0)*influence(p,vec2(.23,.80),.030);
    p.y+=.011*sin(t+4.2)*influence(p,vec2(.75,.83),.025);
  } else if(kind<5.5) {
    // The mask stays rigid; a traveling wave bends only the scarf tails.
    float scarf=influence(p,vec2(.30,.83),.044)+influence(p,vec2(.14,.64),.023)+influence(p,vec2(.30,.18),.020);
    p.y+=.012*sin(2.0*t-p.x*9.0)*scarf;
    p.x+=.010*cos(2.0*t-p.y*8.0)*scarf;
  } else if(kind<6.5) {
    // Flame tips lick upward in alternating beats; horns remain still.
    float flame=influence(p,vec2(.18,.67),.040)+influence(p,vec2(.82,.67),.040);
    p.x+=.008*sin(4.0*t+p.y*15.0)*flame;
    p.y+=.016*sin(2.0*t+p.x*10.0)*flame;
  } else {
    // Fish tails and water curls flex independently around stationary heads.
    p.y+=.013*sin(3.0*t)*influence(p,vec2(.55,.10),.013);
    p.x+=.012*cos(3.0*t+1.3)*influence(p,vec2(.10,.48),.013);
    p.x+=.009*sin(2.0*t+p.y*8.0)*influence(p,vec2(.79,.65),.035);
    p.y+=.009*sin(2.0*t+p.x*8.0)*influence(p,vec2(.50,.87),.030);
  }
  gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);
}`;

export const fragmentSource = `
precision mediump float;
varying vec2 uv;
uniform sampler2D art;
uniform float time;
uniform float kind;
float glint(vec2 anchor,float phase) {
  vec2 d=uv-anchor;
  float beat=pow(max(0.0,sin(time*6.28318530718/8.0+phase)),10.0);
  float cross=exp(-abs(d.x)*650.0-abs(d.y)*95.0)
             +exp(-abs(d.y)*650.0-abs(d.x)*95.0);
  return cross*beat;
}
void main() {
  vec4 color=texture2D(art,uv);
  float t=time*6.28318530718/16.0;
  if(kind>1.5 && kind<2.5) {
    // A reflection travels over the painted facets, clipped to the artwork.
    float position=.5+.62*sin(t);
    float sweep=exp(-pow((uv.x*.75+uv.y*.4-position)*22.0,2.0));
    color.rgb+=vec3(.14,.23,.28)*sweep*color.a;
    float g=glint(vec2(.82,.12),.2)+glint(vec2(.14,.64),2.2)+glint(vec2(.79,.81),4.0);
    color.rgb+=vec3(.7,.85,1.0)*g;
    color.a=max(color.a,min(1.0,g));
  } else if(kind<.5) {
    float g=glint(vec2(.26,.16),0.0)+glint(vec2(.87,.53),2.0)+glint(vec2(.22,.90),4.0);
    color.rgb+=vec3(1.0,.84,.46)*g;
    color.a=max(color.a,min(1.0,g));
  } else if(kind<1.5) {
    // Three pollen motes rise from the flowers, fading at each loop boundary.
    for(int i=0;i<3;i++) {
      float phase=fract(time/8.0+float(i)/3.0);
      vec2 start=i==1?vec2(.78,.72):vec2(.22,.66);
      vec2 pos=start+vec2(.025*sin(phase*6.283+float(i)), -.18*phase);
      float mote=(1.0-smoothstep(.001,.006,length(uv-pos)))*sin(phase*3.141593);
      color.rgb+=vec3(1.0,.72,.24)*mote;
      color.a=max(color.a,mote*.8);
    }
  } else if(kind<3.5) {
    float g=glint(vec2(.18,.65),1.2)+glint(vec2(.82,.80),3.0);
    color.rgb+=vec3(1.0,.65,.77)*g*.5;
    color.a=max(color.a,min(1.0,g*.5));
  } else if(kind<4.5) {
    float g=glint(vec2(.66,.17),.5)+glint(vec2(.89,.63),2.6);
    color.rgb+=vec3(1.0,.88,.4)*g*.65;
    color.a=max(color.a,min(1.0,g*.65));
  } else if(kind<5.5) {
    // A restrained red illumination follows the scarf's existing red ink.
    float red=max(0.0,color.r-max(color.g,color.b));
    color.rgb+=vec3(.13,.015,.005)*red*(.5+.5*sin(t*2.0+uv.x*8.0));
  } else if(kind<6.5) {
    float blue=max(0.0,color.b-color.r);
    color.rgb+=vec3(.02,.13,.22)*blue*(.5+.5*sin(t*4.0+uv.y*9.0));
  } else {
    float g=glint(vec2(.87,.58),1.0)+glint(vec2(.33,.85),3.4);
    color.rgb+=vec3(.5,.9,1.0)*g*.45;
    color.a=max(color.a,min(1.0,g*.45));
  }
  gl_FragColor=vec4(color.rgb*color.a,color.a);
}`;

/** @param {{canvas: HTMLCanvasElement, host: HTMLElement, artwork: string, effectKey: string, enabled: boolean, onReady: (ready: boolean) => void}} options */
export function createIllustratedDecoration({ canvas, host, artwork, effectKey, enabled, onReady }) {
  let destroyed = false, frame = 0, elapsed = 3.7, last = 0;
  let visible = false, loaded = false;
  /** @type {WebGLRenderingContext | null} */
  let gl = null;
  let program, buffer, texture;
  let timeUniform;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = media.matches;
  const source = new Image();
  const active = () => !destroyed && enabled && visible && !reduced && document.visibilityState === 'visible';
  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
  const disposeGPU = () => {
    if (!gl) return;
    gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
    gl = null;
  };
  function initialize() {
    if (gl || !loaded || !active()) return Boolean(gl);
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, preserveDrawingBuffer: true });
    if (!gl) return false;
    const shaderContext = gl;
    const shaders = [];
    try {
      program = gl.createProgram();
      for (const [type, text] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
        const shader = gl.createShader(Number(type));
        shaders.push(shader);
        gl.shaderSource(shader, String(text)); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Decoration shader unavailable');
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Decoration program unavailable');
      gl.useProgram(program);
      const points = [];
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        for (const [dx, dy] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]) points.push((x+dx)/32, (y+dy)/32);
      }
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
      const attribute = gl.getAttribLocation(program, 'point');
      gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.uniform1i(gl.getUniformLocation(program, 'art'), 0);
      const definition = getAvatarEffectDefinition(effectKey);
      gl.uniform1f(gl.getUniformLocation(program, 'kind'), definition && 'choreography' in definition ? Number(definition.choreography) : 0);
      timeUniform = gl.getUniformLocation(program, 'time');
      return true;
    } catch {
      disposeGPU(); return false;
    } finally {
      for (const shader of shaders) shaderContext.deleteShader(shader);
    }
  }
  function draw() {
    if (!gl) return;
    const size = Math.max(1, Math.min(768, Math.round(host.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2))));
    if (canvas.width !== size || canvas.height !== size) { canvas.width = size; canvas.height = size; }
    gl.viewport(0, 0, size, size);
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(timeUniform, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 32*32*6);
    onReady(true);
  }
  function tick(now) {
    frame = 0;
    if (!active()) return;
    if (!last || now-last >= 1000/30) {
      elapsed = (elapsed + (last ? Math.min((now-last)/1000,.1) : 0)) % DECORATION_LOOP_SECONDS;
      last = now; draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    if (!active()) { onReady(false); return; }
    if (initialize()) { draw(); frame = requestAnimationFrame(tick); }
  }
  const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); });
  observer.observe(host);
  const lost = event => { event.preventDefault(); stop(); onReady(false); gl = null; };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', sync);
  const motionChange = event => { reduced = event.matches; sync(); };
  media.addEventListener('change', motionChange);
  document.addEventListener('visibilitychange', sync);
  source.onload = () => { if (destroyed) return; loaded = true; sync(); };
  source.onerror = () => { loaded = false; onReady(false); };
  source.src = artwork;
  return {
    update(value) { if (enabled !== value) { enabled = value; sync(); } },
    destroy() {
      destroyed = true; stop(); observer.disconnect();
      source.onload = source.onerror = null;
      media.removeEventListener('change', motionChange); document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', sync);
      const context = gl;
      disposeGPU();
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}
