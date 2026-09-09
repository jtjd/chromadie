import test from 'node:test';
import assert from 'node:assert/strict';
import { getNameFrameModel, drawNameFrame } from '../src/lib/name/nameRenderer.js';
import { loadCodeOwnedNameRenderers } from '../src/lib/name/nameComposableRenderer.js';
import { drawText, strokeText } from '../src/lib/name/render/primitives.js';
import { getNameGlyphLayout, getPaintedTextSurface } from '../src/lib/name/render/textSurface.js';

function recordingContext() {
  const draws = [];
  const stack = [];
  const ctx = {
    globalAlpha: 1,
    save() { stack.push({ globalAlpha:this.globalAlpha }); },
    restore() { Object.assign(this, stack.pop()); },
    clearRect() {}, setTransform() {}, translate() {}, scale() {},
    fillText(text) { draws.push({ text, alpha:this.globalAlpha }); },
    strokeText(text) { draws.push({ text, alpha:this.globalAlpha }); },
    drawImage() {},
    measureText(text) { return { width:[...text].reduce((sum,c)=>sum+(c==='W'?20:c==='i'?4:c==='\u0301'?0:10),0) }; }
  };
  return { ctx, draws };
}

test('text primitives respect motion opacity and restore the caller state', () => {
  const {ctx, draws}=recordingContext();
  const model=getNameFrameModel({text:'Wi'});
  ctx.globalAlpha=0.25;
  drawText(ctx,model,'#fff',0.5);
  strokeText(ctx,model,'#fff',1,0.4);
  assert.deepEqual(draws.map(draw=>draw.alpha),[0.125,0.1]);
  assert.equal(ctx.globalAlpha,0.25);
});

test('Still paints the material once', async () => {
  await loadCodeOwnedNameRenderers();
  const {ctx,draws}=recordingContext();
  drawNameFrame(ctx,getNameFrameModel({text:'Chromadie',materialKey:'plain',motionKey:'none'}));
  assert.equal(draws.length,1);
});

test('clearing a name removes the previous canvas frame', () => {
  const {ctx,draws}=recordingContext();
  let clears=0;
  ctx.clearRect=()=>clears++;
  drawNameFrame(ctx,getNameFrameModel({text:''}));
  assert.equal(clears,1);
  assert.equal(draws.length,0);
});

test('character motions preserve proportional advances and grapheme clusters', () => {
  const {ctx}=recordingContext();
  const glyphs=getNameGlyphLayout(ctx,getNameFrameModel({text:'Wié\u0301'}));
  assert.deepEqual(glyphs.map(glyph=>glyph.width),[20,4,10]);
  assert.deepEqual(glyphs.map(glyph=>glyph.character),['W','i','é\u0301']);
  assert.equal(glyphs[1].left,glyphs[0].left+20);
});

test('long names reserve canvas bleed for effects rather than filling it with glyphs', () => {
  const model=getNameFrameModel({text:'VeryLongChromadieIdentityName',width:358,height:96,contentWidth:322,fontSize:36,inline:true});
  assert.equal(model.metrics.availableWidth,322);
  assert.ok(model.metrics.width<=322);
  assert.ok(model.metrics.scaleX<1);
});

test('painted surfaces reuse allocation and invalidate all relevant appearance inputs', () => {
  const {ctx}=recordingContext();
  let allocations=0;
  let loaded=false;
  ctx.canvas={ownerDocument:{ fonts:{check:()=>loaded}, createElement:()=>{
    allocations++;
    return {width:1,height:1,getContext:()=>recordingContext().ctx};
  }}};
  let paints=0;
  const paint=()=>paints++;
  const model=getNameFrameModel({text:'Wi',materialKey:'glass-emboss'});
  const original=getPaintedTextSurface(ctx,model,paint).canvas;
  getPaintedTextSurface(ctx,{...model,time:1000,progress:0.9},paint);
  assert.equal(paints,1,'static material does not repaint on motion ticks');
  for(const change of [
    {baseColor:'#00FF00'}, {todayColor:'#FF0000'}, {width:260}, {pixelRatio:2},
    {displayText:'WW'}, {font:{...model.font,weight:900}},
    {material:{...model.material,colors:['#FF0000','#000000','#00FF00']}}
  ]) {
    const before=paints;
    assert.equal(getPaintedTextSurface(ctx,{...model,...change},paint).canvas,original);
    assert.equal(paints,before+1);
  }
  getPaintedTextSurface(ctx,model,paint);
  loaded=true;
  const before=paints;
  getPaintedTextSurface(ctx,model,paint);
  assert.equal(paints,before+1,'font readiness invalidates the fallback face');
  assert.equal(allocations,1);
});
