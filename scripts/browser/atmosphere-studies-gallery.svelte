<script>
  import AtmosphereLayer from '../../src/lib/profile-atmosphere/AtmosphereLayer.svelte';
  import { ATMOSPHERE_STUDIES } from '../../src/lib/profile-atmosphere/atmosphereStudies.js';
  let animated = false;
</script>

<header><p>CHROMADIE / COLLECTION 02</p><h1>Ten little worlds.</h1><div>Atmosphere studies for ten different moods. Open a scene to compare motion and mobile composition.</div><button on:click={() => animated = !animated}>{animated ? 'Pause motion' : 'Play motion'}</button></header>
<main>
  {#each ATMOSPHERE_STUDIES as study, i (study.key)}
    <a href={`./profile-atmospheres.html?effect=${study.key}`} aria-label={`Explore ${study.label}`}>
      <div class="scene"><AtmosphereLayer atmosphereKey={study.key} mode={animated ? 'profile' : 'card'} /><span class="initial">a</span><strong>afterglow</strong><span class="caption">a world of your own</span></div>
      <div class="label"><span>{String(i + 1).padStart(2, '0')}</span><h2>{study.label}</h2><span>↗</span></div><p>{study.description}</p>
    </a>
  {/each}
</main>
<style>
  :global(body) { margin:0; background:#0a0b10; color:#f0eff8; font-family:system-ui,sans-serif; }
  :global(*) { box-sizing:border-box; }
  header, main { max-width:1440px; margin:auto; padding:32px; }
  header p { color:#afa9c7; letter-spacing:.2em; font-size:11px; } h1 { font-size:44px; letter-spacing:-.045em; margin:12px 0; } header div { color:#aaa6bb; max-width:680px; line-height:1.5; }
  button { border:1px solid #5a5275; border-radius:20px; color:#f0e9ff; background:#272139; padding:9px 18px; margin-top:20px; cursor:pointer; }
  main { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:28px 18px; padding-top:0; }
  a { text-decoration:none; color:inherit; min-width:0; } a:focus-visible { outline:2px solid #ab99ff; outline-offset:6px; border-radius:12px; }
  .scene { position:relative; height:300px; overflow:hidden; border:1px solid #302b43; border-radius:14px; background:radial-gradient(ellipse at 50% 45%,#21172f,#090b14 80%); display:flex; align-items:center; justify-content:center; flex-direction:column; }
  .initial, strong, .caption { position:relative; z-index:1; } .initial { display:grid; place-items:center; width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#efb0d4,#6c5796); color:#251b36; font-size:24px; margin-bottom:8px; } strong { font-size:20px; letter-spacing:-.04em; } .caption { color:#b5a8c6; font-size:9px; margin-top:6px; }
  .label { display:flex; align-items:baseline; gap:8px; margin-top:12px; } h2 { font-size:14px; margin:0; flex:1; } .label span { font-size:10px; color:#9285af; } a>p { font-size:11px; line-height:1.55; color:#a39bb5; margin:7px 0 0; }
  @media(max-width:1000px) { main { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media(max-width:600px) { header,main { padding:20px; } main { grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px 12px; } .scene { height:240px; } h1 { font-size:36px; } }
  @media(prefers-reduced-motion:reduce) { button { display:none; } }
</style>
