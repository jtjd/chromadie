<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import ProfileReferenceCard from './ProfileReferenceCard.svelte';
  import ProfileRoll from './ProfileRoll.svelte';
  import { guestRollFixture } from './guestRollFixture.js';

  export let guestActive = false;
  const dispatch = createEventDispatcher();
  let stage = 0;
  let rollComplete = false;
  let rollSection;
  let rollColor = '#8B7CF6';
  let rollAnimationTimer;

  function advanceToRoll() {
    stage = 1;
    requestAnimationFrame(() => rollSection?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
  }

  function handleRollStart() {
    rollColor = '#8B7CF6';
    if (rollAnimationTimer) clearTimeout(rollAnimationTimer);
  }

  function handleRollPreview(event) {
    if (event.detail?.hex) rollColor = event.detail.hex;
  }

  function handleRollComplete(event) {
    rollColor = event.detail?.canonical?.hex || event.detail?.data?.hex || rollColor;
    rollComplete = true;
    if (rollAnimationTimer) clearTimeout(rollAnimationTimer);
    rollAnimationTimer = setTimeout(() => {
      rollAnimationTimer = null;
    }, 1400);
  }

  onDestroy(() => {
    if (rollAnimationTimer) clearTimeout(rollAnimationTimer);
  });
</script>

<div class="guest-profile-onboarding" data-stage={stage}>
  {#if stage === 0}
    <section class="guest-profile-onboarding__identity-stage" aria-labelledby="guest-profile-title">
      <p class="guest-profile-onboarding__eyebrow">your public identity</p>
      <h1 id="guest-profile-title">This could be your profile.</h1>
      <p class="guest-profile-onboarding__intro-copy">Your name, border, colors, and roll history come together here. Every day gives your profile another detail.</p>
      {#if guestActive}<span class="guest-profile-onboarding__status">A local profile is ready on this device.</span>{/if}

      <div class="guest-profile-onboarding__identity-wrap">
        <ProfileReferenceCard displayName="Your profile" bio="A public identity shaped by your daily colors." accentColor="#8B7CF6" presentation="profile" ariaLabel="Example profile card" />
        <div class="guest-profile-onboarding__effects" aria-label="Example profile details">
          <span><i aria-hidden="true"></i> Name layers</span>
          <span><i aria-hidden="true"></i> Profile border</span>
          <span><i aria-hidden="true"></i> Daily color</span>
          <span><i aria-hidden="true"></i> Color story</span>
        </div>
      </div>

      <div class="guest-profile-onboarding__controls">
        <div class="guest-profile-onboarding__progress" aria-label="Onboarding step 1 of 2"><span class="active"></span><span></span></div>
        <button type="button" class="guest-profile-onboarding__next" on:click={advanceToRoll}>
          <span>See today’s roll</span><span aria-hidden="true">↓</span>
        </button>
      </div>
    </section>
  {:else}
    <section class="guest-profile-onboarding__roll-stage" bind:this={rollSection} aria-labelledby="guest-roll-title">
      <p class="guest-profile-onboarding__eyebrow">the daily roll</p>
      <h1 id="guest-roll-title">Add your first chapter.</h1>
      <p class="guest-profile-onboarding__intro-copy">One color each day. Roll below to see how it becomes part of your profile.</p>
      <div class="guest-profile-onboarding__progress" aria-label="Onboarding step 2 of 2"><span class="complete"></span><span class="active"></span></div>

      <div class="guest-profile-onboarding__roll">
        <ProfileRoll moduleSize="wide" compact={true} integrated={true} quiet={true} visualFixture="guest-onboarding" fixtureResult={guestRollFixture} on:rollstart={handleRollStart} on:colorpreview={handleRollPreview} on:rollcomplete={handleRollComplete} />
      </div>

      {#if rollComplete}
        <aside class="guest-profile-onboarding__cta" aria-live="polite">
          <div><p>Keep this color in your profile.</p><strong>Create an account to save your roll, unlock effects, and join the leaderboard.</strong></div>
          <button type="button" on:click={() => dispatch('login', { mode: 'signup' })}>Create your profile</button>
        </aside>
      {/if}
    </section>
  {/if}
</div>

<style>
  .guest-profile-onboarding { position: relative; min-height: calc(100dvh - 4.75rem); isolation: isolate; padding: clamp(3.5rem, 9vh, 6rem) clamp(1rem, 4vw, 3rem) 5rem; }
  .guest-profile-onboarding__identity-stage, .guest-profile-onboarding__roll-stage { position: relative; z-index: 1; width: min(100%, 58rem); margin-inline: auto; text-align: center; }
  .guest-profile-onboarding__eyebrow { margin: 0; color: var(--color-ink-faint); font: 500 0.7rem / 1.2 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .guest-profile-onboarding h1 { margin: 0.9rem 0 0; color: var(--color-ink-strong); font: 700 clamp(2.1rem, 5vw, 3.8rem) / 0.95 var(--font-display-stack); letter-spacing: -0.05em; }
  .guest-profile-onboarding__intro-copy { max-width: 36rem; margin: 1rem auto 0; color: var(--color-ink-muted); font-size: 1rem; line-height: 1.55; }
  .guest-profile-onboarding__status { display: inline-block; margin-top: 0.9rem; color: #d6ff63; font: 500 0.68rem / 1.2 var(--font-mono-stack); }
  .guest-profile-onboarding__identity-wrap { width: min(100%, 48rem); margin: 2.75rem auto 0; }
  .guest-profile-onboarding__identity-wrap :global(.profile-reference-card) { border-color: rgba(196,181,253,0.42); box-shadow: 0 0 3rem rgba(139,124,246,0.2), 0 2rem 5rem rgba(0,0,0,0.34); }
  .guest-profile-onboarding__effects { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.55rem 1rem; margin-top: 1rem; }
  .guest-profile-onboarding__effects span { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--color-ink-faint); font: 500 0.64rem / 1 var(--font-mono-stack); }
  .guest-profile-onboarding__effects i { width: 0.38rem; height: 0.38rem; border-radius: 50%; background: #c4b5fd; box-shadow: 0 0 0.7rem rgba(196,181,253,0.72); }
  .guest-profile-onboarding__controls { display: grid; justify-items: center; gap: 1rem; margin-top: 2.2rem; }
  .guest-profile-onboarding__progress { display: flex; justify-content: center; gap: 0.4rem; }
  .guest-profile-onboarding__progress span { display: block; width: 0.4rem; height: 0.4rem; border: 1px solid rgba(196,181,253,0.44); border-radius: 50%; }
  .guest-profile-onboarding__progress span.active, .guest-profile-onboarding__progress span.complete { border-color: #d6ff63; background: #d6ff63; box-shadow: 0 0 0.7rem rgba(214,255,99,0.55); }
  .guest-profile-onboarding__next { display: inline-flex; align-items: center; gap: 0.8rem; min-height: 2.8rem; padding: 0.65rem 1rem; border: 1px solid rgba(196,181,253,0.48); border-radius: 999px; background: rgba(139,124,246,0.12); color: var(--color-ink-strong); cursor: pointer; font: 600 0.72rem / 1 var(--font-mono-stack); }
  .guest-profile-onboarding__next:hover { background: rgba(139,124,246,0.25); }
  .guest-profile-onboarding__next span:last-child { color: #d6ff63; font-size: 1rem; }
  .guest-profile-onboarding__roll-stage { scroll-margin-top: 5rem; }
  .guest-profile-onboarding__roll-stage > .guest-profile-onboarding__progress { margin-top: 1.5rem; }
  .guest-profile-onboarding__roll { margin: 2.5rem auto 0; text-align: left; }
  .guest-profile-onboarding__roll :global(.profile-roll--integrated) { color: var(--color-ink-strong); }
  .guest-profile-onboarding__cta { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; margin-top: 1.5rem; padding: 1.15rem 1.25rem; border: 1px solid rgba(214,255,99,0.46); border-radius: var(--radius-md); background: linear-gradient(100deg, rgba(214,255,99,0.12), rgba(139,124,246,0.13)); box-shadow: 0 0 2.5rem rgba(214,255,99,0.1); text-align: left; }
  .guest-profile-onboarding__cta p { margin: 0; color: #d6ff63; font: 700 0.66rem / 1.2 var(--font-mono-stack); letter-spacing: 0.12em; text-transform: uppercase; }
  .guest-profile-onboarding__cta strong { display: block; max-width: 30rem; margin-top: 0.35rem; color: var(--color-ink-strong); font: 500 0.92rem / 1.35 var(--font-body-stack); }
  .guest-profile-onboarding__cta button { flex: 0 0 auto; min-height: 2.8rem; padding: 0.7rem 1rem; border: 1px solid #d6ff63; border-radius: 999px; background: #d6ff63; color: #11150a; cursor: pointer; font: 700 0.7rem / 1 var(--font-mono-stack); }
  @media (max-width: 36rem) { .guest-profile-onboarding { padding-inline: 0.75rem; } .guest-profile-onboarding__cta { align-items: stretch; flex-direction: column; } .guest-profile-onboarding__cta button { width: 100%; } }
  @media (prefers-reduced-motion: reduce) { .guest-profile-onboarding__next { transition-duration: 0.001ms; } }
</style>
