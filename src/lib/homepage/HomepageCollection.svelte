<script>
  import { getBadgeMeta } from '../badgeData.js';
  import { getRarityPresentation } from '../rarityPresentation.js';
  import NameEffectCanvas from '../name/NameEffectCanvas.svelte';

  const conditions = ['sum_255', 'sum_69', 'sum_42'].map(id => ({ id, ...getBadgeMeta(id) }));
  const reward = {
    name: 'Neon Particle',
    label: 'Name motion',
    loadout: { motionKey: 'name_motion_neon_particle' }
  };
  const collectionSlots = Array.from({ length: 31 }, (_, index) => index);
</script>

<section class="homepage-section homepage-collection" id="how" aria-labelledby="collection-title">
  <div class="homepage-collection__intro">
    <h2 class="homepage-section-heading" id="collection-title">More to collect.<br />More to customize.</h2>
    <p class="homepage-section-sub">Each roll can reveal new conditions. Build your collection, complete milestones, and turn those rewards into a profile that looks more like yours.</p>
  </div>

  <div class="homepage-collection__drop-stage" aria-label="Example high-rarity conditions found in rolls">
    {#each conditions as condition, index (condition.id)}
      {@const rarity = getRarityPresentation(condition.rarity)}
      <article
        class:homepage-collection__drop--rare={condition.rarity === 'Rare'}
        class:homepage-collection__drop--epic={condition.rarity === 'Epic'}
        class:homepage-collection__drop--legendary={condition.rarity === 'Legendary'}
        class="homepage-collection__drop"
        style={`--condition-color:${rarity.color}; --drop-index:${index}`}
      >
        <div class="homepage-collection__drop-flare" aria-hidden="true"></div>
        <div class="homepage-collection__drop-rarity">{condition.rarity}</div>
        <h3>{condition.name}</h3>
        <p>{condition.desc}</p>
      </article>
    {/each}
  </div>

  <div class="homepage-collection__loop">
    <div class="homepage-collection__collection">
      <div class="homepage-collection__collection-head">
        <span>COLLECTION</span>
        <strong>18 <em>/ 31</em></strong>
      </div>
      <div class="homepage-collection__slots" aria-label="18 of 31 example conditions found">
        {#each collectionSlots as slot}
          <span class:found={slot < 18} aria-hidden="true"></span>
        {/each}
      </div>
      <p>Rare combinations become things you can hunt for, keep, and build toward instead of disappearing as one-off score text.</p>
    </div>

    <div class="homepage-collection__reward" aria-label="Example cosmetic reward unlocked from progression">
      <div class="homepage-collection__reward-line" aria-hidden="true"></div>
      <div class="homepage-collection__reward-copy">
        <span>MILESTONE REWARD</span>
        <strong>{reward.name}</strong>
        <small>{reward.label}</small>
      </div>
      <div class="homepage-collection__reward-preview">
        <NameEffectCanvas
          text="CHM"
          loadout={reward.loadout}
          todayColor="#8DDCFF"
          context="profile"
          mode="animated"
          semanticClass="profile-name"
        />
      </div>
    </div>
  </div>

  <a class="homepage-collection__link" href="/how-to-play">Read the game rules</a>
</section>

<style>
  .homepage-collection {
    padding-block: 88px 100px;
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

  .homepage-collection__drop-stage {
    position: relative;
    display: grid;
    grid-template-columns: .8fr .98fr 1.22fr;
    align-items: end;
    gap: clamp(28px, 4.5vw, 72px);
    margin-top: 68px;
    padding: 24px 0 34px;
    isolation: isolate;
  }

  .homepage-collection__drop-stage::before {
    position: absolute;
    inset: 44% -6% auto;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(132,170,255,.2) 18%, rgba(216,166,255,.2) 50%, rgba(255,154,102,.28) 78%, transparent);
    content: '';
    pointer-events: none;
  }

  .homepage-collection__drop {
    --drop-size: 1;
    position: relative;
    min-width: 0;
    padding: 18px 4px 26px;
    isolation: isolate;
  }

  .homepage-collection__drop::before,
  .homepage-collection__drop::after {
    position: absolute;
    z-index: -1;
    content: '';
    pointer-events: none;
  }

  .homepage-collection__drop::before {
    left: 0;
    right: 0;
    bottom: 4px;
    height: 2px;
    background: linear-gradient(90deg, var(--condition-color), color-mix(in srgb, var(--condition-color) 38%, transparent), transparent);
    box-shadow: 0 0 22px color-mix(in srgb, var(--condition-color) 48%, transparent);
  }

  .homepage-collection__drop::after {
    left: 6%;
    right: 2%;
    bottom: -16px;
    height: 60%;
    background: radial-gradient(ellipse at 44% 100%, color-mix(in srgb, var(--condition-color) 24%, transparent), transparent 68%);
    filter: blur(24px);
    opacity: .8;
  }

  .homepage-collection__drop-flare {
    position: absolute;
    z-index: -1;
    top: 48%;
    left: -12%;
    width: 78%;
    height: 1px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--condition-color) 82%, white), transparent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--condition-color) 64%, transparent);
    opacity: .35;
    transform: rotate(-8deg);
    transform-origin: left center;
  }

  .homepage-collection__drop-rarity {
    margin-bottom: 10px;
    color: var(--condition-color);
    font: 700 .74rem / 1 var(--homepage-display);
    letter-spacing: .16em;
    text-transform: uppercase;
    text-shadow: 0 0 18px color-mix(in srgb, var(--condition-color) 62%, transparent);
  }

  .homepage-collection__drop h3 {
    margin: 0;
    color: #fff;
    font: 650 clamp(1.65rem, 2.7vw, 2.7rem) / .98 var(--homepage-display);
    letter-spacing: -.045em;
    text-wrap: balance;
  }

  .homepage-collection__drop p {
    max-width: 300px;
    margin: 12px 0 0;
    color: var(--homepage-secondary-muted);
    font-size: .9rem;
    line-height: 1.5;
  }

  .homepage-collection__drop--rare {
    --drop-size: .84;
    transform: translateY(16px);
  }

  .homepage-collection__drop--rare h3 {
    font-size: clamp(1.45rem, 2vw, 2rem);
  }

  .homepage-collection__drop--rare .homepage-collection__drop-flare {
    opacity: .18;
  }

  .homepage-collection__drop--epic {
    transform: translateY(4px);
  }

  .homepage-collection__drop--epic h3 {
    color: color-mix(in srgb, var(--condition-color) 24%, white);
    text-shadow:
      0 0 16px color-mix(in srgb, var(--condition-color) 30%, transparent),
      1px 0 rgba(141,220,255,.22),
      -1px 0 rgba(255,107,214,.18);
  }

  .homepage-collection__drop--epic::after {
    opacity: 1;
  }

  .homepage-collection__drop--legendary {
    padding: 28px 8px 34px 12px;
  }

  .homepage-collection__drop--legendary h3 {
    color: color-mix(in srgb, var(--condition-color) 34%, white);
    font-size: clamp(2.35rem, 4.3vw, 4.65rem);
    text-shadow:
      0 0 10px color-mix(in srgb, var(--condition-color) 34%, transparent),
      0 0 34px color-mix(in srgb, var(--condition-color) 24%, transparent);
  }

  .homepage-collection__drop--legendary .homepage-collection__drop-rarity {
    font-size: .82rem;
    text-shadow: 0 0 24px color-mix(in srgb, var(--condition-color) 74%, transparent);
  }

  .homepage-collection__drop--legendary::before {
    height: 3px;
    box-shadow:
      0 0 8px color-mix(in srgb, var(--condition-color) 75%, transparent),
      0 0 34px color-mix(in srgb, var(--condition-color) 48%, transparent);
  }

  .homepage-collection__drop--legendary::after {
    left: -12%;
    right: -8%;
    bottom: -34px;
    height: 92%;
    background:
      radial-gradient(ellipse at 44% 100%, color-mix(in srgb, var(--condition-color) 36%, transparent), transparent 64%),
      radial-gradient(circle at 76% 42%, color-mix(in srgb, #ffd4ad 16%, transparent), transparent 36%);
    filter: blur(30px);
    opacity: 1;
  }

  .homepage-collection__drop--legendary .homepage-collection__drop-flare {
    top: 38%;
    left: -24%;
    width: 116%;
    opacity: .85;
    animation: legendary-flare 4.6s ease-in-out infinite;
  }

  .homepage-collection__loop {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
    gap: clamp(52px, 7vw, 100px);
    align-items: center;
    margin-top: 58px;
    padding-top: 42px;
    border-top: 1px solid var(--homepage-border);
  }

  .homepage-collection__collection-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
  }

  .homepage-collection__collection-head > span,
  .homepage-collection__reward-copy > span {
    color: var(--homepage-muted);
    font: 600 .68rem / 1.2 'Inter', sans-serif;
    letter-spacing: .13em;
  }

  .homepage-collection__collection-head strong {
    color: var(--homepage-text);
    font: 650 clamp(2.5rem, 4.2vw, 4.2rem) / .85 var(--homepage-display);
    letter-spacing: -.055em;
  }

  .homepage-collection__collection-head em {
    color: var(--homepage-muted);
    font-style: normal;
    font-weight: 500;
  }

  .homepage-collection__slots {
    display: grid;
    grid-template-columns: repeat(31, minmax(3px, 1fr));
    gap: 4px;
    margin-top: 22px;
  }

  .homepage-collection__slots span {
    height: 22px;
    background: rgba(255,255,255,.07);
    transform: skewX(-10deg);
  }

  .homepage-collection__slots span.found {
    background: #d8d8dd;
    box-shadow: 0 0 8px rgba(255,255,255,.09);
  }

  .homepage-collection__slots span.found:nth-child(n+10) {
    background: #84aaff;
    box-shadow: 0 0 10px rgba(132,170,255,.22);
  }

  .homepage-collection__slots span.found:nth-child(n+15) {
    background: #d8a6ff;
    box-shadow: 0 0 12px rgba(216,166,255,.24);
  }

  .homepage-collection__collection p {
    max-width: 620px;
    margin: 22px 0 0;
    color: var(--homepage-secondary-muted);
    font-size: .97rem;
    line-height: 1.6;
  }

  .homepage-collection__reward {
    position: relative;
    min-width: 0;
    min-height: 260px;
    padding-left: 34px;
    isolation: isolate;
  }

  .homepage-collection__reward::before {
    position: absolute;
    z-index: -1;
    inset: 0 -10% -12% 8%;
    background: radial-gradient(circle at 52% 48%, rgba(141,220,255,.15), rgba(216,166,255,.08) 34%, transparent 68%);
    content: '';
    filter: blur(26px);
    pointer-events: none;
  }

  .homepage-collection__reward-line {
    position: absolute;
    top: 8px;
    bottom: 12px;
    left: 0;
    width: 1px;
    background: linear-gradient(180deg, rgba(132,170,255,.05), #d8a6ff 45%, rgba(255,154,102,.1));
    box-shadow: 0 0 16px rgba(216,166,255,.2);
  }

  .homepage-collection__reward-copy {
    display: grid;
    gap: 7px;
  }

  .homepage-collection__reward-copy strong {
    font: 650 clamp(1.7rem, 2.7vw, 2.6rem) / 1 var(--homepage-display);
    letter-spacing: -.035em;
  }

  .homepage-collection__reward-copy small {
    color: var(--homepage-muted);
    font-size: .82rem;
  }

  .homepage-collection__reward-preview {
    display: grid;
    min-height: 160px;
    place-items: center;
    margin: -4px -20px 0 -24px;
    overflow: visible;
  }

  .homepage-collection__reward-preview :global(.name-effect-canvas) {
    width: 100%;
    max-width: 430px;
    overflow: visible;
    text-align: center;
  }

  .homepage-collection__reward-preview :global(.profile-name) {
    font-size: clamp(3rem, 5.2vw, 5rem);
  }

  .homepage-collection__link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin-top: 34px;
    text-underline-offset: 5px;
    font-size: 1rem;
  }

  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 5px;
  }

  @keyframes legendary-flare {
    0%, 100% { transform: translateX(-4%) rotate(-8deg); opacity: .48; }
    50% { transform: translateX(16%) rotate(-8deg); opacity: .96; }
  }

  @media (max-width: 980px) {
    .homepage-collection__drop-stage {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .homepage-collection__drop--rare,
    .homepage-collection__drop--epic,
    .homepage-collection__drop--legendary {
      transform: none;
      padding-left: 4px;
    }

    .homepage-collection__drop h3,
    .homepage-collection__drop--legendary h3 {
      font-size: clamp(1.9rem, 7vw, 3.4rem);
    }

    .homepage-collection__loop {
      grid-template-columns: 1fr;
    }

    .homepage-collection__reward {
      min-height: 230px;
      padding-left: 22px;
    }
  }

  @media (max-width: 780px) {
    .homepage-collection {
      padding-block: 64px 72px;
    }

    .homepage-collection__intro {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .homepage-collection__drop-stage {
      margin-top: 44px;
      padding-bottom: 10px;
    }

    .homepage-collection__slots {
      gap: 2px;
    }

    .homepage-collection__slots span {
      height: 16px;
    }

    .homepage-collection__reward-preview {
      margin-inline: -10px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-collection__drop--legendary .homepage-collection__drop-flare {
      animation: none;
    }
  }
</style>
