<script>
  import RollPreview from './RollPreview.svelte';

  const conditions = [
    { symbol: '◈', label: 'Rich Saturation', points: '+7,040' },
    { symbol: '✦', label: 'Hex Echo', points: '+7,007' },
    { symbol: '↗', label: 'Vivid Contrast', points: '+10,013' }
  ];
</script>

<div class="home-showcase" aria-label="A fictional Mythic daily roll and profile preview">
  <span class="home-showcase__sr-only">Fictional showcase content.</span>
  <div class="home-showcase__rule" aria-hidden="true"></div>
  <div class="home-showcase__heading">
    <span>public profile · neonuser</span>
    <span class="home-showcase__live"><i aria-hidden="true"></i> mythic result</span>
  </div>

  <div class="home-showcase__identity-card">
    <div class="home-showcase__avatar" aria-hidden="true"><span></span></div>
    <div class="home-showcase__identity-copy">
      <div class="home-showcase__identity-name"><strong>neonuser</strong><span>@neonuser</span></div>
      <p>Building a public profile one color at a time.</p>
      <div class="home-showcase__links"><span>GitHub</span><span>YouTube</span></div>
    </div>
    <span class="home-showcase__profile-rank">rank <b>#12</b></span>
  </div>

  <div class="home-showcase__roll">
    <div class="home-showcase__orb" aria-hidden="true">
      <span class="home-showcase__orbit home-showcase__orbit--one"></span>
      <span class="home-showcase__orbit home-showcase__orbit--two"></span>
      <RollPreview displayColor="#B666C9" rarity="Mythic" size="game" />
    </div>
    <div class="home-showcase__result">
      <p class="home-showcase__label">today’s roll · inside the profile</p>
      <div class="home-showcase__identity"><strong>#B666C9</strong><span>MYTHIC</span></div>
      <p class="home-showcase__score">119,059 <small>EP</small></p>
      <div class="home-showcase__conditions" aria-label="Scoring conditions">
        {#each conditions as condition (condition.label)}
          <span><b aria-hidden="true">{condition.symbol}</b>{condition.label}<small>{condition.points}</small></span>
        {/each}
      </div>
    </div>
  </div>

  <div class="home-showcase__effects" aria-label="Equipped profile effects">
    <span><i aria-hidden="true"></i> Rainfall</span>
    <span><i aria-hidden="true"></i> Chroma aura</span>
    <span><i aria-hidden="true"></i> Mythic border</span>
  </div>

  <div class="home-showcase__profile">
    <div>
      <p class="home-showcase__label">what a strong roll unlocks</p>
      <strong>A profile people can find, follow, and remember.</strong>
    </div>
    <span class="home-showcase__discover">visible on the leaderboard</span>
  </div>
</div>

<style>
  .home-showcase {
    position: relative;
    align-self: center;
    width: min(100%, 34rem);
    padding: 1.25rem 0 0;
    color: var(--color-ink-strong);
  }

  .home-showcase__sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .home-showcase__rule { height: 1px; margin-bottom: 1rem; background: rgba(255,255,255,0.14); }
  .home-showcase__heading, .home-showcase__identity, .home-showcase__profile { display: flex; align-items: center; }
  .home-showcase__heading { justify-content: space-between; color: var(--color-ink-faint); font: 500 0.68rem / 1 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .home-showcase__live { display: inline-flex; align-items: center; gap: 0.45rem; }
  .home-showcase__live i { width: 0.35rem; height: 0.35rem; border-radius: 50%; background: #d6ff63; box-shadow: 0 0 0.8rem rgba(214,255,99,0.72); }
  .home-showcase__identity-card { display: grid; grid-template-columns: 3.5rem minmax(0,1fr) auto; align-items: center; gap: 0.85rem; margin-top: 1.15rem; padding: 0.85rem; border: 1px solid rgba(196,181,253,0.34); border-radius: 0.8rem; background: linear-gradient(135deg, rgba(15,18,24,0.68), rgba(9,10,16,0.38)); box-shadow: 0 0 1.8rem rgba(139,124,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06); }
  .home-showcase__avatar { position: relative; display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 50%; background: radial-gradient(circle at 35% 25%, #f5dcff, #c46ee1 38%, #5941a9 72%, #141323); box-shadow: 0 0 1.5rem rgba(196,181,253,0.36); overflow: hidden; }
  .home-showcase__avatar::after { content: ''; position: absolute; width: 1.9rem; height: 2.2rem; background: linear-gradient(145deg, #fff0ff 0 26%, #d08be4 27% 54%, #5b4199 55%); clip-path: polygon(50% 0, 100% 86%, 75% 100%, 50% 74%, 25% 100%, 0 86%); opacity: 0.8; }
  .home-showcase__identity-copy { min-width: 0; }
  .home-showcase__identity-name { display: flex; align-items: baseline; gap: 0.45rem; }
  .home-showcase__identity-name strong { color: var(--color-ink-strong); font: 600 1rem / 1 var(--font-display-stack); }
  .home-showcase__identity-name span { color: var(--color-ink-faint); font: 500 0.58rem / 1 var(--font-mono-stack); }
  .home-showcase__identity-copy p { margin: 0.35rem 0 0; color: rgba(235,240,252,0.64); font: 500 0.68rem / 1.3 var(--font-body-stack); }
  .home-showcase__links { display: flex; gap: 0.65rem; margin-top: 0.4rem; color: var(--color-ink-faint); font: 500 0.56rem / 1 var(--font-mono-stack); }
  .home-showcase__links span { border-bottom: 1px solid rgba(255,255,255,0.18); padding-bottom: 0.15rem; }
  .home-showcase__profile-rank { color: var(--color-ink-faint); font: 500 0.62rem / 1 var(--font-mono-stack); text-transform: lowercase; }
  .home-showcase__profile-rank b { margin-left: 0.2rem; color: #d6ff63; font: 700 1.15rem / 1 var(--font-display-stack); }
  .home-showcase__roll { display: grid; grid-template-columns: 11rem minmax(0, 1fr); align-items: center; gap: 1.5rem; padding: 1.25rem 0 1.1rem; }
  .home-showcase__orb { position: relative; display: grid; place-items: center; min-height: 11rem; }
  .home-showcase__orb :global(.roll-effect-wrapper) { z-index: 1; width: 9rem; height: 9rem; animation: home-showcase-orb 4s ease-in-out infinite; }
  .home-showcase__orb :global(.final-color-display) { box-shadow: 0 0 2.5rem rgba(182,102,201,0.62), 0 0 7rem rgba(182,102,201,0.24); }
  .home-showcase__orbit { position: absolute; width: 9.8rem; height: 4.2rem; border: 1px solid rgba(222,184,255,0.46); border-radius: 50%; transform: rotate(-24deg); box-shadow: 0 0 1.3rem rgba(182,102,201,0.22); animation: home-showcase-orbit 5s linear infinite; }
  .home-showcase__orbit--two { width: 8rem; height: 10rem; transform: rotate(35deg); border-color: rgba(113,214,255,0.28); animation-duration: 7s; animation-direction: reverse; }
  .home-showcase__label { margin: 0; color: rgba(235,240,252,0.62); font: 500 0.68rem / 1.2 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .home-showcase__identity { gap: 0.65rem; margin-top: 0.6rem; }
  .home-showcase__identity strong { font: 700 clamp(1.75rem, 4vw, 2.45rem) / 0.95 var(--font-display-stack); letter-spacing: -0.04em; }
  .home-showcase__identity span { padding: 0.24rem 0.42rem; border: 1px solid rgba(214,255,99,0.58); border-radius: 999px; color: #d6ff63; font: 600 0.56rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .home-showcase__score { margin: 0.85rem 0 0; color: #e7c5ff; font: 700 clamp(1.8rem, 4.5vw, 2.8rem) / 0.9 var(--font-display-stack); letter-spacing: -0.04em; }
  .home-showcase__score small { color: var(--color-ink-faint); font: 500 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .home-showcase__conditions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 1rem; }
  .home-showcase__conditions span { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.38rem 0.5rem; border: 1px solid rgba(182,102,201,0.3); border-radius: 999px; background: rgba(25,16,35,0.34); color: rgba(235,240,252,0.74); font: 500 0.62rem / 1 var(--font-body-stack); }
  .home-showcase__conditions b { color: #e7c5ff; font-size: 0.65rem; }
  .home-showcase__conditions small { color: #d6ff63; font: 500 0.56rem / 1 var(--font-mono-stack); }
  .home-showcase__effects { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.8rem 0 1rem; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.12); }
  .home-showcase__effects span { display: inline-flex; align-items: center; gap: 0.35rem; color: rgba(235,240,252,0.64); font: 500 0.62rem / 1 var(--font-mono-stack); }
  .home-showcase__effects i { width: 0.38rem; height: 0.38rem; border-radius: 50%; background: #c4b5fd; box-shadow: 0 0 0.7rem rgba(196,181,253,0.72); }
  .home-showcase__profile { justify-content: space-between; gap: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.12); }
  .home-showcase__profile strong { display: block; max-width: 16rem; margin-top: 0.4rem; color: var(--color-ink-muted); font: 500 0.88rem / 1.35 var(--font-body-stack); }
  .home-showcase__discover { color: #d6ff63; font: 500 0.58rem / 1.25 var(--font-mono-stack); text-align: right; }
  @keyframes home-showcase-orb { 0%, 100% { transform: translateY(0) scale(0.98); } 50% { transform: translateY(-5px) scale(1.02); } }
  @keyframes home-showcase-orbit { from { transform: rotate(-24deg) scale(0.94); } to { transform: rotate(336deg) scale(1.04); } }
  @media (max-width: 48rem) { .home-showcase { width: 100%; } }
  @media (max-width: 36rem) { .home-showcase__identity-card { grid-template-columns: 3rem minmax(0, 1fr); align-items: start; } .home-showcase__avatar { width: 3rem; height: 3rem; } .home-showcase__profile-rank { grid-column: 2; } .home-showcase__roll { grid-template-columns: 7rem minmax(0, 1fr); gap: 0.9rem; } .home-showcase__orb { min-height: 7rem; } .home-showcase__orb :global(.roll-effect-wrapper) { width: 6.4rem; height: 6.4rem; } .home-showcase__orbit { width: 7rem; height: 3rem; } .home-showcase__orbit--two { width: 5.8rem; height: 7rem; } .home-showcase__conditions span { font-size: 0.55rem; } .home-showcase__profile { align-items: flex-start; flex-direction: column; gap: 0.55rem; } .home-showcase__discover { text-align: left; } }
  @media (prefers-reduced-motion: reduce) { .home-showcase__orb :global(.roll-effect-wrapper), .home-showcase__orbit { animation: none; } }
</style>
