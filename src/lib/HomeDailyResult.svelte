<script>
  import CompactRollPreview from './CompactRollPreview.svelte';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { normalizeHexColor } from './utils.js';

  /** @type {any} */
  export let roll = null;
  export let rollIsPreview = false;
  export let previewAvailable = false;
  export let staticEffect = false;
  export let compactUnavailable = false;

  let failedAvatarSource = '';

  $: hasResult = Boolean(roll?.hexCode && roll?.score !== null && roll?.score !== undefined);
  $: color = normalizeHexColor(roll?.hexCode, '#8B7CF6');
  $: rarity = roll?.rarity || 'Common';
  $: hasFeaturedRoll = Boolean(hasResult && !rollIsPreview && roll?.username);
  $: hasProfileLink = Boolean(hasFeaturedRoll && roll?.profilePath);
  $: featuredName = roll?.displayName || roll?.username || '';
  $: featuredAvatarSrc = getProfileMediaUrl(roll?.avatarPath || '');
  $: if (featuredAvatarSrc && featuredAvatarSrc !== failedAvatarSource) failedAvatarSource = '';

  function scrollToLeaderboard(event) {
    event.preventDefault();
    const target = document.getElementById('home-leaderboard');
    if (!target) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
</script>

<aside
  class="home-daily"
  class:home-daily--compact={compactUnavailable && !hasResult}
  style={`--home-daily-color: ${color};`}
  aria-label="Today’s highest roll"
>
  <span class="home-daily__label">Today’s color</span>
  {#if hasResult}
    <div class="home-daily__body">
      <div class="home-daily__main">
        <div class="home-daily__effect-wrap">
          <CompactRollPreview
            displayColor={color}
            rarity={roll.rarity || 'Common'}
            size="7rem"
            scale={0.74}
            facetedGlyph={true}
            {staticEffect}
          />
        </div>
        <div class="home-daily__readout">
          {#if hasFeaturedRoll}
            <p class="home-daily__result-label">Highest roll today</p>
          {/if}
          <div class="home-daily__identity-row">
            <h2>{color}</h2>
            <span class="home-daily__rarity">{rarity}</span>
          </div>
          {#if hasProfileLink}
            <a
              class="home-daily__profile-link"
              href={roll.profilePath}
              aria-label={`Open ${featuredName}'s public profile`}
            >
              {#if featuredAvatarSrc && featuredAvatarSrc !== failedAvatarSource}
                <img
                  class="home-daily__avatar"
                  src={featuredAvatarSrc}
                  alt=""
                  width="44"
                  height="44"
                  loading="lazy"
                  decoding="async"
                  on:error={() => failedAvatarSource = featuredAvatarSrc}
                />
              {:else}
                <span class="home-daily__avatar home-daily__avatar--monogram" aria-hidden="true">
                  {featuredName.slice(0, 1).toUpperCase() || '?'}
                </span>
              {/if}
              <span class="home-daily__profile-copy">
                <strong>{featuredName}</strong>
                <small>@{roll.username} · View profile <span aria-hidden="true">↗</span></small>
              </span>
            </a>
          {:else if hasFeaturedRoll}
            <div class="home-daily__hex">@{roll.username}</div>
          {/if}
        </div>
      </div>
      <div class="home-daily__stats">
        <div><span>Score</span><strong>{Number(roll.score).toLocaleString()} EP</strong></div>
        <div><span>Rarity earned</span><strong>{rarity} roll</strong></div>
      </div>
    </div>
  {:else}
    <div class="home-daily__empty" role="status">
      <div class="home-daily__empty-mark" aria-hidden="true"></div>
      <strong>Today’s public rolls are still forming.</strong>
      {#if previewAvailable}
        <a class="home-daily__preview-link" href="?home_preview=daily">Show a roll in this panel <span aria-hidden="true">↗</span></a>
      {:else}
        <span>As players roll, their colors become public profile chapters.</span>
      {/if}
    </div>
  {/if}
  <div class="home-daily__action">
    <a href="#home-leaderboard" on:click={scrollToLeaderboard}>See today’s top rolls <span aria-hidden="true">↓</span></a>
  </div>
</aside>

<style>
  .home-daily { position: relative; display: grid; min-width: 0; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; padding: 1.4rem 1.35rem; color: #efedf3; background: radial-gradient(circle at 0 45%, color-mix(in srgb, var(--home-daily-color) 16%, transparent), transparent 48%), linear-gradient(180deg, #1a1c22 0%, #121419 100%); }
  .home-daily::before { position: absolute; top: 7%; bottom: 7%; left: 0; width: 1px; content: ''; background: linear-gradient(180deg, transparent, var(--home-daily-color) 28%, var(--home-daily-color) 72%, transparent); opacity: 0.75; }
  .home-daily::after { position: absolute; inset: 0; content: ''; pointer-events: none; background: linear-gradient(110deg, transparent 0 38%, rgba(255, 255, 255, 0.035) 47%, transparent 56% 100%); transform: translateX(-120%); animation: home-panel-sheen 7.5s 1.8s ease-in-out infinite; }
  .home-daily__label { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; color: #b0b4bf; font: 600 0.84rem / 1.1 var(--home-mono); letter-spacing: 0.12em; text-align: center; text-transform: uppercase; }
  .home-daily__label::before { width: 0.42rem; height: 0.42rem; content: ''; border-radius: 50%; background: var(--home-daily-color); box-shadow: 0 0 0.8rem color-mix(in srgb, var(--home-daily-color) 72%, transparent); }
  .home-daily__body { display: grid; align-content: center; min-height: 0; }
  .home-daily__main, .home-daily__stats, .home-daily__action { position: relative; z-index: 1; }
  .home-daily__main { padding: 1.4rem 0 1.2rem; text-align: center; }
  .home-daily__effect-wrap { display: grid; width: 100%; min-height: 7.5rem; place-items: center; margin-inline: auto; margin-bottom: 0.8rem; }
  .home-daily__effect-wrap :global(.compact-roll-preview) { flex-basis: 7.5rem; width: 7.5rem; height: 7.5rem; }
  .home-daily__readout { display: grid; min-width: 0; justify-items: center; }
  .home-daily__result-label { overflow: hidden; margin: 0 0 0.55rem; color: #e0dde5; font: 600 0.88rem / 1.2 var(--home-font); text-overflow: ellipsis; white-space: nowrap; }
  .home-daily__identity-row { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.55rem; }
  .home-daily h2 { margin: 0; color: #f3f0f5; font: 600 1.85rem / 1 var(--home-mono); letter-spacing: -0.035em; }
  .home-daily__rarity { padding: 0.32rem 0.55rem; border: 1px solid color-mix(in srgb, var(--home-daily-color) 62%, transparent); border-radius: 999px; color: color-mix(in srgb, var(--home-daily-color) 78%, #f2f0eb); font: 600 0.68rem / 1 var(--home-mono); letter-spacing: 0.06em; text-transform: uppercase; }
  .home-daily__hex { margin-top: 0.65rem; color: #b8bac3; font: 0.78rem / 1.25 var(--home-mono); }
  .home-daily__profile-link { display: flex; align-items: center; justify-content: center; gap: 0.7rem; max-width: 100%; margin-top: 0.75rem; color: #e8e5eb; text-align: left; text-decoration: none; }
  .home-daily__profile-link:hover { color: #fff; }
  .home-daily__profile-link:focus-visible { outline: 2px solid color-mix(in srgb, var(--home-daily-color) 76%, #fff); outline-offset: 4px; border-radius: 0.25rem; }
  .home-daily__avatar { flex: 0 0 2.75rem; width: 2.75rem; height: 2.75rem; overflow: hidden; border: 1px solid color-mix(in srgb, var(--home-daily-color) 60%, rgba(255, 255, 255, 0.24)); border-radius: 50%; object-fit: cover; box-shadow: 0 0 1.1rem color-mix(in srgb, var(--home-daily-color) 24%, transparent); }
  .home-daily__avatar--monogram { display: grid; place-items: center; background: #282a34; color: #f2eff5; font: 600 0.88rem / 1 var(--home-mono); }
  .home-daily__profile-copy { display: grid; min-width: 0; gap: 0.22rem; }
  .home-daily__profile-copy strong { overflow: hidden; color: inherit; font: 600 0.88rem / 1.15 var(--home-font); text-overflow: ellipsis; white-space: nowrap; }
  .home-daily__profile-copy small { overflow: hidden; color: #aeb1bb; font: 0.69rem / 1.25 var(--home-mono); text-overflow: ellipsis; white-space: nowrap; }
  .home-daily__profile-link:hover .home-daily__profile-copy small { color: color-mix(in srgb, var(--home-daily-color) 78%, #f2f0eb); }
  .home-daily__stats { margin-top: 1.15rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
  .home-daily__stats > div { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.82rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
  .home-daily__stats span { color: #aeb1bb; font: 600 0.72rem / 1.15 var(--home-mono); letter-spacing: 0.08em; text-transform: uppercase; }
  .home-daily__stats strong { color: #f2eff5; font-size: 1rem; line-height: 1.15; }
  .home-daily__action { margin-top: 0; }
  .home-daily__action a { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.9rem 0; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #d9dce5; font: 600 0.75rem / 1.2 var(--home-mono); text-decoration: none; }
  .home-daily__action a:hover { color: #fff; }
  .home-daily__empty { position: relative; z-index: 1; display: grid; gap: 0.55rem; min-height: 17rem; align-content: center; color: #9297a3; }
  .home-daily__empty strong { color: #efedf3; font: 600 1.1rem / 1.2 var(--home-font); }
  .home-daily__empty span { font: 0.72rem / 1.45 var(--home-mono); }
  .home-daily__preview-link { color: #cdd2ff; font: 600 0.72rem / 1.45 var(--home-mono); text-decoration: none; }
  .home-daily__preview-link:hover { color: #fff; }
  .home-daily__empty-mark { width: 4.5rem; height: 4.5rem; margin-bottom: 0.4rem; border: 1px solid rgba(205, 210, 255, 0.4); border-radius: 50%; box-shadow: 0 0 2.5rem rgba(205, 210, 255, 0.1); }
  .home-daily--compact { position: absolute; z-index: 2; right: 1rem; bottom: 1rem; left: 1rem; display: grid; min-height: 0 !important; max-height: 5rem; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto; align-items: center; gap: 1rem; padding: 0.75rem 0.9rem; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 0.45rem; background: rgba(12, 14, 19, 0.88); box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.3); backdrop-filter: blur(0.75rem); -webkit-backdrop-filter: blur(0.75rem); }
  .home-daily--compact::before, .home-daily--compact::after, .home-daily--compact > .home-daily__label, .home-daily--compact .home-daily__empty-mark, .home-daily--compact .home-daily__empty span { display: none; }
  .home-daily--compact .home-daily__empty { min-height: 0; display: block; }
  .home-daily--compact .home-daily__empty strong { font-size: 0.85rem; }
  .home-daily--compact .home-daily__action { margin: 0; }
  .home-daily--compact .home-daily__action a { min-height: 2.25rem; padding: 0 0.2rem 0 0.8rem; border: 0; white-space: nowrap; }
  @keyframes home-panel-sheen { 0%, 74% { transform: translateX(-120%); } 88%, 100% { transform: translateX(120%); } }
  @media (max-width: 67.5rem) {
    .home-daily { min-height: 15.5rem; padding-top: 1.1rem; }
    .home-daily__body { display: grid; grid-template-columns: 8rem minmax(0, 1fr); align-items: center; gap: 1rem; }
    .home-daily__main { display: grid; grid-template-columns: 7rem minmax(0, 1fr); align-items: center; gap: 0.45rem 0.85rem; padding: 0.85rem 0; }
    .home-daily__effect-wrap { grid-row: 1 / span 3; width: 7rem; margin: 0; }
    .home-daily h2, .home-daily__hex { grid-column: 2; }
    .home-daily__stats { margin-top: 0; }
    .home-daily__empty { min-height: 8rem; }
    .home-daily--compact { right: 0.75rem; bottom: 0.75rem; left: 0.75rem; }
    .home-daily--compact .home-daily__empty { min-height: 0; }
  }
  @media (max-width: 36rem) {
    .home-daily__body { grid-template-columns: 1fr; gap: 0.35rem; }
    .home-daily__main { grid-template-columns: 6rem minmax(0, 1fr); }
    .home-daily__effect-wrap { width: 6rem; min-height: 6rem; }
    .home-daily__effect-wrap :global(.compact-roll-preview) { flex-basis: 6rem; width: 6rem; height: 6rem; }
    .home-daily__stats { margin-top: 0.35rem; }
    .home-daily--compact { position: relative; right: auto; bottom: auto; left: auto; max-height: none; grid-template-columns: minmax(0, 1fr) auto; gap: 0.5rem; border-width: 1px 0 0; border-radius: 0; background: #101217; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
    .home-daily--compact .home-daily__empty strong { font-size: 0.78rem; }
    .home-daily--compact .home-daily__action a { padding: 0; font-size: 0.625rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-daily::after { animation: none; }
  }
</style>
