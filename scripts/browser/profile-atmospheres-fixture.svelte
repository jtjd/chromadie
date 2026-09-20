<script>
  import AtmosphereLayer from '../../src/lib/profile-atmosphere/AtmosphereLayer.svelte';
  import ProfileEnvironmentLayer from '../../src/lib/ProfileEnvironmentLayer.svelte';
  import { PROFILE_ATMOSPHERE_DEFINITIONS } from '../../src/lib/profile-atmosphere/atmospheres.js';
  let key = 'dust-light';
  let animated = true;
  let hidden = false;
  let clicks = 0;
  let mode = 'studio';
  let compact = false;
</script>
<nav><select bind:value={key}>{#each Object.values(PROFILE_ATMOSPHERE_DEFINITIONS) as d (d.key)}<option value={d.key}>{d.label}</option>{/each}</select><button id="motion" on:click={() => animated = !animated}>Motion</button><button id="hide" on:click={() => hidden = !hidden}>Hide/show</button><button id="surface" on:click={() => mode = mode === 'studio' ? 'public' : 'studio'}>{mode}</button><button id="compact" on:click={() => compact = !compact}>Card</button><button id="action" on:click={() => clicks++}>Action {clicks}</button></nav>
<main style:display={hidden ? 'none' : 'grid'}>
  <ProfileEnvironmentLayer snapshot={{ environment: { atmosphereKey: key }, styles: { page: '--profile-background:radial-gradient(ellipse at 50% 40%,#21152e,#080910 80%)' } }} {mode} reducedMotion={!animated} />
  <div class="identity"><p class="eyebrow">CHROMADIE / ATMOSPHERE STUDIES</p><div class="avatar">a</div><h1>afterglow</h1><p>somewhere between a dream and a memory</p><a href="#links">my corner of the internet ↗</a><div class="swatch"></div><small>today’s color · #D872C7</small></div>
</main>
{#if compact}<aside class="compact"><AtmosphereLayer atmosphereKey={key} mode="card" /></aside>{/if}
<style>
  :global(body) { margin:0; background:#0b0913; color:#fcf5ff; font-family:system-ui,sans-serif; }
  :global(*) { box-sizing:border-box; } nav { position:relative; z-index:2; display:flex; gap:12px; padding:12px; background:#16121e; }
  .compact { position:relative; width:220px; height:150px; background:#171021; }
  select,button { background:#231d30; color:white; border:1px solid #4a3c59; padding:8px; border-radius:6px; }
  main { position:relative; transform:translateZ(0); min-height:calc(100vh - 60px); overflow:hidden; display:grid; place-items:center; background:radial-gradient(ellipse at 50% 40%,#21152e,#080910 80%); }
  .identity { position:relative; z-index:1; text-align:center; padding:32px; } .eyebrow { font-size:9px; letter-spacing:3px; color:#9d8dac; }
  .avatar { width:72px; height:72px; border-radius:50%; margin:35px auto 0; display:grid; place-items:center; font-size:40px; background:linear-gradient(140deg,#f4c2e9,#7552a2); color:#291e3b; }
  h1 { font-size:48px; letter-spacing:-2px; margin:12px; } .identity > p:not(.eyebrow) { font-size:12px; color:#b5a8c0; } a { display:block; color:#ead7f4; font-size:12px; text-decoration:none; margin:30px; }
  .swatch { width:130px; height:80px; background:#d872c7; margin:30px auto 12px; border-radius:9px; } small { font-size:10px; color:#b5a8c0; }
  @media(max-width:500px) { nav { gap:5px; flex-wrap:wrap; } select { max-width:145px; } button { font-size:10px; } h1 { font-size:40px; } .identity { padding:12px; } }
</style>
