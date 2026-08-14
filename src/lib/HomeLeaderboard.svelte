<script>
  import CompactRollPreview from './CompactRollPreview.svelte';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { normalizeHexColor } from './utils.js';
  import { getNameRendererLoadout } from './name/nameLoadout.js';
  import AvatarEffect from './avatar-effect/AvatarEffect.svelte';

  export let rows = [];
  export let featuredProfiles = [];
  export let loading = false;
  export let error = '';

  $: todayRows = rows.slice(0, 3);
  $: showingToday = todayRows.length > 0;
  $: visibleProfiles = showingToday ? todayRows : featuredProfiles.slice(0, 3);
  $: hasProfiles = visibleProfiles.length > 0;

  function avatarUrl(row) {
    return getProfileMediaUrl(row?.avatarReference || row?.avatarPath || '');
  }

  function rowColor(row) {
    return normalizeHexColor(row?.hexCode, row?.profileAccent || '#8B7CF6');
  }
</script>

<section
  class="home-leaderboard"
  class:home-leaderboard--quiet={!hasProfiles}
  id="home-leaderboard"
  aria-labelledby="home-leaderboard-title"
>
  <div class="home-shell">
    <div class="home-leaderboard__head home-reveal">
      <div>
        <p class="home-kicker">{showingToday ? 'Today on chm.lol' : 'Profiles worth exploring'}</p>
        <h2 id="home-leaderboard-title">
          {showingToday ? 'Today’s colors lead to real profiles.' : 'Find the person behind the color.'}
        </h2>
      </div>
      <p>
        {showingToday
          ? 'Daily placement is a way into people, not the final destination.'
          : 'Every page carries someone’s taste, links, history, and evolving color identity.'}
      </p>
    </div>

    <div
      class="home-leaderboard__board home-reveal home-reveal--delay-1"
      aria-busy={loading && !hasProfiles}
      aria-live="polite"
    >
      {#if hasProfiles}
        {#each visibleProfiles as row, index (row.username)}
          {@const color = rowColor(row)}
          {@const nameRendererLoadout = getNameRendererLoadout(row?.equippedCosmetics)}
          {@const avatarSource = avatarUrl(row)}
          <a
            class="home-rank-row"
            class:home-rank-row--featured={!showingToday}
            href={row.profilePath}
            aria-label={`Open ${row.displayName || row.username}'s public profile`}
            style={`--row-accent: ${color};`}
          >
            <span class="home-rank-row__number">{showingToday ? String(row.rank || index + 1).padStart(2, '0') : 'view'}</span>
            <AvatarEffect effectKey={row?.equippedCosmetics?.avatar_effect} accentColor={color} mode="compact" animated={false} avatarSrc={avatarSource} fallbackText={(row.displayName || row.username || '?').slice(0, 1).toUpperCase()} className="home-rank-row__avatar-effect">
              {#if avatarSource}
                <img class="home-rank-row__avatar" src={avatarSource} alt="" width="42" height="42" loading="lazy" decoding="async" />
              {:else}
                <span class="home-rank-row__avatar home-rank-row__avatar--monogram">{(row.displayName || row.username || '?').slice(0, 1).toUpperCase()}</span>
              {/if}
            </AvatarEffect>
            <span class="home-rank-row__user">
              {#if nameRendererLoadout}
                <NameEffectCanvas
                  text={row.displayName || row.username}
                  loadout={nameRendererLoadout}
                  todayColor={color}
                  context="card"
                  compact={true}
                  mode="static-signature"
                  semanticTag="strong"
                  semanticClass="home-leaderboard__username"
                />
              {:else}
                <strong>{row.displayName || row.username}</strong>
              {/if}
              <span>{row.bio || `@${row.username}`}</span>
            </span>
            <span class="home-rank-row__result">
              <CompactRollPreview displayColor={color} rarity={row.rarity || 'Common'} size="2rem" scale={0.2} staticEffect={true} facetedGlyph={true} />
              <span>
                <b>{row.identity || (showingToday ? 'Latest color' : 'Profile color')}</b>
                <small>{row.rarity || color}</small>
              </span>
            </span>
            <span class="home-rank-row__score">
              {showingToday && row.score !== null && row.score !== undefined
                ? `${Number(row.score).toLocaleString()} EP`
                : 'Open page'}
            </span>
          </a>
        {/each}
      {:else if loading}
        <div class="home-leaderboard__state home-leaderboard__state--loading" role="status">
          <span class="home-leaderboard__state-mark" aria-hidden="true">·</span>
          <span>
            <strong>Opening today’s public profiles.</strong>
            <small>The latest colors are on their way.</small>
          </span>
        </div>
      {:else if error}
        <div class="home-leaderboard__state">
          <span class="home-leaderboard__state-mark" aria-hidden="true">—</span>
          <span>
            <strong>Profiles couldn’t be loaded.</strong>
            <small>{error}</small>
          </span>
          <a href="/leaderboard">Open discovery</a>
        </div>
      {:else}
        <div class="home-leaderboard__state">
          <span class="home-leaderboard__state-mark" aria-hidden="true">—</span>
          <span>
            <strong>No public profiles are available yet.</strong>
            <small>When the first colors land, this becomes a path into the people behind them.</small>
          </span>
          <a href="#claim">Claim a page</a>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .home-leaderboard { scroll-margin-top: 1.25rem; padding: 5.6rem 0 6rem; border-top: 1px solid var(--home-line); border-bottom: 1px solid var(--home-line); background: linear-gradient(180deg, var(--home-raised), #101217); }
  .home-leaderboard--quiet { padding-block: 4.6rem; }
  .home-leaderboard__head { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-bottom: 2.1rem; }
  .home-leaderboard h2 { max-width: 47.5rem; margin: 0.75rem 0 0; color: var(--home-ink); font: 650 clamp(2.6rem, 4.45vw, 4rem) / 0.96 var(--home-font); letter-spacing: -0.037em; }
  .home-leaderboard__head > p { max-width: 23rem; margin: 0 0 0.25rem; color: #94959e; font-size: 0.875rem; line-height: 1.55; }
  .home-leaderboard__board { overflow: hidden; border-top: 1px solid var(--home-line); border-bottom: 1px solid var(--home-line); background: rgba(16, 18, 23, 0.38); }
  .home-rank-row { position: relative; display: grid; grid-template-columns: 4.1rem 3rem minmax(0, 1fr) minmax(14.4rem, auto) 6.9rem; align-items: center; gap: 0.95rem; min-height: 5.5rem; padding: 1.1rem 0.85rem; border-top: 1px solid rgba(255, 255, 255, 0.075); color: inherit; text-decoration: none; transition: background 0.2s ease; }
  .home-rank-row:first-child { border-top: 0; }
  .home-rank-row:hover, .home-rank-row:focus-visible { background: #171920; }
  .home-rank-row::before { position: absolute; top: 0; bottom: 0; left: 0; width: 2px; content: ''; background: var(--row-accent, var(--home-accent)); transform: scaleY(0); transform-origin: center; transition: transform 0.24s ease; }
  .home-rank-row:hover::before, .home-rank-row:focus-visible::before { transform: scaleY(1); }
  .home-rank-row:focus-visible { outline: 2px solid #8ddcff; outline-offset: -2px; }
  .home-rank-row__number { color: #737580; font: 0.59rem / 1 var(--home-mono); letter-spacing: 0.08em; text-transform: uppercase; }
  .home-rank-row--featured .home-rank-row__number { color: color-mix(in srgb, var(--row-accent) 42%, #f2f0eb); }
  .home-rank-row__avatar { width: 2.65rem; height: 2.65rem; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 50%; object-fit: cover; }
  :global(.home-rank-row__avatar-effect) { display: grid; place-items: center; width: 2.65rem; height: 2.65rem; border-radius: 50%; }
  .home-rank-row__avatar--monogram { display: grid; place-items: center; background: #242731; color: #d6d4db; font: 600 0.8rem / 1 var(--home-mono); }
  .home-rank-row__user { min-width: 0; }
  :global(.home-leaderboard__username) { display: block; overflow: hidden; color: #f1eff3; font: 600 0.88rem / 1.1 var(--home-font); text-overflow: ellipsis; white-space: nowrap; }
  .home-rank-row__user strong { display: block; overflow: hidden; color: #f1eff3; font-size: 0.88rem; text-overflow: ellipsis; white-space: nowrap; }
  .home-rank-row__user span { display: block; overflow: hidden; margin-top: 0.25rem; color: #98969f; font-size: 0.69rem; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
  .home-rank-row__result { display: grid; grid-template-columns: 2rem minmax(0, 1fr); align-items: center; gap: 0.6rem; min-width: 0; color: #8d8e98; font: 0.62rem / 1 var(--home-mono); }
  .home-rank-row__result :global(.compact-roll-preview) { flex-basis: 2rem; width: 2rem; height: 2rem; }
  .home-rank-row__result b { display: block; overflow: hidden; margin-bottom: 0.22rem; color: #d8d5dc; font: 500 0.69rem / 1.1 var(--home-font); text-overflow: ellipsis; white-space: nowrap; }
  .home-rank-row__result small { color: #8d8e98; font: inherit; }
  .home-rank-row__score { color: #d2d0d7; font: 0.62rem / 1 var(--home-mono); text-align: right; }
  .home-rank-row--featured .home-rank-row__score { color: color-mix(in srgb, var(--row-accent) 42%, #f2f0eb); }
  .home-leaderboard__state { display: grid; grid-template-columns: 4.1rem minmax(0, 1fr) auto; align-items: center; gap: 1rem; min-height: 7rem; padding: 1.25rem 0.85rem; }
  .home-leaderboard__state-mark { color: var(--home-accent); font: 0.62rem / 1 var(--home-mono); }
  .home-leaderboard__state > span:nth-child(2) { display: grid; gap: 0.35rem; }
  .home-leaderboard__state strong { color: #dedbe2; font: 500 0.92rem / 1.2 var(--home-font); }
  .home-leaderboard__state small { max-width: 35rem; color: #858690; font: 0.65rem / 1.45 var(--home-mono); }
  .home-leaderboard__state a { color: var(--home-accent); font: 0.68rem / 1 var(--home-mono); text-decoration: none; white-space: nowrap; }
  .home-leaderboard__state a:hover { color: #fff; }
  .home-reveal { opacity: 0; transform: translateY(1.35rem); transition: opacity 0.72s cubic-bezier(0.2, 0.72, 0.2, 1), transform 0.72s cubic-bezier(0.2, 0.72, 0.2, 1); }
  .home-reveal--delay-1 { transition-delay: 0.08s; }
  @media (max-width: 67.5rem) {
    .home-leaderboard { padding: 4.5rem 0; }
    .home-rank-row { grid-template-columns: 3.4rem 2.65rem minmax(0, 1fr) auto; }
    .home-rank-row__result { grid-column: 3 / -1; margin-top: 0.2rem; }
  }
  @media (max-width: 42rem) {
    .home-leaderboard__head { align-items: flex-start; flex-direction: column; gap: 1rem; }
    .home-rank-row { grid-template-columns: 2.3rem 2.65rem minmax(0, 1fr); gap: 0.65rem; padding: 1rem 0.6rem; }
    .home-rank-row__result, .home-rank-row__score { grid-column: 3; text-align: left; }
    .home-rank-row__user span { white-space: normal; }
    .home-leaderboard__state { grid-template-columns: 2rem minmax(0, 1fr); gap: 0.75rem; padding: 1.25rem 0.6rem; }
    .home-leaderboard__state a { grid-column: 2; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-rank-row, .home-rank-row::before { transition: none; }
  }
</style>
