<script context="module">
  let atmosphereInstanceCounter = 0;
</script>

<script>
  import { onMount } from 'svelte';
  import { getAtmosphereDefinition } from './atmospheres.js';

  export let atmosphereKey = '';
  export let todayColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'profile';
  export let active = true;
  export let animated = true;
  export let className = '';

  const FALLBACK_COLORS = ['#8B7CF6', '#8DDCFF', '#B7FD4D', '#F7B7E2'];
  let reducedMotion = false;
  let visible = true;
  let mediaQuery;
  let mounted = false;
  let instanceId = 'atmosphere';

  const RAIN_WINDOW_VIDEO = '/atmospheres/rain-window/rain-window.webm';
  const RAIN_WINDOW_VIDEO_FALLBACK = '/atmospheres/rain-window/rain-window.mp4';
  const RAIN_WINDOW_POSTER = '/atmospheres/rain-window/rain-window-poster.png';

  $: definition = getAtmosphereDefinition(atmosphereKey);
  $: compact = mode === 'card' || mode === 'compact';
  $: motionActive = Boolean(active && animated && visible && !reducedMotion && !compact);
  $: colors = [todayColor, ...(Array.isArray(recentColors) ? recentColors : []), ...FALLBACK_COLORS]
    .map(color => /^#[0-9a-f]{6}$/i.test(String(color || '')) ? String(color).toUpperCase() : null)
    .filter(Boolean)
    .filter((color, index, list) => list.indexOf(color) === index)
    .slice(0, 4);
  $: style = [
    `--atmosphere-color-1:${colors[0] || FALLBACK_COLORS[0]}`,
    `--atmosphere-color-2:${colors[1] || FALLBACK_COLORS[1]}`,
    `--atmosphere-color-3:${colors[2] || FALLBACK_COLORS[2]}`,
    `--atmosphere-color-4:${colors[3] || FALLBACK_COLORS[3]}`,
    `--atmosphere-ribbon:url(#${instanceId}-ribbon)`,
    `--atmosphere-spectrum:url(#${instanceId}-spectrum)`,
    `--atmosphere-wash:url(#${instanceId}-wash)`,
    `--atmosphere-soft:url(#${instanceId}-soft)`
  ].join(';');
  $: classes = [
    'profile-atmosphere', className,
    definition ? `profile-atmosphere--${definition.key}` : 'profile-atmosphere--none',
    compact ? 'profile-atmosphere--compact' : '',
    motionActive ? 'profile-atmosphere--animated' : 'profile-atmosphere--static'
  ].filter(Boolean).join(' ');

  function updateReducedMotion(event) {
    reducedMotion = Boolean(event?.matches ?? mediaQuery?.matches);
  }

  function updateVisibility() {
    visible = document.visibilityState === 'visible';
  }

  onMount(() => {
    mounted = true;
    atmosphereInstanceCounter += 1;
    instanceId = `atmosphere-${atmosphereInstanceCounter}`;
    mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    updateReducedMotion();
    mediaQuery?.addEventListener?.('change', updateReducedMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      mediaQuery?.removeEventListener?.('change', updateReducedMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
      mounted = false;
    };
  });
</script>

{#if mounted && definition}
  <div class={classes} style={style} aria-hidden="true" data-atmosphere={definition.key}>
    {#if definition.key === 'rain-window'}
      {#if motionActive}
        <video class="profile-atmosphere__rain-video" autoplay muted loop playsinline preload="metadata" poster={RAIN_WINDOW_POSTER}>
          <source src={RAIN_WINDOW_VIDEO} type="video/webm" />
          <source src={RAIN_WINDOW_VIDEO_FALLBACK} type="video/mp4" />
        </video>
      {:else}
        <img class="profile-atmosphere__rain-video profile-atmosphere__rain-video--poster" src={RAIN_WINDOW_POSTER} alt="" />
      {/if}
    {:else}
      <svg class="profile-atmosphere__art" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id={`${instanceId}-ribbon`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--atmosphere-color-2)" stop-opacity=".08" />
          <stop offset=".48" stop-color="var(--atmosphere-color-1)" stop-opacity=".72" />
          <stop offset="1" stop-color="var(--atmosphere-color-4)" stop-opacity=".12" />
        </linearGradient>
        <linearGradient id={`${instanceId}-spectrum`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="var(--atmosphere-color-2)" />
          <stop offset=".36" stop-color="var(--atmosphere-color-1)" />
          <stop offset=".68" stop-color="var(--atmosphere-color-4)" />
          <stop offset="1" stop-color="var(--atmosphere-color-3)" />
        </linearGradient>
        <radialGradient id={`${instanceId}-wash`} cx="50%" cy="42%" r="64%">
          <stop offset="0" stop-color="var(--atmosphere-color-1)" stop-opacity=".24" />
          <stop offset=".62" stop-color="var(--atmosphere-color-2)" stop-opacity=".06" />
          <stop offset="1" stop-color="#020409" stop-opacity="0" />
        </radialGradient>
        <filter id={`${instanceId}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      {#if definition.key === 'signal-garden'}
        <path class="atmosphere-art__wash" d="M-80 550 C170 410 250 610 480 470 S840 230 1280 350" />
        <path class="atmosphere-art__signal atmosphere-art__signal--glow" d="M-40 490 C130 410 180 540 330 460 S580 260 790 360 S1030 470 1240 260" />
        <path class="atmosphere-art__signal atmosphere-art__signal--one" d="M-40 490 C130 410 180 540 330 460 S580 260 790 360 S1030 470 1240 260" />
        <path class="atmosphere-art__signal atmosphere-art__signal--two" d="M-30 595 C160 520 250 650 430 545 S710 330 910 430 S1120 540 1250 430" />
        <path class="atmosphere-art__signal atmosphere-art__signal--three" d="M70 160 C260 260 410 120 560 220 S760 380 980 190 S1120 100 1240 160" />
        <g class="atmosphere-art__signal-branches"><path d="M330 460V315" /><path d="M790 360V205" /><path d="M1020 430V295" /></g>
        <g class="atmosphere-art__nodes"><circle cx="270" cy="500" r="5" /><circle cx="330" cy="460" r="3" /><circle cx="770" cy="360" r="4" /><circle cx="790" cy="360" r="3" /><circle cx="1020" cy="430" r="5" /></g>
      {:else if definition.key === 'aurora-veil'}
        <ellipse class="atmosphere-art__aurora atmosphere-art__aurora--one" cx="350" cy="360" rx="390" ry="125" />
        <ellipse class="atmosphere-art__aurora atmosphere-art__aurora--two" cx="770" cy="300" rx="420" ry="120" />
        <path class="atmosphere-art__veil" d="M-80 510 C210 160 360 620 610 230 S980 80 1280 430" />
        <path class="atmosphere-art__veil atmosphere-art__veil--second" d="M-100 570 C160 190 390 650 640 270 S1010 120 1300 490" />
        <path class="atmosphere-art__veil atmosphere-art__veil--thin" d="M-100 570 C200 220 390 650 640 270 S1010 120 1300 490" />
        <g class="atmosphere-art__aurora-stars"><circle cx="185" cy="210" r="2" /><circle cx="930" cy="120" r="2.5" /><circle cx="1080" cy="440" r="1.7" /></g>
      {:else if definition.key === 'emberfall'}
        <ellipse class="atmosphere-art__ember-bed" cx="580" cy="690" rx="520" ry="170" />
        <g class="atmosphere-art__embers"><path d="M180 650 C140 520 210 470 176 360" /><path d="M390 680 C360 540 430 470 398 300" /><path d="M640 690 C590 540 670 470 650 260" /><path d="M880 680 C850 550 920 480 900 340" /><path d="M1070 680 C1010 560 1090 520 1060 410" /></g>
        <path class="atmosphere-art__ember-smoke" d="M90 630 C260 530 300 600 420 510 S720 500 820 570 S1080 520 1220 600" />
        <g class="atmosphere-art__sparks"><circle cx="182" cy="360" r="5" /><circle cx="399" cy="300" r="4" /><circle cx="651" cy="260" r="6" /><circle cx="900" cy="340" r="4" /><circle cx="1062" cy="410" r="5" /><path d="M270 430l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" /><path d="M760 225l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" /></g>
      {:else if definition.key === 'paper-archive'}
        <path class="atmosphere-art__paper-wash" d="M-40 500 C200 420 340 550 520 470 S820 280 1240 390 L1240 720 L-40 720Z" />
        <path class="atmosphere-art__paper-edge" d="M-20 510 C220 430 350 560 540 480 S840 290 1220 400" />
        <g class="atmosphere-art__rules"><path d="M80 145 H1120" /><path d="M160 190 H1040" /><path d="M40 580 H1180" /><path d="M120 625 H1040" /></g>
        <g class="atmosphere-art__registration"><path d="M210 100 v42 M190 121 h42" /><path d="M1010 515 v42 M990 536 h42" /></g>
        <path class="atmosphere-art__ink" d="M40 370 C260 250 420 460 600 320 S950 210 1200 330" />
        <g class="atmosphere-art__paper-ticks"><path d="M270 130v22M260 141h20" /><path d="M890 560v22M880 571h20" /></g>
      {:else if definition.key === 'prism-lens'}
        <path class="atmosphere-art__lens atmosphere-art__lens--one" d="M-80 540 L410 80 L640 110 L120 650Z" />
        <path class="atmosphere-art__lens atmosphere-art__lens--two" d="M420 760 L860 20 L1110 50 L650 780Z" />
        <path class="atmosphere-art__lens atmosphere-art__lens--three" d="M780 740 L1060 260 L1300 300 L1010 760Z" />
        <path class="atmosphere-art__lens atmosphere-art__lens--edge" d="M80 600L470 110M520 710L890 40M840 680L1120 290" />
        <circle class="atmosphere-art__lens-ring" cx="610" cy="350" r="160" />
      {:else if definition.key === 'lunar-tide'}
        <circle class="atmosphere-art__moon-shadow" cx="890" cy="180" r="118" />
        <circle class="atmosphere-art__moon" cx="855" cy="150" r="114" />
        <path class="atmosphere-art__moon-terminator" d="M855 36 A114 114 0 0 1 855 264 A74 114 0 0 0 855 36Z" />
        <g class="atmosphere-art__moon-craters"><ellipse cx="812" cy="115" rx="16" ry="9" /><ellipse cx="885" cy="185" rx="20" ry="11" /><circle cx="840" cy="210" r="8" /></g>
        <path class="atmosphere-art__orbit" d="M120 610 C300 290 700 270 1080 470" />
        <path class="atmosphere-art__orbit atmosphere-art__orbit--thin" d="M80 650 C330 350 690 330 1130 520" />
        <circle class="atmosphere-art__star" cx="230" cy="180" r="3" /><circle class="atmosphere-art__star" cx="500" cy="100" r="2" /><circle class="atmosphere-art__star" cx="1080" cy="350" r="3" /><circle class="atmosphere-art__star" cx="380" cy="420" r="1.5" /><circle class="atmosphere-art__star" cx="700" cy="90" r="1.8" />
      {:else if definition.key === 'color-memory'}
        <path class="atmosphere-art__memory atmosphere-art__memory--one" d="M-80 530 C230 350 340 640 600 420 S970 190 1280 360" />
        <path class="atmosphere-art__memory atmosphere-art__memory--two" d="M-80 590 C220 410 390 680 650 480 S980 260 1280 430" />
        <path class="atmosphere-art__memory atmosphere-art__memory--three" d="M-60 210 C230 380 420 50 700 250 S1010 440 1260 180" />
        <path class="atmosphere-art__memory atmosphere-art__memory--four" d="M-50 280 C180 120 420 330 650 180 S1010 80 1250 260" />
        <circle class="atmosphere-art__memory-ring" cx="600" cy="360" r="220" />
        <circle class="atmosphere-art__memory-ring atmosphere-art__memory-ring--inner" cx="600" cy="360" r="188" />
      {/if}
      </svg>
    {/if}
  </div>
{/if}

<style>
  /* Atmospheres are additive artwork. They must never tint or dim a user's uploaded background. */
  .profile-atmosphere { position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; isolation:isolate; opacity:1; background:transparent; }
  .profile-atmosphere--compact { opacity:1; }
  .profile-atmosphere__art { position:absolute; inset:-7%; width:114%; height:114%; opacity:.9; }
  /* The plate is black-backed so screen blending contributes only the authored
     highlights; it never washes or darkens the user's media underneath. */
  .profile-atmosphere__rain-video { position:absolute; inset:-6%; width:112%; height:112%; object-fit:cover; opacity:.34; mix-blend-mode:screen; filter:drop-shadow(0 0 7px var(--atmosphere-color-1)); }
  .profile-atmosphere__rain-video--poster { opacity:.28; }
  .profile-atmosphere__art path, .profile-atmosphere__art ellipse, .profile-atmosphere__art circle { vector-effect:non-scaling-stroke; }
  .atmosphere-art__wash { fill:none; stroke:var(--atmosphere-ribbon); stroke-width:86; opacity:.3; filter:var(--atmosphere-soft); }
  .atmosphere-art__signal { fill:none; stroke:var(--atmosphere-spectrum); stroke-linecap:round; stroke-width:2.5; opacity:.62; stroke-dasharray:2 16; }
  .atmosphere-art__signal--glow { stroke-width:18; opacity:.12; filter:var(--atmosphere-soft); stroke-dasharray:none; }
  .atmosphere-art__signal--two { opacity:.35; stroke-width:1.5; stroke-dasharray:1 25; }
  .atmosphere-art__signal--three { opacity:.26; stroke-width:1; stroke-dasharray:1 30; }
  .atmosphere-art__signal-branches { fill:none; stroke:var(--atmosphere-color-2); stroke-width:1; stroke-dasharray:2 8; opacity:.3; }
  .atmosphere-art__nodes circle { fill:var(--atmosphere-color-3); filter:drop-shadow(0 0 9px var(--atmosphere-color-3)); opacity:.75; }
  .atmosphere-art__aurora { fill:var(--atmosphere-ribbon); filter:var(--atmosphere-soft); opacity:.42; transform:rotate(-15deg); transform-origin:center; }
  .atmosphere-art__aurora--two { fill:var(--atmosphere-color-2); opacity:.22; transform:rotate(18deg); }
  .atmosphere-art__veil { fill:none; stroke:var(--atmosphere-ribbon); stroke-width:60; opacity:.42; filter:var(--atmosphere-soft); }
  .atmosphere-art__veil--second { stroke:var(--atmosphere-color-3); stroke-width:28; opacity:.2; filter:var(--atmosphere-soft); }
  .atmosphere-art__veil--thin { stroke-width:14; opacity:.34; filter:none; }
  .atmosphere-art__aurora-stars circle { fill:var(--atmosphere-color-4); filter:drop-shadow(0 0 8px var(--atmosphere-color-4)); opacity:.72; }
  .atmosphere-art__ember-bed { fill:var(--atmosphere-color-1); opacity:.12; filter:var(--atmosphere-soft); }
  .atmosphere-art__embers { fill:none; stroke:var(--atmosphere-spectrum); stroke-width:2; stroke-linecap:round; opacity:.34; }
  .atmosphere-art__ember-smoke { fill:none; stroke:var(--atmosphere-color-1); stroke-width:22; opacity:.1; filter:var(--atmosphere-soft); }
  .atmosphere-art__sparks { fill:var(--atmosphere-color-4); stroke:var(--atmosphere-color-4); filter:drop-shadow(0 0 8px var(--atmosphere-color-4)); opacity:.78; }
  .atmosphere-art__paper-wash { fill:var(--atmosphere-color-1); opacity:.08; }
  .atmosphere-art__paper-edge { fill:none; stroke:var(--atmosphere-color-3); stroke-width:2; opacity:.28; }
  .atmosphere-art__rules { fill:none; stroke:var(--atmosphere-color-2); stroke-width:1; stroke-dasharray:1 12; opacity:.22; }
  .atmosphere-art__registration { fill:none; stroke:var(--atmosphere-color-3); stroke-width:2; opacity:.4; }
  .atmosphere-art__ink { fill:none; stroke:var(--atmosphere-color-4); stroke-width:42; opacity:.08; filter:var(--atmosphere-soft); }
  .atmosphere-art__paper-ticks { fill:none; stroke:var(--atmosphere-color-4); stroke-width:1.5; opacity:.32; }
  .atmosphere-art__lens { stroke:var(--atmosphere-spectrum); stroke-width:1; opacity:.14; }
  .atmosphere-art__lens--one { fill:var(--atmosphere-color-2); }
  .atmosphere-art__lens--two { fill:var(--atmosphere-color-1); opacity:.11; }
  .atmosphere-art__lens--three { fill:var(--atmosphere-color-4); opacity:.1; }
  .atmosphere-art__lens--edge { fill:none; stroke-width:2; opacity:.4; stroke-dasharray:1 12; }
  .atmosphere-art__lens-ring { fill:none; stroke:var(--atmosphere-spectrum); stroke-width:2; stroke-dasharray:1 16; opacity:.35; }
  .atmosphere-art__moon-shadow { fill:var(--atmosphere-color-1); opacity:.2; filter:var(--atmosphere-soft); }
  .atmosphere-art__moon { fill:var(--atmosphere-color-2); opacity:.18; }
  .atmosphere-art__moon-terminator { fill:var(--atmosphere-color-1); opacity:.22; }
  .atmosphere-art__moon-craters { fill:var(--atmosphere-color-3); opacity:.12; }
  .atmosphere-art__orbit { fill:none; stroke:var(--atmosphere-spectrum); stroke-width:2; stroke-dasharray:1 22; opacity:.42; }
  .atmosphere-art__orbit--thin { stroke-width:1; opacity:.24; }
  .atmosphere-art__star { fill:var(--atmosphere-color-4); filter:drop-shadow(0 0 8px var(--atmosphere-color-4)); opacity:.74; }
  .atmosphere-art__memory { fill:none; stroke-width:32; stroke-linecap:round; opacity:.24; filter:var(--atmosphere-soft); }
  .atmosphere-art__memory--one { stroke:var(--atmosphere-color-1); }
  .atmosphere-art__memory--two { stroke:var(--atmosphere-color-2); opacity:.2; }
  .atmosphere-art__memory--three { stroke:var(--atmosphere-color-4); opacity:.18; }
  .atmosphere-art__memory--four { stroke:var(--atmosphere-color-3); opacity:.16; }
  .atmosphere-art__memory-ring { fill:none; stroke:var(--atmosphere-spectrum); stroke-width:1.5; stroke-dasharray:1 18; opacity:.5; }
  .atmosphere-art__memory-ring--inner { stroke:var(--atmosphere-color-3); opacity:.26; stroke-dasharray:2 24; }
  .profile-atmosphere--animated .atmosphere-art__signal { animation: atmosphere-signal 11s linear infinite; }
  .profile-atmosphere--animated .atmosphere-art__signal--glow { animation: atmosphere-signal-glow 6s ease-in-out infinite alternate; }
  .profile-atmosphere--animated .atmosphere-art__nodes { animation: atmosphere-nodes 4s ease-in-out infinite alternate; transform-origin: center; }
  .profile-atmosphere--animated .atmosphere-art__veil { animation: atmosphere-veil 14s ease-in-out infinite alternate; }
  .profile-atmosphere--animated .atmosphere-art__aurora-stars { animation: atmosphere-stars 6s ease-in-out infinite alternate; }
  .profile-atmosphere--animated .atmosphere-art__embers { animation: atmosphere-embers 7s ease-in-out infinite alternate; }
  .profile-atmosphere--animated .atmosphere-art__sparks { animation: atmosphere-sparks 4.5s ease-in-out infinite; }
  .profile-atmosphere--animated .atmosphere-art__ember-smoke { animation: atmosphere-smoke 8s ease-in-out infinite alternate; }
  .profile-atmosphere--animated .atmosphere-art__lens-ring { animation: atmosphere-spin 20s linear infinite; transform-origin:610px 350px; }
  .profile-atmosphere--animated .atmosphere-art__orbit { animation: atmosphere-orbit 18s ease-in-out infinite alternate; }
  .profile-atmosphere--animated .atmosphere-art__memory { animation: atmosphere-memory 12s ease-in-out infinite alternate; }
  .profile-atmosphere--animated .atmosphere-art__memory-ring { animation: atmosphere-memory-ring 18s linear infinite; transform-origin:600px 360px; }
  @keyframes atmosphere-signal { to { stroke-dashoffset:-170; } }
  @keyframes atmosphere-signal-glow { from { opacity:.08; } to { opacity:.2; } }
  @keyframes atmosphere-nodes { from { opacity:.72; } to { opacity:1; } }
  @keyframes atmosphere-veil { to { transform:translateX(5%) translateY(-2%) rotate(2deg); opacity:.68; } }
  @keyframes atmosphere-stars { from { opacity:.45; } to { opacity:.95; } }
  @keyframes atmosphere-embers { to { transform:translateY(-2%) scale(1.01); opacity:.62; } }
  @keyframes atmosphere-sparks { 0%,100% { opacity:.5; transform:translateY(3px); } 50% { opacity:1; transform:translateY(-5px); } }
  @keyframes atmosphere-smoke { from { opacity:.06; transform:translateY(2%); } to { opacity:.16; transform:translateY(-2%); } }
  @keyframes atmosphere-spin { to { transform:rotate(360deg); } }
  @keyframes atmosphere-orbit { to { transform:translateX(3%) translateY(-2%); } }
  @keyframes atmosphere-memory { to { stroke-dashoffset:-60; transform:translateY(-1%); } }
  @keyframes atmosphere-memory-ring { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .profile-atmosphere--animated .atmosphere-art__signal,
    .profile-atmosphere--animated .atmosphere-art__signal--glow,
    .profile-atmosphere--animated .atmosphere-art__nodes,
    .profile-atmosphere--animated .atmosphere-art__veil,
    .profile-atmosphere--animated .atmosphere-art__aurora-stars,
    .profile-atmosphere--animated .atmosphere-art__embers,
    .profile-atmosphere--animated .atmosphere-art__sparks,
    .profile-atmosphere--animated .atmosphere-art__ember-smoke,
    .profile-atmosphere--animated .atmosphere-art__lens-ring,
    .profile-atmosphere--animated .atmosphere-art__orbit,
    .profile-atmosphere--animated .atmosphere-art__memory,
    .profile-atmosphere--animated .atmosphere-art__memory-ring { animation:none !important; }
  }
</style>
