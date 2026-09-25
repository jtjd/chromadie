<script>
  import { createEventDispatcher } from 'svelte';
  import RollTile from './RollTile.svelte';
  import { ROLL_REVEAL_STEPS } from './rollReveal.js';

  export let displayColor = '#222';
  export let displayHex = '#??????';
  export let rarity = 'Common';
  export let revealStep = 0;
  export let revealDetail = '';
  export let revealConditions = [];
  export let revealItemTotal = 0;
  export let displayScore = 0;
  export let scanProgress = 0;
  export let revealListElement = null;

  const dispatch = createEventDispatcher();
</script>

<div class="card roll-stage roll-stage--rolling" aria-live="polite">
  <div class="roll-card-header">
    <div class="roll-card-header__copy">
      <h2 class="roll-card-header__title">Daily Roll</h2>
      <p class="roll-card-header__meta">Processing today’s roll</p>
    </div>
    <span class="roll-mode-pill">IN PROGRESS</span>
  </div>
  <div class="roll-rolling-display" data-reveal-step={revealStep}>
    <RollTile displayColor={displayColor} {rarity} label="Color being rolled" />
    <h2 class="roll-stage__title">{revealStep === ROLL_REVEAL_STEPS.length - 1 ? 'Result ready.' : 'Generating today’s color.'}</h2>
    <div class="rolling-hex">{displayHex}</div>
    <p class="roll-stage__status" role="status">
      {revealDetail}
    </p>
    <div
      class="roll-reveal-discovery"
      class:roll-reveal-discovery--pending={revealStep < 1}
      aria-hidden={revealStep < 1}
      aria-label="Server-confirmed score conditions being revealed"
    >
      <div class="roll-reveal-discovery__header">
        <span>Condition breakdown</span>
        <strong>{`${revealConditions.length}/${revealItemTotal} conditions`}</strong>
      </div>
      <div class="roll-reveal-discovery__list" bind:this={revealListElement}>
        {#each revealConditions as item (item.id)}
          <div class="roll-reveal-discovery__item">
            <span class="roll-reveal-discovery__mark" aria-hidden="true">{item.symbol || '✦'}</span>
            <span>{item.label}</span>
            {#if item.points}<strong>+{item.points.toLocaleString()}</strong>{/if}
            {#if item.kind === 'condition' && item.conditionRarity}
              <em class="roll-reveal-discovery__rarity" data-rarity={item.conditionRarity.toLowerCase()}>{item.conditionRarity}</em>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    <div
      class="roll-score-reveal"
      class:roll-score-reveal--pending={revealStep < 2}
      aria-hidden={revealStep < 2}
      aria-live="polite"
    >
      <span>Confirmed score</span>
      <strong>{displayScore.toLocaleString()}</strong>
      <small>EP · counting live</small>
    </div>
  </div>
  <div class="scan-container" role="progressbar" aria-label="Daily roll reveal progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(scanProgress)}>
    <div class="scan-bar" style="width: {scanProgress}%"></div>
  </div>
  <button type="button" class="roll-reveal-skip" on:click={() => dispatch('skip')}>
    Skip reveal
  </button>
</div>

<style>
  .roll-rolling-display {
    position: relative;
    isolation: isolate;
    overflow: hidden;
  }
  .roll-rolling-display::before {
    position: absolute;
    z-index: -1;
    inset: 18% 12%;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--color-accent, #8b7cf6) 20%, transparent), transparent 68%);
    content: '';
    filter: blur(1rem);
    opacity: .65;
    animation: rollRevealGlow 3.2s ease-in-out infinite;
    pointer-events: none;
  }
  .roll-rolling-display > * { position: relative; z-index: 1; }
  .roll-reveal-discovery {
    display: grid;
    gap: 8px;
    width: min(100%, 360px);
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--color-line-subtle, #ffffff) 72%, transparent);
  }
  .roll-reveal-discovery__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-muted, #a4a4b5);
    font: 600 .62rem/1.2 var(--font-mono-stack);
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .roll-reveal-discovery__header strong {
    color: var(--color-ink-strong, #ffffff);
    font-weight: 600;
    white-space: nowrap;
  }
  .roll-reveal-discovery__list {
    display: grid;
    height: 174px;
    align-content: start;
    grid-auto-rows: max-content;
    gap: 5px;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    overflow-anchor: none;
    scroll-behavior: smooth;
  }
  .roll-reveal-discovery--pending,
  .roll-score-reveal--pending {
    visibility: hidden;
    pointer-events: none;
  }
  .roll-reveal-discovery__item {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 7px;
    min-height: 24px;
    padding: 4px 7px;
    border: 1px solid color-mix(in srgb, var(--color-accent, #8b7cf6) 18%, var(--card-border, rgba(255, 255, 255, .12)));
    border-radius: 7px;
    background: color-mix(in srgb, var(--color-accent, #8b7cf6) 6%, transparent);
    color: var(--text-muted, #a4a4b5);
    font-size: .68rem;
    animation: rollRevealCondition .48s cubic-bezier(.22, .8, .25, 1) both;
  }
  .roll-reveal-discovery__item > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .roll-reveal-discovery__mark { color: var(--color-accent-bright, #c4b5fd); text-align: center; }
  .roll-reveal-discovery__item strong { color: var(--roll-score-color, var(--color-earned, #f5c26f)); font: 600 .62rem/1 var(--font-mono-stack); white-space: nowrap; }
  .roll-reveal-discovery__rarity { color: var(--color-ink-muted, #a7a3b5); font: 700 .55rem/1 var(--font-mono-stack); letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
  .roll-score-reveal {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 7px;
    width: min(100%, 360px);
    margin-top: 12px;
    padding: 9px 11px;
    border: 1px solid color-mix(in srgb, var(--color-accent, #8b7cf6) 32%, var(--card-border, rgba(255, 255, 255, .12)));
    border-radius: 9px;
    background: color-mix(in srgb, var(--color-accent, #8b7cf6) 9%, transparent);
  }
  .roll-score-reveal span { color: var(--text-muted, #a4a4b5); font: 600 .62rem/1 var(--font-mono-stack); letter-spacing: .08em; text-transform: uppercase; }
  .roll-score-reveal strong { color: var(--roll-score-color, var(--color-earned, #f5c26f)); font: 600 1.35rem/1 var(--font-display-stack); letter-spacing: -.04em; }
  .roll-score-reveal small { color: var(--text-muted, #a4a4b5); font: 600 .58rem/1 var(--font-mono-stack); letter-spacing: .06em; text-transform: uppercase; }
  .roll-reveal-skip {
    align-self: center;
    min-height: 36px;
    margin-top: 8px;
    padding: 6px 10px;
    border: 1px solid var(--card-border, rgba(255, 255, 255, .12));
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #a4a4b5);
    cursor: pointer;
    font: 600 .68rem/1 var(--font-mono-stack);
    letter-spacing: .08em;
    text-transform: uppercase;
    transition: color 220ms ease, border-color 220ms ease, background 220ms ease;
  }
  .roll-reveal-skip:hover,
  .roll-reveal-skip:focus-visible {
    border-color: var(--color-accent, #8b7cf6);
    background: color-mix(in srgb, var(--color-accent, #8b7cf6) 10%, transparent);
    color: var(--color-ink-strong, #ffffff);
  }
  .roll-reveal-skip:focus-visible { outline: 2px solid var(--color-accent-bright, #c4b5fd); outline-offset: 3px; }
  @keyframes rollRevealGlow {
    0%, 100% { opacity: .45; transform: scale(.92); }
    50% { opacity: .8; transform: scale(1.08); }
  }
  @keyframes rollRevealCondition {
    from { opacity: 0; transform: translateY(4px) scale(.98); }
    to { opacity: 1; transform: none; }
  }

  @media (max-width: 600px) {
    .roll-reveal-discovery__header { font-size: .56rem; }
    .roll-reveal-discovery__list { height: 145px; }
    .roll-reveal-skip { width: 100%; }
    .rolling-hex {
      font-size: 1.35rem;
      letter-spacing: 2px;
      word-break: break-word;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-rolling-display::before { animation: none; }
    .roll-reveal-discovery__list { scroll-behavior: auto; }
    .roll-reveal-discovery__item { animation: none; }
    .roll-reveal-skip { transition: none; }
  }
</style>
