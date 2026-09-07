<script>
  import { getBadgeMeta } from '../badgeData.js';
  import { getRarityPresentation } from '../rarityPresentation.js';
  const conditions = ['sum_prime', 'palindrome', 'neon'].map(id => ({ id, ...getBadgeMeta(id) }));
  const achievement = getBadgeMeta('ach_first_roll');
</script>

<section class="homepage-section homepage-collection" id="how" aria-labelledby="collection-title">
  <div class="homepage-collection__intro">
    <h2 class="homepage-section-heading" id="collection-title">More to collect.<br />More to customize.</h2>
    <p class="homepage-section-sub">Each roll can add new conditions to your collection. Earn achievements and unlock cosmetics as you play.</p>
  </div>
  <div class="homepage-collection__grid">
    <article>
      <div class="homepage-collection__sample" aria-label="Example color condition collection">
        {#each conditions as condition (condition.id)}
          <div class="homepage-collection__condition"><span aria-hidden="true">{condition.symbol}</span><strong>{condition.name}</strong><small style={`color:${getRarityPresentation(condition.rarity).color}`}>{condition.rarity}</small></div>
        {/each}
      </div>
      <h3>Find new conditions</h3><p>Matching digits, unusual RGB values, and rare combinations. See which ones you’ve found and which are still missing.</p>
    </article>
    <article>
      <div class="homepage-collection__sample homepage-collection__achievement" aria-label="Example achievement">
        <span class="homepage-collection__badge" aria-hidden="true">{achievement.symbol}</span>
        <strong>{achievement.name.replace('Achievement: ', '')}</strong><span>{achievement.desc}</span>
      </div>
      <h3>Earn it by playing</h3><p>Complete milestones to unlock rewards. Choose the badges and cosmetics you want on your profile.</p>
    </article>
  </div>
  <a class="homepage-collection__link" href="/how-to-play">Read the game rules</a>
</section>

<style>
  .homepage-collection { padding-block: 88px; border-top: 1px solid var(--homepage-border); }
  .homepage-collection__intro { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: end; }
  .homepage-collection__intro p { margin: 0; max-width: 440px; }
  .homepage-collection__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  article { min-width: 0; }
  h3 { margin: 24px 0 10px; font: 600 1.25rem / 1.2 var(--homepage-display); letter-spacing: -.02em; }
  article p { margin: 0; max-width: 460px; color: var(--homepage-secondary-muted); font-size: 1rem; line-height: 1.65; }
  .homepage-collection__sample { display: grid; align-content: center; gap: 16px; min-height: 250px; padding: 28px; background: #151519; border: 1px solid var(--homepage-border); border-radius: var(--homepage-radius); }
  .homepage-collection__condition { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--homepage-border); }
  .homepage-collection__condition strong { font-size: 1rem; font-weight: 500; }
  .homepage-collection__condition small { font-size: .875rem; }
  .homepage-collection__achievement { justify-items: center; gap: 10px; text-align: center; background: radial-gradient(ellipse at 50% 65%, #31261b, #151519 75%); }
  .homepage-collection__achievement > strong { font: 600 1.15rem / 1.3 var(--homepage-display); }
  .homepage-collection__achievement > span:last-child { color: var(--homepage-secondary-muted); font-size: 1rem; }
  .homepage-collection__badge { display: grid; place-items: center; width: 64px; height: 64px; font-size: 2rem; border: 1px solid #b49358; border-radius: 50%; background: #342b1c; }
  .homepage-collection__link { display: inline-flex; align-items: center; min-height: 44px; margin-top: 24px; text-underline-offset: 5px; font-size: 1rem; }
  a:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  @media (max-width: 780px) {
    .homepage-collection { padding-block: 56px; }
    .homepage-collection__intro, .homepage-collection__grid { grid-template-columns: 1fr; gap: 24px; }
    .homepage-collection__grid { gap: 36px; margin-top: 28px; }
    .homepage-collection__sample { padding: 20px; }
    .homepage-collection__condition { gap: 8px; }
  }
</style>
