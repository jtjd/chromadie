<script>
  import { createEventDispatcher } from 'svelte';

  export let loading = false;
  export let authInitialized = false;
  export let isAuthenticated = false;

  const dispatch = createEventDispatcher();
</script>

<div class="card roll-stage roll-stage--preroll roll-pre-roll">
  <div class="roll-card-header">
    <div class="roll-card-header__copy">
      <h2 class="roll-card-header__title">Daily Roll</h2>
      <p class="roll-card-header__meta">One color. Every day.</p>
    </div>
  </div>

  <div class="roll-display roll-display--preview roll-pre-roll__display" aria-label="Daily roll preview">
    <div class="roll-pre-roll__unknown" role="img" aria-label="A color waiting to be revealed">#??????</div>
    <div class="roll-color-info roll-pre-roll__copy">
      <span class="roll-pre-roll__status">READY TO REVEAL</span>
      <div class="roll-color-name">No result yet</div>
      <div class="roll-color-hex">Roll to generate today’s color.</div>
    </div>
  </div>

  <button
    type="button"
    class="roll-btn roll-action__button"
    on:click={() => dispatch('roll')}
    disabled={loading || !authInitialized}
  >
    {loading ? 'Reading…' : 'Roll today’s color'}
  </button>

  {#if !isAuthenticated}
    <p class="guest-prompt guest-prompt--preroll guest-prompt--quiet">
      <button type="button" class="guest-prompt__text-action" on:click={() => dispatch('signup')}>Sign up</button>
      <span>to save your roll.</span>
    </p>
  {/if}
</div>

<style>
  .roll-pre-roll {
    gap: 26px;
  }

  .roll-pre-roll__display {
    align-items: center;
    gap: 18px;
  }

  .roll-pre-roll__unknown {
    display: grid;
    width: 88px;
    height: 88px;
    flex: 0 0 88px;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 14px;
    background: #242428;
    color: rgba(255, 255, 255, .68);
    font: 800 1rem / 1 var(--font-mono-stack, monospace);
    letter-spacing: .08em;
  }

  .roll-pre-roll__copy {
    gap: 7px;
  }

  .roll-pre-roll__status {
    color: rgba(255, 255, 255, .62);
    font: 700 .58rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .14em;
  }

  .roll-pre-roll__copy .roll-color-name {
    font-size: 1.24rem !important;
  }

  .roll-pre-roll__copy .roll-color-hex {
    line-height: 1.25;
  }

  .roll-pre-roll .guest-prompt--quiet {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: .28rem;
    width: 100%;
    margin: 0 !important;
    padding: 24px 0 0;
    border: 0;
    border-top: 1px solid var(--roll-border, rgba(255, 255, 255, .09));
    border-radius: 0;
    background: transparent;
    color: var(--roll-muted, #8d8c92);
    font: 400 .78rem/1.5 var(--site-font, 'Inter', sans-serif);
    text-align: center;
  }

  .roll-pre-roll .guest-prompt__text-action {
    display: inline;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    color: var(--roll-text, #f5f5f6);
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--roll-text, #f5f5f6) 42%, transparent);
    text-underline-offset: 3px;
  }

  .roll-pre-roll .guest-prompt__text-action:hover {
    text-decoration-color: var(--roll-text, #f5f5f6);
  }

  .roll-pre-roll .guest-prompt__text-action:focus-visible {
    outline: 2px solid var(--roll-accent, #fff);
    outline-offset: 4px;
  }

  @media (max-width: 600px) {
    .roll-pre-roll { gap: 22px; }
    .roll-pre-roll__display { gap: 14px; }
    .roll-pre-roll__unknown {
      width: 80px;
      height: 80px;
      flex-basis: 80px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-pre-roll .guest-prompt__text-action { transition: none; }
  }
</style>
