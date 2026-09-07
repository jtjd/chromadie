<script>
  import { getBadgeMeta } from '../badgeData.js';
  import { getRarityPresentation } from '../rarityPresentation.js';
  import NameEffectCanvas from '../name/NameEffectCanvas.svelte';

  const conditions = ['sum_prime', 'palindrome', 'neon'].map(id => ({ id, ...getBadgeMeta(id) }));
  const reward = {
    name: 'Neon Particle',
    label: 'Name motion',
    loadout: { motionKey: 'name_motion_neon_particle' }
  };
</script>

<section class="homepage-section homepage-collection" id="how" aria-labelledby="collection-title">
  <div class="homepage-collection__intro">
    <h2 class="homepage-section-heading" id="collection-title">More to collect.<br />More to customize.</h2>
    <p class="homepage-section-sub">Each roll can reveal new conditions. Build your collection, complete milestones, and turn those rewards into a profile that looks more like yours.</p>
  </div>

  <div class="homepage-collection__experience">
    <article class="homepage-collection__found">
      <div class="homepage-collection__eyebrow">FOUND IN A ROLL</div>
      <div class="homepage-collection__condition-strip" aria-label="Example conditions found in rolls">
        {#each conditions as condition (condition.id)}
          <div class="homepage-collection__condition" style={`--condition-color:${getRarityPresentation(condition.rarity).color}`}>
            <span class="homepage-collection__condition-mark" aria-hidden="true"></span>
            <strong>{condition.name}</strong>
            <small>{condition.rarity}</small>
          </div>
        {/each}
      </div>
      <div class="homepage-collection__progress" aria-label="Example collection progress">
        <div><span>COLLECTION</span><strong>18 / 31 found</strong></div>
        <div class="homepage-collection__bar" aria-hidden="true"><span></span></div>
      </div>
      <p>Matching digits, unusual RGB values, and rare combinations become things you can actually hunt for instead of one-off score text.</p>
    </article>

    <article class="homepage-collection__reward">
      <div class="homepage-collection__reward-copy">
        <span>UNLOCKED</span>
        <strong>{reward.name}</strong>
        <small>{reward.label}</small>
      </div>
      <div class="homepage-collection__reward-preview" aria-label="Example cosmetic reward preview">
        <NameEffectCanvas
          text="CHM"
          loadout={reward.loadout}
          todayColor="#8DDCFF"
          context="profile"
          mode="animated"
          semanticClass="profile-name"
        />
      </div>
      <p>Milestones lead to profile rewards, so progression feeds directly back into self-expression.</p>
    </article>
  </div>

  <a class="homepage-collection__link" href="/how-to-play">Read the game rules</a>
</section>

<style>
  .homepage-collection { padding-block: 96px 104px; border-top: 1px solid var(--homepage-border); }
  .homepage-collection__intro { display: grid; grid-template-columns: 1fr .9fr; gap: 72px; align-items: end; }
  .homepage-collection__intro p { margin: 0; max-width: 470px; }

  .homepage-collection__experience {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
    gap: 28px;
    margin-top: 48px;
    align-items: stretch;
  }

  article { min-width: 0; }

  .homepage-collection__found {
    padding: 10px 0 0;
  }

  .homepage-collection__eyebrow,
  .homepage-collection__reward-copy > span,
  .homepage-collection__progress span {
    color: var(--homepage-muted);
    font: 600 .68rem / 1.2 'Inter', sans-serif;
    letter-spacing: .12em;
  }

  .homepage-collection__condition-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .homepage-collection__condition {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas: 'mark name' 'mark rarity';
    column-gap: 10px;
    row-gap: 4px;
    align-items: center;
    min-width: 0;
    padding: 17px 16px;
    border-top: 1px solid color-mix(in srgb, var(--condition-color) 52%, var(--homepage-border));
    background: linear-gradient(180deg, color-mix(in srgb, var(--condition-color) 7%, transparent), transparent);
  }

  .homepage-collection__condition-mark {
    grid-area: mark;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--condition-color);
    box-shadow: 0 0 18px color-mix(in srgb, var(--condition-color) 55%, transparent);
  }

  .homepage-collection__condition strong {
    grid-area: name;
    min-width: 0;
    overflow: hidden;
    font: 600 .93rem / 1.25 var(--homepage-display);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .homepage-collection__condition small {
    grid-area: rarity;
    color: var(--condition-color);
    font-size: .78rem;
  }

  .homepage-collection__progress {
    display: grid;
    gap: 12px;
    margin-top: 30px;
  }

  .homepage-collection__progress > div:first-child {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 18px;
  }

  .homepage-collection__progress strong { font: 600 .9rem / 1 var(--homepage-display); }
  .homepage-collection__bar { height: 5px; overflow: hidden; background: rgba(255,255,255,.08); }
  .homepage-collection__bar span { display: block; width: 58%; height: 100%; background: #f5f5f7; }

  .homepage-collection__found p,
  .homepage-collection__reward p {
    margin: 24px 0 0;
    max-width: 600px;
    color: var(--homepage-secondary-muted);
    font-size: .98rem;
    line-height: 1.6;
  }

  .homepage-collection__reward {
    display: grid;
    align-content: center;
    min-height: 320px;
    padding: 30px;
    overflow: hidden;
    border: 1px solid var(--homepage-border);
    border-radius: 18px;
    background:
      radial-gradient(circle at 50% 42%, rgba(141,220,255,.11), transparent 42%),
      #131316;
  }

  .homepage-collection__reward-copy { display: grid; gap: 7px; }
  .homepage-collection__reward-copy strong { font: 600 1.35rem / 1.1 var(--homepage-display); }
  .homepage-collection__reward-copy small { color: var(--homepage-muted); font-size: .82rem; }

  .homepage-collection__reward-preview {
    display: grid;
    min-height: 125px;
    place-items: center;
    margin-top: 10px;
    overflow: visible;
  }

  .homepage-collection__reward-preview :global(.name-effect-canvas) { width: 100%; max-width: 320px; text-align: center; }
  .homepage-collection__reward-preview :global(.profile-name) { font-size: clamp(2.3rem, 5vw, 4rem); }

  .homepage-collection__link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin-top: 28px;
    text-underline-offset: 5px;
    font-size: 1rem;
  }

  a:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }

  @media (max-width: 960px) {
    .homepage-collection__experience { grid-template-columns: 1fr; }
    .homepage-collection__reward { min-height: 280px; }
  }

  @media (max-width: 780px) {
    .homepage-collection { padding-block: 64px; }
    .homepage-collection__intro { grid-template-columns: 1fr; gap: 24px; }
    .homepage-collection__condition-strip { grid-template-columns: 1fr; }
    .homepage-collection__condition { grid-template-columns: auto 1fr auto; grid-template-areas: 'mark name rarity'; }
    .homepage-collection__reward { padding: 24px; }
  }
</style>
