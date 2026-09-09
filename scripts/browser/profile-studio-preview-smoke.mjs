import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { startVite, startChromium, findAvailablePort, terminateProcess } from './cdp-harness.mjs';

const evidenceDir = '/tmp/chromadie-studio-preview';
await mkdir(evidenceDir, { recursive: true });
let server;
let browser;
try {
  const appPort = await findAvailablePort(5290);
  server = await startVite({ appPort, evidenceDir });
  browser = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort: await findAvailablePort(9420), evidenceDir, width: 1440, height: 1000 });
  const { page } = browser;
  await page.navigate(`http://127.0.0.1:${appPort}`);
  await page.evaluate(`(async () => {
    const api = await import('/scripts/browser/profile-layout-parity-fixture.js');
    document.body.replaceChildren();
    document.body.style.cssText='margin:0;background:#08090b;color:#fff';
    const previewHost=document.createElement('aside');
    previewHost.id='preview-host';
    previewHost.style.cssText='width:min(600px,100%);max-width:100%;height:calc(100vh - 116px);margin:64px 0 0 auto;padding:0 48px;box-sizing:border-box';
    document.body.append(previewHost);
    window.previewInstance=api.mount(api.studioPreview,{target:previewHost,props:{
      previewRenderSnapshot:{
        profile:{username:'harper',display_name:'Harper',bio:'Unity Game Developer'},
        identity:{username:'harper',displayName:'Harper',bio:'Unity Game Developer',showAvatar:true,descriptionMode:'plain',entryAnimation:'none'},
        appearance:{colors:{accent:'#8B7CF6'}},
        colors:{signature:'#8B7CF6',nameToday:'#8DDCFF',nameBase:'#FFFFFF',nameRecent:[]},
        links:{opening:[{type:'github',url:'https://github.com',label:'GitHub'},{type:'youtube',url:'https://youtube.com',label:'YouTube'}]},
        roll:{show:true,latest:{hex_code:'#8DDCFF',identity:'Bright Vivid Azure',rarity:'Uncommon'}},
        media:{},cosmetics:{profileMotionKey:'',name:null,avatarEffectKey:'',borderKey:''},surface:{style:''},
        layout:{variant:'compact'},configuration:{linkStyle:{}},typography:{profileWideNameFont:false}
      },activeSection:'customize',activeCustomizeTab:'appearance'
    }});
    window.measurePreview=()=>{
      const preview=document.querySelector('.profile-studio-preview');
      const canvas=document.querySelector('.profile-studio-preview__canvas');
      const card=document.querySelector('[data-profile-layout-content],.profile-reference-card');
      const rect=element=>{const box=element?.getBoundingClientRect();return box?{left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height}:null};
      const previewBox=rect(preview),canvasBox=rect(canvas),cardBox=rect(card);
      return {preview:previewBox,canvas:canvasBox,card:cardBox,centerOffset:canvasBox&&cardBox?((cardBox.top+cardBox.bottom)/2-(canvasBox.top+canvasBox.bottom)/2):null,legacy:Boolean(document.querySelector('.profile-studio-preview__header,.profile-studio-preview__footer,.profile-studio-preview__devices')),overflow:document.documentElement.scrollWidth>innerWidth+1||document.body.scrollWidth>innerWidth+1};
    };
  })()`);
  await page.waitFor('document.querySelector(".profile-studio-preview .profile-reference-card")', 'studio preview card');
  const desktop=await page.evaluate('window.measurePreview()');
  assert.equal(desktop.legacy,false,'removed preview chrome is absent');
  assert.ok(Math.abs(desktop.centerOffset||0)<1,'desktop specimen is vertically centered');
  assert.equal(desktop.overflow,false,'desktop preview is contained');
  await page.screenshot(`${evidenceDir}/desktop.png`);
  await page.setViewport(390,844);
  const mobile=await page.evaluate('window.measurePreview()');
  assert.equal(mobile.legacy,false,'mobile preview has no removed chrome');
  assert.equal(mobile.overflow,false,'mobile preview is contained');
  assert.ok((mobile.card?.width||0)>200,'mobile profile card remains readable');
  await page.screenshot(`${evidenceDir}/mobile.png`);
  console.log(`Studio preview passed: desktop center offset ${Math.round(desktop.centerOffset || 0)}px; mobile contained; screenshots: ${evidenceDir}`);
} finally {
  await browser?.page?.close();
  await terminateProcess(browser?.child, 'Chromium');
  await terminateProcess(server?.child, 'Vite');
}
