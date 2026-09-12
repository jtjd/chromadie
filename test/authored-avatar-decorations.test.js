import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { getAvatarEffectDefinition } from '../src/lib/avatar-effect/avatarEffects.js';
import { getIllustratedDecorationFrame } from '../src/lib/avatar-effect/illustratedDecorationFrames.js';
import { createIllustratedDecoration } from '../src/lib/avatar-effect/illustratedDecorationRenderer.js';

test('illustrated decorations have bounded local alpha artwork and matching catalog migration', async () => {
  const migration = (await Promise.all(['20260912030000_authored_avatar_decorations.sql','20260912040000_anime_avatar_decorations.sql'].map(file=>readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8')))).join('\n');
  const seed = await readFile(new URL('../supabase/seed.sql',import.meta.url),'utf8');
  for(const key of ['moonlit-clouds','enchanted-garden','prismatic-fracture','sakura-neko','cloud-bunny','crimson-ronin','midnight-oni','koi-current','sakura-petals']) {
    const itemKey=`avatar_effect_${key.replaceAll('-','_')}`;
    const definition=getAvatarEffectDefinition(itemKey);
    assert.equal(definition.key,key);
    if (definition.artwork) {
      const frame = getIllustratedDecorationFrame(key);
      assert.ok(frame.radius > .3 && frame.radius < .4);
      assert.ok(frame.x > .45 && frame.x < .6);
      assert.ok(frame.y > .4 && frame.y < .56);
    }
    const expectedKind = ['moonlit-clouds','enchanted-garden','prismatic-fracture','sakura-neko','cloud-bunny','crimson-ronin','midnight-oni','koi-current'].indexOf(key);
    if (expectedKind >= 0) assert.equal(definition.choreography, expectedKind, 'catalog order preserves authored shader choreography');
    const asset=new URL(`../public${definition.artwork || definition.sprite}`,import.meta.url);
    const bytes=await readFile(asset);
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(bytes.toString('ascii',12,16),'VP8X');
    assert.ok(bytes[20]&0x10,'true alpha channel');
    assert.ok((await stat(asset)).size<200000,'one bounded texture per decoration');
    for(const sql of [seed,migration]) assert.ok(sql.includes(`('${itemKey}', '${definition.label}', 'avatar_effect', 0, 'renderer', '${key}'`));
  }
});

test('static and unavailable GPU paths never start animation, and disposal removes listeners', () => {
  const names=['window','document','Image','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame'];
  const descriptors=names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]);
  let image, intersect, frameRequests=0, contextRequests=0, disconnected=false;
  const listeners=new Map();
  const target={addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
  const media={...target,matches:true};
  try {
    Object.assign(globalThis,{
      window:{matchMedia:()=>media},document:{...target,visibilityState:'visible'},
      Image:class { constructor(){ image=this; } },
      IntersectionObserver:class { constructor(fn){intersect=fn;} observe(){} disconnect(){disconnected=true;} },
      requestAnimationFrame:()=>{frameRequests++;return 1;},cancelAnimationFrame:()=>{}
    });
    const ready=[];
    const controller=createIllustratedDecoration({canvas:{...target,getContext:()=>{contextRequests++;return null;}},host:{},artwork:'/test.webp',effectKey:'moonlit-clouds',enabled:true,onReady:value=>ready.push(value)});
    intersect([{isIntersecting:true}]); image.onload();
    assert.equal(contextRequests,0,'reduced motion does not allocate GPU');
    listeners.get('change')({matches:false});
    assert.equal(contextRequests,1,'attempt GPU once when motion becomes available');
    assert.equal(frameRequests,0,'GPU failure stays on still fallback');
    assert.ok(ready.every(value=>value===false));
    const lateLoad=image.onload;
    controller.destroy();lateLoad();
    assert.equal(listeners.size,0);
    assert.equal(disconnected,true);
    assert.equal(frameRequests,0,'late image cannot restart disposed animation');
  } finally {
    for(const [name,descriptor] of descriptors) {
      if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
    }
  }
});
