<script>
  import IdentityCard from './IdentityCard.svelte';

  const previewProfile = {
    username: 'mara',
    displayName: 'mara',
    bio: 'Collecting bright colors, one day at a time.',
    accentColor: '#FFB86B'
  };

  const previewLinks = [
    { type: 'github', label: 'GitHub', url: 'https://github.com', order: 0 },
    { type: 'link', label: 'mara.dev', url: 'https://example.com', order: 1 },
    { type: 'youtube', label: 'YouTube', url: 'https://youtube.com', order: 2 }
  ];

  const previewBadges = [
    { id: 'color_collector', name: 'Color Collector', icon: '✦' },
    { id: 'daily_streak', name: '18 day streak', icon: '18' }
  ];

  const recentColors = [
    { label: 'Apricot', color: '#FFB86B' },
    { label: 'Mint', color: '#B7FD4D' },
    { label: 'Lilac', color: '#B9A7FF' },
    { label: 'Cobalt', color: '#5CA8FF' }
  ];
</script>

<section class="home-showcase" style="--home-roll-color: #B7FD4D; --home-profile-accent: {previewProfile.accentColor};" aria-label="A live public profile and daily color result preview">
  <header class="home-showcase__header">
    <span>Live public profile</span>
    <span>{previewProfile.username} · 18 rolls · resets in 08:42:16</span>
  </header>

  <div class="home-showcase__stage">
    <div class="home-showcase__profile" inert>
      <IdentityCard
        username={previewProfile.username}
        displayName={previewProfile.displayName}
        bio={previewProfile.bio}
        links={previewLinks}
        badges={previewBadges}
        accentColor={previewProfile.accentColor}
        showToday={false}
      />
    </div>

    <div class="home-showcase__story" aria-label="Recent colors from this profile">
      <div class="home-showcase__story-heading">
        <span>Recent colors</span>
        <strong>18 rolls</strong>
      </div>
      <div class="home-showcase__story-colors">
        {#each recentColors as recentColor (recentColor.label)}
          <span class="home-showcase__story-color" style={'--story-color: ' + recentColor.color}>
            <i aria-hidden="true"></i>
            <small>{recentColor.label}</small>
          </span>
        {/each}
      </div>
    </div>
  </div>

  <div class="home-showcase__daily" aria-label="Example daily roll result">
    <div class="home-showcase__daily-title">
      <span class="home-showcase__swatch" aria-hidden="true"></span>
      <div>
        <span>Today’s roll</span>
        <strong>Bright mint · #B7FD4D</strong>
      </div>
    </div>

    <dl class="home-showcase__daily-stats">
      <div>
        <dt>Rarity</dt>
        <dd>Rare</dd>
      </div>
      <div>
        <dt>Score</dt>
        <dd>53,296 EP</dd>
      </div>
      <div>
        <dt>Rank</dt>
        <dd>#12 today</dd>
      </div>
    </dl>
  </div>
</section>

<style>
  .home-showcase {
    width: 100%;
    margin-top: clamp(2.5rem, 6vh, 4.25rem);
    overflow: hidden;
    border: 1px solid var(--home-line-strong);
    border-top: 2px solid var(--home-color);
    border-radius: 0.75rem;
    background: var(--home-surface);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.24);
  }

  .home-showcase__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 2.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--home-line);
    color: var(--home-ink-faint);
    font: 600 0.61rem / 1 var(--home-mono);
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .home-showcase__stage {
    position: relative;
    display: grid;
    place-items: center;
    min-height: clamp(21rem, 42vw, 29rem);
    padding: clamp(2rem, 6vw, 5rem);
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(circle at 30% 45%, color-mix(in srgb, var(--home-profile-accent) 12%, transparent), transparent 35%),
      radial-gradient(circle at 78% 58%, color-mix(in srgb, var(--home-roll-color) 9%, transparent), transparent 37%),
      linear-gradient(132deg, rgba(255, 184, 107, 0.035), transparent 42%),
      #090a09;
  }

  .home-showcase__stage::before,
  .home-showcase__stage::after {
    position: absolute;
    z-index: -1;
    content: '';
    pointer-events: none;
  }

  .home-showcase__stage::before {
    inset: 0;
    opacity: 0.62;
    background:
      radial-gradient(circle at 12% 24%, rgba(255, 255, 255, 0.38) 0 1px, transparent 1.5px),
      radial-gradient(circle at 28% 71%, color-mix(in srgb, var(--home-roll-color) 62%, transparent) 0 1px, transparent 1.5px),
      radial-gradient(circle at 76% 27%, rgba(255, 255, 255, 0.25) 0 1px, transparent 1.5px),
      radial-gradient(circle at 88% 68%, color-mix(in srgb, var(--home-roll-color) 48%, transparent) 0 1px, transparent 1.5px),
      radial-gradient(circle at 63% 84%, rgba(255, 255, 255, 0.22) 0 1px, transparent 1.5px);
  }

  .home-showcase__stage::after {
    top: 15%;
    left: 50%;
    width: min(38rem, 70vw);
    aspect-ratio: 2.3;
    border: 1px solid color-mix(in srgb, var(--home-profile-accent) 18%, transparent);
    border-radius: 50%;
    opacity: 0.45;
    transform: translateX(-50%) rotate(-7deg);
  }

  .home-showcase__profile {
    width: min(100%, 46rem);
  }

  .home-showcase__profile :global(.identity-card) {
    border-color: color-mix(in srgb, var(--home-profile-accent) 56%, rgba(255, 255, 255, 0.12));
    border-radius: 0.75rem;
    background: rgba(8, 9, 8, 0.88);
    box-shadow:
      0 1.8rem 4rem rgba(0, 0, 0, 0.48),
      0 0 2.5rem color-mix(in srgb, var(--home-profile-accent) 15%, transparent);
  }

  .home-showcase__story {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 1.2rem;
    margin-top: 0.85rem;
    padding: 0.7rem 0.9rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .home-showcase__story-heading {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    white-space: nowrap;
  }

  .home-showcase__story-heading span,
  .home-showcase__story-heading strong,
  .home-showcase__story-color small {
    color: var(--home-ink-faint);
    font: 600 0.58rem / 1 var(--home-mono);
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .home-showcase__story-heading strong {
    color: color-mix(in srgb, var(--home-profile-accent) 76%, white);
    font-weight: 500;
  }

  .home-showcase__story-colors {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .home-showcase__story-color {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
  }

  .home-showcase__story-color i {
    display: block;
    flex: 0 0 0.75rem;
    width: 0.75rem;
    height: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 50%;
    background: var(--story-color);
    box-shadow: 0 0 0.7rem color-mix(in srgb, var(--story-color) 28%, transparent);
  }

  .home-showcase__story-color small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .home-showcase__daily {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 2rem;
    padding: 1rem clamp(1rem, 3vw, 1.5rem);
    border-top: 1px solid var(--home-line);
    background: var(--home-surface-raised);
  }

  .home-showcase__daily-title {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-width: 10rem;
  }

  .home-showcase__swatch {
    flex: 0 0 2.75rem;
    width: 2.75rem;
    aspect-ratio: 1;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.35rem;
    background: var(--home-roll-color);
    box-shadow: 0 0 1.25rem color-mix(in srgb, var(--home-roll-color) 22%, transparent);
  }

  .home-showcase__daily-title span:not(.home-showcase__swatch),
  .home-showcase__daily-stats dt {
    display: block;
    color: var(--home-ink-faint);
    font: 600 0.58rem / 1 var(--home-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .home-showcase__daily-title strong {
    display: block;
    margin-top: 0.35rem;
    color: var(--home-ink);
    font: 600 0.78rem / 1 var(--home-mono);
  }

  .home-showcase__daily-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(5.5rem, 1fr));
    flex: 1;
    max-width: 29rem;
    margin: 0;
  }

  .home-showcase__daily-stats div {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.42rem;
    min-width: 0;
    padding: 0 1rem;
    border-left: 1px solid var(--home-line);
  }

  .home-showcase__daily-stats dd {
    margin: 0;
    color: var(--home-ink);
    font: 600 0.72rem / 1.2 var(--home-font);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 48rem) {
    .home-showcase__stage {
      min-height: 22rem;
      padding: 2rem 1.25rem;
    }

    .home-showcase__story {
      grid-template-columns: 1fr;
      gap: 0.7rem;
    }

    .home-showcase__daily {
      align-items: flex-start;
      flex-direction: column;
      gap: 1rem;
    }

    .home-showcase__daily-stats {
      width: 100%;
      max-width: none;
    }

    .home-showcase__daily-stats div:first-child {
      padding-left: 0;
      border-left: 0;
    }
  }

  @media (max-width: 36rem) {
    .home-showcase {
      margin-top: 2.5rem;
    }

    .home-showcase__header {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.35rem;
    }

    .home-showcase__stage {
      min-height: 24rem;
      padding: 1.5rem 0.85rem;
    }

    .home-showcase__profile :global(.identity-card__person) {
      align-items: center;
      flex-direction: column;
    }

    .home-showcase__profile :global(.identity-card__copy) {
      width: 100%;
      text-align: center;
    }

    .home-showcase__profile :global(.identity-card__name-row),
    .home-showcase__profile :global(.identity-card__handle-row),
    .home-showcase__profile :global(.identity-card__links) {
      justify-content: center;
    }

    .home-showcase__profile :global(.identity-card__bio) {
      margin-right: auto;
      margin-left: auto;
    }

    .home-showcase__story-colors {
      gap: 0.35rem;
    }

    .home-showcase__daily {
      padding: 1rem;
    }

    .home-showcase__daily-stats {
      grid-template-columns: 1fr;
    }

    .home-showcase__daily-stats div,
    .home-showcase__daily-stats div:first-child {
      flex-direction: row;
      justify-content: space-between;
      padding: 0.65rem 0;
      border-top: 1px solid var(--home-line);
      border-left: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-showcase__profile :global(*) {
      animation: none !important;
      transition-duration: 0.001ms !important;
    }
  }
</style>
