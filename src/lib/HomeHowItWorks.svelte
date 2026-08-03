<script>
  import HomeImageLightbox from './HomeImageLightbox.svelte';

  const steps = Object.freeze([
    {
      number: '01',
      label: 'Roll',
      title: 'Receive one color each day.',
      text: 'The daily result has a color, rarity, and score. It is a small ritual with a result that belongs to your page.'
    },
    {
      number: '02',
      label: 'Evolve',
      title: 'Let the page remember it.',
      text: 'Every result joins your public history. Progress unlocks more ways to shape the same identity instead of replacing it.'
    },
    {
      number: '03',
      label: 'Explore',
      title: 'Find the person behind the color.',
      text: 'Daily placement opens a path into real profiles—their music, projects, links, and the story they have built over time.'
    }
  ]);
</script>

<section class="home-how" id="how-it-works" aria-labelledby="home-how-title">
  <div class="home-shell">
    <div class="home-how__head home-reveal">
      <p class="home-kicker">The daily loop</p>
      <h2 id="home-how-title">One color. A page that keeps becoming yours.</h2>
      <p>The game takes a minute. What it adds to your identity stays.</p>
    </div>

    <div class="home-how__body home-reveal home-reveal--delay-1">
      <ol class="home-how__steps">
        {#each steps as step (step.number)}
          <li>
            <span class="home-how__number">{step.number}</span>
            <div>
              <p class="home-how__label">{step.label}</p>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        {/each}
      </ol>

      <figure class="home-how__visual">
        <HomeImageLightbox
          src="/homepage/daily-roll-progress.webp"
          alt="A daily roll becoming a profile chapter, with its score contributors and next roll countdown"
          width="794"
          height="650"
          buttonClass="home-how__image-trigger"
          imageClass="home-how__image"
        />
        <figcaption><span>One result</span><span>Color → history → discovery</span></figcaption>
      </figure>
    </div>
  </div>
</section>

<style>
  .home-how { position: relative; padding: 6.5rem 0 6.75rem; border-top: 1px solid var(--home-line); background: linear-gradient(180deg, rgba(9, 10, 13, 0.34), rgba(9, 10, 13, 0.9)); }
  .home-how::before { position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; content: ''; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--home-accent) 16%, transparent), transparent); opacity: 0.7; pointer-events: none; }
  .home-how__head { max-width: 52rem; margin-bottom: 4rem; }
  .home-how h2 { margin: 0.8rem 0 1.2rem; color: var(--home-ink); font: 650 clamp(2.75rem, 4.6vw, 4.15rem) / 0.96 var(--home-font); letter-spacing: -0.038em; }
  .home-how__head > p:last-child { max-width: 34rem; margin: 0; color: var(--home-ink-muted); font-size: 1rem; line-height: 1.62; }
  .home-how__body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(24rem, 32rem); align-items: center; gap: clamp(3rem, 7vw, 7.5rem); }
  .home-how__steps { padding: 0; margin: 0; list-style: none; }
  .home-how__steps li { display: grid; grid-template-columns: 2.65rem minmax(0, 1fr); gap: 1.35rem; padding: 1.7rem 0 1.85rem; border-top: 1px solid rgba(255, 255, 255, 0.095); }
  .home-how__steps li:first-child { border-top-color: color-mix(in srgb, var(--home-accent) 56%, rgba(255, 255, 255, 0.095)); }
  .home-how__number, .home-how__label { color: var(--home-accent); font: 0.62rem / 1 var(--home-mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .home-how__number { padding-top: 0.2rem; }
  .home-how__label { margin: 0 0 0.7rem; }
  .home-how__steps h3 { margin: 0 0 0.7rem; color: var(--home-ink); font: 600 clamp(1.65rem, 2.5vw, 2.25rem) / 1 var(--home-font); letter-spacing: -0.03em; }
  .home-how__steps li div > p:last-child { max-width: 38rem; margin: 0; color: #9c9ba4; font-size: 0.9rem; line-height: 1.62; }
  .home-how__visual { min-width: 0; margin: 0; }
  :global(.home-how .home-how__image-trigger) { height: 26rem; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 0.5rem; background: #08090c; }
  :global(.home-how .home-how__image) { object-fit: cover; object-position: center top; filter: saturate(0.88) brightness(0.82); transition: filter 0.4s ease, transform 0.7s cubic-bezier(0.2, 0.72, 0.2, 1); }
  :global(.home-how__visual:hover .home-how__image) { filter: saturate(0.96) brightness(0.9); transform: scale(1.015); }
  .home-how__visual figcaption { display: flex; justify-content: space-between; gap: 1rem; padding: 0.8rem 0.15rem 0; color: #858690; font: 0.61rem / 1 var(--home-mono); }
  .home-how__visual figcaption span:first-child { color: #d3d0d8; }
  .home-reveal { opacity: 0; transform: translateY(1.35rem); transition: opacity 0.72s cubic-bezier(0.2, 0.72, 0.2, 1), transform 0.72s cubic-bezier(0.2, 0.72, 0.2, 1); }
  .home-reveal--delay-1 { transition-delay: 0.08s; }
  @media (max-width: 67.5rem) {
    .home-how__body { grid-template-columns: 1fr; gap: 2.5rem; }
    .home-how__visual { width: min(100%, 43rem); }
  }
  @media (max-width: 48rem) {
    .home-how { padding: 4.75rem 0 5rem; }
    .home-how::before { display: none; }
    .home-how__head { margin-bottom: 2.4rem; }
    .home-how__steps li { grid-template-columns: 2rem minmax(0, 1fr); gap: 0.9rem; padding: 1.4rem 0 1.55rem; }
    :global(.home-how .home-how__image-trigger) { height: auto; aspect-ratio: 1.22 / 1; }
    .home-how__visual figcaption { font-size: 0.56rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.home-how .home-how__image), .home-reveal { transition: none; }
    .home-reveal { opacity: 1; transform: none; }
  }
</style>
