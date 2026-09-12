<script>
  import { getBadgeMeta } from '../badgeData.js';
  import { getRarityPresentation } from '../rarityPresentation.js';
  import NameEffectCanvas from '../name/NameEffectCanvas.svelte';
  const conditions = ['sum_255', 'sum_69', 'sum_42'].map(id => ({ id, ...getBadgeMeta(id) }));
  const reward = { name: 'Neon Particle', loadout: { motionKey: 'name_motion_neon_particle' } };
</script>

<section class="homepage-section homepage-collection" id="how" aria-labelledby="collection-title">
  <div class="homepage-collection__intro">
    <h2 class="homepage-section-heading" id="collection-title">More to collect.<br />More to customize.</h2>
    <p class="homepage-section-sub">Find unusual color combinations. Keep the conditions you discover, and give your profile a look of its own.</p>
  </div>
  <div class="homepage-collection__display">
    <div class="homepage-collection__tray" aria-label="Example high-rarity conditions found in rolls">
      <p class="homepage-collection__caption">A few things you could discover</p>
      <div class="homepage-collection__specimens">
        {#each conditions as condition (condition.id)}
          {@const rarity = getRarityPresentation(condition.rarity)}
          <article style={`--condition-color:${rarity.color}`}>
            <img class="homepage-collection__art" src={`/homepage/condition-${condition.id}-flat-v2.webp`} alt="" width="192" height="192" loading="lazy" decoding="async" />
            <span>{condition.rarity}</span>
            <h3>{condition.name}</h3>
            <p>{condition.desc}</p>
          </article>
        {/each}
      </div>
      <a href="/how-to-play">Read the game rules</a>
    </div>
    <figure class="homepage-collection__reward" aria-label="Example profile cosmetic">
      <p class="homepage-collection__caption">Put your own style on display</p>
      <div class="homepage-collection__reward-preview">
        <NameEffectCanvas text="Mira" loadout={reward.loadout} todayColor="#8DDCFF" context="profile" mode="animated" semanticClass="profile-name" />
      </div>
      <figcaption><strong>{reward.name}</strong><span>Free name motion · example profile</span></figcaption>
    </figure>
  </div>
</section>

<style>
  .homepage-collection__intro { display: grid; grid-template-columns: 1fr .9fr; gap: 48px; align-items: end; }
  .homepage-collection__intro p { margin: 0; }
  .homepage-collection__display { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; margin-top: 36px; padding: 28px 32px; border: 1px solid var(--homepage-border); border-radius: 18px; background: rgba(18,18,22,.65); }
  .homepage-collection__tray { padding: 0; }
  .homepage-collection__caption { margin: 0; color: var(--homepage-secondary-muted); font-size: .85rem; }
  .homepage-collection__art { display: block; width: 144px; height: 144px; object-fit: contain; margin: 12px auto 16px; }
  .homepage-collection__specimens { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; margin-top: 16px; }
  article { min-width: 0; text-align: center; }
  article > span { color: var(--condition-color); font-size: .8rem; }
  h3 { margin: 10px 0; font: 600 clamp(1.15rem, 1.8vw, 1.6rem) / 1.1 var(--homepage-display); letter-spacing: -.03em; }
  article p { color: var(--homepage-secondary-muted); font-size: .85rem; line-height: 1.6; margin: 0; }
  a { display: inline-flex; min-height: 44px; align-items: center; margin-top: 24px; text-underline-offset: 5px; }
  a:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  .homepage-collection__reward { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 24px; align-items: center; min-width: 0; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid var(--homepage-border); }
  .homepage-collection__reward-preview :global(.profile-name) { font-size: 2.5rem; }
  figcaption { display: grid; gap: 6px; text-align: right; font-size: .9rem; }
  figcaption span { color: var(--homepage-muted); font-size: .78rem; }
  @media (max-width: 780px) { .homepage-collection__intro { grid-template-columns: 1fr; gap: 24px; } .homepage-collection__display { padding: 24px 20px; margin-top: 28px; } .homepage-collection__specimens { gap: 16px; } .homepage-collection__art { width: 112px; height: 112px; } .homepage-collection__reward { grid-template-columns: 1fr auto; } .homepage-collection__reward > p { grid-column: 1 / -1; } }
  @media (max-width: 540px) { .homepage-collection__specimens { grid-template-columns: 1fr; } article { display: grid; grid-template-columns: 88px minmax(0, 1fr); column-gap: 16px; padding-block: 16px; border-bottom: 1px solid var(--homepage-border); text-align: left; } article .homepage-collection__art { grid-row: span 3; width: 88px; height: 88px; margin: auto 0; } h3 { margin: 6px 0; } .homepage-collection__reward { grid-template-columns: 1fr; text-align: center; } figcaption { text-align: center; } }
</style>
