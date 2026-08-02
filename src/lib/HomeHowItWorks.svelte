<script>
  import HomeLeaderboard from './HomeLeaderboard.svelte';
  import HomeImageLightbox from './HomeImageLightbox.svelte';

  export let rows = [];

  const steps = Object.freeze({
    roll: {
      step: '01 / Roll',
      title: 'Get one color and score each day.',
      text: 'Each result produces a generated color, rarity, score, and visible conditions. The color becomes a new chapter in the profile’s public history.',
      image: '/homepage/daily-roll-result.webp',
      alt: 'Daily roll color, rarity, score, and conditions',
      label: 'Color · rarity · score · conditions'
    },
    progress: {
      step: '02 / Progress',
      title: 'See where the score came from.',
      text: 'Conditions and score contributors explain the result. EP then feeds profile progression and unlocks new ways to shape the same public page.',
      image: '/homepage/daily-roll-progress.webp',
      alt: 'Daily roll story, countdown, and score contributors',
      label: 'New chapter · contributors · rewards'
    },
    visibility: {
      step: '03 / Visibility',
      title: 'Higher placement makes the profile easier to find.',
      text: 'The leaderboard is a route into real profiles. Visitors can continue from a daily result into the person’s music, projects, links, and other public content.',
      image: '',
      alt: '',
      label: ''
    }
  });

  const tabKeys = Object.freeze(['roll', 'progress', 'visibility']);
  let activeStep = 'roll';
  let switching = false;

  $: currentStep = steps[activeStep];

  function selectStep(nextStep) {
    if (!steps[nextStep] || nextStep === activeStep) return;
    switching = true;
    window.setTimeout(() => {
      activeStep = nextStep;
      switching = false;
    }, 180);
  }

  function handleTabKeydown(event, index) {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabKeys.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabKeys.length) % tabKeys.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabKeys.length - 1;
    if (nextIndex === index) return;
    event.preventDefault();
    selectStep(tabKeys[nextIndex]);
    document.getElementById(`home-how-tab-${tabKeys[nextIndex]}`)?.focus();
  }
</script>

<section class="home-how" id="how-it-works" aria-labelledby="home-how-title">
  <div class="home-shell">
    <div class="home-how__head home-reveal">
      <div>
        <p class="home-kicker">How it works</p>
        <h2 id="home-how-title">Roll. Progress. Move into view.</h2>
      </div>
      <p>One daily result becomes a new chapter in your profile history. Conditions explain the score, EP feeds progression, and higher placement makes the profile more visible across chm.lol.</p>
    </div>

    <div class="home-how__stage home-reveal home-reveal--delay-1">
      <div class="home-how__tabs" role="tablist" aria-label="How Chromadie works">
        {#each tabKeys as key, index (key)}
          <button
            id={`home-how-tab-${key}`}
            class:active={activeStep === key}
            type="button"
            role="tab"
            aria-selected={activeStep === key}
            aria-controls="home-how-panel"
            tabindex={activeStep === key ? 0 : -1}
            on:click={() => selectStep(key)}
            on:keydown={event => handleTabKeydown(event, index)}
          >
            <i>{String(index + 1).padStart(2, '0')}</i><strong>{key[0].toUpperCase() + key.slice(1)}</strong><span>{key === 'roll' ? 'one result daily' : key === 'progress' ? 'conditions + EP' : 'move into view'}</span>
          </button>
        {/each}
      </div>

      <div id="home-how-panel" class:home-how__content--switching={switching} class="home-how__content" role="tabpanel" aria-labelledby={`home-how-tab-${activeStep}`} aria-live="polite" tabindex="0">
        <div class="home-how__copy">
          <p class="home-how__step">{currentStep.step}</p>
          <h3>{currentStep.title}</h3>
          <p>{currentStep.text}</p>
        </div>
        <div class="home-how__visual">
          {#if currentStep.image}
            <figure class="home-how__visual-frame">
              <HomeImageLightbox src={currentStep.image} alt={currentStep.alt} width="794" height={activeStep === 'roll' ? '390' : '650'} buttonClass="home-how__image-trigger" imageClass="home-how__image" />
              <figcaption>{currentStep.label}</figcaption>
            </figure>
          {:else}
            <HomeLeaderboard rows={rows} compact={true} />
          {/if}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .home-how { padding: 5.25rem 0; }
  .home-how__head { display: grid; grid-template-columns: 1fr minmax(21.25rem, 29.4rem); align-items: end; gap: 3.75rem; margin-bottom: 2rem; }
  .home-how h2 { max-width: 49.4rem; margin: 0.75rem 0 0; color: var(--home-ink); font: 650 clamp(2.875rem, 5.1vw, 4.5rem) / 0.95 var(--home-font); letter-spacing: -0.038em; }
  .home-how__head > p { margin: 0; color: var(--home-ink-muted); font-size: 1rem; line-height: 1.62; }
  .home-how__stage { display: grid; grid-template-columns: 15.3rem minmax(0, 1fr); min-height: 24.5rem; overflow: hidden; border: 1px solid var(--home-line); border-radius: 0.55rem; background: var(--home-raised); }
  .home-how__tabs { padding: 0.95rem; border-right: 1px solid #32353e; background: #0e1014; }
  .home-how__tabs button { position: relative; display: grid; width: 100%; grid-template-columns: 1.9rem 1fr auto; align-items: center; gap: 0.7rem; padding: 1.1rem 0.55rem; border: 0; border-top: 1px solid #32353e; background: transparent; color: #858690; text-align: left; cursor: pointer; }
  .home-how__tabs button:first-child { border-top: 0; }
  .home-how__tabs button::after { position: absolute; bottom: 0; left: 0; width: 0; height: 1px; content: ''; background: var(--home-accent); transition: width 0.3s ease; }
  .home-how__tabs button.active, .home-how__tabs button:hover { color: #fff; }
  .home-how__tabs button.active::after { width: 100%; }
  .home-how__tabs i, .home-how__tabs span { color: #676a74; font: 0.62rem / 1 var(--home-mono); font-style: normal; }
  .home-how__tabs button.active i, .home-how__tabs button.active span { color: var(--home-accent); }
  .home-how__tabs strong { font: 500 0.88rem / 1 var(--home-font); }
  .home-how__content { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 27.5rem; align-items: center; gap: 2.5rem; padding: 2.4rem 2.6rem; isolation: isolate; transition: opacity 0.26s ease, transform 0.32s cubic-bezier(0.2, 0.72, 0.2, 1); }
  .home-how__content::before { position: absolute; z-index: -1; inset: 0; content: ''; background: linear-gradient(90deg, rgba(205, 210, 255, 0.025), transparent 42%); pointer-events: none; }
  .home-how__content--switching { opacity: 0; transform: translateX(0.55rem); }
  .home-how__step { color: #858690; font: 0.62rem / 1 var(--home-mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .home-how__copy h3 { max-width: 37.5rem; margin: 0.75rem 0 1rem; color: var(--home-ink); font: 600 clamp(2rem, 3.2vw, 2.7rem) / 0.98 var(--home-font); letter-spacing: -0.034em; }
  .home-how__copy > p:last-child { max-width: 36.9rem; margin: 0; color: #a7a5ad; font-size: 0.94rem; line-height: 1.65; }
  .home-how__visual { min-height: 18.1rem; }
  .home-how__visual-frame { position: relative; width: 100%; height: 18.1rem; overflow: hidden; margin: 0; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0.45rem; background: #090a0d; }
  :global(.home-how__image-trigger) { height: 100%; }
  :global(.home-how__visual-frame .home-how__image) { object-fit: contain; object-position: center; filter: saturate(0.94) brightness(0.9); }
  .home-how__visual-frame figcaption { position: absolute; bottom: 0.75rem; left: 0.8rem; padding: 0.45rem 0.55rem; border: 1px solid rgba(255, 255, 255, 0.11); border-radius: 0.25rem; background: rgba(9, 10, 13, 0.72); color: #d2d0d7; font: 0.62rem / 1 var(--home-mono); }
  .home-reveal { opacity: 0; transform: translateY(1.35rem); transition: opacity 0.72s cubic-bezier(0.2, 0.72, 0.2, 1), transform 0.72s cubic-bezier(0.2, 0.72, 0.2, 1); }
  .home-reveal--delay-1 { transition-delay: 0.08s; }
  @media (max-width: 67.5rem) {
    .home-how__head { grid-template-columns: 1fr; gap: 1.4rem; }
    .home-how__stage { grid-template-columns: 13.4rem minmax(0, 1fr); }
    .home-how__content { grid-template-columns: minmax(0, 1fr) 20rem; padding: 2rem 1.5rem; gap: 1.5rem; }
  }
  @media (max-width: 48rem) {
    .home-how { padding: 4rem 0; }
    .home-how__stage { grid-template-columns: 1fr; }
    .home-how__tabs { display: grid; grid-template-columns: repeat(3, 1fr); padding: 0.5rem; border-right: 0; border-bottom: 1px solid #32353e; }
    .home-how__tabs button { display: block; padding: 0.75rem 0.3rem; border-top: 0; border-left: 1px solid #32353e; text-align: center; }
    .home-how__tabs button:first-child { border-left: 0; }
    .home-how__tabs strong { display: block; margin-top: 0.35rem; font-size: 0.7rem; }
    .home-how__tabs span { display: none; }
    .home-how__content { grid-template-columns: 1fr; padding: 1.75rem 1.15rem; }
    .home-how__visual { min-height: 14rem; }
    .home-how__visual-frame { height: 14rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-how__tabs button::after, .home-how__content, .home-reveal { transition: none; }
    .home-reveal { opacity: 1; transform: none; }
  }
</style>
