<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileRoll from './ProfileRoll.svelte';
  import TodayColor from './TodayColor.svelte';

  export let isOwner = false;
  export let result = null;
  export let accentColor = '#8B7CF6';
  export let variant = 'compact';
  export let visualFixture = '';

  const dispatch = createEventDispatcher();

  function forward(event) {
    dispatch(event.type, event.detail);
  }
</script>

<div class={'profile-daily-roll profile-daily-roll--' + variant} aria-label={isOwner ? 'Today’s color roll' : 'Latest color'}>
  {#if isOwner}
    <ProfileRoll
      moduleSize="wide"
      compact={true}
      integrated={true}
      quiet={true}
      presentation={variant}
      {visualFixture}
      fixtureResult={result}
      on:rollstart={forward}
      on:rollcancel={forward}
      on:rollcomplete={forward}
    />
  {:else}
    <TodayColor result={result} quiet={true} accentColor={accentColor} />
  {/if}
</div>

<style>
  .profile-daily-roll { width: 100%; min-width: 0; }
  .profile-daily-roll :global(.profile-roll--integrated),
  .profile-daily-roll :global(.today-color) { width: 100%; margin: 0; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
  .profile-daily-roll :global(.profile-roll--integrated .foundation-module__body) { padding: 0; }
  .profile-daily-roll :global(.today-color__result-head) { grid-template-columns: 2.25rem minmax(0, 1fr); gap: .65rem; }
  .profile-daily-roll :global(.today-color__preview),
  .profile-daily-roll :global(.today-color__preview .roll-preview-frame),
  .profile-daily-roll :global(.today-color__preview .final-color-display) { width: 2.25rem; height: 2.25rem; }
  .profile-daily-roll :global(.today-color__copy strong) { font-size: .92rem; }
  .profile-daily-roll :global(.today-color__label) { font-size: .55rem; }
  .profile-daily-roll :global(.today-color__score) { margin-top: .2rem; font-size: .75rem; }
  .profile-daily-roll :global(.today-color__rarity),
  .profile-daily-roll :global(.today-color__condition-rail),
  .profile-daily-roll :global(.today-color__details) { display: none; }
  .profile-daily-roll :global(.profile-roll__description),
  .profile-daily-roll :global(.profile-roll__percentile),
  .profile-daily-roll :global(.profile-roll__details) { display: none; }
  .profile-daily-roll :global(.profile-roll__button),
  .profile-daily-roll :global(.profile-roll__reveal-button) { min-height: 2.35rem; }

  /* These are presentation contracts, not separate roll implementations.
     ProfileRoll and TodayColor still own eligibility, data and events. */
  .profile-daily-roll--compact {
    padding: .55rem .7rem .65rem;
    border-top: 1px solid color-mix(in srgb, var(--profile-control-accent, #8B7CF6) 22%, transparent);
  }

  .profile-daily-roll--sleek {
    min-height: 3rem;
    padding: .2rem .55rem;
    border: 1px solid color-mix(in srgb, var(--profile-border-color, #ffffff) 14%, transparent);
    border-radius: .72rem;
    background: color-mix(in srgb, var(--profile-surface, #090b0f) 52%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .profile-daily-roll--minimal {
    width: auto;
    max-width: 100%;
    padding: .25rem 0;
    border-top: 1px solid color-mix(in srgb, var(--profile-control-accent, #8B7CF6) 18%, transparent);
  }

  .profile-daily-roll--minimal :global(.today-color__result-head),
  .profile-daily-roll--minimal :global(.profile-roll__result) { max-width: 15rem; }

  .profile-daily-roll--modern {
    padding: .3rem .55rem .15rem;
    border: 1px solid color-mix(in srgb, var(--profile-border-color, #ffffff) 11%, transparent);
    border-radius: .72rem;
    background: color-mix(in srgb, var(--profile-surface, #090b0f) 42%, transparent);
  }

  .profile-daily-roll--modern :global(.today-color__result-head),
  .profile-daily-roll--modern :global(.profile-roll__result) { max-width: 17rem; }

  .profile-daily-roll--portfolio {
    padding: .5rem 0;
  }

  @media (prefers-reduced-motion: reduce) { .profile-daily-roll :global(*) { scroll-behavior: auto; } }
</style>
