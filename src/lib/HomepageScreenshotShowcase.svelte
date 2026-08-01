<script>
  import { HOMEPAGE_SHOWCASE_PROFILES } from './homepageShowcase.js';

  export let mode = 'all';

  const collagePositions = ['central', 'left', 'right', 'lower'];

  const collageProfiles = collagePositions
    .map(position => HOMEPAGE_SHOWCASE_PROFILES.find(profile => profile.collagePosition === position))
    .filter(Boolean);

  function loadingFor(profile) {
    return profile.collagePosition === 'central' ? 'eager' : 'lazy';
  }

  function imageSizes(profile) {
    if (profile.collagePosition === 'central') return '(max-width: 48rem) 100vw, 45vw';
    if (profile.collagePosition === 'lower') return '(max-width: 48rem) 100vw, 40vw';
    return '(max-width: 48rem) 100vw, 18vw';
  }
</script>

<div class="homepage-screenshot-showcase">
  {#if mode !== 'profiles'}
    <section class="homepage-screenshot-showcase__collage" aria-label="Public profile screenshots">
      {#each collageProfiles as profile (profile.collagePosition)}
        <a
          class={'homepage-screenshot-showcase__capture homepage-screenshot-showcase__capture--' + profile.collagePosition}
          href={profile.profileUrl}
          aria-label={`Open ${profile.username}'s public profile`}
          >
          <img
            src={profile.screenshotPath}
            alt={profile.altText}
            width={profile.collagePosition === 'lower' ? 1600 : 1200}
            height={profile.collagePosition === 'lower' ? 700 : 1500}
            loading={loadingFor(profile)}
            decoding="async"
            fetchpriority={profile.collagePosition === 'central' ? 'high' : 'auto'}
            sizes={imageSizes(profile)}
          />
        </a>
      {/each}
    </section>
  {/if}

  {#if mode !== 'collage'}
    <section class="homepage-screenshot-showcase__profiles" aria-labelledby="homepage-showcase-title">
    <div class="homepage-screenshot-showcase__heading">
      <div>
        <p>Public profile gallery</p>
        <h2 id="homepage-showcase-title">Pages people made.</h2>
      </div>
      <span>Open a profile ↗</span>
    </div>

    <div class="homepage-screenshot-showcase__grid">
      {#each HOMEPAGE_SHOWCASE_PROFILES as profile (profile.screenshotPath)}
        <article class="homepage-screenshot-showcase__profile">
          <a class="homepage-screenshot-showcase__profile-image" href={profile.profileUrl} aria-label={`Open ${profile.username}'s public profile`}>
            <img
              src={profile.screenshotPath}
              alt={profile.altText}
              width={profile.collagePosition === 'lower' ? 1600 : 1200}
              height={profile.collagePosition === 'lower' ? 700 : 1500}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 42rem) 100vw, (max-width: 64rem) 50vw, 33vw"
            />
          </a>
          <div class="homepage-screenshot-showcase__profile-meta">
            <div>
              <strong>@{profile.username}</strong>
              <p>Public profile capture</p>
            </div>
            <a href={profile.profileUrl}>Open profile <span aria-hidden="true">↗</span></a>
          </div>
        </article>
      {/each}
    </div>
    </section>
  {/if}
</div>

<style>
  .homepage-screenshot-showcase { display: grid; gap: 0; min-width: 0; }
  .homepage-screenshot-showcase__collage { position: relative; display: grid; grid-template-columns: minmax(8rem, 0.55fr) minmax(22rem, 1.75fr) minmax(8rem, 0.55fr); grid-template-rows: auto auto; align-items: center; gap: 0.8rem; min-height: 35rem; padding: 2rem 0 1.75rem; }
  .homepage-screenshot-showcase__collage::before { position: absolute; z-index: -1; inset: 10% 8% 15%; content: ''; background: radial-gradient(ellipse at center, rgba(141, 220, 255, 0.09), transparent 62%); filter: blur(2.5rem); pointer-events: none; }
  .homepage-screenshot-showcase__capture { position: relative; display: block; min-width: 0; overflow: hidden; border: 1px solid rgba(241, 243, 237, 0.16); border-radius: 0.3rem; background: #080a0b; box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.2); color: inherit; text-decoration: none; transition: border-color 160ms ease, transform 160ms ease; }
  .homepage-screenshot-showcase__capture:hover, .homepage-screenshot-showcase__capture:focus-visible { border-color: rgba(141, 220, 255, 0.72); }
  .homepage-screenshot-showcase__capture:hover { transform: translateY(-0.15rem); }
  .homepage-screenshot-showcase__capture:focus-visible { outline: 2px solid #8ddcff; outline-offset: 4px; }
  .homepage-screenshot-showcase__capture img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .homepage-screenshot-showcase__capture--central { z-index: 3; grid-column: 2; grid-row: 1; aspect-ratio: 4 / 5; }
  .homepage-screenshot-showcase__capture--left { z-index: 2; grid-column: 1; grid-row: 1; width: calc(100% + 2.4rem); margin-left: -2.4rem; aspect-ratio: 4 / 5; transform: rotate(-2deg); }
  .homepage-screenshot-showcase__capture--right { z-index: 2; grid-column: 3; grid-row: 1; width: calc(100% + 2.4rem); margin-right: -2.4rem; aspect-ratio: 4 / 5; transform: rotate(2deg); }
  .homepage-screenshot-showcase__capture--left:hover { transform: rotate(-2deg) translateY(-0.15rem); }
  .homepage-screenshot-showcase__capture--right:hover { transform: rotate(2deg) translateY(-0.15rem); }
  .homepage-screenshot-showcase__capture--lower { z-index: 1; grid-column: 2; grid-row: 2; width: 78%; margin: 0.3rem auto 0; aspect-ratio: 16 / 7; transform: translateY(1.2rem); }
  .homepage-screenshot-showcase__capture--lower:hover { transform: translateY(1.05rem); }

  .homepage-screenshot-showcase__profiles { margin-top: clamp(4rem, 9vw, 7rem); }
  .homepage-screenshot-showcase__heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(241, 243, 237, 0.14); }
  .homepage-screenshot-showcase__heading p { margin: 0 0 0.55rem; color: rgba(241, 243, 237, 0.42); font: 600 0.59rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); letter-spacing: 0.13em; text-transform: uppercase; }
  .homepage-screenshot-showcase__heading h2 { margin: 0; color: rgba(241, 243, 237, 0.93); font: 600 clamp(1.65rem, 3vw, 2.8rem) / 0.98 var(--home-font, 'Instrument Sans', sans-serif); letter-spacing: -0.04em; }
  .homepage-screenshot-showcase__heading > span { color: rgba(241, 243, 237, 0.42); font: 600 0.59rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); text-transform: uppercase; }
  .homepage-screenshot-showcase__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem 0.85rem; padding-top: 0.85rem; }
  .homepage-screenshot-showcase__profile { min-width: 0; overflow: hidden; border: 1px solid rgba(241, 243, 237, 0.14); background: rgba(8, 10, 11, 0.72); }
  .homepage-screenshot-showcase__profile-image { display: block; aspect-ratio: 16 / 10; overflow: hidden; }
  .homepage-screenshot-showcase__profile-image img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 220ms ease; }
  .homepage-screenshot-showcase__profile-image:hover img, .homepage-screenshot-showcase__profile-image:focus-visible img { transform: scale(1.025); }
  .homepage-screenshot-showcase__profile-image:focus-visible { outline: 2px solid #8ddcff; outline-offset: -3px; }
  .homepage-screenshot-showcase__profile-meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.8rem 0.9rem; border-top: 1px solid rgba(241, 243, 237, 0.12); }
  .homepage-screenshot-showcase__profile-meta strong { color: rgba(241, 243, 237, 0.88); font: 600 0.76rem / 1 var(--home-font, 'Instrument Sans', sans-serif); }
  .homepage-screenshot-showcase__profile-meta p { margin: 0.28rem 0 0; color: rgba(241, 243, 237, 0.48); font-size: 0.71rem; line-height: 1.3; }
  .homepage-screenshot-showcase__profile-meta > a { flex: 0 0 auto; color: #8ddcff; font: 600 0.62rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); text-decoration: none; white-space: nowrap; }
  .homepage-screenshot-showcase__profile-meta > a:hover { color: var(--color-accent-bright); }

  @media (max-width: 62rem) {
    .homepage-screenshot-showcase__collage { grid-template-columns: minmax(7rem, 0.5fr) minmax(20rem, 2fr) minmax(7rem, 0.5fr); }
    .homepage-screenshot-showcase__capture--left { width: calc(100% + 2rem); margin-left: -2rem; }
    .homepage-screenshot-showcase__capture--right { width: calc(100% + 2rem); margin-right: -2rem; }
  }

  @media (max-width: 48rem) {
    .homepage-screenshot-showcase__collage { grid-template-columns: 1fr; grid-template-rows: auto; gap: 0.85rem; min-height: 0; padding-top: 2.25rem; }
    .homepage-screenshot-showcase__capture--central, .homepage-screenshot-showcase__capture--left, .homepage-screenshot-showcase__capture--right, .homepage-screenshot-showcase__capture--lower { grid-column: 1; grid-row: auto; width: 100%; margin: 0; aspect-ratio: 4 / 5; transform: none; }
    .homepage-screenshot-showcase__capture--lower { aspect-ratio: 16 / 7; }
    .homepage-screenshot-showcase__capture--left:hover, .homepage-screenshot-showcase__capture--right:hover, .homepage-screenshot-showcase__capture--lower:hover { transform: translateY(-0.15rem); }
    .homepage-screenshot-showcase__profiles { margin-top: 4rem; }
    .homepage-screenshot-showcase__grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 36rem) {
    .homepage-screenshot-showcase__heading { align-items: flex-start; flex-direction: column; }
    .homepage-screenshot-showcase__heading > span { display: none; }
    .homepage-screenshot-showcase__profile-meta { align-items: flex-start; flex-direction: column; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-screenshot-showcase__capture, .homepage-screenshot-showcase__profile-image img { transition: none; }
    .homepage-screenshot-showcase__capture:hover, .homepage-screenshot-showcase__capture--left:hover, .homepage-screenshot-showcase__capture--right:hover, .homepage-screenshot-showcase__capture--lower:hover { transform: none; }
  }
</style>
