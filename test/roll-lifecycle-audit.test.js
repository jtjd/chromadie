import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {canInitiateRoll} from '../src/lib/rollState.js';
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

test('confirmed guest results persist before an interruptible reveal, on the request day', () => {
  const start=game.indexOf('    const requestDate = getTodayString();');
  const save=game.indexOf('saveGuestRoll(createCanonicalRollData(data, requestDate))',start);
  const reveal=game.indexOf('await presentRollResult(data, requestIsCurrent)',start);
  assert.ok(start>=0 && save>start && reveal>save);
  assert.match(game,/initialStateRequestId \+= 1;\n    rollRequestId \+= 1;/);
});

const initialHandler = game.slice(game.indexOf('  async function syncInitialState()'), game.indexOf('  function handleGuestStorageChange'));
test('failed initial hydration releases loading and exposes a retryable error', async () => {
  const state = {
    isRollReady: () => true, $authInitialized: true, $session: {user:{id:'a'}},
    initialStateKey:null, rollRequestId:0, initialStateRequestId:0,
    getTodayString:()=> '2026-09-10',resetRollPresentation:()=>{},dispatchRollState:()=>{},
    getRollAccountMode:()=> 'authenticated',guestProgressActive:{set:()=>{}},
    loadAuthenticatedRollState:async()=>{throw new Error('Network unavailable');}
  };
  vm.createContext(state);vm.runInContext(initialHandler,state);
  await vm.runInContext('syncInitialState()',state);
  assert.equal(state.loading,false);
  assert.equal(state.error,'Network unavailable');
});

test('guest roll is saved even when navigation cancels its reveal', async () => {
  const saved=[];
  let finishReveal;
  let signalReveal;
  const revealStarted = new Promise(resolve => { signalReveal = resolve; });
  const state = {
    $authInitialized:true, $session:null, $rerollShards:0, loading:false,
    rerollRequestInFlight:false,rollRequestId:0,supabase:{},
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
    rerollRequestInFlight:false,rollRequestId:0,supabase:{},canInitiateRoll,
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

test('a challenge link finishing after an account switch never copies the old result', async () => {
  let finish;
  const state={rollRequestId:1,$session:{user:{id:'a'}},displayColor:'#123456',
    normalizeHexColor:value=>value,$profile:{username:'Alice'},$authUser:null,
    getAppOrigin:()=> 'https://chm.lol',$isAuthenticated:true,supabase:{},score:42,
    createChallengeLink:()=>new Promise(resolve=>{finish=resolve;}),
    navigator:{clipboard:{writeText:()=>assert.fail('stale clipboard write')}}};
  vm.createContext(state);
  vm.runInContext(game.slice(game.indexOf('  async function shareResultsText()'),game.indexOf('  function getSavedGuestRoll()')),state);
  const pending=vm.runInContext('shareResultsText()',state);
  state.rollRequestId++;
  state.$session={user:{id:'b'}};
  finish({success:true,shareUrl:'/c/example'});
  await pending;
});

test('a failed optional percentile lookup never deletes a valid saved guest roll', async () => {
  const {requestRollPercentile} = await import('../src/lib/rollService.js');
  const state={getSavedGuestRoll:()=>JSON.stringify({date:'2026-09-10',hex:'#123456',score:42,rarity:'Common'}),
    initialStateRequestId:1,normalizeHexColor:value=>value,MAX_STORED_ROLL_SCORE:100000000,
    getTodayString:()=> '2026-09-10',guestProgressActive:{set:()=>{}},
    setRollPresentationFromData:()=>{},requestRollPercentile,
    supabase:{rpc:async()=>{throw Error('Percentile offline');}},
    clearGuestRoll:()=>assert.fail('valid saved result deleted'),dispatchRollState:()=>{}};
  vm.createContext(state);
  vm.runInContext(game.slice(game.indexOf('  async function loadGuestRollState('),game.indexOf('  async function syncInitialState()')),state);
  await vm.runInContext('loadGuestRollState(1)',state);
  assert.equal(state.phase,'results');
  assert.equal(state.displayColor,'#123456');
  assert.equal(state.loading,false);
});
