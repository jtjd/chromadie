<section class="homepage-section homepage-questions" aria-labelledby="homepage-questions-title">
  <h2 id="homepage-questions-title">A few things to know</h2>
  <div>
    <details><summary>Is it free?</summary><p>Daily rolls and a customizable profile are free. Optional paid media features are listed on the <a href="/pricing">pricing page</a>.</p></details>
    <details><summary>When can I roll again?</summary><p>A new daily roll is available at midnight UTC. The timer beside your result shows how long is left.</p></details>
    <details><summary>What makes a color score higher?</summary><p>Colors score points for the conditions they match, such as patterns in their RGB values or hex digits. The result breakdown shows what contributed to your score. <a href="/how-to-play">Read the game rules.</a></p></details>
    <details><summary>What happens if I play without an account?</summary><p>Guest rolls stay on this device. Create an account to save future rolls to your profile and earn rewards.</p></details>
  </div>
</section>

<style>
  .homepage-questions { display: grid; grid-template-columns: .7fr 1.3fr; gap: 72px; padding-block: 48px 64px; border-top: 1px solid var(--homepage-border); }
  h2 { margin: 0; color: var(--homepage-secondary); font: 600 1.35rem / 1.3 var(--homepage-display); letter-spacing: -.025em; }
  details { border-bottom: 1px solid var(--homepage-border); }
  summary { min-height: 52px; padding: 14px 0; cursor: pointer; color: var(--homepage-secondary); font-size: .96rem; line-height: 1.5; }
  details:first-child summary { padding-top: 0; min-height: 38px; }
  p { margin: 0; padding: 0 0 18px; color: var(--homepage-secondary-muted); font-size: .92rem; line-height: 1.65; }
  a { text-underline-offset: 4px; }
  summary:focus-visible, a:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  @media (max-width: 780px) { .homepage-questions { grid-template-columns: 1fr; gap: 20px; padding-block: 40px 52px; } }
</style>
