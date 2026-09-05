<script>
  import { createEventDispatcher } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import Game from './Game.svelte';
  import HomepageBestRoll from './homepage/HomepageBestRoll.svelte';
  import HomepageNextMilestone from './homepage/HomepageNextMilestone.svelte';
  import ProgressionUnlockQueue from './ProgressionUnlockQueue.svelte';
  import { createRollPageContext, deriveRollPagePresentation, deriveRollAccountPresentation, acceptRollPageEvent } from './rollPageContext.js';
  import { accountState, session, profile } from './stores.js';
  import { ACCOUNT_STATES } from './authState.js';
  import { trackProductEvent } from './productAnalytics.js';

  const dispatch = createEventDispatcher();
  export let surface = 'roll';
  export let signupNext = '/roll';
  export let showAcquisitionActions = false;
  export let homepage = false;
  export let bestRollRows = [];
  export let bestRollLoading = true;
  export let bestRollError = '';
  let gameRef = null;
  let rollEvent = createRollPageContext();
  $: account = deriveRollAccountPresentation($accountState, $session, $profile);
  $: rollContext = { ...(rollEvent.accountKey === account.accountKey ? rollEvent : createRollPageContext()), ...account };
  const progressionViewsTracked = new SvelteSet();

  $: contextPresentation = deriveRollPagePresentation(rollContext, { homepage });
  $: contextHasResult = contextPresentation.hasResult;
  $: homepagePreroll = contextPresentation.homepagePreroll;
  $: homepageRolling = contextPresentation.homepageRolling;
  $: contextDay = contextPresentation.day;
  $: contextRank = contextPresentation.rank;
  $: contextProgress = contextPresentation.rankProgress;
  $: contextRarity = contextPresentation.rarity;
  $: if (rollContext.isAuthenticated && !progressionViewsTracked.has('authenticated')) {
    progressionViewsTracked.add('authenticated');
    trackProductEvent('progression_viewed', { surface, accountMode: 'authenticated' });
  }

  function forward(eventName, event) {
    dispatch(eventName, event.detail);
  }

  function handleRollState(event) {
    const previous = rollEvent;
    rollEvent = acceptRollPageEvent(rollEvent, event.detail, $session?.user?.id || 'guest');
    if (rollEvent !== previous && rollEvent.phase === 'results' && previous.phase !== 'results') dispatch('resultready');
  }

  function requestGuestSignup() {
    if ($accountState !== ACCOUNT_STATES.SIGNED_OUT) return;
    gameRef?.beginGuestSignupFromParent(signupNext);
  }

  function handleProgressionUnlockAcknowledgement(event) {
    const unlockId = event?.detail?.unlock?.id;
    if (!unlockId) return;
    rollEvent = {
      ...rollEvent,
      newProgressionUnlocks: (rollContext.newProgressionUnlocks || [])
        .filter(unlock => unlock.id !== unlockId)
    };
  }

</script>

<div
  class="roll-page"
  class:roll-page--homepage={homepage}
  class:roll-page--homepage-preroll={homepagePreroll}
  class:roll-page--homepage-rolling={homepageRolling}
  class:roll-page--result={contextHasResult}
>
  <section
    class="roll-page__game"
    aria-labelledby="roll-page-title"
    style={`--roll-context-accent: ${contextHasResult && rollContext.hex ? rollContext.hex : 'var(--white)'}; --roll-rarity: ${contextHasResult ? contextRarity.color : 'var(--roll-accent)'};`}
  >
    <div class="roll-page__context" class:roll-page__context--result={contextHasResult} aria-live="polite">
      {#if contextHasResult}
        <p class="roll-page__eyebrow">{contextDay ? `DAY ${contextDay} · DAILY ROLL` : 'DAILY ROLL'}</p>
        <h1 id="roll-page-title">You rolled <span>{rollContext.identity}.</span></h1>
        <p class="roll-page__description">
          <span class="roll-page__description-rarity">{rollContext.rarity || 'Daily'} roll</span>
          ·
          <strong class="roll-page__description-score">{Number(rollContext.score).toLocaleString()} score</strong>.
          {#if account.isAuthenticated}This color is now part of your profile history.
          {:else if account.signedOut}This roll is saved on this device. Create an account to start your profile history.{/if}
        </p>

        {#if rollContext.newProgressionUnlocks?.length || rollContext.weeklyFocusComplete}
          <div class="roll-page__proof" role="status" aria-live="polite">
            {#if rollContext.newProgressionUnlocks?.length}
              <div class="roll-page__proof-block">
                <span class="roll-page__proof-label">NEW COSMETIC</span>
                <strong>{rollContext.newProgressionUnlocks.map(unlock => unlock.reward?.name || unlock.name).join(', ')}</strong>
              </div>
            {/if}
            {#if rollContext.weeklyFocusComplete}
              <div class="roll-page__proof-block">
                <span class="roll-page__proof-label">WEEKLY FOCUS COMPLETE</span>
                <strong>+50,000 EP is in your wallet.</strong>
              </div>
            {/if}
          </div>
        {/if}

        {#if rollContext.newProgressionUnlocks?.length}
          <div class="roll-page__unlock">
            <ProgressionUnlockQueue
              unlocks={rollContext.newProgressionUnlocks}
              surface="dedicated-roll"
              username={rollContext.username || 'You'}
              displayColor={rollContext.hex || '#FFFFFF'}
              avatarSrc={rollContext.avatarSrc || ''}
              compact={true}
              on:acknowledge={handleProgressionUnlockAcknowledgement}
            />
          </div>
        {/if}

        {#if account.signedOut}
          <div class="roll-page__guest-cta">
            <button type="button" on:click={requestGuestSignup}>Create an account</button>
          </div>
        {/if}
      {:else}
        <p class="roll-page__eyebrow">A NEW COLOR, EVERY DAY</p>
        {#if homepage}
          <div class="roll-page__unknown" aria-hidden="true">{homepage && rollContext.phase === 'rolling' ? (rollContext.revealHex || '#??????') : '#??????'}</div>
          <h1 id="roll-page-title">What color is your day?</h1>
          <p class="roll-page__description">One daily roll. A new piece of your profile.</p>
        {:else}
          <h1 id="roll-page-title">Roll today’s color.</h1>
          <p class="roll-page__description">One of 16,777,216 colors. See the patterns, rarity, and score hidden in yours.</p>
        {/if}
      {/if}

      {#if $accountState === ACCOUNT_STATES.PROFILE_LOADING || $accountState === ACCOUNT_STATES.BOOTING}
        <p class="roll-page__description" role="status">Loading your account…</p>
      {:else if $accountState === ACCOUNT_STATES.PROFILE_ERROR}
        <p class="roll-page__description" role="alert">Your account details couldn’t be loaded. <button type="button" on:click={() => window.location.reload()}>Retry</button></p>
      {/if}
      {#if account.isAuthenticated}
        <div class="roll-page__streak">
          <span class="roll-page__streak-icon" aria-hidden="true"></span>
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
          <small>{contextRank.next ? `${contextProgress}% toward ${contextRank.next.name}` : 'Final rank reached'}</small>
        </div>
        <HomepageNextMilestone userId={$session.user.id} refreshKey={`${rollContext.phase}:${rollContext.hex}:${rollContext.totalRolls}`} />

      {/if}
    </div>
    <Game
      bind:this={gameRef}
      dedicated={true}
      {surface}
      {signupNext}
      {showAcquisitionActions}
      on:navigate={event => forward('navigate', event)}
      on:promptlogin={event => forward('promptlogin', event)}
      on:rollstate={handleRollState}
    />
    {#if homepagePreroll && !homepageRolling}
      <HomepageBestRoll
        rows={bestRollRows}
        loading={bestRollLoading}
        error={bestRollError}
        on:retry={() => dispatch('discoveryretry')}
      />
    {/if}
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
    --roll-card-glow: rgba(255, 255, 255, .08);
    --roll-card-glow-soft: rgba(255, 255, 255, .04);
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
    --roll-rarity: var(--roll-accent);
    --roll-score-color: var(--color-earned, #f5c26f);
    position: relative;
    z-index: 10;
    display: grid;
    grid-template-columns: minmax(280px, 400px) minmax(360px, 420px);
    align-items: start;
    justify-content: center;
    gap: clamp(44px, 6vw, 88px);
    width: min(100%, 980px);
    margin-inline: auto;
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

  .roll-page__description-rarity {
    color: var(--roll-rarity);
    font-weight: 600;
    text-shadow: 0 0 14px color-mix(in srgb, var(--roll-rarity) 42%, transparent);
  }

  .roll-page__description-score {
    color: var(--roll-score-color);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 14px color-mix(in srgb, var(--roll-score-color) 34%, transparent);
  }

  .roll-page__guest-cta {
    width: min(100%, 300px);
    margin-top: 28px;
  }

  .roll-page__guest-cta button {
    width: 100%;
    min-height: 48px;
    padding: 12px 18px;
    border: 1px solid color-mix(in srgb, var(--roll-context-accent) 42%, var(--roll-border));
    border-radius: 10px;
    background: color-mix(in srgb, var(--roll-context-accent) 7%, transparent);
    color: var(--roll-text);
    cursor: pointer;
    font: 700 .86rem/1 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: -.01em;
    transition: border-color .18s ease, background-color .18s ease, box-shadow .18s ease, transform .18s ease;
  }

  .roll-page__guest-cta button:hover {
    border-color: color-mix(in srgb, var(--roll-context-accent) 72%, var(--roll-border));
    background: color-mix(in srgb, var(--roll-context-accent) 13%, transparent);
    box-shadow: 0 10px 28px -22px color-mix(in srgb, var(--roll-context-accent) 60%, transparent);
    transform: translateY(-1px);
  }

  .roll-page__guest-cta button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--roll-context-accent) 78%, white);
    outline-offset: 3px;
  }

  .roll-page__proof {
    display: grid;
    gap: .65rem;
    margin-top: 20px;
    padding: .8rem .9rem;
    border: 1px solid color-mix(in srgb, var(--roll-context-accent) 34%, var(--roll-border));
    border-radius: 12px;
    background: color-mix(in srgb, var(--roll-context-accent) 7%, var(--roll-panel-card));
  }

  .roll-page__proof-block {
    display: grid;
    gap: .25rem;
  }

  .roll-page__proof-label {
    color: var(--roll-context-accent);
    font: 700 .62rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .12em;
  }

  .roll-page__proof strong {
    color: var(--roll-text);
    font: 650 .8rem/1.35 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-page__unlock {
    min-width: 0;
    margin-top: 12px;
  }

  .roll-page__unlock :global(.progression-unlock-queue) {
    margin: 0;
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
    display: block;
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    border: 8px solid var(--border-soft, rgba(255, 255, 255, .05));
    border-radius: 50%;
    background: var(--roll-context-accent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--roll-context-accent) 30%, transparent);
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

  .roll-page :global(.game-container--dedicated) {
    --roll-rarity: var(--roll-accent);
    width: 100%;
    max-width: 420px !important;
    min-height: 0;
    margin: 0;
    padding: 0;
  }

  .roll-page :global(.game-container--dedicated .roll-stage--results) {
    --roll-accent: var(--roll-result-color, var(--white));
    --roll-accent-glow: color-mix(in srgb, var(--roll-result-color, var(--white)) 34%, transparent);
    --roll-card-glow: color-mix(in srgb, var(--roll-result-color, var(--white)) 30%, transparent);
    --roll-card-glow-soft: color-mix(in srgb, var(--roll-result-color, var(--white)) 14%, transparent);
    animation: roll-result-glow 5.8s ease-in-out infinite;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  @keyframes roll-result-glow {
    0%, 100% {
      box-shadow:
        0 28px 70px -30px rgba(0, 0, 0, .8),
        0 0 18px -5px color-mix(in srgb, var(--roll-result-color, var(--white)) 30%, transparent),
        0 0 52px -20px color-mix(in srgb, var(--roll-result-color, var(--white)) 12%, transparent);
    }

    50% {
      box-shadow:
        0 28px 70px -30px rgba(0, 0, 0, .8),
        0 0 28px -2px color-mix(in srgb, var(--roll-result-color, var(--white)) 52%, transparent),
        0 0 72px -12px color-mix(in srgb, var(--roll-result-color, var(--white)) 25%, transparent);
    }
  }

  .roll-page :global(.game-container--dedicated .roll-stage) {
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
    box-shadow:
      0 28px 70px -30px rgba(0, 0, 0, .8),
      0 0 20px -4px var(--roll-card-glow),
      0 0 56px -18px var(--roll-card-glow-soft);
    color: var(--roll-text);
    text-align: left;
    backdrop-filter: saturate(180%) blur(30px);
    -webkit-backdrop-filter: saturate(180%) blur(30px);
  }

  .roll-page :global(.game-container--dedicated .roll-stage::before) { display: none; }

  .roll-page :global(.game-container--dedicated .roll-card-header) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
  }

  .roll-page :global(.game-container--dedicated .roll-card-header__copy) {
    display: grid;
    grid-column: 2;
    justify-items: center;
    min-width: 0;
    text-align: center;
  }

  .roll-page :global(.game-container--dedicated .roll-card-header__copy::before) {
    width: 28px;
    height: 3px;
    margin-bottom: 9px;
    border-radius: 999px;
    background: var(--roll-accent);
    box-shadow: 0 0 16px var(--roll-accent-glow);
    content: '';
  }

  .roll-page :global(.game-container--dedicated .roll-card-header__title) {
    margin: 0;
    color: var(--roll-text);
    font: 800 1.45rem/1 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: -.035em;
  }

  .roll-page :global(.game-container--dedicated .roll-card-header__meta) {
    margin: 7px 0 0;
    color: var(--roll-muted);
    font: 500 .74rem/1.2 var(--site-font, 'Inter', sans-serif);
    white-space: nowrap;
  }

  .roll-page :global(.game-container--dedicated .roll-mode-pill) {
    grid-column: 3;
    justify-self: end;
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
    border-radius: 14px;
    filter: none;
  }

  .roll-page :global(.game-container--dedicated .roll-tile::before) { display: none; }

  .roll-page :global(.game-container--dedicated .roll-tile__surface) {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    transform: none;
  }

  .roll-page :global(.game-container--dedicated .roll-tile__face) {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 14px;
    background: var(--roll-tile-color);
    box-shadow:
      0 10px 24px -8px color-mix(in srgb, var(--roll-tile-color) 38%, transparent),
      0 0 26px -8px color-mix(in srgb, var(--roll-tile-color) 24%, transparent);
  }

  .roll-page :global(.game-container--dedicated .roll-color-info) {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 6px;
  }

  .roll-page :global(.game-container--dedicated .roll-color-rarity) {
    display: inline-flex;
    align-items: center;
    padding: 4px 7px;
    border: 1px solid color-mix(in srgb, var(--roll-rarity) 56%, var(--roll-border));
    border-radius: 999px;
    background: color-mix(in srgb, var(--roll-rarity) 13%, transparent);
    color: var(--roll-rarity);
    font: 600 .7rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .02em;
    text-shadow: 0 0 16px color-mix(in srgb, var(--roll-rarity) 86%, transparent);
    filter: saturate(1.2);
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
    justify-content: flex-start;
    gap: 12px;
    flex-wrap: wrap;
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

  .roll-page :global(.game-container--dedicated .badges-title) {
    margin-bottom: 16px;
    color: var(--roll-muted);
    font: 700 .85rem/1 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity) {
    flex: 0 0 auto;
    padding: 3px 6px;
    border: 1px solid color-mix(in srgb, var(--condition-rarity-color, var(--roll-muted)) 60%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--condition-rarity-color, var(--roll-muted)) 15%, transparent);
    color: var(--condition-rarity-color, var(--roll-muted));
    font: 700 .58rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .02em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity[data-rarity='trash']) { --condition-rarity-color: #bebbcf; }
  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity[data-rarity='common']) { --condition-rarity-color: #f0edff; }
  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity[data-rarity='uncommon']) { --condition-rarity-color: #54f2a0; }
  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity[data-rarity='rare']) { --condition-rarity-color: #70a4ff; }
  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity[data-rarity='epic']) { --condition-rarity-color: #d194ff; }
  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity[data-rarity='legendary']) { --condition-rarity-color: #ff8e5b; }
  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity[data-rarity='anomaly']),
  .roll-page :global(.game-container--dedicated .roll-reveal-discovery__rarity[data-rarity='mythic']) { --condition-rarity-color: #ff52d1; }

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
    color: var(--roll-action-ink, #fff);
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
    color: var(--roll-action-ink, #fff);
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
  .roll-page :global(.game-container--dedicated .roll-stage--results > .roll-result-summary) { order: 1; }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .roll-action__button) { order: 2; }
  .roll-page :global(.roll-countdown) { order: 2; margin: 0; text-align: center; color: var(--roll-muted); font-size: .85rem; font-variant-numeric: tabular-nums; }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .roll-acquisition-actions) { order: 3; }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .cotw-success-banner) { order: 4; }
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__trigger) { min-height:4.8rem; padding:.3rem .65rem .3rem .3rem; border-color:var(--roll-border); background:var(--roll-panel-card); }
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__thumbnail) { flex:0 0 min(8.5rem, 46%); width:min(8.5rem, 46%); height:4.2rem; border-color:var(--roll-border); background:var(--roll-bg); }
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__thumbnail .shop-preview-area) { min-height:4.2rem; height:4.2rem; padding:.35rem .55rem; }
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__thumbnail .shop-preview-text--name),
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__thumbnail .name-effect-canvas) { overflow:hidden; }
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__thumbnail .name-effect-canvas) { display:block; width:100%; max-width:100%; }
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__thumbnail .name-effect-canvas__semantic) { width:100%; overflow:hidden; font-size:.9rem; line-height:1.1; text-overflow:ellipsis; white-space:nowrap; }
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__trigger-copy strong) { color:var(--roll-text); }
  .roll-page__context :global(.progression-reward-preview--wide .progression-reward-preview__trigger-copy small) { color:var(--roll-muted); }
  .roll-page :global(.game-container--dedicated .roll-stage--results > .roll-detail-grid),
  .roll-page :global(.game-container--dedicated .roll-stage--results > .milestone-banner),
  .roll-page :global(.game-container--dedicated .roll-stage--results > .local-progress-banner),
  .roll-page :global(.game-container--dedicated .roll-stage--results > .studio-onboarding) { order: 5; }

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
  .roll-page :global(.game-container--dedicated .roll-stage__title) { margin: 0; color: var(--roll-text); font: 800 1.6rem/1 var(--site-display) !important; letter-spacing: -.02em; }
  .roll-page :global(.game-container--dedicated .rolling-hex) { color: var(--roll-text); font: 600 1rem/1 var(--site-font); letter-spacing: .1em; }
  .roll-page :global(.game-container--dedicated .roll-stage__status) { margin: 0; color: var(--roll-muted); font: 400 .75rem/1.4 var(--site-font); }
  .roll-page :global(.game-container--dedicated .scan-container) { width: 100%; height: 2px; margin: 0; background: var(--roll-border); }
  .roll-page :global(.game-container--dedicated .scan-bar) { background: var(--roll-accent); box-shadow: 0 0 12px var(--roll-accent-glow); }

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
  }

  @media (max-width: 600px) {
    .roll-page { min-height: calc(100dvh - 4.25rem); padding: 24px 12px 56px; }
    .roll-page :global(.game-container--dedicated) { max-width: 420px; }
    .roll-page :global(.game-container--dedicated .roll-stage) { padding: 20px; border-radius: 20px; }
    .roll-page :global(.game-container--dedicated .roll-display) { align-items: flex-start; gap: 14px; padding: 16px; }
    .roll-page :global(.game-container--dedicated .roll-color-name) { font-size: 1.35rem !important; }
    .roll-page :global(.game-container--dedicated .roll-attr-tags) { gap: 6px; }
    .roll-page :global(.game-container--dedicated .roll-attr-tag) { font-size: .64rem; }
    .roll-page :global(.game-container--dedicated .roll-detail-section) { padding: 16px; }
    .roll-page :global(.game-container--dedicated .guest-prompt-copy) { font-size: .78rem; }
    .roll-page :global(.game-container--dedicated .guest-prompt__button),
    .roll-page :global(.game-container--dedicated .roll-action__button) { font-size: 1rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-page::before { position: absolute; }
    .roll-page :global(.game-container--dedicated .roll-stage--results) { animation: none; }
    .roll-page :global(.game-container--dedicated .roll-tile__surface) { transform: none; }
    .roll-page__guest-cta button { transition: none; }
    .roll-page__guest-cta button:hover { transform: none; }
    .roll-page :global(.game-container--dedicated .roll-action__button:hover:not(:disabled)),
    .roll-page :global(.game-container--dedicated .guest-prompt__button:hover:not(:disabled)) { transform: none; }
  }

  /* The homepage starts with the player's roll prompt on the left and today's
     strongest public roll on the right. Once a roll starts, the game takes
     over that right-hand slot so the result state keeps the same composition. */
  .roll-page.roll-page--homepage-preroll {
    align-items: center;
    justify-content: center;
    padding: 44px 20px 72px;
  }

  .roll-page.roll-page--homepage-preroll .roll-page__game {
    display: grid;
    grid-template-columns: minmax(280px, 360px) minmax(360px, 420px);
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: clamp(44px, 6vw, 88px);
    row-gap: 0;
    width: min(100%, 900px);
  }

  .roll-page.roll-page--homepage-preroll .roll-page__context {
    grid-column: 1;
    grid-row: 1;
    width: 100%;
    max-width: 360px;
    align-self: end;
    text-align: center;
  }

  .roll-page.roll-page--homepage-preroll .roll-page__eyebrow {
    display: flex;
    justify-content: center;
    margin-bottom: 18px;
    color: var(--roll-muted);
  }

  .roll-page.roll-page--homepage-preroll .roll-page__eyebrow::before { display: none; }

  .roll-page.roll-page--homepage-preroll .roll-page__unknown {
    margin-top: 0;
    color: #c8c7cc;
    font: 800 clamp(3.4rem, 6vw, 4.5rem) / .86 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: .02em;
    text-shadow: none;
  }

  .roll-page.roll-page--homepage-preroll .roll-page__context h1 {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated) {
    grid-column: 1;
    grid-row: 2;
    max-width: 360px !important;
    margin-top: 30px;
    align-self: start;
  }

  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll) {
    align-items: center;
    gap: 24px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    text-align: center;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .roll-card-header),
  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .roll-display) { display: none; }

  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .roll-action__button) {
    width: min(100%, 320px);
    min-height: 66px;
    border: 1px solid rgba(255, 255, 255, .92);
    border-radius: 10px;
    background: #fff;
    color: #111114;
    box-shadow: 0 14px 32px -22px rgba(255, 255, 255, .55), 0 14px 32px -24px rgba(0, 0, 0, .95);
    font-size: .92rem;
    letter-spacing: .01em;
    transition: transform .18s ease, box-shadow .18s ease;
  }

  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .roll-action__button:hover:not(:disabled)) {
    border-color: #fff;
    background: #e9e9ec;
    box-shadow: 0 17px 34px -23px rgba(255, 255, 255, .62), 0 17px 34px -23px rgba(0, 0, 0, .95);
    transform: translateY(-2px);
  }

  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .roll-action__button:disabled) {
    border-color: rgba(255, 255, 255, .14);
    background: #1b1b1f;
    box-shadow: none;
  }

  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .guest-prompt--quiet) {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: center;
    gap: .28rem;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .guest-prompt__text-action) {
    color: rgba(255, 255, 255, .88);
    font-weight: 700;
  }

  .roll-page.roll-page--homepage-preroll :global(.homepage-best-roll) {
    grid-column: 2;
    grid-row: 1 / span 2;
    width: 100%;
    max-width: 420px;
    margin-top: 0;
    align-self: center;
  }

  /* During the reveal, replace the public spotlight with the live game while
     keeping the player's context in the left result column. */
  .roll-page.roll-page--homepage-rolling .roll-page__game {
    grid-template-columns: minmax(280px, 400px) minmax(360px, 420px);
    grid-template-rows: auto;
    width: min(100%, 980px);
  }

  .roll-page.roll-page--homepage-rolling .roll-page__context {
    grid-column: 1;
    grid-row: 1;
    width: 100%;
    max-width: 400px;
    align-self: center;
  }

  .roll-page.roll-page--homepage-rolling :global(.game-container--dedicated) {
    grid-column: 2;
    grid-row: 1;
    max-width: 420px !important;
    margin-top: 0;
    align-self: start;
  }

  @media (max-width: 900px) {
    .roll-page.roll-page--homepage-preroll {
      align-items: flex-start;
      padding: clamp(52px, 8vh, 82px) 20px 72px;
    }

    .roll-page.roll-page--homepage-preroll .roll-page__game {
      grid-template-columns: minmax(0, 420px);
      grid-template-rows: auto auto auto;
      width: min(100%, 420px);
      gap: 0;
    }

    .roll-page.roll-page--homepage-preroll .roll-page__context {
      grid-column: 1;
      grid-row: 1;
      max-width: 420px;
      align-self: auto;
      text-align: center;
    }

    .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated) {
      grid-column: 1;
      grid-row: 2;
      max-width: 420px !important;
      margin-top: 30px;
    }

    .roll-page.roll-page--homepage-preroll :global(.homepage-best-roll) {
      grid-column: 1;
      grid-row: 3;
      margin-top: 30px;
    }

    .roll-page.roll-page--homepage-rolling .roll-page__game {
      grid-template-columns: minmax(0, 420px);
      grid-template-rows: auto auto;
      width: min(100%, 420px);
    }

    .roll-page.roll-page--homepage-rolling .roll-page__context {
      grid-column: 1;
      grid-row: 1;
      max-width: 420px;
      align-self: auto;
    }

    .roll-page.roll-page--homepage-rolling :global(.game-container--dedicated) {
      grid-column: 1;
      grid-row: 2;
      max-width: 420px !important;
      margin-top: 30px;
    }
  }

  @media (max-width: 600px) {
    .roll-page.roll-page--homepage-preroll { padding: 82px 12px 72px; }
    .roll-page.roll-page--homepage-preroll .roll-page__unknown { margin-top: 0; font-size: clamp(2.9rem, 14vw, 4.2rem); }
    .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated) { margin-top: 30px; }
    .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll) { gap: 25px; }
    .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .roll-action__button) { min-height: 64px; }
    .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .guest-prompt--quiet) { flex-wrap: wrap; }
    .roll-page.roll-page--homepage-preroll :global(.homepage-best-roll) { margin-top: 30px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-page.roll-page--homepage-preroll :global(.game-container--dedicated .roll-stage--preroll .roll-action__button) { transition: none; }
  }

  /* Keep the result card compact. The summary carries the important signal;
     the complete score record opens in its own contained panel. */
  .roll-page.roll-page--result .roll-page__game {
    grid-template-columns: minmax(280px, 400px) minmax(360px, 420px);
    align-items: center;
    column-gap: clamp(44px, 6vw, 88px);
    width: min(100%, 980px);
  }

  .roll-page.roll-page--result .roll-page__context {
    align-self: center;
  }

  .roll-page.roll-page--result :global(.game-container--dedicated) {
    max-width: 420px !important;
    align-self: center;
  }

  .roll-page.roll-page--result :global(.game-container--dedicated .roll-stage--results) {
    gap: 18px;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .roll-page.roll-page--result :global(.game-container--dedicated .roll-stage--results > .roll-acquisition-actions .result-action) {
    justify-content: center;
    text-align: center;
  }

  @media (max-width: 1100px) {
    .roll-page.roll-page--result .roll-page__game {
      grid-template-columns: minmax(0, 420px);
      grid-template-rows: auto auto;
      gap: 28px;
      width: min(100%, 420px);
    }

    .roll-page.roll-page--result .roll-page__context {
      grid-column: 1;
      grid-row: 1;
      width: 100%;
      max-width: 420px;
      text-align: center;
    }

    .roll-page.roll-page--result .roll-page__guest-cta {
      margin-inline: auto;
    }

    .roll-page.roll-page--result .roll-page__eyebrow {
      justify-content: center;
    }

    .roll-page.roll-page--result :global(.game-container--dedicated) {
      grid-column: 1;
      grid-row: 2;
      width: 100%;
      max-width: 420px !important;
    }
  }

  @media (max-width: 600px) {
    .roll-page.roll-page--result {
      padding-inline: 12px;
    }

    .roll-page.roll-page--result .roll-page__game {
      grid-template-columns: minmax(0, 420px);
      width: min(100%, 420px);
    }

    .roll-page.roll-page--result .roll-page__context {
      max-width: 420px;
    }

    .roll-page.roll-page--result .roll-page__guest-cta {
      width: min(100%, 320px);
    }

    .roll-page.roll-page--result :global(.game-container--dedicated) {
      max-width: 420px !important;
    }
  }
</style>
