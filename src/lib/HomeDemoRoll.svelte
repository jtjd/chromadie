<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileRoll from './ProfileRoll.svelte';
  import { guestRollFixture } from './guestRollFixture.js';

  export let isAuthenticated = false;

  const dispatch = createEventDispatcher();
  let rollComplete = false;

  function handleRollComplete() {
    rollComplete = true;
  }
</script>

<section class="home-demo-roll" style="--profile-accent: #B666C9;" aria-labelledby="home-demo-roll-title">
  <div class="home-demo-roll__heading">
    <div>
      <span class="home-demo-roll__kicker">Try a sample roll</span>
      <h3 id="home-demo-roll-title">See the daily loop in motion.</h3>
      <p>This preview runs locally. Your real color is saved only after you create a profile.</p>
    </div>
    <button type="button" class="home-demo-roll__close" on:click={() => dispatch('close')}>Close</button>
  </div>

  <div class="home-demo-roll__stage">
    <ProfileRoll
      moduleSize="wide"
      compact={true}
      integrated={true}
      quiet={true}
      visualFixture="guest-onboarding"
      fixtureResult={guestRollFixture}
      on:rollcomplete={handleRollComplete}
    />
  </div>

  {#if rollComplete}
    <div class="home-demo-roll__cta" aria-live="polite">
      <div>
        <span>Preview complete</span>
        <strong>{isAuthenticated ? 'Open your profile to roll for real.' : 'Create a profile to keep your daily color.'}</strong>
      </div>
      <button type="button" on:click={() => dispatch(isAuthenticated ? 'profile' : 'signup')}>
        {isAuthenticated ? 'Open profile' : 'Create your profile'}
      </button>
    </div>
  {/if}
</section>

<style>
  .home-demo-roll { display: grid; gap: 1.2rem; padding: 1.35rem 1.45rem 1.45rem; border: 1px solid color-mix(in srgb, var(--home-roll-color) 27%, var(--home-line)); border-radius: 0.8rem; background: linear-gradient(145deg, rgba(255,255,255,0.045), rgba(182,102,201,0.07)); }
  .home-demo-roll__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .home-demo-roll__kicker { color: color-mix(in srgb, var(--profile-accent) 50%, white); font: 600 0.62rem / 1.2 var(--home-mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .home-demo-roll h3 { margin: 0.4rem 0 0; color: var(--home-ink); font: 600 clamp(1.35rem, 3vw, 2rem) / 1 var(--home-font); letter-spacing: -0.045em; }
  .home-demo-roll__heading p { max-width: 32rem; margin: 0.55rem 0 0; color: var(--home-ink-muted); font-size: 0.84rem; line-height: 1.5; }
  .home-demo-roll__close { flex: 0 0 auto; min-height: 2rem; padding: 0.45rem 0.7rem; border: 1px solid var(--home-line); border-radius: 999px; background: transparent; color: var(--home-ink-faint); cursor: pointer; font: 600 0.62rem / 1 var(--home-mono); }
  .home-demo-roll__close:hover { border-color: var(--home-line-strong); color: var(--home-ink); }
  .home-demo-roll__stage { min-width: 0; padding-top: 0.35rem; border-top: 1px solid var(--home-line); }
  .home-demo-roll__cta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--home-line); }
  .home-demo-roll__cta div { display: grid; gap: 0.3rem; }
  .home-demo-roll__cta span { color: color-mix(in srgb, var(--profile-accent) 58%, white); font: 600 0.6rem / 1.2 var(--home-mono); letter-spacing: 0.1em; text-transform: uppercase; }
  .home-demo-roll__cta strong { color: var(--home-ink); font-size: 0.82rem; font-weight: 600; }
  .home-demo-roll__cta button { flex: 0 0 auto; min-height: 2.6rem; padding: 0.65rem 0.85rem; border: 1px solid var(--home-color); border-radius: 0.5rem; background: var(--home-color); color: #11140d; cursor: pointer; font: 650 0.72rem / 1 var(--home-font); }
  .home-demo-roll__cta button:hover { background: #c7ff72; }
  :global(.home-demo-roll .profile-roll__details),
  :global(.home-demo-roll .profile-roll__result-actions) { display: none; }
  :global(.home-demo-roll .profile-roll--quiet.profile-roll--compact .profile-roll__ready) { padding: 0; }
  @media (max-width: 40rem) {
    .home-demo-roll { padding: 1rem; }
    .home-demo-roll__heading,
    .home-demo-roll__cta { flex-direction: column; align-items: stretch; }
    .home-demo-roll__close { justify-self: start; align-self: flex-start; }
    .home-demo-roll__cta button { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-demo-roll button { transition: none; }
  }
</style>
