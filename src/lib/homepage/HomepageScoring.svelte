<section class="homepage-section homepage-scoring" aria-labelledby="homepage-scoring-title">
  <div class="homepage-scoring__copy">
    <div class="homepage-section-kicker">Probability, not opinion</div>
    <h2 id="homepage-scoring-title" class="homepage-section-heading">Why some colors score <span>higher.</span></h2>
    <p class="homepage-section-sub">Some colors hide unusual patterns. Matching digits, mirrored numbers, and exact shades can make a roll special. Rarer patterns earn more points.</p>
    <a class="homepage-text-link" href="/how-to-play">Read how scoring works</a>
  </div>

  <div class="homepage-scoring__examples" aria-label="Example color conditions">
    <article>
      <span class="homepage-scoring__swatch homepage-scoring__swatch--repeat" aria-hidden="true"></span>
      <div>
        <h3>Repeated digits</h3>
        <p><code>#111111</code> repeats the same digit six times. Only a handful of colors do that.</p>
      </div>
    </article>
    <article>
      <span class="homepage-scoring__swatch homepage-scoring__swatch--symmetry" aria-hidden="true"></span>
      <div>
        <h3>Mirrored digits</h3>
        <p><code>#123321</code> reads the same forward and backward. That hidden symmetry adds to its score.</p>
      </div>
    </article>
    <article>
      <span class="homepage-scoring__swatch homepage-scoring__swatch--exact" aria-hidden="true"></span>
      <div>
        <h3>Recognizable values</h3>
        <p><code>#FF0000</code> is pure red: all red, no green or blue. Landing on that exact shade is a rare discovery.</p>
      </div>
    </article>
  </div>
</section>

<style>
  .homepage-scoring {
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr);
    align-items: start;
    gap: clamp(56px, 8vw, 110px);
    padding: 116px 0 128px;
    border-top: 1px solid var(--homepage-border);
  }

  .homepage-scoring .homepage-section-heading { font-size: clamp(2.8rem, 4.7vw, 4.7rem); }

  .homepage-text-link {
    display: inline-flex;
    margin-top: 28px;
    color: var(--homepage-text);
    font: 650 .8rem/1.3 'Inter', sans-serif;
    text-decoration-color: color-mix(in srgb, var(--homepage-text) 38%, transparent);
    text-underline-offset: 5px;
  }

  .homepage-text-link:hover { text-decoration-color: var(--homepage-text); }
  .homepage-text-link:focus-visible { outline: 2px solid var(--homepage-accent); outline-offset: 4px; }
  .homepage-scoring__examples { display: grid; border-top: 1px solid var(--homepage-border); }

  .homepage-scoring__examples article {
    display: grid;
    grid-template-columns: 58px minmax(0, 1fr);
    align-items: start;
    gap: 20px;
    padding: 26px 0;
    border-bottom: 1px solid var(--homepage-border);
  }

  .homepage-scoring__swatch {
    width: 58px;
    height: 58px;
    border: 1px solid rgba(255, 255, 255, .15);
    border-radius: 12px;
    box-shadow: 0 0 22px color-mix(in srgb, var(--swatch) 20%, transparent);
    background: var(--swatch);
  }

  .homepage-scoring__swatch--repeat { --swatch: #111111; }
  .homepage-scoring__swatch--symmetry { --swatch: #123321; }
  .homepage-scoring__swatch--exact { --swatch: #ff0000; }

  .homepage-scoring__examples h3 {
    margin: 0;
    color: var(--homepage-text);
    font: 700 1.1rem/1.15 var(--homepage-display);
    letter-spacing: -.025em;
  }

  .homepage-scoring__examples p {
    margin: 8px 0 0;
    color: var(--homepage-secondary-muted);
    font: 500 .86rem/1.55 'Inter', sans-serif;
  }

  @media (max-width: 820px) {
    .homepage-scoring { grid-template-columns: 1fr; gap: 48px; padding: 88px 0 96px; }
  }

  @media (max-width: 460px) {
    .homepage-scoring__examples article { grid-template-columns: 46px minmax(0, 1fr); gap: 16px; }
    .homepage-scoring__swatch { width: 46px; height: 46px; border-radius: 10px; }
  }
</style>
