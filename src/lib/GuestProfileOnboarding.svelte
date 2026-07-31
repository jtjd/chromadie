<script>
  import { createEventDispatcher } from 'svelte';
  import Game from './Game.svelte';
  import IdentityCard from './IdentityCard.svelte';
  import ProfileAtmosphere from './ProfileAtmosphere.svelte';

  export let guestActive = false;
  const dispatch = createEventDispatcher();
  let stage = 0;

  const steps = [
    { label: 'Profile', eyebrow: 'your public identity', title: 'This is your profile.', copy: 'Your profile is the game. Every color you roll becomes part of your public identity.' },
    { label: 'Customize', eyebrow: 'make it yours', title: 'Build a profile people remember.', copy: 'Earn effects, shape your atmosphere, and tell your story as your roll history grows.' },
    { label: 'Roll', eyebrow: 'your first daily color', title: 'Now roll today’s color.', copy: 'One roll each day. Your result becomes the newest chapter in your profile.' }
  ];

  $: currentStep = steps[stage];

  function advance() {
    if (stage < 2) stage += 1;
  }
</script>

<div class="guest-profile-onboarding" data-stage={stage}>
  <ProfileAtmosphere accent="#8B7CF6" secondaryAccent="#2ED3C9" effect="rain" />

  {#if stage < 2}
    <section class="guest-profile-onboarding__intro" aria-labelledby="guest-profile-title">
      <p class="guest-profile-onboarding__eyebrow">{currentStep.eyebrow}</p>
      <h1 id="guest-profile-title">{currentStep.title}</h1>
      <p>{currentStep.copy}</p>
      {#if guestActive}<span class="guest-profile-onboarding__status">A local profile is ready on this device.</span>{/if}
    </section>

    {#key stage}
      <section class="guest-profile-onboarding__stage" aria-live="polite">
        {#if stage === 0}
          <div class="guest-profile-onboarding__identity-wrap">
            <IdentityCard username="yourname" displayName="Your profile" bio="A public identity shaped by your daily colors." accentColor="#8B7CF6" showToday={false} />
            <div class="guest-profile-onboarding__profile-note">
              <span class="guest-profile-onboarding__note-mark">✦</span>
              <span>Customize your name, bio, colors, effects, and links.</span>
            </div>
          </div>
        {:else}
          <div class="guest-profile-onboarding__customize">
            <div class="guest-profile-onboarding__customize-orb" aria-hidden="true"><span></span></div>
            <div class="guest-profile-onboarding__customize-copy">
              <span class="guest-profile-onboarding__mini-label">profile expression</span>
              <strong>Every roll unlocks another detail.</strong>
              <div class="guest-profile-onboarding__tokens" aria-label="Profile customization examples">
                <span>rainfall</span><span>chroma aura</span><span>name effects</span><span>story chapters</span>
              </div>
            </div>
          </div>
        {/if}
      </section>
    {/key}

    <div class="guest-profile-onboarding__controls">
      <div class="guest-profile-onboarding__progress" aria-label={'Onboarding step ' + (stage + 1) + ' of 3'}>
        {#each steps as step, index (step.label)}<span class:active={index === stage} class:complete={index < stage} title={step.label}></span>{/each}
      </div>
      <button type="button" class="guest-profile-onboarding__next" on:click={advance}>
        <span>{stage === 0 ? 'See how profiles grow' : 'Go to today’s roll'}</span>
        <span aria-hidden="true">↓</span>
      </button>
    </div>
  {:else}
    <section class="guest-profile-onboarding__roll-intro" aria-labelledby="guest-roll-title">
      <p class="guest-profile-onboarding__eyebrow">{currentStep.eyebrow}</p>
      <h1 id="guest-roll-title">{currentStep.title}</h1>
      <p>{currentStep.copy}</p>
    </section>
    <div class="guest-profile-onboarding__game">
      <Game profileMode={true} on:promptlogin={event => dispatch('login', event.detail)} on:navigate={event => dispatch('navigate', event.detail)} />
    </div>
  {/if}
</div>

<style>
  .guest-profile-onboarding { position: relative; min-height: calc(100dvh - 4.75rem); isolation: isolate; padding: clamp(3.5rem, 10vh, 7rem) clamp(1rem, 4vw, 3rem) 5rem; }
  .guest-profile-onboarding__intro, .guest-profile-onboarding__roll-intro, .guest-profile-onboarding__stage, .guest-profile-onboarding__game { position: relative; z-index: 1; width: min(100%, 52rem); margin-inline: auto; }
  .guest-profile-onboarding__intro, .guest-profile-onboarding__roll-intro { text-align: center; }
  .guest-profile-onboarding__eyebrow, .guest-profile-onboarding__mini-label { margin: 0; color: var(--color-ink-faint); font: 500 0.7rem / 1.2 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .guest-profile-onboarding h1 { margin: 0.9rem 0 0; color: var(--color-ink-strong); font: 700 clamp(2.1rem, 5vw, 3.8rem) / 0.95 var(--font-display-stack); letter-spacing: -0.05em; }
  .guest-profile-onboarding__intro > p:not(.guest-profile-onboarding__eyebrow), .guest-profile-onboarding__roll-intro > p:not(.guest-profile-onboarding__eyebrow) { max-width: 36rem; margin: 1rem auto 0; color: var(--color-ink-muted); font-size: 1rem; line-height: 1.55; }
  .guest-profile-onboarding__status { display: inline-block; margin-top: 0.9rem; color: #d6ff63; font: 500 0.68rem / 1.2 var(--font-mono-stack); }
  .guest-profile-onboarding__stage { min-height: 20rem; display: grid; place-items: center; margin-top: 2.25rem; animation: onboarding-stage-in 0.55s var(--motion-ease-emphasis); }
  .guest-profile-onboarding__identity-wrap { width: min(100%, 46rem); }
  .guest-profile-onboarding__identity-wrap :global(.identity-card) { border-color: rgba(196,181,253,0.42); box-shadow: 0 0 3rem rgba(139,124,246,0.2), 0 2rem 5rem rgba(0,0,0,0.34); }
  .guest-profile-onboarding__profile-note { display: flex; align-items: center; justify-content: center; gap: 0.55rem; margin-top: 1rem; color: var(--color-ink-faint); font: 500 0.68rem / 1.3 var(--font-mono-stack); text-align: center; }
  .guest-profile-onboarding__note-mark { color: #d6ff63; }
  .guest-profile-onboarding__customize { display: flex; align-items: center; gap: 2rem; width: min(100%, 38rem); padding: 2rem; border: 1px solid rgba(196,181,253,0.3); border-radius: var(--radius-lg); background: rgba(9,11,15,0.58); box-shadow: 0 0 3rem rgba(139,124,246,0.14), inset 0 1px 0 rgba(255,255,255,0.05); }
  .guest-profile-onboarding__customize-orb { position: relative; flex: 0 0 8rem; width: 8rem; height: 8rem; border-radius: 50%; background: radial-gradient(circle at 35% 25%, #f4ddff, #c46ee1 38%, #5941a9 72%, #141323); box-shadow: 0 0 2.5rem rgba(196,181,253,0.45); animation: onboarding-orb 3.5s ease-in-out infinite; }
  .guest-profile-onboarding__customize-orb::after { content: ''; position: absolute; inset: 18%; border: 1px solid rgba(255,255,255,0.56); border-radius: 50%; transform: rotate(-28deg) scaleY(0.58); }
  .guest-profile-onboarding__customize-copy { min-width: 0; }
  .guest-profile-onboarding__customize-copy strong { display: block; margin-top: 0.6rem; color: var(--color-ink-strong); font: 600 1.35rem / 1.15 var(--font-display-stack); }
  .guest-profile-onboarding__tokens { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 1rem; }
  .guest-profile-onboarding__tokens span { padding: 0.4rem 0.55rem; border: 1px solid rgba(196,181,253,0.28); border-radius: 999px; color: var(--color-ink-muted); font: 500 0.62rem / 1 var(--font-mono-stack); }
  .guest-profile-onboarding__controls { position: relative; z-index: 2; display: grid; justify-items: center; gap: 1.15rem; margin-top: 2rem; }
  .guest-profile-onboarding__progress { display: flex; gap: 0.4rem; }
  .guest-profile-onboarding__progress span { width: 0.4rem; height: 0.4rem; border: 1px solid rgba(196,181,253,0.44); border-radius: 50%; }
  .guest-profile-onboarding__progress span.active, .guest-profile-onboarding__progress span.complete { border-color: #d6ff63; background: #d6ff63; box-shadow: 0 0 0.7rem rgba(214,255,99,0.55); }
  .guest-profile-onboarding__next { display: inline-flex; align-items: center; gap: 0.8rem; min-height: 2.8rem; padding: 0.65rem 1rem; border: 1px solid rgba(196,181,253,0.48); border-radius: 999px; background: rgba(139,124,246,0.12); color: var(--color-ink-strong); cursor: pointer; font: 600 0.72rem / 1 var(--font-mono-stack); transition: background var(--motion-base) var(--motion-ease-standard), transform var(--motion-base) var(--motion-ease-standard); }
  .guest-profile-onboarding__next:hover { background: rgba(139,124,246,0.25); transform: translateY(-2px); }
  .guest-profile-onboarding__next span:last-child { color: #d6ff63; font-size: 1rem; }
  .guest-profile-onboarding__roll-intro { margin-bottom: 1.75rem; text-align: center; }
  .guest-profile-onboarding__game :global(.game-container) { margin-top: 0; }
  .guest-profile-onboarding__game :global(.game-container--profile) { max-width: 60rem; padding: 0; }
  .guest-profile-onboarding__game :global(.game-container--profile > .card) { border: 0; border-radius: 0; background: transparent; box-shadow: none; padding: 1.5rem 0; }
  .guest-profile-onboarding__game :global(.game-container--profile h1) { color: var(--color-ink-faint); font: 500 0.72rem / 1 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: lowercase; }
  .guest-profile-onboarding__game :global(.game-container--profile .info-text) { max-width: 34rem; margin-inline: auto; color: var(--color-ink-muted); }
  .guest-profile-onboarding__game :global(.game-container--profile .roll-btn) { border-radius: var(--radius-pill); background: rgba(139,124,246,0.16); border: 1px solid rgba(196,181,253,0.5); box-shadow: 0 0 2rem rgba(139,124,246,0.16); }
  .guest-profile-onboarding__game :global(.game-container--profile .roll-btn:hover) { background: rgba(139,124,246,0.28); }
  @keyframes onboarding-stage-in { from { opacity: 0; transform: translateY(0.8rem) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes onboarding-orb { 0%, 100% { transform: translateY(0) scale(0.98); } 50% { transform: translateY(-7px) scale(1.03); } }
  @media (max-width: 36rem) { .guest-profile-onboarding { padding-inline: 0.75rem; } .guest-profile-onboarding__customize { flex-direction: column; align-items: flex-start; padding: 1.35rem; } .guest-profile-onboarding__customize-orb { align-self: center; } .guest-profile-onboarding__profile-note { align-items: flex-start; text-align: left; } }
  @media (prefers-reduced-motion: reduce) { .guest-profile-onboarding__stage, .guest-profile-onboarding__customize-orb { animation: none; } .guest-profile-onboarding__next { transition-duration: 0.001ms; } }
</style>
