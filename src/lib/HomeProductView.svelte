<script>
  import HomeImageLightbox from './HomeImageLightbox.svelte';
</script>

<section class="home-product" id="showcase" aria-labelledby="home-product-title">
  <div class="home-shell">
    <div class="home-product__head">
      <p class="home-kicker">A profile with a memory</p>
      <h2 id="home-product-title">Every roll leaves something behind.</h2>
      <p>The page people share today carries every color that came before it. Daily play becomes identity, history, and a profile that could only belong to you.</p>
    </div>

    <div class="home-product__grid">
      <figure class="home-product__shot home-product__shot--profile">
        <HomeImageLightbox src="/homepage/bfr-profile.webp" alt="A live public profile with avatar, bio, links, background, name layers, and profile border" width="1600" height="789" buttonClass="home-product__image-trigger" imageClass="home-product__image" />
        <figcaption><span><i>01</i> The page people share</span><span>Identity · links · atmosphere</span></figcaption>
      </figure>
      <figure class="home-product__shot home-product__shot--roll">
        <HomeImageLightbox src="/homepage/daily-roll-full.webp" alt="A live daily color result with score, conditions, story, and countdown" width="794" height="1131" buttonClass="home-product__image-trigger" imageClass="home-product__image" />
        <figcaption><span><i>02</i> Today’s chapter</span><span>Color · score · history</span></figcaption>
      </figure>
    </div>
  </div>
</section>

<style>
  .home-product { position: relative; padding: 5.75rem 0 6.25rem; border-top: 1px solid var(--home-line); border-bottom: 1px solid var(--home-line); background: radial-gradient(circle at 74% 18%, color-mix(in srgb, var(--home-active-color) 7%, transparent), transparent 34%), var(--home-raised); }
  .home-product__head { max-width: 53rem; margin-bottom: 3.2rem; }
  .home-product h2 { margin: 0.8rem 0 1.2rem; color: var(--home-ink); font: 650 clamp(2.7rem, 4.5vw, 4.1rem) / 0.96 var(--home-font); letter-spacing: -0.037em; }
  .home-product__head > p:last-child { max-width: 39rem; margin: 0; color: var(--home-ink-muted); font-size: 1rem; line-height: 1.62; }
  .home-product__grid { display: grid; grid-template-columns: minmax(0, 1.38fr) minmax(18.75rem, 0.62fr); align-items: end; gap: clamp(1rem, 2.2vw, 2.1rem); }
  .home-product__shot { min-width: 0; margin: 0; }
  :global(.home-product .home-product__image-trigger) { height: 18.5rem; border: 1px solid rgba(255, 255, 255, 0.075); border-radius: 0.5rem; background: #08090c; }
  :global(.home-product .home-product__shot--roll .home-product__image-trigger) { height: 14.2rem; }
  :global(.home-product__image) { filter: saturate(0.94) brightness(0.9); transition: filter 0.45s ease, transform 0.7s cubic-bezier(0.2, 0.72, 0.2, 1); }
  :global(.home-product .home-product__shot--profile .home-product__image) { object-position: center 53%; transform: scale(2.56); }
  :global(.home-product__shot--roll .home-product__image) { object-position: center top; }
  :global(.home-product__shot--profile:hover .home-product__image) { filter: saturate(0.99) brightness(0.94); transform: scale(2.59); }
  :global(.home-product__shot--roll:hover .home-product__image) { filter: saturate(0.99) brightness(0.94); transform: scale(1.012); }
  .home-product__shot figcaption { display: flex; justify-content: space-between; gap: 1.25rem; padding: 0.8rem 0.15rem 0; color: #8c8e98; font: 0.63rem / 1 var(--home-mono); }
  .home-product__shot figcaption span:first-child { display: inline-flex; align-items: center; gap: 0.52rem; color: #d3d0d8; }
  .home-product__shot figcaption i { color: var(--home-accent); font-style: normal; }
  @media (max-width: 67.5rem) {
    .home-product__grid { grid-template-columns: 1fr; }
    :global(.home-product .home-product__image-trigger) { height: auto; aspect-ratio: 16 / 8.2; }
    :global(.home-product .home-product__shot--roll .home-product__image-trigger) { aspect-ratio: 16 / 10.2; }
  }
  @media (max-width: 48rem) {
    .home-product { padding: 4rem 0; }
    .home-product__head { margin-bottom: 2.25rem; }
    .home-product__shot figcaption { font-size: 0.57rem; }
    :global(.home-product .home-product__shot--profile .home-product__image) { transform: scale(2.25); }
    :global(.home-product__shot--profile:hover .home-product__image) { transform: scale(2.27); }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.home-product__image) { transition: none; transform: none; }
  }
</style>
