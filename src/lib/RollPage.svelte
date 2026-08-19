<script>
  import { createEventDispatcher } from 'svelte';
  import Game from './Game.svelte';
  import { getRankState } from './ranks.js';

  const dispatch = createEventDispatcher();
  let gameSurface;
  let tiltFrame = null;
  let pendingPointer = null;
  let rollContext = {
    phase: 'preroll',
    identity: '',
    hex: '',
    rarity: '',
    score: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalRolls: 0,
    lifetimeEp: 0,
    isAuthenticated: false
  };

  $: contextHasResult = rollContext.phase === 'results' && Boolean(rollContext.identity);
  $: contextDay = Math.max(0, Number(rollContext.totalRolls) || Number(rollContext.currentStreak) || 0);
  $: contextRank = getRankState(rollContext.lifetimeEp);
  $: contextProgress = Math.round(contextRank.progress * 100);

  function forward(eventName, event) {
    dispatch(eventName, event.detail);
  }

  function handleRollState(event) {
    rollContext = { ...rollContext, ...(event.detail || {}) };
  }

  function resetCardParallax() {
    pendingPointer = null;
    if (tiltFrame) {
      cancelAnimationFrame(tiltFrame);
      tiltFrame = null;
    }

    const card = gameSurface?.querySelector('.game-container--dedicated .roll-stage');
    card?.style.setProperty('--roll-card-rotate-x', '0deg');
    card?.style.setProperty('--roll-card-rotate-y', '0deg');
    card?.style.setProperty('--roll-card-shift-x', '0px');
    card?.style.setProperty('--roll-card-shift-y', '0px');
  }

  function handleCardPointerMove(event) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resetCardParallax();
      return;
    }

    pendingPointer = { clientX: event.clientX, clientY: event.clientY };
    if (tiltFrame) return;

    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = null;
      const card = gameSurface?.querySelector('.game-container--dedicated .roll-stage');
      if (!card || !pendingPointer) return;

      const rect = card.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (pendingPointer.clientX - rect.left - rect.width / 2) / (rect.width / 2)));
      const y = Math.max(-1, Math.min(1, (pendingPointer.clientY - rect.top - rect.height / 2) / (rect.height / 2)));
      card.style.setProperty('--roll-card-rotate-x', `${y * -3.5}deg`);
      card.style.setProperty('--roll-card-rotate-y', `${x * 4.5}deg`);
      card.style.setProperty('--roll-card-shift-x', `${x * 2}px`);
      card.style.setProperty('--roll-card-shift-y', `${y * 2}px`);
    });
  }
</script>

<svelte:head>
  <title>Daily Roll · ChromaDie</title>
</svelte:head>

<div class="roll-page">
  <section
    bind:this={gameSurface}
    class="roll-page__game"
    aria-labelledby="roll-page-title"
    style={`--roll-context-accent: ${contextHasResult && rollContext.hex ? rollContext.hex : 'var(--white)'};`}
    on:pointermove={handleCardPointerMove}
    on:pointerleave={resetCardParallax}
  >
    <div class="roll-page__context" class:roll-page__context--result={contextHasResult} aria-live="polite">
      {#if contextHasResult}
        <p class="roll-page__eyebrow">{contextDay ? `DAY ${contextDay} · DAILY ROLL` : 'DAILY ROLL'}</p>
        <h1 id="roll-page-title">You rolled <span>{rollContext.identity}.</span></h1>
        <p class="roll-page__description">{rollContext.rarity || 'Daily'} roll · {Number(rollContext.score).toLocaleString()} score. This color is now part of your profile history.</p>
      {:else}
        <p class="roll-page__eyebrow">DAILY ROLL</p>
        <h1 id="roll-page-title">Keep your <span>color story.</span></h1>
        <p class="roll-page__description">Roll before the timer resets to add another scored color to your profile.</p>
      {/if}

      {#if rollContext.isAuthenticated}
        <div class="roll-page__streak">
          <span class="roll-page__streak-icon" aria-hidden="true">↻</span>
          <div>
            <strong>{rollContext.currentStreak > 0 ? `${rollContext.currentStreak}-day streak` : 'Start your streak'}</strong>
            <small>{rollContext.currentStreak > 0 ? 'Roll again before the timer runs out to keep it alive.' : 'Roll again tomorrow to keep it going.'}</small>
          </div>
        </div>

        <div class="roll-page__progression" aria-label="Profile progression">
          <div class="roll-page__progression-heading">
            <span>PROGRESSION</span>
            <strong>{contextRank.current.name}</strong>
          </div>
          <div class="roll-page__progression-bar" role="progressbar" aria-label={`${contextProgress}% toward ${contextRank.next?.name || 'the final rank'}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={contextProgress}>
            <span style={`width: ${contextProgress}%`}></span>
          </div>
          <small>{contextRank.next ? `${Math.max(0, contextRank.next.min - contextRank.lifetimeEp).toLocaleString()} EP to ${contextRank.next.name}` : 'Final rank reached'}</small>
        </div>

        <a class="roll-page__history-link" href="/profile/settings#progression">View your roll history <span aria-hidden="true">→</span></a>
      {/if}
    </div>
    <Game
      dedicated={true}
      on:navigate={event => forward('navigate', event)}
      on:promptlogin={event => forward('promptlogin', event)}
      on:rollstate={handleRollState}
    />
  </section>
</div>

<style>
  :global(body:has(.roll-page)),
  :global(.app-shell--site:has(.roll-page)),
  :global(.app-main--site:has(.roll-page)) {
    background-color: var(--bg, #0e0e10);
    background-image: none;
  }

  :global(.app-shell--site:has(.roll-page) .site-footer) {
    --site-footer-border: var(--border);
    --site-footer-muted: var(--text-muted);
    --site-footer-ink: var(--text);
    background: transparent;
  }

  .roll-page {
    --roll-bg: var(--bg, #0e0e10);
    --roll-panel-card: var(--surface, #161619);
    --roll-border: var(--border, rgba(255, 255, 255, .09));
    --roll-border-highlight: var(--border, rgba(255, 255, 255, .09));
    --roll-text: var(--text, #f5f5f6);
    --roll-muted: var(--text-muted, #8d8c92);
    --roll-faint: var(--text-faint, #59585e);
    --roll-accent: var(--white, #fff);
    --roll-accent-glow: rgba(255, 255, 255, .09);
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: calc(100dvh - 88px);
    overflow: hidden;
    padding: 40px 20px 80px;
    background: transparent;
    color: var(--roll-text);
    font-family: var(--site-font, 'Inter', sans-serif);
  }

  .roll-page::before {
    position: fixed;
    inset: 0;
    z-index: 0;
    content: '';
    background: var(--roll-bg);
    pointer-events: none;
  }

  .roll-page__game {
    position: relative;
    z-index: 10;
    display: grid;
    grid-template-columns: minmax(280px, 400px) minmax(360px, 420px);
    align-items: center;
    justify-content: center;
    gap: clamp(44px, 6vw, 88px);
    width: min(100%, 980px);
    margin-inline: auto;
    perspective: 1200px;
    perspective-origin: center;
  }

  .roll-page__context {
    width: min(100%, 400px);
    color: var(--roll-text);
  }

  .roll-page__eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    color: var(--roll-accent);
    font: 600 .68rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .12em;
  }

  .roll-page__eyebrow::before {
    width: 24px;
    height: 1px;
    content: '';
    background: var(--roll-accent);
    box-shadow: 0 0 12px var(--roll-accent-glow);
  }

  .roll-page__context h1 {
    max-width: 100%;
    margin: 20px 0 0;
    color: var(--roll-text);
    font: 700 clamp(2.6rem, 4vw, 3.5rem)/.96 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: -.06em;
  }

  .roll-page__context h1 span {
    color: var(--roll-context-accent);
  }

  .roll-page__description {
    max-width: 31ch;
    margin: 24px 0 0;
    color: var(--roll-muted);
    font: 400 .95rem/1.55 var(--site-font, 'Inter', sans-serif);
  }

  .roll-page__streak {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
    padding: 12px 14px;
    border: 1px solid var(--roll-border);
    border-radius: 12px;
    background: var(--surface, #161619);
  }

  .roll-page__streak-icon {
    display: grid;
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    place-items: center;
    border-radius: 9px;
    background: var(--border-soft, rgba(255, 255, 255, .05));
    color: var(--roll-accent);
    font: 700 .9rem/1 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-page__streak div {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .roll-page__streak strong {
    color: var(--roll-text);
    font: 700 .82rem/1.1 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-page__streak small,
  .roll-page__progression small {
    color: var(--roll-muted);
    font: 400 .7rem/1.35 var(--site-font, 'Inter', sans-serif);
  }

  .roll-page__progression {
    display: grid;
    gap: 9px;
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid var(--roll-border);
  }

  .roll-page__progression-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .roll-page__progression-heading span {
    color: var(--roll-accent);
    font: 600 .64rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .12em;
  }

  .roll-page__progression-heading strong {
    color: var(--roll-text);
    font: 700 .78rem/1 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-page__progression-bar {
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--roll-border);
  }

  .roll-page__progression-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--roll-context-accent);
    box-shadow: 0 0 10px var(--roll-accent-glow);
  }

  .roll-page__history-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    margin-top: 22px;
    color: var(--roll-muted);
    font: 500 .78rem/1.2 var(--site-font, 'Inter', sans-serif);
    text-decoration: none;
  }

  .roll-page__history-link:hover,
  .roll-page__history-link:focus-visible {
    color: var(--roll-text);
  }

  .roll-page :global(.game-container--dedicated) {
    --roll-rarity: var(--roll-accent);
    width: 100%;
    max-width: 420px !important;
    min-height: 0;
    margin: 0;
    padding: 0;
  }

  .roll-page :global(.game-container--dedicated.roll-rarity--Trash) {
    --roll-rarity: #aaa9b8;
  }

  .roll-page :global(.game-container--dedicated.roll-rarity--Common) {
    --roll-rarity: #dedce8;
  }

  .roll-page :global(.game-container--dedicated.roll-rarity--Uncommon) {
    --roll-rarity: #6ee2a4;
  }

  .roll-page :global(.game-container--dedicated.roll-rarity--Rare) {
    --roll-rarity: #84aaff;
  }

  .roll-page :global(.game-container--dedicated.roll-rarity--Epic) {
    --roll-rarity: #d8a6ff;
  }

  .roll-page :global(.game-container--dedicated.roll-rarity--Anomaly) {
    --roll-rarity: #ff9a66;
  }

  .roll-page :global(.game-container--dedicated.roll-rarity--Mythic) {
    --roll-rarity: #f4cd76;
  }

  .roll-page :global(.game-container--dedicated .roll-stage--results) {
    --roll-accent: var(--roll-result-color, var(--white));
    --roll-accent-glow: color-mix(in srgb, var(--roll-result-color, var(--white)) 16%, transparent);
  }

  .roll-page :global(.game-container--dedicated .roll-stage) {
    --roll-card-rotate-x: 0deg;
    --roll-card-rotate-y: 0deg;
    --roll-card-shift-x: 0px;
    --roll-card-shift-y: 0px;
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    margin: 0;
    padding: 32px;
    border: 1px solid var(--roll-border);
    border-radius: 24px;
    background: var(--roll-panel-card);
    box-shadow: 0 28px 70px -30px rgba(0, 0, 0, .8), 0 0 34px var(--roll-accent-glow);
    color: var(--roll-text);
    text-align: left;
    backdrop-filter: saturate(180%) blur(30px);
    -webkit-backdrop-filter: saturate(180%) blur(30px);
    transform: translate3d(var(--roll-card-shift-x), var(--roll-card-shift-y), 0) rotateX(var(--roll-card-rotate-x)) rotateY(var(--roll-card-rotate-y));
    transform-style: preserve-3d;
    transition: transform 180ms ease-out;
    will-change: transform;
  }

  .roll-page :global(.game-container--dedicated .roll-stage::before) { display: none; }

  .roll-page :global(.game-container--dedicated .roll-card-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .roll-page :global(.game-container--dedicated .roll-card-header__title) {
    margin: 0;
    color: var(--roll-text);
    font: 700 1.3rem/1.15 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: -.02em;
  }

  .roll-page :global(.game-container--dedicated .roll-card-header__meta) {
    margin: 4px 0 0;
    color: var(--roll-muted);
    font: 500 .75rem/1 var(--site-font, 'Inter', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .roll-mode-pill) {
    flex: 0 0 auto;
    padding: 6px 12px;
    border: 1px solid var(--roll-accent);
    border-radius: 6px;
    background: var(--border-soft);
    color: var(--roll-accent);
    font: 600 .7rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .05em;
    text-transform: uppercase;
  }

  .roll-page :global(.game-container--dedicated .roll-display) {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    border: 1px solid var(--roll-border);
    border-radius: 16px;
    background: var(--surface-2);
  }

  .roll-page :global(.game-container--dedicated .roll-tile) {
    position: relative;
    flex: 0 0 88px;
    width: 88px;
    height: 88px;
    margin: 0;
    filter: none;
  }

  .roll-page :global(.game-container--dedicated .roll-tile::before) { display: none; }

  .roll-page :global(.game-container--dedicated .roll-tile__surface) {
    position: absolute;
    inset: 0;
    transform: none;
  }

  .roll-page :global(.game-container--dedicated .roll-tile__face) {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 12px;
    background: var(--roll-tile-color);
    box-shadow: 0 10px 28px color-mix(in srgb, var(--roll-tile-color) 20%, transparent);
  }

  .roll-page :global(.game-container--dedicated .roll-color-info) {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 6px;
  }

  .roll-page :global(.game-container--dedicated .roll-color-rarity) {
    color: var(--roll-rarity);
    font: 600 .7rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .02em;
    text-shadow: 0 0 12px color-mix(in srgb, var(--roll-rarity) 70%, transparent);
  }

  .roll-page :global(.game-container--dedicated .roll-color-name) {
    margin: 0;
    overflow: hidden;
    overflow-wrap: anywhere;
    color: var(--roll-text);
    font: 800 1.32rem/1.05 var(--site-display, 'Manrope', sans-serif) !important;
    letter-spacing: -.035em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .roll-page :global(.game-container--dedicated .roll-color-hex) {
    color: var(--roll-muted);
    font: 400 .85rem/1 var(--site-font, 'Inter', sans-serif);
    font-variant-numeric: tabular-nums;
  }

  .roll-page :global(.game-container--dedicated .roll-result-meta) {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .roll-page :global(.game-container--dedicated .roll-attr-tags) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .roll-page :global(.game-container--dedicated .roll-attr-tag) {
    padding: 4px 8px;
    border: 1px solid var(--roll-border);
    border-radius: 4px;
    background: rgba(255, 255, 255, .05);
    color: var(--roll-muted);
    font: 500 .7rem/1 var(--site-font, 'Inter', sans-serif);
    white-space: nowrap;
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown) {
    padding: 20px;
    border: 1px solid var(--roll-border);
    border-radius: 16px;
    background: var(--surface-2);
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__header),
  .roll-page :global(.game-container--dedicated .badges-title) {
    margin-bottom: 16px;
    color: var(--roll-muted);
    font: 700 .85rem/1 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__list) {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__row) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 24px;
    color: var(--roll-text);
    font: 500 .9rem/1.2 var(--site-font, 'Inter', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__label),
  .roll-page :global(.game-container--dedicated .badge-text) {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
    color: var(--roll-text);
    font: 500 .9rem/1.2 var(--site-font, 'Inter', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__icon) {
    display: inline-flex;
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: rgba(255, 255, 255, .05);
    color: var(--roll-rarity);
    font-size: .8rem;
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__value) {
    flex: 0 0 auto;
    color: var(--roll-text);
    font: 600 .9rem/1.2 var(--site-font, 'Inter', sans-serif);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__points) {
    margin-left: 4px;
    color: var(--roll-muted);
    font-size: .75rem;
    font-weight: 400;
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__row--total) {
    margin-top: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--roll-border);
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__row--total .roll-breakdown__label) {
    font: 700 1rem/1 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .roll-breakdown__row--total .roll-breakdown__value) {
    color: var(--roll-accent);
    font: 800 1.2rem/1 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .roll-action__button) {
    display: flex;
    width: 100%;
    min-height: 54px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px;
    border: 0;
    border-radius: 12px;
    background: var(--roll-accent);
    color: #fff;
    box-shadow: 0 4px 20px var(--roll-accent-glow);
    font: 700 1.1rem/1 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: -.01em;
  }

  .roll-page :global(.game-container--dedicated .roll-action__button:hover:not(:disabled)) {
    background: var(--roll-accent);
    box-shadow: 0 8px 30px var(--roll-accent-glow);
    transform: translateY(-2px);
  }

  .roll-page :global(.game-container--dedicated .roll-stage--preroll .roll-action__button:not(:disabled)) {
    background: var(--white);
    color: var(--bg);
    box-shadow: 0 6px 22px rgba(0, 0, 0, .2);
  }

  .roll-page :global(.game-container--dedicated .roll-stage--preroll .roll-action__button:hover:not(:disabled)) {
    background: var(--white);
    color: var(--bg);
    box-shadow: 0 9px 26px rgba(0, 0, 0, .24);
  }

  .roll-page :global(.game-container--dedicated .roll-button-glyph) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: 0;
    font-size: 1.2rem;
    line-height: 1;
  }

  .roll-page :global(.game-container--dedicated .roll-action__button:disabled) {
    background: rgba(255, 255, 255, .1);
    color: var(--roll-muted);
    cursor: wait;
    box-shadow: none;
    transform: none;
  }

  .roll-page :global(.game-container--dedicated .roll-action__button--claimed),
  .roll-page :global(.game-container--dedicated .roll-action__button--claimed:disabled) {
    background: var(--roll-accent);
    color: #fff;
    cursor: default;
    box-shadow: 0 4px 20px var(--roll-accent-glow);
    opacity: 1;
  }

  .roll-page :global(.game-container--dedicated .guest-prompt) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin: 0 !important;
    padding: 24px 0 0;
    border: 0;
    border-top: 1px solid var(--roll-border);
    border-radius: 0;
    background: transparent;
    text-align: center;
  }

  .roll-page :global(.game-container--dedicated .guest-prompt-copy) {
    max-width: 32rem;
    color: var(--roll-muted);
    font: 400 .85rem/1.4 var(--site-font, 'Inter', sans-serif);
    text-align: center;
  }

  .roll-page :global(.game-container--dedicated .guest-prompt__button) {
    width: 100%;
    min-height: 54px;
    margin: 0;
    padding: 16px;
    border: 0;
    border-radius: 12px;
    background: #fff;
    color: #000;
    font: 700 1.1rem/1 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: -.01em;
  }

  .roll-page :global(.game-container--dedicated .guest-prompt__button:hover:not(:disabled)) {
    background: #fff;
    transform: translateY(-2px);
  }

  .roll-page :global(.game-container--dedicated .roll-detail-grid) {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    margin: 0;
  }

  .roll-page :global(.game-container--dedicated .roll-stage--results > .roll-display) { order: 0; }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .roll-breakdown) { order: 1; }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .roll-action__button) { order: 2; }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .cotw-success-banner) { order: 3; }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .roll-detail-grid),
  .roll-page :global(.game-container--dedicated .roll-stage--results > .milestone-banner),
  .roll-page :global(.game-container--dedicated .roll-stage--results > .local-progress-banner),
  .roll-page :global(.game-container--dedicated .roll-stage--results > .studio-onboarding) { order: 5; }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .guest-prompt) { order: 6; }

  .roll-page :global(.game-container--dedicated .roll-detail-section) {
    min-width: 0;
    margin: 0 !important;
    padding: 20px;
    border: 1px solid var(--roll-border);
    border-radius: 16px;
    background: var(--surface-2);
  }

  .roll-page :global(.game-container--dedicated .roll-detail-section__heading) {
    margin: 0;
  }

  .roll-page :global(.game-container--dedicated .roll-detail-section .badges-subtitle) {
    margin: -8px 0 16px;
    color: var(--roll-muted);
    font: 400 .75rem/1.4 var(--site-font, 'Inter', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .roll-score-total) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--roll-border);
    color: var(--roll-text);
    font: 700 1rem/1 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .roll-score-total strong) {
    color: var(--roll-accent);
    font: 800 1.2rem/1 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .roll-score-total small) {
    color: color-mix(in srgb, var(--roll-accent) 60%, transparent);
    font: 400 .75rem/1 var(--site-font, 'Inter', sans-serif);
  }

  .roll-page :global(.game-container--dedicated .cotw-success-banner),
  .roll-page :global(.game-container--dedicated .milestone-banner),
  .roll-page :global(.game-container--dedicated .local-progress-banner) {
    width: 100%;
    margin: 0;
    padding: 12px 14px;
    border: 1px solid var(--roll-border);
    border-radius: 9px;
    background: var(--surface-2);
    color: var(--roll-muted);
    font: 500 .75rem/1.45 var(--site-font, 'Inter', sans-serif);
    text-align: left;
  }

  .roll-page :global(.game-container--dedicated .cotw-widget) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    margin: 0;
    padding: 12px 13px;
    border: 1px solid var(--roll-border);
    border-radius: 9px;
    background: var(--surface);
  }

  .roll-page :global(.game-container--dedicated .cotw-title) { color: var(--roll-accent); font: 700 .75rem/1.1 var(--site-display); }
  .roll-page :global(.game-container--dedicated .cotw-desc) { color: var(--roll-muted); font: 400 .7rem/1.35 var(--site-font); }
  .roll-page :global(.game-container--dedicated .cotw-desc strong) { color: var(--roll-accent); }
  .roll-page :global(.game-container--dedicated .cotw-swatch) { width: 44px; height: 44px; border: 1px solid var(--roll-border); border-radius: 6px; }

  .roll-page :global(.game-container--dedicated .roll-stage--rolling) {
    min-height: 520px;
    justify-content: center;
  }

  .roll-page :global(.game-container--dedicated .roll-rolling-display) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .roll-page :global(.game-container--dedicated .roll-rolling-display .roll-tile) { margin-bottom: 8px; }
  .roll-page :global(.game-container--dedicated .roll-stage__eyebrow) { color: var(--roll-rarity); font: 600 .7rem/1 var(--site-font); letter-spacing: .1em; text-transform: uppercase; }
  .roll-page :global(.game-container--dedicated .roll-stage__title) { margin: 0; color: var(--roll-text); font: 800 1.6rem/1 var(--site-display) !important; letter-spacing: -.02em; }
  .roll-page :global(.game-container--dedicated .rolling-hex) { color: var(--roll-text); font: 600 1rem/1 var(--site-font); letter-spacing: .1em; }
  .roll-page :global(.game-container--dedicated .roll-stage__status) { margin: 0; color: var(--roll-muted); font: 400 .75rem/1.4 var(--site-font); }
  .roll-page :global(.game-container--dedicated .scan-container) { width: 100%; height: 2px; margin: 0; background: var(--roll-border); }
  .roll-page :global(.game-container--dedicated .scan-bar) { background: var(--roll-accent); box-shadow: 0 0 12px var(--roll-accent-glow); }
  .roll-page :global(.game-container--dedicated .roll-progress-label) { display: flex; justify-content: space-between; color: var(--roll-muted); font: 500 .7rem/1 var(--site-font); }
  .roll-page :global(.game-container--dedicated .roll-progress-label strong) { color: var(--roll-accent); }

  .roll-page :global(.game-container--dedicated .image-modal-content) {
    border-color: var(--roll-border-highlight);
    border-radius: 16px;
    background: var(--surface-2);
  }

  @media (max-width: 900px) {
    .roll-page__game {
      grid-template-columns: minmax(0, 420px);
      gap: 28px;
      width: min(100%, 420px);
    }

    .roll-page__context {
      width: 100%;
      text-align: center;
    }

    .roll-page__eyebrow { justify-content: center; }
    .roll-page__context h1 { max-width: none; }
    .roll-page__description { margin-inline: auto; }
    .roll-page__context { max-width: 420px; }
    .roll-page__history-link { margin-inline: auto; }
  }

  @media (max-width: 600px) {
    .roll-page { min-height: calc(100dvh - 4.25rem); padding: 24px 12px 56px; }
    .roll-page :global(.game-container--dedicated) { max-width: 420px; }
    .roll-page :global(.game-container--dedicated .roll-stage) { padding: 20px; border-radius: 20px; }
    .roll-page :global(.game-container--dedicated .roll-display) { align-items: flex-start; gap: 14px; padding: 16px; }
    .roll-page :global(.game-container--dedicated .roll-color-name) { font-size: 1.35rem !important; }
    .roll-page :global(.game-container--dedicated .roll-attr-tags) { gap: 6px; }
    .roll-page :global(.game-container--dedicated .roll-attr-tag) { font-size: .64rem; }
    .roll-page :global(.game-container--dedicated .roll-breakdown),
    .roll-page :global(.game-container--dedicated .roll-detail-section) { padding: 16px; }
    .roll-page :global(.game-container--dedicated .roll-breakdown__row),
    .roll-page :global(.game-container--dedicated .roll-breakdown__label),
    .roll-page :global(.game-container--dedicated .roll-breakdown__value),
    .roll-page :global(.game-container--dedicated .guest-prompt-copy) { font-size: .78rem; }
    .roll-page :global(.game-container--dedicated .guest-prompt__button),
    .roll-page :global(.game-container--dedicated .roll-action__button) { font-size: 1rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-page::before { position: absolute; }
    .roll-page :global(.game-container--dedicated .roll-stage) { transform: none; transition: none; }
    .roll-page :global(.game-container--dedicated .roll-tile__surface) { transform: none; }
    .roll-page :global(.game-container--dedicated .roll-action__button:hover:not(:disabled)),
    .roll-page :global(.game-container--dedicated .guest-prompt__button:hover:not(:disabled)) { transform: none; }
  }
</style>
