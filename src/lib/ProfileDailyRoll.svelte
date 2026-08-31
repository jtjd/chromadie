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

<div class={'profile-daily-roll profile-daily-roll--' + variant} role="group" aria-label={isOwner ? 'Today’s color roll' : 'Latest color'} data-profile-widget="roll" data-profile-roll-variant={variant}>
  {#if variant === 'compact'}
    <header class="profile-daily-roll__header">
      <span aria-hidden="true"></span>
      <h2>Daily Roll</h2>
    </header>
  {/if}
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
    <TodayColor result={result} quiet={true} accentColor={accentColor} presentation={variant} />
  {/if}
</div>

<style>
  .profile-daily-roll { width: 100%; min-width: 0; }
  .profile-daily-roll :global(.profile-roll--integrated),
  .profile-daily-roll :global(.today-color) {
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .profile-daily-roll :global(.profile-roll--integrated .foundation-module__body) { padding: 0; }
  .profile-daily-roll :global(.profile-roll__description),
  .profile-daily-roll :global(.profile-roll__percentile),
  .profile-daily-roll :global(.profile-roll__details),
  .profile-daily-roll :global(.today-color__condition-rail),
  .profile-daily-roll :global(.today-color__details) { display: none; }

  /* Compact is one continuous profile surface. The roll owns a subtle
     divider and shared result language, but does not grow a second card shell
     inside the identity card. */
  .profile-daily-roll--compact {
    --profile-daily-roll-accent: var(--profile-control-accent, var(--profile-accent, #8B7CF6));
    --roll-border: rgba(255, 255, 255, .09);
    --roll-text: #f5f5f6;
    --roll-muted: #8d8c92;
    --roll-faint: #59585e;
    --roll-accent: var(--profile-daily-roll-accent);
    --roll-score-color: #f5c26f;
    margin-top: 1.05rem;
    padding: .95rem 0 .1rem;
    border-top: 1px solid color-mix(in srgb, var(--profile-daily-roll-accent) 34%, var(--roll-border));
    color: var(--roll-text);
    font-family: var(--site-font, 'Inter', sans-serif);
  }

  .profile-daily-roll__header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .45rem;
    margin: 0 0 .75rem;
    text-align: center;
  }

  .profile-daily-roll__header > span {
    width: 1.25rem;
    height: .14rem;
    border-radius: 999px;
    background: var(--profile-daily-roll-accent);
    box-shadow: 0 0 .8rem color-mix(in srgb, var(--profile-daily-roll-accent) 68%, transparent);
  }

  .profile-daily-roll__header h2 {
    margin: 0;
    color: var(--roll-text);
    font: 700 .68rem / 1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .13em;
    text-transform: uppercase;
  }

  .profile-daily-roll--compact:focus-within {
    border-top-color: color-mix(in srgb, var(--profile-daily-roll-accent) 58%, var(--roll-border));
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact),
  .profile-daily-roll--compact :global(.today-color--presentation-compact) {
    width: 100%;
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .foundation-module__body) {
    padding: 0;
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result-head),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__result-head) {
    grid-template-columns: 3.75rem minmax(0, 1fr);
    gap: .7rem;
    padding: .65rem 0;
    border-block: 1px solid var(--roll-border);
    background: transparent;
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result .profile-roll__preview),
  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result .profile-roll__preview .roll-preview-frame),
  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result .profile-roll__preview .final-color-display),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__preview),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__preview .roll-preview-frame),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__preview .final-color-display) {
    width: 3.75rem;
    min-width: 3.75rem;
    height: 3.75rem;
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result .profile-roll__preview .final-color-display),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__preview .final-color-display) {
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: .7rem;
    box-shadow: 0 .5rem 1.3rem -.55rem color-mix(in srgb, var(--roll-result-color, var(--roll-accent)) 42%, transparent), inset 0 0 .8rem rgba(0, 0, 0, .3);
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result .profile-roll__eyebrow),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__label) {
    color: var(--roll-muted);
    font: 700 .56rem / 1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .1em;
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__identity),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__identity) {
    margin-top: .34rem;
    color: var(--roll-text);
    font: 800 .9rem / 1.05 var(--site-display, 'Manrope Variable', sans-serif);
    letter-spacing: -.03em;
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__identity-row),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__identity-row) {
    gap: .45rem;
    margin-top: .3rem;
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__hex),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__identity-row strong) {
    color: var(--roll-muted);
    font: 400 .68rem / 1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: 0;
  }

  .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__rarity),
  .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__rarity) {
    display: inline-flex;
    padding: .2rem .35rem;
    border-color: color-mix(in srgb, var(--roll-rarity, var(--roll-accent)) 56%, var(--roll-border));
    background: color-mix(in srgb, var(--roll-rarity, var(--roll-accent)) 13%, transparent);
    color: var(--roll-rarity, var(--roll-accent));
    font: 600 .5rem / 1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .02em;
  }

  /* The same summary component is intentionally flattened here: score and
     conditions stay legible, while the profile card remains the visual owner. */
  .profile-daily-roll--compact :global(.roll-result-summary) {
    --roll-accent: var(--roll-result-color, var(--profile-daily-roll-accent));
    --result-accent: var(--roll-result-color, var(--profile-daily-roll-accent));
    --roll-score-color: #f5c26f;
    display: grid;
    gap: .55rem;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .profile-daily-roll--compact :global(.roll-result-summary__scoreline) {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: .65rem;
    padding: .6rem 0 .55rem;
    border-top: 1px solid var(--roll-border);
    border-bottom: 1px solid var(--roll-border);
  }

  .profile-daily-roll--compact :global(.roll-result-summary__score) {
    display: flex;
    align-items: baseline;
    gap: .55rem;
  }

  .profile-daily-roll--compact :global(.roll-result-summary__score span) {
    color: var(--roll-muted);
    font-size: .56rem;
    letter-spacing: .12em;
  }

  .profile-daily-roll--compact :global(.roll-result-summary__score strong) {
    font-size: 1.45rem;
    text-shadow: 0 0 .9rem color-mix(in srgb, var(--roll-score-color) 24%, transparent);
  }

  .profile-daily-roll--compact :global(.roll-result-summary__conditions) {
    gap: .4rem;
    padding-top: 0;
    border-top: 0;
  }

  .profile-daily-roll--compact :global(.roll-result-summary__label) {
    font-size: .56rem;
    letter-spacing: .12em;
  }

  .profile-daily-roll--compact :global(.roll-result-summary__condition-list) { gap: .3rem; }

  .profile-daily-roll--compact :global(.roll-result-summary__condition) {
    grid-template-columns: 1.35rem minmax(0, 1fr) auto auto;
    gap: .35rem;
    min-height: 1.85rem;
    padding: .2rem .35rem;
    border-radius: .55rem;
    background: rgba(255, 255, 255, .025);
  }

  .profile-daily-roll--compact :global(.roll-result-summary__condition-icon) {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: .35rem;
    font-size: .64rem;
  }

  .profile-daily-roll--compact :global(.roll-result-summary__condition strong) {
    font-size: .59rem;
    line-height: 1.15;
  }

  .profile-daily-roll--compact :global(.roll-result-summary__condition-rarity) {
    padding: .22rem .3rem;
    font-size: .46rem;
  }

  .profile-daily-roll--compact :global(.roll-result-summary__condition-points) { font-size: .55rem; }
  .profile-daily-roll--compact :global(.roll-result-summary__remaining) { font-size: .62rem; }

  .profile-daily-roll--compact :global(.roll-result-summary__details-button) {
    min-height: 2.2rem;
    padding: .48rem .65rem;
    border-radius: .55rem;
    font-size: .62rem;
  }

  .profile-daily-roll--compact :global(.today-color__empty-state) {
    grid-template-columns: 3.75rem minmax(0, 1fr);
    gap: .7rem;
    padding: .65rem 0;
    border-block: 1px solid var(--roll-border);
    background: transparent;
  }

  .profile-daily-roll--compact :global(.today-color__empty-state .today-color__preview),
  .profile-daily-roll--compact :global(.today-color__empty-state .today-color__preview .roll-preview-frame),
  .profile-daily-roll--compact :global(.today-color__empty-state .today-color__preview .final-color-display) {
    width: 3.75rem;
    height: 3.75rem;
  }

  @media (max-width: 22rem) {
    .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result-head),
    .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__result-head) {
      grid-template-columns: 3.25rem minmax(0, 1fr);
    }

    .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result .profile-roll__preview),
    .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result .profile-roll__preview .roll-preview-frame),
    .profile-daily-roll--compact :global(.profile-roll--presentation-compact .profile-roll__result .profile-roll__preview .final-color-display),
    .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__preview),
    .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__preview .roll-preview-frame),
    .profile-daily-roll--compact :global(.today-color--presentation-compact .today-color__preview .final-color-display) {
      width: 3.25rem;
      min-width: 3.25rem;
      height: 3.25rem;
    }

    .profile-daily-roll--compact :global(.roll-result-summary__condition) {
      grid-template-columns: 1.25rem minmax(0, 1fr) auto;
    }

    .profile-daily-roll--compact :global(.roll-result-summary__condition-points) { grid-column: 3; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-daily-roll :global(*) { scroll-behavior: auto; }
  }
</style>
