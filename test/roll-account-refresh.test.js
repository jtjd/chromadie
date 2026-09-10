import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/lib/stores.js',import.meta.url),'utf8');
for(const [name,next] of [['fetchWalletBalance','function normalizeEntitlementKeys'],['fetchInventoryState','export async function refreshProfileState']]){
  test(`${name} preserves confirmed account data on a returned RPC error`,async()=>{
    const failure={message:'Network unavailable'};
    const state={supabase:{rpc:async()=>({data:null,error:failure}),from:()=>({select:()=>({eq:async()=>({data:null,error:failure})})})},
      walletBalance:{set:()=>assert.fail('wallet overwritten')},userInventory:{set:()=>assert.fail('inventory overwritten')},
      expandInventoryRows:()=>assert.fail('failed read was interpreted as empty inventory')};
    vm.createContext(state);
    vm.runInContext(source.slice(source.indexOf(`export async function ${name}`),source.indexOf(next,source.indexOf(`export async function ${name}`))).replace('export ',''),state);
    await assert.rejects(vm.runInContext(`${name}('a')`,state),error=>error.message===failure.message);
  });
}
