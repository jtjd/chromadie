import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {canInitiateRoll, createCanonicalRollData} from '../src/lib/rollState.js';
import {executeRollAttempt} from '../src/lib/rollAttempt.js';
const game = await readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8');

test('ordinary rolls and rerolls both reject overlapping requests', () => {
  for (const isReroll of [false, true]) {
    const ready = {authInitialized:true, isReroll, userId:'a', rerollShards:1};
    assert.equal(canInitiateRoll(ready), true);
    assert.equal(canInitiateRoll({...ready, loading:true}), false);
    assert.equal(canInitiateRoll({...ready, rerollRequestInFlight:true}), false);
  }
});

test('UTC rollover refreshes the daily state after idle or background resume', () => {
  let reloads=0;
  const state={$session:null,hasActiveRerollLock:()=>false,getTomorrowMidnightUTC:()=>new Date(Date.now()+86400000),getTodayString:()=> '2026-09-11',initialStateDate:'2026-09-10',initialStateKey:'a',loading:false,syncInitialState:()=>{reloads++;}};
  vm.createContext(state);
  vm.runInContext(game.slice(game.indexOf('  function tickCountdown()'),game.indexOf('  async function shareResultsText()')),state);
  vm.runInContext('tickCountdown()',state);
  assert.equal(reloads,1);
  assert.equal(state.initialStateKey,null);
  state.loading=true;
  vm.runInContext('tickCountdown()',state);
  assert.equal(reloads,1,'pending roll must settle before changing the visible day');
});

test('Game wires request-day guest persistence and reveal through the roll attempt controller', () => {
  assert.match(game, /executeRollAttempt\(\{/);
  assert.match(game, /saveGuestBeforeReveal: \(data, date\) => \{[\s\S]*saveGuestRoll\(createCanonicalRollData\(data, date\)\)/);
  assert.match(game, /reveal: data => presentRollResult\(data, requestIsCurrent\)/);
  assert.match(game,/initialStateRequestId \+= 1;\n\s{4}rollRequestId \+= 1;/);
});

test('Game delegates initial snapshot loading while retaining request and account guards', () => {
  assert.match(game, /import \{ runInitialRollHydration \} from '\.\/rollInitialState\.js'/);
  assert.match(game, /await runInitialRollHydration\(\{/);
  assert.match(game, /isRequestCurrent: \(\) => requestId === initialStateRequestId/);
  assert.match(game, /isSnapshotCurrent: \(\) => requestId === initialStateRequestId[\s\S]*?userId === \$session\?\.user\?\.id/);
  assert.match(game, /applySnapshot: applyInitialRollSnapshot/);
  assert.match(game, /onFinally: \(\) => \{ loading = false; \}/);
});

test('guest roll is saved even when navigation cancels its reveal', async () => {
  const saved=[];
  let finishReveal;
  let signalReveal;
  const revealStarted = new Promise(resolve => { signalReveal = resolve; });
  const state = {
    $authInitialized:true, $session:null, $rerollShards:0, loading:false,
    rerollRequestInFlight:false,rollRequestId:0,supabase:{},shareImageDialog:null,executeRollAttempt,
    canInitiateRoll,hasActiveRerollLock:()=>false,getTodayString:()=> '2026-09-10',
    ROLL_REVEAL_STEPS:[{progress:0}],dispatchRollState:()=>{},
    requestRoll:async()=>({data:{success:true,hex:'#123456',score:42,rarity:'Common'}}),
    createCanonicalRollData:(data,date)=>({...data,date}),
    saveGuestRoll:data=>saved.push(data),guestProgressActive:{set:()=>{}},
    presentRollResult:()=>new Promise(resolve=>{finishReveal=resolve;signalReveal();})
  };
  vm.createContext(state);
  vm.runInContext(game.slice(game.indexOf('  async function initiateRoll('),game.indexOf('  function beginGuestSignup(')),state);
  const pending=vm.runInContext('initiateRoll()',state);
  await revealStarted;
  assert.equal(saved.length,1);
  assert.equal(saved[0].hex,'#123456');
  assert.equal(saved[0].date,'2026-09-10');
  state.rollRequestId++;
  finishReveal({hex:'#123456',score:42,rarity:'Common',badges:[]});
  await pending;
  assert.equal(saved.length,1);
});

test('a rejected reroll keeps the last confirmed result and releases its controls', async () => {
  const state={
    $authInitialized:true,$session:{user:{id:'a'}},$rerollShards:1,loading:false,
    rerollRequestInFlight:false,rollRequestId:0,supabase:{},shareImageDialog:null,canInitiateRoll,executeRollAttempt,
    hasActiveRerollLock:()=>false,setRerollLock:()=>{},clearRerollLock:()=>{},
    getTodayString:()=> '2026-09-10',ROLL_REVEAL_STEPS:[{progress:0}],dispatchRollState:()=>{},
    requestRoll:async()=>({data:null,error:{message:'Offline'}}),
    score:42,rarity:'Rare',badges:['example'],traits:[],identity:'Saved color',rollContributors:[],
    displayHex:'#123456',displayColor:'#123456',displayScore:42,percentileDisplay:'Top 10%',
    milestoneGranted:'',newMilestones:[],cotwHit:true
  };
  vm.createContext(state);
  vm.runInContext(game.slice(game.indexOf('  async function initiateRoll('),game.indexOf('  function beginGuestSignup(')),state);
  await vm.runInContext('initiateRoll(true)',state);
  assert.equal(state.phase,'results');
  assert.equal(state.displayColor,'#123456');
  assert.equal(state.score,42);
  assert.equal(state.cotwHit,true);
  assert.deepEqual(state.badges,['example']);
  assert.equal(state.loading,false);
  assert.equal(state.error,'Offline');
});

test('a confirmed reroll replaces the old result and releases its locks when reveal rejects', async () => {
  const clearedLocks = [];
  const toasts = [];
  const state={
    $authInitialized:true,$session:{user:{id:'a'}},$rerollShards:1,$profile:null,loading:false,
    rerollRequestInFlight:false,rollRequestId:0,supabase:{},shareImageDialog:null,canInitiateRoll,executeRollAttempt,
    surface:'roll',
    hasActiveRerollLock:()=>false,setRerollLock:()=> 'request-lock',clearRerollLock:(_key,handle)=>clearedLocks.push(handle),
    getTodayString:()=> '2026-09-10',ROLL_REVEAL_STEPS:[{progress:10}],dispatchRollState:()=>{},
    requestRoll:async()=>({data:{success:true,hex:'#AABBCC',score:999,rarity:'Epic',badges:[]},error:null}),
    createCanonicalRollData,
    normalizeHexColor:value=>value,
    presentRollResult:async()=>{throw new Error('Reveal unavailable');},
    sortRollBadgesDescending:value=>value,normalizeNewMilestones:()=>[],prefersReducedMotion:()=>false,
    getRollAccountMode:()=> 'authenticated',trackProductEvent:()=>{},getPercentileTier:()=>null,
    refreshProfileState:async()=>true,fetchInventoryState:async()=>true,fetchWalletBalance:async()=>true,
    addToast:(message,type)=>toasts.push({message,type}),
    score:42,rarity:'Rare',badges:['example'],traits:[],identity:'Saved color',rollContributors:[],
    displayHex:'#123456',displayColor:'#123456',displayScore:42,percentileDisplay:'Top 10%',
    milestoneGranted:'',newMilestones:[],cotwHit:true
  };
  vm.createContext(state);
  vm.runInContext(game.slice(game.indexOf('  async function initiateRoll('),game.indexOf('  function beginGuestSignup(')),state);
  await vm.runInContext('initiateRoll(true)',state);

  assert.equal(state.phase,'results');
  assert.equal(state.displayColor,'#AABBCC');
  assert.equal(state.score,999);
  assert.equal(state.loading,false);
  assert.equal(state.rerollRequestInFlight,false);
  assert.deepEqual(clearedLocks,['request-lock']);
  assert.deepEqual(toasts,[{message:'Your roll was saved, but the reveal could not finish.',type:'error'}]);
});

const initialSnapshotHandler = game.slice(
  game.indexOf('  function applyInitialRollSnapshot('),
  game.indexOf('  async function syncInitialState()')
);

test('a current guest snapshot is applied to the presentation and guest state', () => {
  const state={
    snapshot:{isCurrent:true,roll:{date:'2026-09-10',hex:'#123456',score:42,rarity:'Common'},percentileData:null},
    guestProgressRestored:false,phase:'preroll',score:0,displayScore:0,
    rarity:'',displayColor:'#222',setRollPresentationFromData:roll=>{state.presentedRoll=roll;},
    dispatchRollState:()=>{state.dispatched=true;},loading:true,
    guestProgressActive:{set:value=>{state.guestActive=value;}},
    trackProductEvent:(name,data)=>{state.productEvent={name,data};},surface:'roll',
    getPercentileTier:()=>null
  };
  vm.createContext(state);
  vm.runInContext(initialSnapshotHandler,state);
  vm.runInContext("applyInitialRollSnapshot(snapshot, 'guest')",state);
  assert.equal(state.phase,'results');
  assert.equal(state.displayColor,'#123456');
  assert.equal(state.guestActive,true);
  assert.equal(state.loading,false);
  assert.equal(state.dispatched,true);
  assert.equal(state.productEvent,undefined);
});

test('an authenticated snapshot keeps the server color, percentile, and focus badge', () => {
  const state = {
    snapshot: {
      error: null,
      roll: { score: 9876, hex_code: '#ABCDEF', rarity: 'Rare', badges: ['cotw_hit'] },
      percentileData: { percentile: 94, total_rollers: 100 }
    },
    phase:'preroll',score:0,displayScore:0,rarity:'',displayColor:'#222',
    setRollPresentationFromData:roll=>{state.presentedRoll=roll;},
    getPercentileTier:(percentile,total)=>`${percentile}/${total}`,
    dispatchRollState:()=>{state.dispatched=true;},trackProductEvent:()=>assert.fail('a returned roll is not roll_ready'),
    guestProgressActive:{set:()=>assert.fail('authenticated snapshots do not mutate guest progress')},
    surface:'roll',loading:true,error:null,cotwHit:false,guestProgressRestored:false
  };
  vm.createContext(state);
  vm.runInContext(initialSnapshotHandler,state);
  vm.runInContext("applyInitialRollSnapshot(snapshot, 'authenticated')",state);

  assert.equal(state.phase,'results');
  assert.equal(state.score,9876);
  assert.equal(state.displayScore,9876);
  assert.equal(state.displayColor,'#ABCDEF');
  assert.equal(state.presentedRoll.hex,'#ABCDEF');
  assert.equal(state.percentileDisplay,'94/100');
  assert.equal(state.cotwHit,true);
  assert.equal(state.loading,false);
  assert.equal(state.dispatched,true);
});

test('empty guest state is ready while an authenticated read error stays an error', () => {
  const guest = {
    snapshot:{roll:null,percentileData:null},phase:'results',guestProgressRestored:true,
    guestProgressActive:{set:value=>{guest.active=value;}},dispatchRollState:()=>{guest.dispatched=true;},
    trackProductEvent:(name,data)=>{guest.event={name,data};},surface:'roll',loading:true,
    setRollPresentationFromData:()=>{},getPercentileTier:()=>null
  };
  vm.createContext(guest);
  vm.runInContext(initialSnapshotHandler,guest);
  vm.runInContext("applyInitialRollSnapshot(snapshot, 'guest')",guest);
  assert.equal(guest.phase,'preroll');
  assert.equal(guest.guestProgressRestored,false);
  assert.equal(guest.active,false);
  assert.equal(guest.event.name,'roll_ready');
  assert.equal(guest.event.data.accountMode,'guest');
  assert.equal(guest.loading,false);

  const authenticated = {
    snapshot:{roll:null,error:{message:'Offline'}},phase:'results',guestProgressRestored:true,
    dispatchRollState:()=>{authenticated.dispatched=true;},
    trackProductEvent:()=>assert.fail('failed account reads are not ready'),surface:'roll',
    loading:true,error:null,setRollPresentationFromData:()=>{},getPercentileTier:()=>null
  };
  vm.createContext(authenticated);
  vm.runInContext(initialSnapshotHandler,authenticated);
  vm.runInContext("applyInitialRollSnapshot(snapshot, 'authenticated')",authenticated);
  assert.equal(authenticated.phase,'preroll');
  assert.equal(authenticated.error,'Offline');
  assert.equal(authenticated.loading,false);
  assert.equal(authenticated.dispatched,true);
});
