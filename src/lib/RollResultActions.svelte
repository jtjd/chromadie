<script>
  import { createEventDispatcher } from 'svelte';

  export let placement = 'dedicated';
  export let showAcquisitionActions = false;
  export let isAuthenticated = false;
  export let isSignedOut = false;
  export let copied = false;
  export let countdownString = '';
  export let rerollShards = 0;
  export let rerollDisabled = false;

  const dispatch = createEventDispatcher();
</script>

{#if placement === 'dedicated'}
  <div class="roll-acquisition-actions roll-acquisition-actions--dedicated" aria-label="Roll result actions">
    {#if showAcquisitionActions}
      <div class="roll-acquisition-actions__next-steps" role="group" aria-label="Continue from your result">
        {#if isAuthenticated}
          <button class="chroma-btn result-action result-action--primary" type="button" on:click={() => dispatch('navigate', { view: 'profile' })}>View your profile</button>
          <button class="chroma-btn result-action roll-acquisition-actions__next-action" type="button" on:click={() => dispatch('navigate', { view: 'profile-settings' })}>Customize your profile</button>
          <button class="chroma-btn result-action roll-acquisition-actions__next-action" type="button" on:click={() => dispatch('navigate', { view: 'leaderboard' })}>Explore leaderboard</button>
        {:else}
          <button class="chroma-btn result-action result-action--primary roll-acquisition-actions__next-action--guest" type="button" on:click={() => dispatch('navigate', { view: 'leaderboard' })}>Browse the leaderboard</button>
        {/if}
      </div>
    {/if}
    <div class="post-score-actions post-score-actions--dedicated" aria-label="Share and continue">
      <button type="button" class="chroma-btn result-action roll-acquisition-actions__tool" on:click={() => dispatch('share')}>
        {copied ? 'Copied' : 'Share result'}
      </button>
      <button type="button" class="chroma-btn result-action roll-acquisition-actions__tool" data-roll-action="share-image" on:click={() => dispatch('shareimage')}>View / share image</button>
      {#if isAuthenticated && rerollShards > 0}
        <button type="button" class="reroll-btn result-action result-action--reroll roll-acquisition-actions__tool" on:click={() => dispatch('reroll')} disabled={rerollDisabled}>Reroll · {rerollShards} left</button>
      {/if}
    </div>
  </div>
{:else if placement === 'acquisition'}
  <div class="roll-acquisition-actions" aria-label="Roll result actions">
    {#if isAuthenticated}
      <button class="chroma-btn result-action result-action--primary" type="button" on:click={() => dispatch('navigate', { view: 'profile' })}>View your profile</button>
      <button class="roll-acquisition-actions__quiet" on:click={() => dispatch('share')}>
        {copied ? 'Copied' : 'Share result'}
      </button>
    {:else if isSignedOut}
      <button class="roll-acquisition-actions__quiet" type="button" on:click={() => dispatch('share')}>
        {copied ? 'Copied' : 'Share result'}
      </button>
    {/if}
  </div>
{:else if placement === 'post-score'}
  <div class="post-score-actions" aria-label="Roll result actions">
    <div class="countdown-inline">
      <span class="countdown-inline__label">Next roll</span>
      <strong>{countdownString}</strong>
    </div>
    <button class="chroma-btn result-action result-action--primary" on:click={() => dispatch('share')}>
      {copied ? 'Copied' : 'Share result'}
    </button>
    <button class="chroma-btn result-action" on:click={() => dispatch('shareimage')}>
      View image
    </button>

    {#if isAuthenticated && rerollShards > 0}
      <button class="reroll-btn result-action result-action--reroll" on:click={() => dispatch('reroll')} disabled={rerollDisabled}>
        Reroll · {rerollShards} left
      </button>
    {/if}
  </div>
{/if}

<style>
  .post-score-actions { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 0 0 20px 0; flex-wrap: wrap; }
  .roll-acquisition-actions--dedicated { gap: 12px; }
  .roll-acquisition-actions__next-steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .roll-acquisition-actions__next-steps > .result-action--primary { grid-column: 1 / -1; }
  .roll-acquisition-actions__next-action {
    min-height: 44px;
    padding: 0 10px;
    border-color: var(--roll-border, var(--card-border));
    background: var(--roll-panel-card, rgba(255, 255, 255, .025));
    color: var(--roll-text, var(--text));
    font: 650 .72rem/1.2 var(--site-font, var(--font-body-stack));
  }
  .roll-acquisition-actions__next-action:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--roll-accent, var(--color-accent)) 60%, var(--roll-border, var(--card-border)));
    background: color-mix(in srgb, var(--roll-accent, var(--color-accent)) 9%, var(--roll-panel-card, transparent));
    color: var(--roll-text, var(--text));
  }
  .roll-acquisition-actions__next-action:focus-visible,
  .roll-acquisition-actions__next-action--guest:focus-visible { outline: 2px solid var(--roll-accent, var(--color-accent)); outline-offset: 3px; }
  .roll-acquisition-actions__next-action--guest { grid-column: 1 / -1; min-height: 48px; }
  .post-score-actions--dedicated { width: 100%; margin: 0; gap: 8px; }
  .post-score-actions--dedicated .roll-acquisition-actions__tool {
    min-height: 40px;
    padding: 0 13px;
    border-color: var(--roll-border, var(--card-border));
    background: var(--roll-panel-card, rgba(255, 255, 255, .025));
    color: var(--roll-muted, var(--text-muted));
    font: 650 .72rem/1 var(--site-font, var(--font-body-stack));
  }
  .post-score-actions--dedicated .roll-acquisition-actions__tool:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--roll-accent, var(--color-accent)) 60%, var(--roll-border, var(--card-border)));
    background: color-mix(in srgb, var(--roll-accent, var(--color-accent)) 9%, var(--roll-panel-card, transparent));
    color: var(--roll-text, var(--text));
  }
  .post-score-actions--dedicated .reroll-btn.roll-acquisition-actions__tool {
    border-color: color-mix(in srgb, var(--roll-accent, var(--color-accent)) 58%, transparent);
    background: transparent;
    color: var(--roll-accent, var(--color-accent-bright));
  }
  .post-score-actions--dedicated .reroll-btn.roll-acquisition-actions__tool:hover:not(:disabled) {
    background: color-mix(in srgb, var(--roll-accent, var(--color-accent)) 10%, transparent);
  }
  .countdown-inline { color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-body-stack); background: rgba(255,255,255,0.03); padding: 6px 12px; border-radius: 9px; border: 1px solid var(--card-border); }
  .roll-acquisition-actions {
    display: grid;
    gap: 12px;
    width: 100%;
    text-align: center;
  }
  .roll-acquisition-actions__quiet {
    justify-self: center;
    min-height: 0;
    padding: 4px 8px;
    border: 0;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font: 650 .78rem/1.3 var(--font-body-stack);
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--text-muted) 45%, transparent);
    text-underline-offset: 4px;
  }
  .roll-acquisition-actions__quiet:hover { color: var(--text); text-decoration-color: var(--text); }
  .roll-acquisition-actions__quiet:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }

  @media (max-width: 600px) {
    .roll-acquisition-actions__next-steps { grid-template-columns: 1fr; }
    .roll-acquisition-actions__next-steps > .result-action--primary { grid-column: auto; }
    .post-score-actions {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
    .post-score-actions--dedicated { gap: 8px; }
  }
</style>
