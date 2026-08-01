<script>
  import { createEventDispatcher } from 'svelte';
  import CompactRollPreview from './CompactRollPreview.svelte';
  import HomeMusicPreview from './HomeMusicPreview.svelte';
  import ProfileAtmosphere from './ProfileAtmosphere.svelte';
  import IdentityCard from './IdentityCard.svelte';
  import HomeDemoRoll from './HomeDemoRoll.svelte';
  import { shopItems } from './stores';
  import { getCosmeticEffect, getOrbShape, getProfileAtmosphereEffect, getProfileBg, getRollEffect } from './cosmetics';

  export let isAuthenticated = false;

  const dispatch = createEventDispatcher();
  let demoOpen = false;

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }

  const previewProfile = {
    username: 'mara',
    displayName: 'Mara',
    bio: 'Designer and night-shift builder. I collect bright colors and ship small tools.',
    accentColor: '#8DDCFF'
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

  const previewLoadout = {
    profile_bg: 'bg_aurora',
    profile_atmosphere: 'bg_fireflies',
    profile_border: 'border_celestial',
    frame: 'frame_holo',
    name_effect: 'name_prism_atelier',
    orb_shape: 'orb_hexagon',
    roll_effect: 'roll_smoke'
  };

  function classFallback(effect, cls) {
    return effect?.cls || effect?.style ? effect : { cls, style: '' };
  }

  $: previewCosmetics = $shopItems && {
    background: classFallback(getProfileBg(previewLoadout), 'home-showcase__cosmetic-background--fallback'),
    atmosphere: getProfileAtmosphereEffect(previewLoadout) || 'fireflies',
    border: classFallback(getCosmeticEffect(previewLoadout, 'profile_border'), 'border-celestial-anim'),
    frame: classFallback(getCosmeticEffect(previewLoadout, 'frame'), 'frame_holo'),
    name: classFallback(getCosmeticEffect(previewLoadout, 'name_effect'), 'name_prism_atelier'),
    orb: classFallback(getOrbShape(previewLoadout), 'orb-shape-hexagon'),
    roll: classFallback(getRollEffect(previewLoadout), 'roll-smoke-anim')
  };
</script>

<section class="home-showcase" style="--home-roll-color: #B7FD4D; --home-profile-accent: {previewProfile.accentColor};" aria-label="Example public profile preview for Mara">
  <header class="home-showcase__header">
    <span>chm.lol/mara</span>
    <span>Example profile</span>
  </header>

  <div class="home-showcase__stage">
    {#if previewCosmetics.atmosphere}
      <ProfileAtmosphere
        canvasOnly={true}
        accent={previewProfile.accentColor}
        secondaryAccent="#9D8CFF"
        effect={previewCosmetics.atmosphere}
      />
    {/if}

    <div class="home-showcase__profile">
      <div class={'home-showcase__profile-boundary ' + previewCosmetics.border.cls} style={previewCosmetics.border.style}>
        {#if previewCosmetics.background.cls || previewCosmetics.background.style}
          <div class={'home-showcase__cosmetic-background ' + previewCosmetics.background.cls} style={previewCosmetics.background.style} aria-hidden="true"></div>
        {/if}
        <div class="home-showcase__identity" inert>
          <IdentityCard
            titleId="home-featured-profile-title"
            username={previewProfile.username}
            displayName={previewProfile.displayName}
            bio={previewProfile.bio}
            links={previewLinks}
            badges={previewBadges}
            avatarSrc="/avatars/mara-dog-v1.jpg"
            accentColor={previewProfile.accentColor}
            nameClass={previewCosmetics.name.cls}
            nameStyle={previewCosmetics.name.style}
            frameClass={previewCosmetics.frame.cls}
            frameStyle={previewCosmetics.frame.style}
            showToday={false}
          />
        </div>
      </div>
    </div>
    <HomeMusicPreview accent={previewProfile.accentColor} />
  </div>

  <section class="home-showcase__roll" aria-labelledby="home-roll-title">
    <div class="home-showcase__roll-copy">
      <span class="home-showcase__roll-kicker">Daily roll</span>
      <h2 id="home-roll-title">Your daily roll builds visibility.</h2>
      <p>Roll once a day to collect a color and earn points. Stronger rolls move your profile up the leaderboard, where more people can find it.</p>

      <div class="home-showcase__roll-path" aria-label="How a roll builds profile visibility">
        <span><b>01</b><strong>Earn points</strong></span>
        <span><b>02</b><strong>Climb the leaderboard</strong></span>
        <span><b>03</b><strong>Get discovered</strong></span>
      </div>
    </div>

    <div class={'home-showcase__roll-result' + (demoOpen ? ' home-showcase__roll-result--demo' : '')} aria-label={demoOpen ? 'Interactive sample roll' : 'Example daily roll result'}>
      {#if demoOpen}
        <HomeDemoRoll isAuthenticated={isAuthenticated} on:close={() => demoOpen = false} on:signup={forwardAction} on:profile={forwardAction} />
      {:else}
        <div class="home-showcase__roll-result-heading">
          <span>Today’s color</span>
          <strong>Rare</strong>
        </div>
        <div class="home-showcase__roll-result-main">
          <CompactRollPreview
            displayColor="#B7FD4D"
            rarity="Rare"
            effectCls={previewCosmetics.roll.cls}
            effectStyle={previewCosmetics.roll.style}
            orbCls={previewCosmetics.orb.cls}
            size="4.5rem"
            scale={0.42}
          />
          <div>
            <code>#B7FD4D</code>
            <strong>Signal lime</strong>
          </div>
        </div>
        <dl class="home-showcase__roll-stats">
          <div>
            <dt>Current rank</dt>
            <dd>#12 today</dd>
          </div>
          <div>
            <dt>Why it matters</dt>
            <dd>More people find you</dd>
          </div>
        </dl>
        <button class="home-showcase__roll-action" type="button" on:click={() => demoOpen = true}>Try a sample roll <span aria-hidden="true">→</span></button>
      {/if}
    </div>
  </section>
</section>

<style>
  .home-showcase {
    width: 100%;
    margin-top: clamp(1.5rem, 3vh, 2.5rem);
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

  .home-showcase__header span:first-child { color: var(--home-ink); text-transform: none; }

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
      linear-gradient(132deg, rgba(141, 220, 255, 0.035), transparent 42%),
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
    position: relative;
    z-index: 2;
    width: min(100%, 46rem);
  }

  .home-showcase__profile-boundary {
    position: relative;
    overflow: hidden;
    border-radius: 0.75rem;
    background: #08090d;
  }

  .home-showcase__cosmetic-background {
    position: absolute;
    z-index: 1;
    inset: 0;
    opacity: 0.72;
    pointer-events: none;
  }

  .home-showcase__cosmetic-background--fallback {
    background:
      radial-gradient(circle at 18% 24%, rgba(141, 220, 255, 0.28) 0 1px, transparent 2px),
      radial-gradient(circle at 78% 68%, rgba(157, 140, 255, 0.24) 0 1px, transparent 2px),
      linear-gradient(135deg, #080d18 0%, #111c35 56%, #080b12 100%);
    background-size: 210px 210px, 260px 260px, 100% 100%;
  }

  .home-showcase__profile-boundary :global(.identity-card) {
    position: relative;
    z-index: 2;
    border: 0;
    border-radius: 0.75rem;
    background: rgba(8, 9, 8, 0.74);
    box-shadow:
      0 1.8rem 4rem rgba(0, 0, 0, 0.48),
      0 0 2.5rem color-mix(in srgb, var(--home-profile-accent) 15%, transparent);
  }

  .home-showcase__roll {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(19rem, 0.9fr);
    gap: clamp(2rem, 6vw, 5rem);
    padding: clamp(2rem, 4vw, 3.25rem);
    border-top: 1px solid var(--home-line);
    background: var(--home-surface-raised);
  }

  .home-showcase__roll-kicker,
  .home-showcase__roll-result-heading span,
  .home-showcase__roll-stats dt {
    color: var(--home-ink-faint);
    font: 600 0.6rem / 1 var(--home-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .home-showcase__roll-copy h2 {
    max-width: 27rem;
    margin: 0.75rem 0 0;
    color: var(--home-ink);
    font: 620 clamp(1.8rem, 3.4vw, 2.8rem) / 0.98 var(--home-font);
    letter-spacing: -0.055em;
  }

  .home-showcase__roll-copy > p {
    max-width: 34rem;
    margin: 1rem 0 0;
    color: var(--home-ink-muted);
    font-size: 0.9rem;
    line-height: 1.55;
  }

  .home-showcase__roll-path {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 2rem;
    border-top: 1px solid var(--home-line-strong);
    border-bottom: 1px solid var(--home-line);
  }

  .home-showcase__roll-path span {
    display: grid;
    gap: 1rem;
    min-height: 5rem;
    padding: 0.8rem 0.75rem 0.9rem 0;
  }

  .home-showcase__roll-path span + span {
    padding-left: 0.75rem;
    border-left: 1px solid var(--home-line);
  }

  .home-showcase__roll-path b {
    color: var(--home-roll-color);
    font: 600 0.58rem / 1 var(--home-mono);
  }

  .home-showcase__roll-path strong {
    align-self: end;
    color: var(--home-ink);
    font: 560 0.76rem / 1.2 var(--home-font);
  }

  .home-showcase__roll-result {
    align-self: center;
    min-width: 0;
    padding: 1.25rem;
    border: 1px solid color-mix(in srgb, var(--home-roll-color) 28%, var(--home-line));
    border-radius: 0.6rem;
    background: rgba(7, 9, 7, 0.7);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 1rem 2rem rgba(0, 0, 0, 0.16);
  }

  .home-showcase__roll-result-heading,
  .home-showcase__roll-result-main,
  .home-showcase__roll-stats {
    display: flex;
    align-items: center;
  }

  .home-showcase__roll-result-heading {
    justify-content: space-between;
    gap: 1rem;
  }

  .home-showcase__roll-result-heading strong {
    padding: 0.3rem 0.45rem;
    border: 1px solid color-mix(in srgb, var(--home-roll-color) 46%, transparent);
    border-radius: 999px;
    color: var(--home-roll-color);
    font: 600 0.58rem / 1 var(--home-mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .home-showcase__roll-result-main {
    gap: 1rem;
    margin-top: 1.4rem;
  }

  .home-showcase__roll-result-main code {
    color: var(--home-ink-muted);
    font: 600 0.7rem / 1 var(--home-mono);
  }

  .home-showcase__roll-result-main > div > strong {
    display: block;
    margin-top: 0.5rem;
    color: var(--home-ink);
    font: 620 clamp(2.25rem, 4vw, 3.5rem) / 0.85 var(--home-font);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.06em;
  }

  .home-showcase__roll-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin: 0;
    padding-top: 1.15rem;
    border-top: 1px solid var(--home-line);
    margin-top: 1.25rem;
  }

  .home-showcase__roll-stats div {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }

  .home-showcase__roll-stats dd {
    margin: 0;
    color: var(--home-ink);
    font: 600 0.72rem / 1.2 var(--home-font);
    font-variant-numeric: tabular-nums;
  }

  .home-showcase__roll-action {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    margin-top: 1.25rem;
    padding: 0.55rem 0;
    border: 0;
    background: transparent;
    color: var(--home-roll-color);
    cursor: pointer;
    font: 600 0.68rem / 1 var(--home-mono);
  }

  .home-showcase__roll-action:hover { color: var(--color-accent-bright); }

  .home-showcase__roll-result--demo {
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  @media (max-width: 48rem) {
    .home-showcase__stage {
      min-height: 22rem;
      padding: 2rem 1.25rem;
    }

    .home-showcase__roll {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .home-showcase__roll-result {
      width: 100%;
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

    .home-showcase__roll {
      gap: 1.5rem;
      padding: 1.35rem;
    }

    .home-showcase__roll-path {
      grid-template-columns: 1fr;
      margin-top: 1.5rem;
    }

    .home-showcase__roll-path span,
    .home-showcase__roll-path span + span {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 0;
      padding: 0.65rem 0;
      border-top: 1px solid var(--home-line);
      border-left: 0;
    }

    .home-showcase__roll-result {
      padding: 1rem;
    }

  }

  @media (prefers-reduced-motion: reduce) {
    .home-showcase__profile :global(*) {
      animation: none !important;
      transition-duration: 0.001ms !important;
    }
  }
</style>
