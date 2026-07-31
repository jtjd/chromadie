<script>
  import { createEventDispatcher } from 'svelte';
  import Game from './Game.svelte';
  import ProfileAtmosphere from './ProfileAtmosphere.svelte';

  export let guestActive = false;
  const dispatch = createEventDispatcher();
</script>

<div class="guest-profile-onboarding">
  <ProfileAtmosphere accent="#8B7CF6" secondaryAccent="#2ED3C9" />
  <section class="guest-profile-onboarding__intro" aria-labelledby="guest-profile-title">
    <p class="guest-profile-onboarding__eyebrow">your profile starts here</p>
    <h1 id="guest-profile-title">Roll your first color.</h1>
    <p>Try today’s roll locally, then create an account to save your profile, earn EP, unlock effects, and appear on the leaderboard.</p>
    {#if guestActive}<span class="guest-profile-onboarding__status">Local progress is saved on this device.</span>{/if}
  </section>

  <div class="guest-profile-onboarding__game">
    <Game profileMode={true} on:promptlogin={event => dispatch('login', event.detail)} on:navigate={event => dispatch('navigate', event.detail)} />
  </div>
</div>

<style>
  .guest-profile-onboarding { position: relative; min-height: calc(100dvh - 4.75rem); isolation: isolate; padding: clamp(3rem, 9vh, 6rem) clamp(1rem, 4vw, 3rem) 5rem; }
  .guest-profile-onboarding__intro, .guest-profile-onboarding__game { position: relative; z-index: 1; width: min(100%, 46rem); margin-inline: auto; }
  .guest-profile-onboarding__intro { text-align: center; margin-bottom: 2rem; }
  .guest-profile-onboarding__eyebrow { margin: 0; color: var(--color-ink-faint); font: 500 0.7rem / 1.2 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .guest-profile-onboarding h1 { margin: 0.9rem 0 0; color: var(--color-ink-strong); font: 700 clamp(2rem, 5vw, 3.4rem) / 0.95 var(--font-display-stack); letter-spacing: -0.04em; }
  .guest-profile-onboarding__intro > p:not(.guest-profile-onboarding__eyebrow) { max-width: 34rem; margin: 1rem auto 0; color: var(--color-ink-muted); font-size: 1rem; line-height: 1.55; }
  .guest-profile-onboarding__status { display: inline-block; margin-top: 0.9rem; color: #d6ff63; font: 500 0.68rem / 1.2 var(--font-mono-stack); }
  .guest-profile-onboarding__game :global(.game-container) { margin-top: 0; }
  .guest-profile-onboarding__game :global(.game-container--profile) { max-width: 60rem; padding: 0; }
  .guest-profile-onboarding__game :global(.game-container--profile > .card) { border: 0; border-radius: 0; background: transparent; box-shadow: none; padding: 1.5rem 0; }
  .guest-profile-onboarding__game :global(.game-container--profile h1) { color: var(--color-ink-faint); font: 500 0.72rem / 1 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .guest-profile-onboarding__game :global(.game-container--profile .info-text) { max-width: 34rem; margin-inline: auto; color: var(--color-ink-muted); }
  .guest-profile-onboarding__game :global(.game-container--profile .roll-btn) { border-radius: var(--radius-pill); background: rgba(139,124,246,0.16); border: 1px solid rgba(196,181,253,0.5); box-shadow: 0 0 2rem rgba(139,124,246,0.16); }
  .guest-profile-onboarding__game :global(.game-container--profile .roll-btn:hover) { background: rgba(139,124,246,0.28); }
  @media (max-width: 36rem) { .guest-profile-onboarding { padding-inline: 0.75rem; } }
</style>
