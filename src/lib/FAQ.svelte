<script>
  const rollSteps = [
    {
      icon: '🎲',
      title: 'Roll once a day',
      copy: 'Start with a fresh roll and see what color the day gives you.'
    },
    {
      icon: '🎨',
      title: 'Read the result',
      copy: 'Your color comes with a rarity tier and any conditions it meets.'
    },
    {
      icon: '✨',
      title: 'Earn EP and badges',
      copy: 'Better rolls can award more EP, achievements, and milestone rewards.'
    },
    {
      icon: '📈',
      title: 'Improve your profile',
      copy: 'Spend EP on cosmetics, pin achievements, and climb the boards.'
    }
  ];

  const rarityTiers = [
    {
      name: 'Trash',
      color: '#767b8c',
      note: 'The lowest tier. Usually plain, but still part of the full spectrum.',
      ep: 'Lowest'
    },
    {
      name: 'Common',
      color: '#ffffff',
      note: 'The baseline tier for everyday rolls.',
      ep: 'Base'
    },
    {
      name: 'Uncommon',
      color: '#10b981',
      note: 'A step above the baseline with stronger patterns and better EP.',
      ep: 'Above average'
    },
    {
      name: 'Rare',
      color: '#3b82f6',
      note: 'Harder to hit and usually worth a stronger reward.',
      ep: 'High'
    },
    {
      name: 'Epic',
      color: '#a15cff',
      note: 'Very uncommon rolls with standout rewards.',
      ep: 'Very high'
    },
    {
      name: 'Anomaly',
      color: '#f97316',
      note: 'An unusual result that stands out immediately.',
      ep: 'Exceptional'
    },
    {
      name: 'Mythic',
      color: '#f1c40f',
      note: 'The top tier. Extremely rare and heavily rewarded.',
      ep: 'Top'
    }
  ];

  const conditionExamples = [
    {
      icon: '🌓',
      title: 'High Contrast',
      copy: 'Very wide RGB spread. Big visual differences usually mean a stronger score.'
    },
    {
      icon: '⚫',
      title: 'Greyscale',
      copy: 'All three channels match, creating a clean monochrome result.'
    },
    {
      icon: '🪞',
      title: 'Palindrome',
      copy: 'The hex color reads the same forward and backward.'
    },
    {
      icon: '3️⃣',
      title: 'Rule of Three',
      copy: 'The roll hits a pattern tied to multiples of three.'
    },
    {
      icon: '🧬',
      title: 'Meaning of Life',
      copy: 'A tiny edge-case result that is memorable when it lands.'
    }
  ];

  const cosmeticSections = [
    'Frames',
    'Borders',
    'Name effects',
    'Orb shapes',
    'Roll effects',
    'Leaderboard themes',
    'Profile styling'
  ];

  const quickLinks = [
    { href: '/?view=game', label: 'Start Rolling' },
    { href: '/?view=shop', label: 'Browse Shop' },
    { href: '/?view=leaderboard&tab=today', label: 'View Leaderboard' },
    { href: '/?view=profile', label: 'Open Profile' }
  ];
</script>

<svelte:head>
  <title>How to Play | ChromaDie</title>
</svelte:head>

<main class="container guide-page" aria-labelledby="guide-title">
  <section class="card guide-hero">
    <p class="guide-kicker">Getting started</p>
    <h1 id="guide-title">Learn ChromaDie in a minute</h1>
    <p class="guide-intro">
      ChromaDie is a daily color-roll game. Each roll gives you a new color, a rarity tier, and
      conditions that can boost your score. Build EP, unlock cosmetics, and chase better results
      without needing a long tutorial.
    </p>

    <div class="quick-links" aria-label="Jump to key pages">
      {#each quickLinks as link (link.label)}
        <a class="quick-link" href={link.href}>{link.label}</a>
      {/each}
    </div>
  </section>

  <section class="card guide-section">
    <div class="section-head">
      <p class="section-kicker">Welcome</p>
      <h2>What you are playing for</h2>
    </div>
    <div class="welcome-grid">
      <article class="welcome-card">
        <div class="welcome-icon">🎨</div>
        <h3>A fresh color every day</h3>
        <p>Roll once, see what the day gives you, and keep your best results moving forward.</p>
      </article>
      <article class="welcome-card">
        <div class="welcome-icon">✨</div>
        <h3>Better rolls, better rewards</h3>
        <p>Rarer colors and stronger condition combos earn more EP and more bragging rights.</p>
      </article>
      <article class="welcome-card">
        <div class="welcome-icon">🏆</div>
        <h3>Cosmetics and competition</h3>
        <p>Spend EP on style, pin achievements, and compare your progress on the leaderboard.</p>
      </article>
    </div>
  </section>

  <section class="card guide-section">
    <div class="section-head">
      <p class="section-kicker">How it works</p>
      <h2>The roll loop</h2>
    </div>

    <div class="roll-flow" role="list" aria-label="Roll steps">
      {#each rollSteps as step, index (step.title)}
      <article class="flow-card" role="listitem">
        <div class="flow-top">
          <span class="flow-index">{index + 1}</span>
          <span class="flow-icon" aria-hidden="true">{step.icon}</span>
        </div>
        <h3>{step.title}</h3>
        <p>{step.copy}</p>
      </article>
      {/each}
    </div>
  </section>

  <section class="card guide-section">
    <div class="section-head">
      <p class="section-kicker">Rarity</p>
      <h2>Color tiers</h2>
    </div>
    <p class="section-note">
      Higher tiers are harder to hit and usually reward more EP. The exact odds stay hidden, but
      the color itself always tells you where the roll landed.
    </p>

    <div class="rarity-grid">
      {#each rarityTiers as tier (tier.name)}
        <article class="rarity-card">
          <div class="rarity-swatch" style="background: {tier.color};"></div>
          <div class="rarity-copy">
            <div class="rarity-header">
              <h3>{tier.name}</h3>
              <span>{tier.ep} EP</span>
            </div>
            <p>{tier.note}</p>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="card guide-section">
    <div class="section-head">
      <p class="section-kicker">Conditions</p>
      <h2>Extra traits that boost a roll</h2>
    </div>
    <p class="section-note">
      A single roll can satisfy more than one condition. The rarer the combination, the more EP it
      can generate.
    </p>

    <div class="condition-grid">
      {#each conditionExamples as condition (condition.title)}
        <article class="condition-card">
          <div class="condition-icon" aria-hidden="true">{condition.icon}</div>
          <h3>{condition.title}</h3>
          <p>{condition.copy}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="card guide-section">
    <div class="section-head">
      <p class="section-kicker">EP</p>
      <h2>Experience points</h2>
    </div>
    <div class="info-split">
      <div>
        <p class="section-note">
          EP is the game&apos;s progression currency. You earn it by rolling, then spend it in the
          cosmetic shop.
        </p>
        <ul class="simple-list">
          <li>EP unlocks cosmetics and utility items.</li>
          <li>Strong rolls can also unlock milestones and achievements.</li>
        </ul>
      </div>
      <div class="info-panel">
        <p class="panel-label">EP focus</p>
        <p class="panel-value">Unlock, equip, and express your style.</p>
        <p class="panel-copy">The shop is built around customization and presentation.</p>
      </div>
    </div>
  </section>

  <section class="card guide-section">
    <div class="section-head">
      <p class="section-kicker">Cosmetics</p>
      <h2>Make your profile yours</h2>
    </div>
    <p class="section-note">
      The shop is focused on presentation. Buy items with EP, equip them, and build a look that
      matches your style.
    </p>

    <div class="cosmetic-grid">
      {#each cosmeticSections as item (item)}
        <div class="cosmetic-pill">{item}</div>
      {/each}
    </div>
  </section>

  <section class="card guide-section">
    <div class="two-column">
      <article>
        <div class="section-head">
          <p class="section-kicker">Achievements</p>
          <h2>Track your milestones</h2>
        </div>
        <p class="section-note">
          Achievements reward long-term play, special rolls, and rare conditions. You can pin a few
          favorites to your profile so they stay visible.
        </p>
      </article>

      <article>
        <div class="section-head">
          <p class="section-kicker">Leaderboards</p>
          <h2>Compare your rolls</h2>
        </div>
        <p class="section-note">
          Leaderboards show how your best rolls stack up. Rivals make it easy to follow friends and
          compare daily results without losing the fun part.
        </p>
        <p class="section-note section-note-tight">
          Rivals is a focused view for players you want to track more closely, so you can check their
          daily results without sorting through the full leaderboard.
        </p>
      </article>
    </div>
  </section>

  <section class="card guide-section">
    <div class="section-head">
      <p class="section-kicker">Guest mode</p>
      <h2>Play first, sign in later</h2>
    </div>
    <div class="guest-grid">
      <article class="guest-card">
        <h3>Start immediately</h3>
        <p>You can roll as a guest with no account setup.</p>
      </article>
      <article class="guest-card">
        <h3>Local progress</h3>
        <p>Guest progress stays on the current browser and device.</p>
      </article>
      <article class="guest-card">
        <h3>Why create an account</h3>
        <p>Sign in to keep progress across devices and use features tied to a permanent account.</p>
      </article>
    </div>
  </section>
</main>

<style>
  .guide-page {
    max-width: 1040px;
    text-align: left;
    margin-bottom: 48px;
  }

  .guide-hero {
    background:
      radial-gradient(circle at top right, rgba(161, 92, 255, 0.18), transparent 34%),
      radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.15), transparent 32%),
      rgba(8, 10, 18, 0.82);
  }

  .guide-kicker,
  .section-kicker {
    margin: 0 0 0.6rem;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .guide-hero h1 {
    margin: 0 0 0.8rem;
    font-size: clamp(2.1rem, 4vw, 3.4rem);
  }

  .guide-intro,
  .section-note,
  .welcome-card p,
  .flow-card p,
  .rarity-card p,
  .condition-card p,
  .info-panel p,
  .guest-card p {
    color: var(--text-muted);
    line-height: 1.65;
  }

  .guide-intro {
    max-width: 72ch;
    margin: 0;
    font-size: 1.03rem;
  }

  .quick-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.3rem;
  }

  .quick-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.72rem 1rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    text-decoration: none;
    font-weight: 600;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  }

  .quick-link:hover,
  .quick-link:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(161, 92, 255, 0.38);
    background: rgba(161, 92, 255, 0.14);
  }

  .guide-section + .guide-section {
    margin-top: 1rem;
  }

  .section-head h2 {
    margin: 0;
    font-size: clamp(1.35rem, 2.4vw, 1.9rem);
  }

  .section-head {
    margin-bottom: 1rem;
  }

  .welcome-grid,
  .condition-grid,
  .guest-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .welcome-card,
  .flow-card,
  .rarity-card,
  .condition-card,
  .info-panel,
  .guest-card {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.03);
  }

  .welcome-card,
  .condition-card,
  .guest-card {
    padding: 1rem;
  }

  .welcome-icon,
  .condition-icon {
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    margin-bottom: 0.85rem;
    font-size: 1.15rem;
  }

  .welcome-card h3,
  .condition-card h3,
  .guest-card h3,
  .flow-card h3,
  .rarity-card h3 {
    margin: 0 0 0.45rem;
    color: #fff;
    font-size: 1.02rem;
  }

  .roll-flow {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
  }

  .flow-card {
    padding: 1rem;
    position: relative;
    overflow: hidden;
    min-height: 100%;
  }

  .flow-card::after {
    content: '';
    position: absolute;
    inset: auto 1rem 1rem 1rem;
    height: 1px;
    background: linear-gradient(90deg, rgba(161, 92, 255, 0.2), rgba(255, 255, 255, 0.08));
  }

  .flow-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.9rem;
  }

  .flow-index {
    display: inline-grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 999px;
    background: rgba(161, 92, 255, 0.18);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .flow-icon {
    font-size: 1.15rem;
  }

  .rarity-grid {
    display: grid;
    gap: 0.85rem;
  }

  .rarity-card {
    display: grid;
    grid-template-columns: 86px minmax(0, 1fr);
    align-items: stretch;
    overflow: hidden;
  }

  .rarity-swatch {
    min-height: 100%;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  }

  .rarity-copy {
    padding: 0.95rem 1rem;
  }

  .rarity-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.45rem;
  }

  .rarity-header span {
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .info-split,
  .two-column {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.9fr);
    gap: 1rem;
    align-items: start;
  }

  .simple-list {
    margin: 1rem 0 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.55rem;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .info-panel {
    padding: 1rem;
    background:
      radial-gradient(circle at top left, rgba(241, 196, 15, 0.14), transparent 34%),
      rgba(255, 255, 255, 0.04);
  }

  .panel-label {
    margin: 0 0 0.4rem;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .panel-value {
    margin: 0 0 0.35rem;
    color: #fff;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .panel-copy {
    margin: 0;
  }

  .cosmetic-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .cosmetic-pill {
    padding: 0.72rem 0.95rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
    font-weight: 600;
  }

  .guest-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .guest-card {
    min-height: 100%;
  }

  @media (max-width: 900px) {
    .roll-flow,
    .welcome-grid,
    .condition-grid,
    .guest-grid,
    .info-split,
    .two-column {
      grid-template-columns: 1fr;
    }

    .roll-flow {
      gap: 0.85rem;
    }

    .rarity-card {
      grid-template-columns: 1fr;
    }

    .rarity-swatch {
      min-height: 26px;
    }
  }

  @media (max-width: 640px) {
    .guide-page {
      margin-bottom: 32px;
    }

    .guide-hero {
      padding-top: 1.15rem;
      padding-bottom: 1.15rem;
    }

    .guide-hero h1 {
      font-size: clamp(1.9rem, 10vw, 2.6rem);
      line-height: 1.05;
    }

    .guide-intro {
      font-size: 0.98rem;
    }

    .quick-links {
      gap: 0.6rem;
    }

    .quick-link {
      width: 100%;
    }

    .welcome-card,
    .condition-card,
    .guest-card,
    .flow-card,
    .rarity-copy,
    .info-panel {
      padding: 0.9rem;
    }

    .section-head h2 {
      font-size: 1.28rem;
      line-height: 1.15;
    }

  .section-note {
    font-size: 0.97rem;
  }

  .section-note-tight {
    margin-top: 0.4rem;
  }

    .rarity-header {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.2rem;
    }

    .cosmetic-pill {
      width: 100%;
      text-align: center;
    }
  }
</style>
