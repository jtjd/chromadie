import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {startVite,startChromium,findAvailablePort,terminateProcess,loadLocalEnvironment,assertLocalSupabaseUrl} from './cdp-harness.mjs';
assertLocalSupabaseUrl((await loadLocalEnvironment()).url);
const evidenceDir='/tmp/chromadie-roll-reliability';
await mkdir(evidenceDir,{recursive:true});
let server,chromium;
const checks=[];
try {
  const appPort=await findAvailablePort(5194);
  const appUrl=`http://127.0.0.1:${appPort}`;
  server=await startVite({appPort,evidenceDir});
  chromium=await startChromium({appUrl,debugPort:await findAvailablePort(9254),evidenceDir,width:1440,height:900});
  const page=chromium.page;
  await page.waitFor('document.querySelector(".roll-stage--preroll, .roll-stage--results")','guest mounted');
  await page.evaluate("localStorage.removeItem('chromadie-roll');window.dispatchEvent(new StorageEvent('storage',{key:'chromadie-roll'}))");
  await page.waitFor('document.querySelector(".roll-btn:not(:disabled)")','guest ready');
  await page.setReducedMotion(false);
  await page.evaluate(`(async()=>{
    const {supabase}=await import('/src/lib/supabase.js');
    window.rollAudit={calls:0};
    const original=supabase.rpc.bind(supabase);
    supabase.rpc=async(name,args)=>{
      if(name==='roll_die'){window.rollAudit.calls++;return {data:{success:true,hex:'#123456',score:1234,rarity:'Common',identity:'Audit color',badges:[],contributors:[]}};}
      return original(name,args);
    };
  })()`);
  await page.evaluate('document.querySelector(".roll-btn").click();document.querySelector(".roll-btn")?.click()');
  await page.waitFor('localStorage.getItem("chromadie-roll") && document.querySelector(".roll-stage--rolling")','persist before reveal');
  assert.equal(await page.evaluate('window.rollAudit.calls'),1);
  await page.navigate(appUrl+'/roll','interrupt guest reveal');
  await page.waitFor('document.querySelector(".roll-stage--results")','restored guest result');
  assert.ok(await page.evaluate('document.querySelector(".roll-stage--results").textContent.includes("#123456")'));
  checks.push('one RPC for double click; guest survives navigation during reveal');

  await page.setReducedMotion(true);
  await page.evaluate(`(async()=>{
    const stores=await import('/src/lib/stores.js');
    const {supabase}=await import('/src/lib/supabase.js');
    window.rollAudit={stores,calls:[],failRoll:false,failRead:false};
    supabase.rpc=async(name)=>{
      const t=window.rollAudit;t.calls.push(name);
      if(name==='get_my_daily_roll') {if(t.failRead)throw Error('Daily read offline');return {data:{hex_code:'#123456',score:1234,rarity:'Common',identity:'Audit color',badges:[],contributors:[]}};}
      if(name==='roll_die') return t.failRoll?{data:null,error:{message:'Reroll offline'}}:{data:{success:true,hex:'#654321',score:2345,rarity:'Rare',identity:'Next audit color',badges:[],contributors:[]}};
      if(name==='get_my_profile'||name==='get_wallet_balance')throw Error('Refresh offline');
      return {data:null,error:null};
    };
    stores.session.set({user:{id:'11111111-1111-4111-8111-111111111111'}});
    stores.profile.set({id:'11111111-1111-4111-8111-111111111111',username:'Audit',total_rolls:3});
    stores.profileReady.set(true);stores.rerollShards.set(2);
  })()`);
  await page.waitFor('document.querySelector(".reroll-btn:not(:disabled)")','authenticated reroll');
  await page.evaluate('window.rollAudit.failRoll=true');
  await page.click('.reroll-btn','failed reroll');
  await page.waitFor('document.querySelector(".auth-error")?.textContent.includes("Reroll offline")','reroll error');
  assert.ok(await page.evaluate('document.querySelector(".roll-stage--results").textContent.includes("#123456")'));
  await page.waitFor('document.querySelector(".reroll-btn:not(:disabled)")','reroll retry enabled');
  checks.push('failed reroll retains confirmed result and permits retry');
  await page.evaluate('window.rollAudit.failRoll=false');
  await page.click('.reroll-btn','successful reroll with failed refresh');
  await page.waitFor('document.querySelector(".roll-stage--results")?.textContent.includes("#654321")','confirmed new result');
  await page.waitFor('document.querySelector(".reroll-btn:not(:disabled)")','refresh failure releases controls');
  checks.push('reduced-motion result survives failed account refresh without locking controls');
  await page.evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'View image').click()");
  await page.waitFor('document.querySelector(".image-modal-content")','share image dialog');
  await page.pressKey('Escape');
  await page.waitFor('!document.querySelector(".image-modal-content")','share image closes with Escape');
  checks.push('share image opens and keyboard dismissal releases the dialog');
  for(const width of [1440,390]){
    await page.setViewport(width,900);
    assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    const headingContrast=await page.evaluate(`(()=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
      const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(document.querySelector('.roll-page__context h1 span')).color;ctx.fillRect(0,0,1,1);
      const rgb=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
      return (.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]+.05)/(.005+.05);
    })()`);
    assert.ok(headingContrast>=4.5, 'Dark roll heading lost readable contrast');
    await page.screenshot(join(evidenceDir,`result-${width}.png`));
  }
  await page.setReducedMotion(false);
  await page.command('Performance.enable');
  const revealStart=Date.now();
  await page.click('.reroll-btn', 'complete normal reveal');
  await page.waitFor('document.querySelector(".roll-stage--rolling")','normal reveal starts');
  await page.waitFor('document.querySelector(".roll-stage--results")','normal reveal completes');
  await page.waitFor('document.querySelector(".reroll-btn:not(:disabled)")','completed reveal unlocks');
  const revealDurationMs=Date.now()-revealStart;
  const performance=await page.command('Performance.getMetrics');
  checks.push('normal-motion reveal completes and releases controls');
  await page.click('.reroll-btn', 'normal reveal');
  await page.waitFor('document.querySelector(".roll-stage--rolling")','normal reveal mounted');
  await page.evaluate("[...document.querySelectorAll('button')].find(button => /skip/i.test(button.textContent)).click()");
  await page.waitFor('document.querySelector(".roll-stage--results")','skip completes normal reveal');
  checks.push('normal reveal skip reaches the confirmed result');
  await page.setReducedMotion(true);
  await page.waitFor('document.querySelector(".reroll-btn:not(:disabled)")','normal reveal unlocks');
  await page.evaluate(`(async()=>{
    const {supabase}=await import('/src/lib/supabase.js');const original=supabase.rpc;
    supabase.rpc=(name,args)=>name==='roll_die'?new Promise(resolve=>{window.rollAudit.finishRoll=resolve;}):original(name,args);
  })()`);
  await page.click('.reroll-btn','delayed old-account roll');
  await page.waitFor('Boolean(window.rollAudit.finishRoll)','pending roll RPC');
  await page.evaluate(`window.rollAudit.stores.session.set({user:{id:'33333333-3333-4333-8333-333333333333'}})`);
  await page.waitFor('document.querySelector(".roll-stage--results")?.textContent.includes("#123456")','new-account daily hydration');
  await page.evaluate(`window.rollAudit.finishRoll({data:{success:true,hex:'#FFFFFF',score:9999,rarity:'Rare',identity:'Stale result',badges:[]}})`);
  assert.ok(await page.evaluate('document.querySelector(".roll-stage--results").textContent.includes("#123456")'));
  checks.push('delayed old-account roll cannot replace the new account result');
  await page.evaluate(`(()=>{const t=window.rollAudit;t.failRead=true;t.stores.session.set({user:{id:'22222222-2222-4222-8222-222222222222'}});})()`);
  await page.waitFor('document.querySelector(".auth-error")?.textContent.includes("Daily read offline")','initial hydration failure');
  await page.waitFor('document.querySelector(".roll-btn:not(:disabled)")','initial hydration releases loading');
  checks.push('initial hydration exception exposes error and releases loading');
  await writeFile(join(evidenceDir,'results.json'),JSON.stringify({status:'passed',checks,requests:page.requestLog.length,revealDurationMs,performance},null,2));
  console.log(checks.join('\n'));
}catch(error){
  if(chromium?.page) {
    await chromium.page.screenshot(join(evidenceDir,'failure.png')).catch(()=>{});
    await writeFile(join(evidenceDir,'failure.json'),JSON.stringify({message:error.message,console:chromium.page.consoleLog},null,2));
  }
  throw error;
}finally{
  if(chromium)await terminateProcess(chromium.child);
  if(server)await terminateProcess(server.child);
}
