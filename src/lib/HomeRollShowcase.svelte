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
    <span>the daily roll</span>
    <span class="home-showcase__live"><i aria-hidden="true"></i> mythic result</span>
  </div>

  <div class="home-showcase__roll">
    <div class="home-showcase__orb" aria-hidden="true">
      <span class="home-showcase__orbit home-showcase__orbit--one"></span>
      <span class="home-showcase__orbit home-showcase__orbit--two"></span>
      <RollPreview displayColor="#B666C9" rarity="Mythic" size="game" />
    </div>
    <div class="home-showcase__result">
      <p class="home-showcase__label">daily color</p>
      <div class="home-showcase__identity"><strong>#B666C9</strong><span>MYTHIC</span></div>
      <p class="home-showcase__score">119,059 <small>EP</small></p>
      <div class="home-showcase__conditions" aria-label="Scoring conditions">
        {#each conditions as condition (condition.label)}
          <span><b aria-hidden="true">{condition.symbol}</b>{condition.label}<small>{condition.points}</small></span>
        {/each}
      </div>
    </div>
  </div>

  <div class="home-showcase__profile">
    <div>
      <p class="home-showcase__label">profile unlocked by play</p>
      <strong>your color becomes your profile.</strong>
    </div>
    <div class="home-showcase__rank">
      <span>discover</span>
      <b>#12</b>
      <small>today</small>
    </div>
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
  .home-showcase__heading, .home-showcase__identity, .home-showcase__profile, .home-showcase__rank { display: flex; align-items: center; }
  .home-showcase__heading { justify-content: space-between; color: var(--color-ink-faint); font: 500 0.68rem / 1 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .home-showcase__live { display: inline-flex; align-items: center; gap: 0.45rem; }
  .home-showcase__live i { width: 0.35rem; height: 0.35rem; border-radius: 50%; background: #d6ff63; box-shadow: 0 0 0.8rem rgba(214,255,99,0.72); }
  .home-showcase__roll { display: grid; grid-template-columns: 11rem minmax(0, 1fr); align-items: center; gap: 1.5rem; padding: 1.5rem 0 1.25rem; }
  .home-showcase__orb { position: relative; display: grid; place-items: center; min-height: 11rem; }
  .home-showcase__orb :global(.roll-effect-wrapper) { z-index: 1; width: 9rem; height: 9rem; animation: home-showcase-orb 4s ease-in-out infinite; }
  .home-showcase__orb :global(.final-color-display) { box-shadow: 0 0 2.5rem rgba(182,102,201,0.62), 0 0 7rem rgba(182,102,201,0.24); }
  .home-showcase__orbit { position: absolute; width: 9.8rem; height: 4.2rem; border: 1px solid rgba(222,184,255,0.46); border-radius: 50%; transform: rotate(-24deg); box-shadow: 0 0 1.3rem rgba(182,102,201,0.22); animation: home-showcase-orbit 5s linear infinite; }
  .home-showcase__orbit--two { width: 8rem; height: 10rem; transform: rotate(35deg); border-color: rgba(113,214,255,0.28); animation-duration: 7s; animation-direction: reverse; }
  .home-showcase__label { margin: 0; color: var(--color-ink-faint); font: 500 0.64rem / 1.2 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .home-showcase__identity { gap: 0.65rem; margin-top: 0.6rem; }
  .home-showcase__identity strong { font: 700 clamp(1.75rem, 4vw, 2.45rem) / 0.95 var(--font-display-stack); letter-spacing: -0.04em; }
  .home-showcase__identity span { padding: 0.24rem 0.42rem; border: 1px solid rgba(214,255,99,0.58); border-radius: 999px; color: #d6ff63; font: 600 0.56rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .home-showcase__score { margin: 0.85rem 0 0; color: #e7c5ff; font: 700 clamp(1.8rem, 4.5vw, 2.8rem) / 0.9 var(--font-display-stack); letter-spacing: -0.04em; }
  .home-showcase__score small { color: var(--color-ink-faint); font: 500 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .home-showcase__conditions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 1rem; }
  .home-showcase__conditions span { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.38rem 0.5rem; border: 1px solid rgba(182,102,201,0.3); border-radius: 999px; background: rgba(25,16,35,0.34); color: var(--color-ink-muted); font: 500 0.6rem / 1 var(--font-body-stack); }
  .home-showcase__conditions b { color: #e7c5ff; font-size: 0.65rem; }
  .home-showcase__conditions small { color: #d6ff63; font: 500 0.56rem / 1 var(--font-mono-stack); }
  .home-showcase__profile { justify-content: space-between; gap: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.12); }
  .home-showcase__profile strong { display: block; max-width: 16rem; margin-top: 0.4rem; color: var(--color-ink-muted); font: 500 0.88rem / 1.35 var(--font-body-stack); }
  .home-showcase__rank { gap: 0.45rem; color: var(--color-ink-faint); font: 500 0.62rem / 1 var(--font-mono-stack); text-transform: lowercase; }
  .home-showcase__rank b { color: #d6ff63; font: 700 1.25rem / 1 var(--font-display-stack); }
  .home-showcase__rank small { color: var(--color-ink-faint); font: inherit; }
  @keyframes home-showcase-orb { 0%, 100% { transform: translateY(0) scale(0.98); } 50% { transform: translateY(-5px) scale(1.02); } }
  @keyframes home-showcase-orbit { from { transform: rotate(-24deg) scale(0.94); } to { transform: rotate(336deg) scale(1.04); } }
  @media (max-width: 48rem) { .home-showcase { width: 100%; } }
  @media (max-width: 36rem) { .home-showcase__roll { grid-template-columns: 7rem minmax(0, 1fr); gap: 0.9rem; } .home-showcase__orb { min-height: 7rem; } .home-showcase__orb :global(.roll-effect-wrapper) { width: 6.4rem; height: 6.4rem; } .home-showcase__orbit { width: 7rem; height: 3rem; } .home-showcase__orbit--two { width: 5.8rem; height: 7rem; } .home-showcase__conditions span { font-size: 0.55rem; } }
  @media (prefers-reduced-motion: reduce) { .home-showcase__orb :global(.roll-effect-wrapper), .home-showcase__orbit { animation: none; } }
</style>
