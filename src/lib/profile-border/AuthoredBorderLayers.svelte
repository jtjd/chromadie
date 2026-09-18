<script>
  import { BORDER_MOTIFS, BORDER_ORNAMENTS } from './borderOrnaments.js';
  export let borderKey;
  export let active = true;
  export let compact = false;
  $: motif = BORDER_MOTIFS[borderKey];
  $: paths = BORDER_ORNAMENTS[motif] || [];
</script>

<!-- Decorative layers never move, recolor, obscure or intercept profile controls. -->
<div class="border-art" class:paused={!active} class:compact data-border-art={borderKey} data-border-style={motif} aria-hidden="true">
  <div class="rim"></div>
  <div class="thread"></div>
  {#each ['a', 'b'] as position (position)}
    <div class="ornament ornament-{position}">
      <svg viewBox="0 0 100 100" fill="none">
        <g class="illustration">
          {#each paths as path, index (index)}
            <path d={path.d} fill={path.fill || 'none'} stroke={path.stroke} stroke-width={path.width} transform={path.transform} stroke-linecap="round" stroke-linejoin="round" />
          {/each}
        </g>
      </svg>
    </div>
  {/each}
  {#each [0, 1, 2, 3] as particle (particle)}
    <svg class="mote mote-{particle}" viewBox="0 0 24 24">
      {#if motif === 'bow' || motif === 'heart'}
        <path d="M12 21C6 16 1 12 2 6C3 1 10 1 12 6C15 1 22 1 22 7C22 13 16 18 12 21Z" />
      {:else if motif === 'sakura'}
        <path d="M3 21C1 7 8 0 15 3L15 7L20 5C25 14 14 23 3 21Z" />
      {:else if motif === 'angel'}
        <path d="M10 0H14V8H18V10H24V14H18V16H14V24H10V16H6V14H0V10H6V8H10Z" />
      {:else if motif === 'shell'}
        <path d="M12 2C9 7 3 12 4 17C5 24 20 24 20 16C20 12 14 5 12 2Z" />
      {:else if motif === 'bloom'}
        <path d="M2 22C-1 8 7 1 23 1C23 16 14 24 2 22Z" />
      {:else}
        <path d="M12 1L14 9L22 12L14 14L12 23L10 14L2 12L10 10Z" />
      {/if}
    </svg>
  {/each}
</div>

<style>
  .border-art {
    --edge: 2px;
    --ink: #e7a6c0;
    --mote: #f498bb;
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    pointer-events: none;
    z-index: 2;
  }
  .rim, .thread {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: var(--edge);
    box-sizing: border-box;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
  }
  .rim { background: var(--ink); }
  .thread { inset: 5px; padding: 1px; opacity: .5; background: var(--ink); }
  .ornament {
    position: absolute;
    width: clamp(52px, 24%, 100px);
    height: auto;
    left: -13px;
    top: -13px;
    filter: drop-shadow(0 2px 2px #10091750);
  }
  .ornament svg { width: 100%; height: auto; overflow: visible; display: block; }
  .ornament-b { left: auto; top: auto; right: -13px; bottom: -13px; transform: rotate(180deg); }
  .illustration { transform-origin: 38px 38px; animation: illustration-sway 7s ease-in-out infinite alternate; }
  .ornament-b .illustration { animation-delay: -3.5s; }
  .mote {
    position: absolute;
    width: 9px;
    height: 12px;
    fill: var(--mote);
    left: -5px;
    top: 34%;
    opacity: .65;
    animation: edge-drift 7s ease-in-out infinite;
  }
  .mote-1 { left: auto; right: -6px; top: 68%; animation-delay: -3s; }
  .mote-2 { left: 25%; top: -5px; width: 7px; height: 7px; animation-delay: -5s; }
  .mote-3 { left: 75%; top: auto; bottom: -5px; width: 7px; height: 7px; animation-delay: -1s; }

  /* Rosette — satin loops, blush lace and a fine pearl edge. */
  [data-border-style='bow'] { --ink: #eb9dbd; --mote: #f992bb; }
  [data-border-style='bow'] .rim {
    inset: -3px;
    padding: 6px;
    background: radial-gradient(circle, #fff0ec 1.4px, #cd8ba2 2px, transparent 2.5px) 0 0 / 8px 8px;
  }
  [data-border-style='bow'] .thread { inset: 3px; opacity: .85; background: linear-gradient(90deg,#cf6494,#ffd1e0,#cf6494); }
  [data-border-style='bow'] .ornament-a { width: clamp(60px, 20%, 80px); top: -40px; left: 50%; transform: translateX(-50%); }
  [data-border-style='bow'] .ornament-b { width: 46px; bottom: -18px; right: 5px; transform: rotate(-14deg); }
  [data-border-style='bow'] .illustration { transform-origin: 50px 36px; }

  /* Love Letter — lipstick-red wax hearts and stitched stationery. */
  [data-border-style='heart'] { --ink: #ec527d; --mote: #ef436d; }
  [data-border-style='heart'] .rim { padding: 3px; background: linear-gradient(135deg,#fd9ab3,#a62045 35%,#f3b8c8 68%,#ef496e); }
  [data-border-style='heart'] .thread { inset: 7px; background: repeating-linear-gradient(90deg,#f4a5b8 0 4px,transparent 4px 9px); opacity: .7; }
  [data-border-style='heart'] .ornament-a { left: auto; right: -12px; top: -16px; width: 58px; transform: rotate(16deg); }
  [data-border-style='heart'] .ornament-b { left: -12px; right: auto; bottom: -17px; width: 49px; transform: rotate(-18deg); }
  [data-border-style='heart'] .illustration { animation-name: heart-beat; transform-origin: 50px 45px; animation-duration: 5s; }

  /* Sakura Diary — warm branches, painted blossoms and drifting petals. */
  [data-border-style='sakura'] { --ink: #cf849d; --mote: #ffc1da; }
  [data-border-style='sakura'] .rim { background: linear-gradient(125deg,#ffc0d8,#ac506d 26%,#754256 45%,#ffbad5 80%,#845067); }
  [data-border-style='sakura'] .thread { opacity: .18; inset: 4px; background: #f4d5b1; }
  [data-border-style='sakura'] .ornament { width: clamp(66px, 24%, 100px); }
  [data-border-style='sakura'] .mote { width: 12px; height: 16px; animation-name: petal-fall; animation-duration: 9s; }

  /* Manga Panel — off-white ink, red impact marks and screentone. */
  [data-border-style='manga'] { --ink: #ece6de; --mote: #eb344b; }
  [data-border-style='manga'] .rim { padding: 3px; background: linear-gradient(174deg,#fff9f0 25%,#a7a29c 25% 26%,#fff9f0 26% 76%,#282329 76% 77%,#eee7df 77%); }
  [data-border-style='manga'] .thread { inset: -5px 4px 4px -5px; opacity: .6; background: #e5ddd6; }
  [data-border-style='manga'] .ornament-a { left: auto; right: -16px; top: -18px; width: 72px; }
  [data-border-style='manga'] .ornament-b { left: -15px; right: auto; bottom: -15px; width: 48px; transform: rotate(175deg); }
  [data-border-style='manga'] .illustration { animation: ink-impact 8s steps(1) infinite; }
  [data-border-style='manga'] .mote { width: 3px; height: 24px; animation: ink-impact 8s steps(1) infinite; }
  [data-border-style='manga'] .mote-2, [data-border-style='manga'] .mote-3 { display: none; }

  /* Midnight Rose — crimson petals, tarnished silver and dark leaves. */
  [data-border-style='rose'] { --ink: #6c4b62; --mote: #b63a61; }
  [data-border-style='rose'] .rim { padding: 3px; background: linear-gradient(135deg,#aca0a5,#3c303d 30%,#95506c 62%,#a29b9d); }
  [data-border-style='rose'] .thread { inset: 6px; background: #933255; opacity: .4; }
  [data-border-style='rose'] .ornament { width: clamp(65px, 23%, 100px); }
  [data-border-style='rose'] .illustration { animation-name: rose-breathe; animation-duration: 9s; }
  [data-border-style='rose'] .mote { width: 5px; height: 8px; opacity: .5; }

  /* Blackthorn — cold, sharp vines; a black rim with tiny blood-red accents. */
  [data-border-style='thorn'] { --ink: #76717d; --mote: #a11d3e; }
  [data-border-style='thorn'] .rim { padding: 2px; background: linear-gradient(120deg,#b2aab7,#26212c 22%,#625665 55%,#aaa4af 80%,#312735); }
  [data-border-style='thorn'] .thread { inset: 5px; background: repeating-linear-gradient(135deg,#938995 0 1px,transparent 1px 13px); opacity: .55; }
  [data-border-style='thorn'] .illustration { animation-name: thorn-stir; animation-duration: 12s; }
  [data-border-style='thorn'] .mote { width: 4px; height: 10px; animation-name: dark-glint; }

  /* Web Angel — pixel wings, a lavender heart and old-web chrome. */
  [data-border-style='angel'] { --ink: #b8aacb; --mote: #ceafff; }
  [data-border-style='angel'] .rim { padding: 4px; background: linear-gradient(180deg,#faf3ff,#afa7c2 18%,#5b536d 48%,#c8bada 54%,#f6f0ff 80%,#8c819e); }
  [data-border-style='angel'] .thread { inset: 5px; opacity: .5; background: repeating-linear-gradient(90deg,#d0b4f9 0 2px,transparent 2px 4px); }
  [data-border-style='angel'] .ornament-a { width: 84px; left: calc(50% - 42px); top: -31px; }
  [data-border-style='angel'] .ornament-b { display: none; }
  [data-border-style='angel'] .illustration { animation: pixel-bob 4s steps(4) infinite; }
  [data-border-style='angel'] .mote { animation: pixel-twinkle 3s steps(2) infinite; width: 12px; height: 12px; }
  [data-border-style='angel'] .mote-2, [data-border-style='angel'] .mote-3 { width: 8px; height: 8px; }

  /* Afterhours — torn photocopy tape, pencil scratches and an acid-yellow doodle. */
  [data-border-style='zine'] { --ink: #ada8a2; --mote: #d8eb58; }
  [data-border-style='zine'] .rim {
    padding: 3px;
    background: repeating-linear-gradient(175deg,#aba6a0 0 3px,#49464a 3px 4px,#d4cec7 4px 8px,#211e25 8px 10px);
    clip-path: polygon(0 0,22% 1%,35% 0,67% 1%,100% 0,99.6% 32%,100% 55%,99.5% 79%,100% 100%,69% 99.5%,42% 100%,16% 99.5%,0 100%,.5% 62%,0 43%);
  }
  [data-border-style='zine'] .thread { inset: -4px 6px 5px -3px; opacity: .35; background: #e1dbce; }
  [data-border-style='zine'] .ornament { width: 72px; }
  [data-border-style='zine'] .illustration { animation: paper-lift 9s ease-in-out infinite; }
  [data-border-style='zine'] .mote { width: 9px; height: 9px; animation: print-grain 6s steps(1) infinite; }
  [data-border-style='zine'] .mote-2, [data-border-style='zine'] .mote-3 { display: none; }

  /* Sea Glass — translucent tide lines, shell ridges and small water drops. */
  [data-border-style='shell'] { --ink: #8ccabf; --mote: #b3e8e0; }
  [data-border-style='shell'] .rim { padding: 4px; background: linear-gradient(130deg,#dcf6e9,#64b9b3 20%,#5998b3 36%,#cedcce 52%,#eec9ac 73%,#72bdb9 88%,#dcf6e9); background-size: 220% 220%; animation: tide-light 14s ease-in-out infinite; }
  [data-border-style='shell'] .thread { inset: -3px; background: #bae7da; opacity: .3; }
  [data-border-style='shell'] .ornament-a { top: auto; bottom: -19px; left: auto; right: -15px; width: 70px; transform: rotate(-12deg); }
  [data-border-style='shell'] .ornament-b { left: -12px; right: auto; bottom: auto; top: -17px; width: 40px; transform: rotate(145deg); }
  [data-border-style='shell'] .illustration { animation: shell-float 10s ease-in-out infinite; transform-origin: 50px 70px; }
  [data-border-style='shell'] .mote { opacity: .65; width: 8px; height: 10px; }

  /* Wildflower — garden greens, periwinkle and butter-yellow flowers. */
  [data-border-style='bloom'] { --ink: #86a765; --mote: #99bb6d; }
  [data-border-style='bloom'] .rim { background: linear-gradient(120deg,#9fbc70,#4c7253 30%,#b7bf85 55%,#638963 80%,#9fbc70); }
  [data-border-style='bloom'] .thread { inset: 4px; opacity: .3; background: #cec698; }
  [data-border-style='bloom'] .ornament { width: clamp(65px, 23%, 100px); }
  [data-border-style='bloom'] .illustration { animation-duration: 8s; }
  [data-border-style='bloom'] .mote { width: 8px; height: 15px; animation: leaf-turn 8s ease-in-out infinite; }

  .compact .ornament { width: 40px; }
  .compact .ornament-a { top: -12px; left: -8px; right: auto; }
  .compact .ornament-b { bottom: -11px; right: -8px; left: auto; top: auto; }
  .compact[data-border-style='bow'] .ornament-a, .compact[data-border-style='angel'] .ornament-a { left: 50%; top: -20px; transform: translateX(-50%); }
  .compact[data-border-style='bow'] .ornament-b { display: none; }
  .compact[data-border-style='shell'] .ornament-a { top: auto; bottom: -12px; left: auto; right: -8px; }
  .compact .mote { width: 5px; height: 7px; }
  .compact .thread { inset: 3px; }
  .paused, .paused * { animation-play-state: paused !important; }

  @keyframes illustration-sway { from { transform: rotate(-1.5deg); } to { transform: rotate(2deg); } }
  @keyframes edge-drift { 0%,100% { transform: translateY(6px) rotate(-10deg); opacity:.35; } 50% { transform: translateY(-9px) rotate(14deg); opacity:.85; } }
  @keyframes heart-beat { 0%,70%,100% { transform: scale(1); } 80% { transform: scale(1.045); } 90% { transform: scale(1.01); } }
  @keyframes petal-fall { 0%,100% { transform: translate(0,-10px) rotate(-25deg); opacity:.25; } 50% { transform: translate(4px,13px) rotate(38deg); opacity:.9; } }
  @keyframes ink-impact { 0%,88%,100% { transform: translate(0,0); } 90% { transform: translate(1px,-1px); } 94% { transform: translate(-1px,0); } }
  @keyframes rose-breathe { from { transform: scale(.98) rotate(-1deg); } to { transform: scale(1.02) rotate(1deg); } }
  @keyframes thorn-stir { from { transform: rotate(-1deg); } to { transform: rotate(.8deg); } }
  @keyframes dark-glint { 0%,100% { opacity:.25; } 50% { opacity:.9; } }
  @keyframes pixel-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @keyframes pixel-twinkle { 0%,100% { opacity:.3; transform: scale(.8); } 50% { opacity:1; transform: scale(1); } }
  @keyframes paper-lift { 0%,100% { transform: rotate(-1deg); } 50% { transform: rotate(1.4deg); } }
  @keyframes print-grain { 0%,100% { opacity:.65; } 35% { opacity:.4; } 65% { opacity:.85; } }
  @keyframes tide-light { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
  @keyframes shell-float { 0%,100% { transform: rotate(-1deg) translateY(0); } 50% { transform: rotate(2deg) translateY(-2px); } }
  @keyframes leaf-turn { 0%,100% { transform: rotate(-20deg); } 50% { transform: rotate(15deg) translateY(-3px); } }
  @media (prefers-reduced-motion: reduce) {
    .border-art, .border-art * { animation: none !important; }
  }
</style>
