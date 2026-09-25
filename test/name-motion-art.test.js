import test from 'node:test';
import assert from 'node:assert/strict';
import { envelope, fill, stroke, noise } from '../src/lib/name/render/collectionArt.js';

function context() {
  const saved=[];
  return {
    globalAlpha:.25,
    painted:[],
    save() { saved.push(this.globalAlpha); },
    restore() { this.globalAlpha=saved.pop(); },
    beginPath() {},
    fill() { this.painted.push(this.globalAlpha); },
    stroke() { this.painted.push(this.globalAlpha); }
  };
}

test('scene paint inherits and restores lifecycle opacity',()=>{
  const ctx=context();
  fill(ctx,'#fff',.4,()=>{});
  stroke(ctx,'#fff',1,.6,()=>{});
  assert.deepEqual(ctx.painted,[.1,.15]);
  assert.equal(ctx.globalAlpha,.25);
  ctx.globalAlpha=0;
  fill(ctx,'#fff',1,()=>{});
  assert.equal(ctx.painted.at(-1),0);
});

test('scene envelope closes both sides of the clock wrap with a quiet interval',()=>{
  const scene=p=>envelope(p,.025,.94,.09);
  for(const p of [0,.002,.02,.94,.998,1]) assert.equal(scene(p),0);
  assert.equal(scene(.5),1);
  for(let i=0;i<=1000;i++) assert.ok(scene(i/1000)>=0 && scene(i/1000)<=1);
  assert.ok(scene(.05)<scene(.08));
  assert.ok(scene(.90)>scene(.93));
});

test('scene variations are deterministic and bounded',()=>{
  const first=Array.from({length:40},(_,i)=>noise('identity',i));
  assert.deepEqual(first,Array.from({length:40},(_,i)=>noise('identity',i)));
  assert.ok(first.every(n=>n>=0 && n<=1));
  assert.ok(new Set(first).size>35);
});
