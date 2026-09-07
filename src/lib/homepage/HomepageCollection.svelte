<script>
  import { getBadgeMeta } from '../badgeData.js';
  import { getRarityPresentation } from '../rarityPresentation.js';
  import NameEffectCanvas from '../name/NameEffectCanvas.svelte';

  // Show a deliberate rarity ladder rather than filling the homepage with
  // common examples. These are real scoring conditions from the live catalog.
  const conditions = ['sum_255', 'sum_69', 'sum_42'].map(id => ({ id, ...getBadgeMeta(id) }));

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

      <div class="homepage-collection__condition-strip" aria-label="Example higher-rarity conditions found in rolls">
        {#each conditions as condition (condition.id)}
          {@const rarity = getRarityPresentation(condition.rarity)}
          <div class="homepage-collection__condition" style={`--condition-color:${rarity.color}`}>
            <span class="homepage-collection__condition-rarity">{condition.rarity}</span>
            <strong>{condition.name}</strong>
            <p>{condition.desc}</p>
            <span class="homepage-collection__condition-status">FOUND</span>
          </div>
        {/each}
      </div>

      <div class="homepage-collection__progress" aria-label="Example collection progress">
        <div><span>COLLECTION</span><strong>18 / 31 found</strong></div>
        <div class="homepage-collection__bar" aria-hidden="true"><span></span></div>
      </div>

      <p class="homepage-collection__explanation">Matching digits, unusual RGB values, and rare combinations become things you can actually hunt for instead of one-off score text.</p>
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
  .homepage-collection {
    padding-block: 88px 96px;
    border-top: 1px solid var(--homepage-border);
  }

  .homepage-collection__intro {
    display: grid;
    grid-template-columns: 1fr .9fr;
    gap: 72px;
    align-items: end;
  }

  .homepage-collection__intro p {
    margin: 0;
    max-width: 470px;
  }

  .homepage-collection__experience {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
    gap: 48px;
    margin-top: 46px;
    align-items: center;
  }

  article {
    min-width: 0;
  }

  .homepage-collection__found {
    padding-top: 4px;
  }

  .homepage-collection__eyebrow,
  .homepage-collection__reward-copy > span,
  .homepage-collection__progress span,
  .homepage-collection__condition-status {
    color: var(--homepage-muted);
    font: 600 .68rem / 1.2 'Inter', sans-serif;
    letter-spacing: .12em;
  }

  .homepage-collection__condition-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 22px;
    margin-top: 20px;
  }

  .homepage-collection__condition {
    position: relative;
    display: grid;
    align-content: start;
    min-width: 0;
    min-height: 152px;
    padding: 18px 6px 24px;
    border-top: 3px solid var(--condition-color);
    border-bottom: 1px solid color-mix(in srgb, var(--condition-color) 28%, var(--homepage-border));
    background: linear-gradient(180deg, color-mix(in srgb, var(--condition-color) 12%, transparent), transparent 72%);
    isolation: isolate;
  }

  .homepage-collection__condition::before {
    position: absolute;
    z-index: -1;
    top: -8px;
    right: 0;
    left: 0;
    height: 46px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--condition-color) 24%, transparent), transparent);
    content: '';
    filter: blur(14px);
    opacity: .82;
    pointer-events: none;
  }

  .homepage-collection__condition-rarity {
    margin-bottom: 11px;
    color: var(--condition-color);
    font: 700 .72rem / 1 var(--homepage-display);
    letter-spacing: .14em;
    text-transform: uppercase;
    text-shadow: 0 0 18px color-mix(in srgb, var(--condition-color) 62%, transparent);
  }

  .homepage-collection__condition strong {
    min-width: 0;
    color: var(--homepage-text);
    font: 600 1.08rem / 1.15 var(--homepage-display);
    letter-spacing: -.015em;
  }

  .homepage-collection__condition p {
    margin: 8px 0 28px;
    color: var(--homepage-secondary-muted);
    font-size: .78rem;
    line-height: 1.45;
  }

  .homepage-collection__condition-status {
    position: absolute;
    bottom: 7px;
    left: 6px;
    color: color-mix(in srgb, var(--condition-color) 78%, white);
    letter-spacing: .1em;
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

  .homepage-collection__progress strong {
    font: 600 .9rem / 1 var(--homepage-display);
  }

  .homepage-collection__bar {
    height: 5px;
    overflow: hidden;
    background: rgba(255,255,255,.08);
  }

  .homepage-collection__bar span {
    display: block;
    width: 58%;
    height: 100%;
    background: linear-gradient(90deg, #84aaff, #d8a6ff 58%, #ff9a66);
  }

  .homepage-collection__explanation,
  .homepage-collection__reward p {
    margin: 24px 0 0;
    max-width: 600px;
    color: var(--homepage-secondary-muted);
    font-size: .98rem;
    line-height: 1.6;
  }

  .homepage-collection__reward {
    position: relative;
    display: grid;
    align-content: center;
    min-height: 320px;
    padding: 20px 8px 12px 30px;
    overflow: visible;
    background: transparent;
  }

  .homepage-collection__reward::before {
    position: absolute;
    z-index: -1;
    inset: 12% 8% 2% 5%;
    border-radius: 38%;
    background: radial-gradient(circle at 50% 45%, rgba(141,220,255,.16), rgba(203,166,247,.07) 40%, transparent 70%);
    content: '';
    filter: blur(22px);
  }

  .homepage-collection__reward-copy {
    display: grid;
    gap: 7px;
  }

  .homepage-collection__reward-copy strong {
    font: 600 1.45rem / 1.1 var(--homepage-display);
  }

  .homepage-collection__reward-copy small {
    color: var(--homepage-muted);
    font-size: .82rem;
  }

  .homepage-collection__reward-preview {
    display: grid;
    min-height: 150px;
    place-items: center;
    margin: 2px -26px 0 -12px;
    overflow: visible;
  }

  .homepage-collection__reward-preview :global(.name-effect-canvas) {
    width: 100%;
    max-width: 360px;
    overflow: visible;
    text-align: center;
  }

  .homepage-collection__reward-preview :global(.profile-name) {
    font-size: clamp(2.7rem, 5vw, 4.5rem);
  }

  .homepage-collection__link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin-top: 28px;
    text-underline-offset: 5px;
    font-size: 1rem;
  }

  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 5px;
  }

  @media (max-width: 960px) {
    .homepage-collection__experience {
      grid-template-columns: 1fr;
    }

    .homepage-collection__reward {
      min-height: 280px;
      padding-left: 0;
    }
  }

  @media (max-width: 780px) {
    .homepage-collection {
      padding-block: 64px;
    }

    .homepage-collection__intro {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .homepage-collection__condition-strip {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .homepage-collection__condition {
      min-height: 126px;
    }

    .homepage-collection__reward-preview {
      margin-inline: 0;
    }
  }
</style>
