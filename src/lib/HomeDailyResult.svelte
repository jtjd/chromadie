<script>
  import CompactRollPreview from './CompactRollPreview.svelte';
  import { getOrbShape, getRollEffect } from './cosmetics.js';
  import { normalizeHexColor } from './utils.js';

  /** @type {any} */
  export let roll = null;
  export let staticEffect = false;

  $: hasResult = Boolean(roll?.hexCode && roll?.score !== null && roll?.score !== undefined);
  $: color = normalizeHexColor(roll?.hexCode, '#8B7CF6');
  $: cosmetics = roll?.equippedCosmetics || {};
  $: effect = getRollEffect(cosmetics);
  $: orb = getOrbShape(cosmetics);
  $: label = roll?.identity || 'Latest color';
  $: rank = roll?.rank ? `#${roll.rank} today` : 'Not ranked';

  function scrollToLeaderboard(event) {
    event.preventDefault();
    const target = document.getElementById('home-leaderboard');
    if (!target) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
</script>

<aside class="home-daily" style={`--home-daily-color: ${color};`} aria-label="Today’s color">
  <span class="home-daily__label">Today’s color</span>
  {#if hasResult}
    <div class="home-daily__body">
      <div class="home-daily__main">
        <div class="home-daily__effect-wrap">
          <CompactRollPreview
            displayColor={color}
            rarity={roll.rarity || 'Common'}
            effectCls={effect.cls}
            effectStyle={effect.style}
            orbCls={orb.cls}
            size="6.25rem"
            scale={0.7}
            referenceShape={true}
            {staticEffect}
          />
        </div>
        <h2>{label}</h2>
        <div class="home-daily__hex">{color} · {roll.rarity || 'Common'}</div>
      </div>
      <div class="home-daily__stats">
        <div><span>Score</span><strong>{Number(roll.score).toLocaleString()} EP</strong></div>
        <div><span>Position</span><strong>{rank}</strong></div>
      </div>
    </div>
  {:else}
    <div class="home-daily__empty" role="status">
      <div class="home-daily__empty-mark" aria-hidden="true"></div>
      <strong>Today’s result is still forming.</strong>
      <span>Live public roll data will appear here.</span>
    </div>
  {/if}
  <div class="home-daily__action">
    <a href="#home-leaderboard" on:click={scrollToLeaderboard}>View today’s profiles <span aria-hidden="true">↓</span></a>
  </div>
</aside>

<style>
  .home-daily { position: relative; display: flex; min-width: 0; flex-direction: column; justify-content: space-between; overflow: hidden; padding: 1.3rem 1.2rem; color: #efedf3; background: linear-gradient(180deg, #1a1c22 0%, #121419 100%); }
  .home-daily::before { position: absolute; top: 7%; bottom: 7%; left: 0; width: 1px; content: ''; background: linear-gradient(180deg, transparent, var(--home-daily-color) 28%, var(--home-daily-color) 72%, transparent); opacity: 0.75; }
  .home-daily::after { position: absolute; inset: 0; content: ''; pointer-events: none; background: linear-gradient(110deg, transparent 0 38%, rgba(255, 255, 255, 0.035) 47%, transparent 56% 100%); transform: translateX(-120%); animation: home-panel-sheen 7.5s 1.8s ease-in-out infinite; }
  .home-daily__label { position: relative; z-index: 1; color: #858a96; font: 0.625rem / 1 var(--home-mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .home-daily__body, .home-daily__main, .home-daily__stats, .home-daily__action { position: relative; z-index: 1; }
  .home-daily__main { padding: 1.25rem 0 1.0625rem; text-align: left; }
  .home-daily__effect-wrap { display: grid; width: 100%; min-height: 6.25rem; place-items: center; margin-bottom: 0.6875rem; }
  .home-daily__effect-wrap :global(.compact-roll-preview) { flex-basis: 6.25rem; width: 6.25rem; height: 6.25rem; }
  .home-daily h2 { margin: 0; color: #efedf3; font: 600 1.375rem / 1 var(--home-font); letter-spacing: -0.025em; }
  .home-daily__hex { margin-top: 0.5rem; color: #9297a3; font: 0.625rem / 1 var(--home-mono); }
  .home-daily__stats { margin-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.075); }
  .home-daily__stats > div { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.6875rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.075); }
  .home-daily__stats span { color: #8c919d; font: 0.5625rem / 1 var(--home-mono); letter-spacing: 0.08em; text-transform: uppercase; }
  .home-daily__stats strong { color: #f2eff5; font-size: 0.8125rem; }
  .home-daily__action { margin-top: auto; }
  .home-daily__action a { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.75rem 0; border-top: 1px solid rgba(255, 255, 255, 0.075); color: #d2d6e0; font: 0.625rem / 1 var(--home-mono); text-decoration: none; }
  .home-daily__action a:hover { color: #fff; }
  .home-daily__empty { position: relative; z-index: 1; display: grid; gap: 0.55rem; min-height: 17rem; align-content: center; color: #9297a3; }
  .home-daily__empty strong { color: #efedf3; font: 600 1rem / 1.15 var(--home-font); }
  .home-daily__empty span { font: 0.62rem / 1.4 var(--home-mono); }
  .home-daily__empty-mark { width: 4.5rem; height: 4.5rem; margin-bottom: 0.4rem; border: 1px solid rgba(205, 210, 255, 0.4); border-radius: 50%; box-shadow: 0 0 2.5rem rgba(205, 210, 255, 0.1); }
  @keyframes home-panel-sheen { 0%, 74% { transform: translateX(-120%); } 88%, 100% { transform: translateX(120%); } }
  @media (max-width: 67.5rem) {
    .home-daily { min-height: 15.5rem; padding-top: 1.1rem; }
    .home-daily__body { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); align-items: center; gap: 1rem; }
    .home-daily__main { display: grid; grid-template-columns: 6.25rem minmax(0, 1fr); align-items: center; gap: 0.45rem 0.85rem; padding: 0.85rem 0; }
    .home-daily__effect-wrap { grid-row: 1 / span 3; width: 6.25rem; margin: 0; }
    .home-daily h2, .home-daily__hex { grid-column: 2; }
    .home-daily__stats { margin-top: 0; }
    .home-daily__empty { min-height: 8rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-daily::after { animation: none; }
  }
</style>
