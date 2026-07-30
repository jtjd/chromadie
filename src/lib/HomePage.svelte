<script>
  import { createEventDispatcher } from 'svelte';

  export let isAuthenticated = false;

  const dispatch = createEventDispatcher();
</script>

<section class="home-page" aria-labelledby="home-title">
  <div class="home-page__copy">
    <p class="home-page__eyebrow">daily color identity · chm.lol</p>
    <h1 id="home-title" aria-label="chm.lol">
      <span>chm</span><em>.lol</em>
    </h1>
    <p class="home-page__intro">
      Roll one color each day. Keep the one that finds you. Your profile grows
      into a record of every return.
    </p>

    <div class="home-page__actions">
      {#if isAuthenticated}
        <button class="home-page__cta" type="button" on:click={() => dispatch('profile')}>
          Open your profile <span aria-hidden="true">↗</span>
        </button>
      {:else}
        <button class="home-page__cta" type="button" on:click={() => dispatch('signup')}>
          Create your profile <span aria-hidden="true">↗</span>
        </button>
      {/if}
      <p class="home-page__note">free to start <span aria-hidden="true">·</span> one roll each day</p>
    </div>
  </div>

  <aside class="home-page__aside" aria-label="About ChromaDie">
    <div class="home-page__aside-rule" aria-hidden="true"></div>
    <p class="home-page__aside-label">the ritual</p>
    <p class="home-page__aside-copy">A small daily act that leaves something behind.</p>
    <div class="home-page__aside-status">
      <span aria-hidden="true"></span>
      <span>every day</span>
    </div>
  </aside>
</section>

<style>
  .home-page {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(12rem, 15rem);
    align-items: end;
    gap: clamp(2rem, 8vw, 8rem);
    width: min(100%, 88rem);
    min-height: calc(100dvh - 9.75rem);
    margin-inline: auto;
    padding: clamp(4rem, 13vh, 9rem) clamp(1.5rem, 5vw, 3rem) clamp(4rem, 9vh, 6.5rem);
  }

  .home-page__copy {
    position: relative;
    z-index: 1;
    min-width: 0;
  }

  .home-page__eyebrow,
  .home-page__aside-label {
    margin: 0;
    color: var(--color-ink-faint);
    font: 500 0.7rem / 1.2 var(--font-mono-stack);
    letter-spacing: 0.1em;
    text-transform: lowercase;
  }

  .home-page h1 {
    display: block;
    margin: 1.25rem 0 0;
    color: var(--color-ink-strong);
    font: 800 clamp(5.5rem, 20vw, 17.5rem) / 0.78 var(--font-display-stack);
    letter-spacing: -0.085em;
    white-space: nowrap;
    user-select: none;
  }

  .home-page h1 em {
    color: var(--color-ink-faint);
    font-style: normal;
  }

  .home-page__intro {
    max-width: 34rem;
    margin: clamp(2rem, 5vw, 3.5rem) 0 0;
    color: var(--color-ink-muted);
    font-size: clamp(1.05rem, 1.5vw, 1.2rem);
    line-height: 1.55;
    text-wrap: balance;
  }

  .home-page__actions {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.85rem 1.25rem;
    margin-top: 2rem;
  }

  .home-page__cta {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    min-height: 2.5rem;
    padding: 0.45rem 0 0.55rem;
    border: 0;
    border-bottom: 1px solid rgba(233, 235, 239, 0.48);
    border-radius: 0;
    background: transparent;
    color: var(--color-ink-strong);
    font: 600 0.9rem / 1 var(--font-body-stack);
    cursor: pointer;
    transition: color var(--motion-base) var(--motion-ease-standard), border-color var(--motion-base) var(--motion-ease-standard), transform var(--motion-fast) var(--motion-ease-standard);
  }

  .home-page__cta:hover {
    transform: translateX(2px);
    border-color: var(--color-accent-bright);
    color: var(--color-accent-bright);
  }

  .home-page__cta:focus-visible {
    outline: 1px solid var(--color-accent-bright);
    outline-offset: 5px;
  }

  .home-page__note {
    margin: 0;
    color: var(--color-ink-faint);
    font: 500 0.7rem / 1.4 var(--font-mono-stack);
    letter-spacing: 0.02em;
  }

  .home-page__note span { margin-inline: 0.25rem; color: var(--color-accent); }

  .home-page__aside {
    align-self: center;
    max-width: 15rem;
    margin-bottom: clamp(1rem, 9vh, 6rem);
    color: var(--color-ink-muted);
  }

  .home-page__aside-rule {
    width: 100%;
    height: 1px;
    margin-bottom: 1.25rem;
    background: rgba(255, 255, 255, 0.13);
  }

  .home-page__aside-copy {
    margin: 0.8rem 0 0;
    color: var(--color-ink-muted);
    font-size: 0.9rem;
    line-height: 1.55;
  }

  .home-page__aside-status {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin-top: 2rem;
    color: var(--color-ink-faint);
    font: 500 0.68rem / 1 var(--font-mono-stack);
    letter-spacing: 0.08em;
    text-transform: lowercase;
  }

  .home-page__aside-status span:first-child {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: var(--color-accent);
    box-shadow: 0 0 1rem color-mix(in srgb, var(--color-accent) 70%, transparent);
  }

  @media (max-width: 48rem) {
    .home-page {
      grid-template-columns: 1fr;
      align-items: start;
      gap: 3.5rem;
      min-height: calc(100dvh - 8.75rem);
      padding-block: 5rem 4.5rem;
    }

    .home-page h1 { font-size: clamp(4.4rem, 19vw, 9rem); }
    .home-page__aside { align-self: start; margin-bottom: 0; }
  }

  @media (max-width: 36rem) {
    .home-page {
      gap: 3rem;
      padding: 3.5rem 1.25rem 3.5rem;
    }

    .home-page h1 { font-size: clamp(3.35rem, 18vw, 5.75rem); }
    .home-page__intro { margin-top: 1.75rem; font-size: 1rem; }
    .home-page__actions { align-items: flex-start; flex-direction: column; }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-page__cta { transition-duration: 0.001ms; }
    .home-page__cta:hover { transform: none; }
  }
</style>
