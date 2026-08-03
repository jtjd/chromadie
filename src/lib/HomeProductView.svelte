<script>
  import HomeImageLightbox from './HomeImageLightbox.svelte';
</script>

<section class="home-product" id="showcase" aria-labelledby="home-product-title">
  <div class="home-shell">
    <div class="home-product__head">
      <div>
        <p class="home-kicker">What the product actually looks like</p>
        <h2 id="home-product-title">The profile and the roll live together.</h2>
      </div>
      <p>One side is the public page people visit. The other is the daily result that adds a color, score, conditions, and a new chapter to that profile’s history.</p>
    </div>

    <div class="home-product__grid">
      <figure class="home-product__shot home-product__shot--profile">
        <HomeImageLightbox src="/homepage/bfr-profile.webp" alt="A live public profile with avatar, bio, links, background, name layers, and profile border" width="1600" height="789" buttonClass="home-product__image-trigger" imageClass="home-product__image" />
        <figcaption><span>Public profile</span><span>Identity · links · color story</span></figcaption>
      </figure>
      <figure class="home-product__shot home-product__shot--roll">
        <HomeImageLightbox src="/homepage/daily-roll-full.webp" alt="A live daily color result with score, conditions, story, and countdown" width="794" height="1131" buttonClass="home-product__image-trigger" imageClass="home-product__image" />
        <figcaption><span>Daily result</span><span>Color · score · history</span></figcaption>
      </figure>
    </div>
  </div>
</section>

<style>
  .home-product { padding: 4.9rem 0 5.25rem; border-top: 1px solid var(--home-line); border-bottom: 1px solid var(--home-line); background: var(--home-raised); }
  .home-product__head { display: grid; grid-template-columns: minmax(0, 1fr) minmax(21.9rem, 32.5rem); align-items: end; gap: 3.5rem; margin-bottom: 1.9rem; }
  .home-product h2 { max-width: 47.5rem; margin: 0.75rem 0 0; color: var(--home-ink); font: 650 clamp(2.75rem, 4.8vw, 4.25rem) / 0.96 var(--home-font); letter-spacing: -0.037em; }
  .home-product__head > p { margin: 0; color: var(--home-ink-muted); font-size: 1rem; line-height: 1.62; }
  .home-product__grid { display: grid; grid-template-columns: minmax(0, 1.18fr) minmax(21.25rem, 0.82fr); align-items: stretch; gap: 1.1rem; }
  .home-product__shot { min-width: 0; margin: 0; }
  :global(.home-product .home-product__image-trigger) { height: 14.7rem; border-radius: 0.5rem; background: #08090c; }
  :global(.home-product__image) { filter: saturate(0.94) brightness(0.9); transition: filter 0.45s ease, transform 0.7s cubic-bezier(0.2, 0.72, 0.2, 1); }
  :global(.home-product .home-product__shot--profile .home-product__image) { object-position: center; transform: scale(2.1); }
  :global(.home-product__shot--roll .home-product__image) { object-position: center top; }
  :global(.home-product__shot--profile:hover .home-product__image) { filter: saturate(0.99) brightness(0.94); transform: scale(2.13); }
  :global(.home-product__shot--roll:hover .home-product__image) { filter: saturate(0.99) brightness(0.94); transform: scale(1.012); }
  .home-product__shot figcaption { display: flex; justify-content: space-between; gap: 1.25rem; padding: 0.8rem 0.15rem 0; color: #8c8e98; font: 0.63rem / 1 var(--home-mono); }
  .home-product__shot figcaption span:first-child { color: #d3d0d8; }
  @media (max-width: 67.5rem) {
    .home-product__head { grid-template-columns: 1fr; gap: 1.35rem; }
    .home-product__grid { grid-template-columns: 1fr; }
    :global(.home-product .home-product__image-trigger) { height: auto; aspect-ratio: 16 / 8.2; }
    :global(.home-product .home-product__shot--roll .home-product__image-trigger) { aspect-ratio: 16 / 10.2; }
  }
  @media (max-width: 48rem) {
    .home-product { padding: 4rem 0; }
    .home-product__shot figcaption { font-size: 0.57rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.home-product__image) { transition: none; transform: none; }
  }
</style>
