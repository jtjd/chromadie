<script>
  import { pricingComparisonRows } from '../pricingData.js';

  export let isAuthenticated = false;
  export let sectionId = 'pricing';

  $: freeHref = isAuthenticated ? '/profile/settings' : '/signup';
  $: freeLabel = isAuthenticated ? 'Open Profile Studio' : 'Create a free profile';
  const freeFeatures = pricingComparisonRows.filter(row => row.free).slice(0, 4);
  const plusFeatures = pricingComparisonRows.filter(row => !row.free && row.plus);
</script>

<section class="homepage-section homepage-pricing" id={sectionId} aria-labelledby="homepage-pricing-title">
  <div class="homepage-pricing__intro">
    <div>
      <p class="homepage-pricing__eyebrow">PRICING</p>
      <h2 class="homepage-section-heading" id="homepage-pricing-title">Start free.<br /><span>Add Plus when you need it.</span></h2>
    </div>
    <p class="homepage-section-sub">Build a profile with the free tools. Plus adds hosted media and custom uploads for a one-time $7.99.</p>
  </div>

  <div class="homepage-pricing__cards" aria-label="Free profile and Chromadie Plus plans">
    <article class="homepage-pricing__card homepage-pricing__card--free">
      <div class="homepage-pricing__card-head">
        <p class="homepage-pricing__label">FREE</p>
        <h3>Free profile</h3>
        <p class="homepage-pricing__price">$0 <span>forever</span></p>
        <p class="homepage-pricing__description">Play daily and build your profile.</p>
      </div>
      <ul>
        {#each freeFeatures as feature (feature.label)}
          <li>{feature.label}</li>
        {/each}
      </ul>
      <div class="homepage-pricing__actions">
        <a href={freeHref}>{freeLabel}</a>
      </div>
    </article>

    <article class="homepage-pricing__card homepage-pricing__card--plus">
      <span class="homepage-pricing__badge">ONE-TIME</span>
      <div class="homepage-pricing__card-head">
        <p class="homepage-pricing__label">PLUS</p>
        <h3>Chromadie Plus</h3>
        <p class="homepage-pricing__price">$7.99 <span>lifetime</span></p>
        <p class="homepage-pricing__terms">USD · one identity · up to 1 GB shared media</p>
        <p class="homepage-pricing__description">Hosted media and custom uploads for one identity.</p>
      </div>
      <ul>
        {#each plusFeatures as feature (feature.label)}
          <li>{feature.label}</li>
        {/each}
      </ul>
      <div class="homepage-pricing__actions">
        <a href="/pricing">View Plus details</a>
      </div>
    </article>
  </div>
</section>

<style>
  .homepage-pricing {
    padding-block: 104px 116px;
  }

  .homepage-pricing__intro {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(320px, .95fr);
    gap: clamp(48px, 8vw, 132px);
    align-items: end;
  }

  .homepage-pricing__eyebrow {
    margin: 0 0 16px;
    color: var(--homepage-muted);
    font: 600 .68rem / 1.2 'Inter', sans-serif;
    letter-spacing: .14em;
  }

  .homepage-pricing__intro .homepage-section-heading span { color: var(--homepage-text); }
  .homepage-pricing__intro .homepage-section-sub { max-width: 470px; margin: 0; }

  .homepage-pricing__cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 48px;
    align-items: stretch;
    margin-top: 36px;
  }

  .homepage-pricing__card {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    gap: 20px;
    padding: 24px 0;
    border-top: 1px solid var(--homepage-border-strong);
    background: transparent;
  }

  .homepage-pricing__card--plus {
    border-color: rgba(200,134,238,.34);
  }

  .homepage-pricing__card-head { display: grid; gap: 10px; }
  .homepage-pricing__label {
    margin: 0;
    color: var(--homepage-muted);
    font: 700 .68rem / 1 'Inter', sans-serif;
    letter-spacing: .14em;
  }
  .homepage-pricing__card--plus .homepage-pricing__label { color: #d99af4; }

  .homepage-pricing__card h3 {
    margin: 0;
    color: var(--homepage-text);
    font: 650 clamp(1.55rem, 2.8vw, 2.35rem) / 1 var(--homepage-display);
    letter-spacing: -.045em;
  }

  .homepage-pricing__price {
    margin: 10px 0 0;
    color: var(--homepage-text);
    font: 650 clamp(2rem, 3vw, 2.8rem) / .88 var(--homepage-display);
    letter-spacing: -.06em;
  }

  .homepage-pricing__price span {
    display: inline-block;
    margin-left: 7px;
    color: var(--homepage-muted);
    font: 500 .78rem / 1 'Inter', sans-serif;
    letter-spacing: 0;
    vertical-align: middle;
  }

  .homepage-pricing__terms {
    margin: -2px 0 0;
    color: rgba(230,196,246,.74);
    font-size: .72rem;
    line-height: 1.4;
  }

  .homepage-pricing__description {
    max-width: 34ch;
    margin: 4px 0 0;
    color: var(--homepage-secondary-muted);
    font-size: .92rem;
    line-height: 1.5;
  }

  .homepage-pricing__card ul {
    display: grid;
    gap: 13px;
    margin: 0;
    padding: 0;
    color: var(--homepage-secondary);
    font-size: .92rem;
    line-height: 1.35;
    list-style: none;
  }

  .homepage-pricing__card li {
    position: relative;
    padding-left: 22px;
  }

  .homepage-pricing__card li::before {
    position: absolute;
    left: 0;
    color: #c886ee;
    content: '✓';
    font-weight: 700;
  }

  .homepage-pricing__card--free li::before { color: #9ca9ff; }

  .homepage-pricing__actions { margin-top: auto; }
  .homepage-pricing__actions a {
    display: inline-flex;
    width: auto;
    padding-inline: 20px;
    min-height: 46px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--homepage-border-strong);
    border-radius: 9px;
    background: transparent;
    color: var(--homepage-text);
    font: 600 .86rem / 1 var(--homepage-display);
    text-decoration: none;
    transition: transform .18s ease, border-color .18s ease, background-color .18s ease;
  }

  .homepage-pricing__actions a:hover {
    border-color: #c886ee;
    background: rgba(200,134,238,.12);
    transform: translateY(-1px);
  }

  .homepage-pricing__card--plus .homepage-pricing__actions a {
    border-color: rgba(200,134,238,.58);
    background: #29212f;
  }

  .homepage-pricing__card--plus .homepage-pricing__actions a:hover { background: #35293e; }

  .homepage-pricing__badge {
    position: absolute;
    top: 24px;
    right: 0;
    padding: 7px 12px;
    border: 1px solid rgba(200,134,238,.38);
    border-radius: 999px;
    background: #26152c;
    color: #d99af4;
    font: 700 .62rem / 1 'Inter', sans-serif;
    letter-spacing: .1em;
  }

  @media (max-width: 780px) {
    .homepage-pricing { padding-block: 72px 80px; }
    .homepage-pricing__intro { grid-template-columns: 1fr; gap: 24px; }
    .homepage-pricing__intro .homepage-section-sub { margin: 0; }
    .homepage-pricing__cards { grid-template-columns: 1fr; gap: 18px; margin-top: 52px; }
    .homepage-pricing__card,
    .homepage-pricing__card--plus { min-height: 0; margin-top: 0; }
  }

  @media (max-width: 460px) {
    .homepage-pricing__card { padding: 28px 22px 24px; }
    .homepage-pricing__card ul { font-size: .86rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-pricing__actions a { transition: none; }
    .homepage-pricing__actions a:hover { transform: none; }
  }
</style>
