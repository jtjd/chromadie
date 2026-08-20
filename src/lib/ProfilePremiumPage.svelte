<script>
  import { hasChromadiePlus } from './premiumEntitlements.js';

  export let entitlements = [];
  export let staff = false;

  $: active = Boolean(staff || hasChromadiePlus(entitlements));
</script>

<section class="profile-premium-page" aria-labelledby="profile-premium-title">
  <header class="profile-premium-page__hero">
    <div>
      <p class="profile-premium-page__eyebrow">Chromadie Plus / cosmetics, once</p>
      <h2 id="profile-premium-title">More room for your profile.</h2>
      <p>Keep the daily ritual and everything you earn. Plus gives the page around your identity more room to become yours.</p>
    </div>
    <span class="profile-premium-page__mark" aria-hidden="true">◇</span>
  </header>

  {#if active}
    <div class="profile-premium-page__active" role="status"><span aria-hidden="true">●</span> Chromadie Plus is active for this account.</div>
  {:else}
    <div class="profile-premium-page__upsell">
      <div>
        <p class="profile-premium-page__eyebrow">Unlock the full studio</p>
        <h3>One identity. More cosmetics.</h3>
        <p>Premium adds creative capacity without changing rolls, rank, rewards, or earned prestige.</p>
      </div>
      <a href="/pricing">See Plus · $7.99 lifetime</a>
    </div>
  {/if}

  <div class="profile-premium-page__grid">
    <article>
      <span>01</span>
      <h3>Rich media</h3>
      <p>Background video, audio tracks, banners, and custom cursors within a safe profile quota.</p>
    </article>
    <article>
      <span>02</span>
      <h3>More capacity</h3>
      <p>Up to 25 links, ten projects, four provider cards, and premium structured share metadata.</p>
    </article>
    <article>
      <span>03</span>
      <h3>Cosmetic layers</h3>
      <p>Atelier templates, name motion, atmospheres, and the complete premium cosmetics catalog.</p>
    </article>
  </div>

  <footer class="profile-premium-page__footer">
    <span>Premium buys cosmetics. Gameplay earns prestige.</span>
    <a href="/pricing">Compare Free and Plus</a>
  </footer>
</section>

<style>
  .profile-premium-page { display: grid; gap: 1.35rem; min-width: 0; }
  .profile-premium-page__hero { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: clamp(1.35rem, 3vw, 2.4rem); border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .65rem; background: radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--site-accent, #cdd2ff) 12%, transparent), transparent 30%), var(--site-raised, #111319); }
  .profile-premium-page__eyebrow { margin: 0 0 .7rem; color: var(--site-faint, #7d7e87); font: .68rem/1 var(--site-mono, monospace); letter-spacing: .14em; text-transform: uppercase; }
  .profile-premium-page__hero h2 { max-width: 16ch; margin: 0; color: var(--site-ink, #f2f0eb); font-size: clamp(2rem, 5vw, 4rem); line-height: .95; letter-spacing: -.06em; }
  .profile-premium-page__hero p:last-child { max-width: 34rem; margin: .9rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .86rem; line-height: 1.55; }
  .profile-premium-page__mark { color: var(--site-accent, #cdd2ff); font-size: clamp(2.8rem, 6vw, 5rem); line-height: 1; text-shadow: 0 0 2rem color-mix(in srgb, var(--site-accent, #cdd2ff) 35%, transparent); }
  .profile-premium-page__upsell, .profile-premium-page__active { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.15rem; border: 1px solid color-mix(in srgb, var(--site-accent, #cdd2ff) 38%, var(--site-line, rgba(255,255,255,.08))); border-radius: .55rem; background: color-mix(in srgb, var(--site-accent, #cdd2ff) 8%, var(--site-raised, #111319)); }
  .profile-premium-page__active { justify-content: flex-start; color: #a6efc3; font-size: .78rem; }
  .profile-premium-page__active span { color: #65df9a; font-size: .7rem; }
  .profile-premium-page__upsell h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: 1.15rem; letter-spacing: -.03em; }
  .profile-premium-page__upsell .profile-premium-page__eyebrow { margin-bottom: .45rem; color: var(--site-accent, #cdd2ff); }
  .profile-premium-page__upsell p:last-child { margin: .35rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .8rem; line-height: 1.45; }
  .profile-premium-page__upsell a, .profile-premium-page__footer a { display: inline-flex; align-items: center; gap: .45rem; flex: 0 0 auto; min-height: 2.5rem; padding: .65rem .85rem; border: 1px solid color-mix(in srgb, var(--site-accent, #cdd2ff) 52%, transparent); border-radius: .35rem; background: var(--site-accent, #cdd2ff); color: #090a0d; font-size: .78rem; font-weight: 700; text-decoration: none; }
  .profile-premium-page__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
  .profile-premium-page__grid article { min-height: 10rem; padding: 1.1rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .55rem; background: var(--site-raised, #111319); }
  .profile-premium-page__grid article > span { color: var(--site-accent, #cdd2ff); font: .7rem/1 var(--site-mono, monospace); }
  .profile-premium-page__grid h3 { margin: 1.8rem 0 .4rem; color: var(--site-ink, #f2f0eb); font-size: 1rem; letter-spacing: -.025em; }
  .profile-premium-page__grid p { margin: 0; color: var(--site-muted, #aaa8b0); font-size: .8rem; line-height: 1.5; }
  .profile-premium-page__footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: .85rem; border-top: 1px solid var(--site-line, rgba(255,255,255,.08)); color: var(--site-faint, #7d7e87); font: .7rem/1.4 var(--site-mono, monospace); }
  .profile-premium-page__footer a { min-height: auto; padding: .5rem .7rem; background: transparent; color: var(--site-accent, #cdd2ff); font: inherit; }
  @media (max-width: 52rem) { .profile-premium-page__grid { grid-template-columns: 1fr; } }
  @media (max-width: 42rem) { .profile-premium-page__upsell, .profile-premium-page__footer { align-items: stretch; flex-direction: column; } .profile-premium-page__upsell a { justify-content: center; } .profile-premium-page__footer a { justify-content: center; } }
  @media (prefers-reduced-motion: reduce) { .profile-premium-page a { transition: none; } }
</style>
