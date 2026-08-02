<script>
  import CompactRollPreview from './CompactRollPreview.svelte';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import { getOrbShape, getRollEffect } from './cosmetics.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { normalizeHexColor } from './utils.js';
  import { getNameRendererLoadout } from './name/nameLoadout.js';

  export let rows = [];
  export let compact = false;

  function avatarUrl(row) {
    return getProfileMediaUrl(row?.avatarPath || '');
  }

  function rowColor(row) {
    return normalizeHexColor(row?.hexCode, row?.profileAccent || '#8B7CF6');
  }
</script>

{#if compact}
  <div class="home-mini-leaderboard" aria-label="Three real public profiles">
    {#each rows.slice(0, 3) as row, index (row.username)}
      {@const color = rowColor(row)}
      {@const nameRendererKey = String(row?.equippedCosmetics?.name_effect || '')}
      {@const nameRendererLoadout = getNameRendererLoadout(row?.equippedCosmetics)}
      <a class="home-mini-leaderboard__row" href={row.profilePath} aria-label={`Open ${row.displayName || row.username}'s public profile`} style={`--row-accent: ${color};`}>
        <i>{String(index + 1).padStart(2, '0')}</i>
        {#if avatarUrl(row)}
          <img src={avatarUrl(row)} alt="" width="38" height="38" loading="lazy" decoding="async" />
        {:else}
          <span class="home-mini-leaderboard__avatar">{(row.displayName || row.username || '?').slice(0, 1).toUpperCase()}</span>
        {/if}
        <span class="home-mini-leaderboard__user">
          {#if nameRendererKey || nameRendererLoadout}
            <NameEffectCanvas
              text={'@' + row.username}
              rendererKey={nameRendererKey}
              loadout={nameRendererLoadout}
              todayColor={color}
              context="card"
              compact={true}
              mode="static-signature"
              semanticTag="strong"
              semanticClass="home-leaderboard__username"
            />
          {:else}
            <strong>@{row.username}</strong>
          {/if}
          <span>{row.identity || row.hexCode || 'Public color profile'}</span>
        </span>
        <span class="home-mini-leaderboard__score">{row.score === null || row.score === undefined ? '—' : `${Number(row.score).toLocaleString()} EP`}</span>
      </a>
    {:else}
      <p class="home-leaderboard__empty">Live leaderboard profiles are unavailable right now.</p>
    {/each}
  </div>
{:else}
  <section class="home-leaderboard" id="home-leaderboard" aria-labelledby="home-leaderboard-title">
    <div class="home-shell">
      <div class="home-leaderboard__head home-reveal">
        <div>
          <p class="home-kicker">Today on chm.lol</p>
          <h2 id="home-leaderboard-title">Today’s colors lead to real profiles.</h2>
        </div>
        <p>Higher placement makes a profile easier to find. The leaderboard remains a route into people, not the final destination.</p>
      </div>

      <div class="home-leaderboard__board home-reveal home-reveal--delay-1">
        {#each rows.slice(0, 3) as row, index (row.username)}
          {@const color = rowColor(row)}
          {@const effects = getRollEffect(row.equippedCosmetics)}
          {@const orb = getOrbShape(row.equippedCosmetics)}
          {@const nameRendererKey = String(row?.equippedCosmetics?.name_effect || '')}
          {@const nameRendererLoadout = getNameRendererLoadout(row?.equippedCosmetics)}
          <a class="home-rank-row" href={row.profilePath} aria-label={`Open ${row.displayName || row.username}'s public profile`} style={`--row-accent: ${color};`}>
            <span class="home-rank-row__number">{String(row.rank || index + 1).padStart(2, '0')}</span>
            {#if avatarUrl(row)}
              <img class="home-rank-row__avatar" src={avatarUrl(row)} alt="" width="42" height="42" loading="lazy" decoding="async" />
            {:else}
              <span class="home-rank-row__avatar home-rank-row__avatar--monogram">{(row.displayName || row.username || '?').slice(0, 1).toUpperCase()}</span>
            {/if}
            <span class="home-rank-row__user">
              {#if nameRendererKey || nameRendererLoadout}
                <NameEffectCanvas
                  text={row.displayName || row.username}
                  rendererKey={nameRendererKey}
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
              <span>{row.bio || 'Public color profile'}</span>
            </span>
            <span class="home-rank-row__result">
              <CompactRollPreview displayColor={color} rarity={row.rarity || 'Common'} effectCls={effects.cls} effectStyle={effects.style} orbCls={orb.cls} size="2rem" scale={0.2} staticEffect={true} referenceShape={true} />
              <span><b>{row.identity || 'Latest color'}</b><small>{row.rarity || color}</small></span>
            </span>
            <span class="home-rank-row__score">{row.score === null || row.score === undefined ? '—' : `${Number(row.score).toLocaleString()} EP`}</span>
          </a>
        {:else}
          <p class="home-leaderboard__empty">Live leaderboard profiles are unavailable right now.</p>
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  .home-leaderboard { scroll-margin-top: 1.25rem; padding: 5rem 0; border-top: 1px solid var(--home-line); border-bottom: 1px solid var(--home-line); background: var(--home-raised); }
  .home-leaderboard__head { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.7rem; }
  .home-leaderboard h2 { max-width: 47.5rem; margin: 0.75rem 0 0; color: var(--home-ink); font: 650 clamp(2.75rem, 4.8vw, 4.25rem) / 0.96 var(--home-font); letter-spacing: -0.037em; }
  .home-leaderboard__head > p { max-width: 21.9rem; margin: 0 0 0.25rem; color: #94959e; font-size: 0.875rem; line-height: 1.55; }
  .home-leaderboard__board { overflow: hidden; border: 1px solid var(--home-line); border-radius: 0.5rem; background: #101217; }
  .home-rank-row { position: relative; display: grid; grid-template-columns: 3rem 3rem minmax(0, 1fr) minmax(14.4rem, auto) 6.9rem; align-items: center; gap: 0.95rem; padding: 1.05rem 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.075); color: inherit; text-decoration: none; transition: background 0.2s ease; }
  .home-rank-row:first-child { border-top: 0; }
  .home-rank-row:hover, .home-rank-row:focus-visible { background: #171920; }
  .home-rank-row::before { position: absolute; top: 0; bottom: 0; left: 0; width: 2px; content: ''; background: var(--row-accent, #cdd2ff); transform: scaleY(0); transform-origin: center; transition: transform 0.24s ease; }
  .home-rank-row:hover::before, .home-rank-row:focus-visible::before { transform: scaleY(1); }
  .home-rank-row:focus-visible, .home-mini-leaderboard__row:focus-visible { outline: 2px solid #8ddcff; outline-offset: -2px; }
  .home-rank-row__number, .home-mini-leaderboard__row > i { color: #737580; font: 0.62rem / 1 var(--home-mono); font-style: normal; }
  .home-rank-row__avatar, .home-mini-leaderboard__row img, .home-mini-leaderboard__avatar { width: 2.65rem; height: 2.65rem; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 50%; object-fit: cover; }
  .home-rank-row__avatar--monogram, .home-mini-leaderboard__avatar { display: grid; place-items: center; background: #242731; color: #d6d4db; font: 600 0.8rem / 1 var(--home-mono); }
  .home-rank-row__user, .home-mini-leaderboard__user { min-width: 0; }
  :global(.home-leaderboard__username) { display: block; overflow: hidden; color: #f1eff3; font: 600 0.88rem / 1.1 var(--home-font); text-overflow: ellipsis; white-space: nowrap; }
  .home-rank-row__user strong, .home-mini-leaderboard__user strong { display: block; overflow: hidden; color: #f1eff3; font-size: 0.88rem; text-overflow: ellipsis; white-space: nowrap; }
  .home-rank-row__user span, .home-mini-leaderboard__user span { display: block; overflow: hidden; margin-top: 0.25rem; color: #98969f; font-size: 0.69rem; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
  .home-rank-row__result { display: grid; grid-template-columns: 2rem minmax(0, 1fr); align-items: center; gap: 0.6rem; min-width: 0; color: #8d8e98; font: 0.62rem / 1 var(--home-mono); }
  .home-rank-row__result :global(.compact-roll-preview) { flex-basis: 2rem; width: 2rem; height: 2rem; }
  .home-rank-row__result b { display: block; overflow: hidden; margin-bottom: 0.22rem; color: #d8d5dc; font: 500 0.69rem / 1.1 var(--home-font); text-overflow: ellipsis; white-space: nowrap; }
  .home-rank-row__result small { color: #8d8e98; font: inherit; }
  .home-rank-row__score { color: #d2d0d7; font: 0.62rem / 1 var(--home-mono); text-align: right; }
  .home-leaderboard__empty { margin: 0; padding: 1.4rem; color: #9297a3; font: 0.68rem / 1.4 var(--home-mono); }
  .home-reveal { opacity: 0; transform: translateY(1.35rem); transition: opacity 0.72s cubic-bezier(0.2, 0.72, 0.2, 1), transform 0.72s cubic-bezier(0.2, 0.72, 0.2, 1); }
  .home-reveal--delay-1 { transition-delay: 0.08s; }
  .home-mini-leaderboard { width: 100%; padding: 1.05rem; border: 1px solid #40434d; border-radius: 0.5rem; background: #16181e; }
  .home-mini-leaderboard__row { display: grid; grid-template-columns: 1.8rem 2.4rem minmax(0, 1fr) auto; align-items: center; gap: 0.6rem; padding: 0.75rem 0; border-top: 1px solid #32353e; color: inherit; text-decoration: none; }
  .home-mini-leaderboard__row:first-child { border-top: 0; }
  .home-mini-leaderboard__row img, .home-mini-leaderboard__avatar { width: 2.35rem; height: 2.35rem; }
  .home-mini-leaderboard__score { color: #ccc9d1; font: 0.6rem / 1 var(--home-mono); }
  @media (max-width: 67.5rem) {
    .home-leaderboard { padding: 4rem 0; }
    .home-rank-row { grid-template-columns: 2rem 2.65rem minmax(0, 1fr) 6.9rem; }
    .home-rank-row__result, .home-rank-row__score { grid-column: 3 / -1; text-align: left; }
    .home-rank-row__result { margin-top: 0.2rem; }
    .home-rank-row__score { margin-top: 0.2rem; }
  }
  @media (max-width: 42rem) {
    .home-leaderboard__head { align-items: flex-start; flex-direction: column; gap: 1rem; }
    .home-rank-row { grid-template-columns: 1.7rem 2.65rem minmax(0, 1fr); gap: 0.65rem; padding: 1rem 0.85rem; }
    .home-rank-row__result, .home-rank-row__score { grid-column: 3; }
    .home-rank-row__user span { white-space: normal; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-rank-row, .home-rank-row::before { transition: none; }
  }
</style>
