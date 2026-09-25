<section class="homepage-section homepage-questions" id="questions" data-homepage-reveal aria-labelledby="homepage-questions-title">
  <div class="homepage-questions__intro">
    <h2 id="homepage-questions-title" class="homepage-section-heading">Good to know.</h2>
    <p>A few answers before you get started.</p>
    <a href="/how-to-play" class="homepage-questions__guide">Read the full guide</a>
  </div>
  <div>
    <details><summary>Is it free?</summary><p>Daily rolls and a customizable profile are free. Optional paid media features are listed on the <a href="/pricing">pricing page</a>.</p></details>
    <details><summary>When can I roll again?</summary><p>A new daily roll is available at midnight UTC. The timer beside your result shows how long is left.</p></details>
    <details><summary>What makes a color score higher?</summary><p>Colors score points for the conditions they match, such as patterns in their RGB values or hex digits. The result breakdown shows what contributed to your score. <a href="/how-to-play">Read the game rules.</a></p></details>
    <details><summary>What happens if I play without an account?</summary><p>Guest rolls stay on this device. Create an account to save future rolls to your profile and earn rewards.</p></details>
  </div>
</section>

<style>
  .homepage-questions { display: grid; grid-template-columns: .8fr 1.2fr; gap: 80px; }
  h2 { margin: 0; color: var(--homepage-text); }
  .homepage-questions__intro p { margin-top: 20px; padding-bottom: 16px; }
  .homepage-questions__guide { display: inline-flex; align-items: center; min-height: 44px; font-size: .875rem; text-decoration-color: var(--homepage-muted); }
  details { border-bottom: 1px solid var(--homepage-border); }
  summary { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 76px; padding: 24px 0; cursor: pointer; color: var(--homepage-secondary); font-size: 1rem; line-height: 1.5; list-style: none; transition: color 180ms ease; }
  summary:hover, details[open] summary { color: var(--homepage-text); }
  summary::-webkit-details-marker { display: none; }
  summary::after { content: '+'; flex-shrink: 0; font-size: 1.4rem; color: var(--homepage-muted); transition: transform 180ms ease; }
  details[open] summary::after { transform: rotate(45deg); }
  details:first-child { border-top: 1px solid var(--homepage-border); }
  p { margin: 0; padding: 0 24px 24px 0; color: var(--homepage-secondary-muted); font-size: .95rem; line-height: 1.8; }
  a { text-underline-offset: 4px; }
  summary:focus-visible, a:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  @media (max-width: 780px) { .homepage-questions { grid-template-columns: 1fr; gap: 32px; } }
  @media (prefers-reduced-motion: reduce) { summary, summary::after { transition: none; } }
</style>
