<script>
  import { createEventDispatcher } from 'svelte';
  import { getPublicProfilePath } from './discoveryData.js';
  import { getProfileMediaUrl } from './profileMedia.js';

  export let item;
  export let position = 0;

  const dispatch = createEventDispatcher();
  let failedAvatarSource = '';

  $: profilePath = getPublicProfilePath(item?.username);
  $: displayName = item?.displayName || item?.username || 'Unknown player';
  $: showUsername = Boolean(item?.username && item.username !== displayName);
  $: avatarSrc = getProfileMediaUrl(item?.avatarReference || item?.avatarPath);
  $: if (avatarSrc && avatarSrc !== failedAvatarSource) failedAvatarSource = '';
  $: score = item?.score === null || item?.score === undefined || item?.score === ''
    ? null
    : Number.isSafeInteger(Number(item.score)) ? Number(item.score) : null;
  $: scoreLabel = score === null ? '—' : score.toLocaleString();
  $: rollColor = item?.hexCode || item?.profileAccent || '#8d8c92';
  $: rollHex = item?.hexCode || '';
  $: rollRarity = item?.rarity || 'Color roll';
  $: visiblePosition = item?.rank || position + 1;
  $: rankAccent = visiblePosition === 1 ? '#FFD21C' : visiblePosition === 2 ? '#D5DCE8' : visiblePosition === 3 ? '#E29A66' : '#A5A7B4';
  $: rowStyle = `--row-accent: ${rankAccent}; --roll-color: ${rollColor};`;

  function viewProfile(event) {
    event?.preventDefault?.();
    if (!profilePath) return;
    dispatch('navigate', { view: 'profile', username: item.username, userId: null });
  }
</script>

<a
  class:leaderboard-row--first={position === 0}
  class="leaderboard-row"
  style={rowStyle}
  href={profilePath || '/leaderboard'}
  on:click={viewProfile}
  aria-label={`Open ${displayName}'s public profile, rank ${visiblePosition}, color ${rollHex || 'unavailable'}, rarity ${rollRarity}, score ${scoreLabel}`}
>
  <span class="leaderboard-row__rank" aria-label={`Rank ${visiblePosition}`}>
    {#if position < 3}
      <span class="leaderboard-row__rank-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          {#if position === 0}
            <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" />
            <path d="M8 5H5.5v2a3.5 3.5 0 0 0 3.2 3.48M16 5h2.5v2a3.5 3.5 0 0 1-3.2 3.48M12 12.5v3M8.5 19.5h7M10 15.5h4" />
          {:else}
            <circle cx="12" cy="9" r="4.7" />
            <path d="m9.4 12.8-1.2 6.1 3.8-2.1 3.8 2.1-1.2-6.1" />
          {/if}
        </svg>
      </span>
    {/if}
    <span class="leaderboard-row__rank-number">#{visiblePosition}</span>
  </span>

  <span class="leaderboard-row__profile">
    <span class="leaderboard-row__avatar">
      {#if avatarSrc && avatarSrc !== failedAvatarSource}
        <img src={avatarSrc} alt="" loading="lazy" decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
      {:else}
        <span class="leaderboard-row__avatar-initial" aria-hidden="true">{displayName.slice(0, 1).toUpperCase() || '✦'}</span>
      {/if}
    </span>
    <span class="leaderboard-row__identity">
      <strong>{displayName}</strong>
      {#if showUsername}<small>@{item.username}</small>{/if}
    </span>
  </span>

  <span class="leaderboard-row__metrics" aria-label="Roll details">
    <span class="leaderboard-row__metric leaderboard-row__metric--color">
      <span class="leaderboard-row__metric-label" aria-hidden="true">Color</span>
      <span class="leaderboard-row__metric-value">
        <i class="leaderboard-row__roll-swatch" style={`background: ${rollColor}`} aria-label={rollHex ? `Rolled color ${rollHex}` : 'Rolled color unavailable'}></i>
        {#if rollHex}<b>{rollHex}</b>{:else}<small>Unavailable</small>{/if}
      </span>
    </span>
    <span class="leaderboard-row__metric">
      <span class="leaderboard-row__metric-label" aria-hidden="true">Rarity</span>
      <strong class="leaderboard-row__metric-value leaderboard-row__rarity">{rollRarity}</strong>
    </span>
    <span class="leaderboard-row__metric leaderboard-row__metric--score">
      <span class="leaderboard-row__metric-label" aria-hidden="true">Score</span>
      <strong class="leaderboard-row__metric-value leaderboard-row__score">{scoreLabel}</strong>
    </span>
  </span>
</a>

<style>
  .leaderboard-row {
    --row-line: var(--leaderboard-line, rgba(255, 255, 255, .11));
    position: relative;
    box-sizing: border-box;
    min-width: 0;
    color: var(--leaderboard-text, #f5f5f7);
    text-decoration: none;
    transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  .leaderboard-row {
    position: relative;
    display: grid;
    grid-template-columns: 2.5rem minmax(13rem, 1.15fr) minmax(0, 1.8fr);
    gap: .85rem;
    align-items: center;
    min-height: 5.75rem;
    padding: .8rem 1rem;
    border: 1px solid var(--row-line);
    border-radius: 16px;
    background: var(--leaderboard-panel, rgba(13, 13, 16, .66));
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .16);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .leaderboard-row:hover,
  .leaderboard-row:focus-visible { border-color: color-mix(in srgb, var(--leaderboard-accent, var(--white, #ffffff)) 55%, var(--row-line)); background: color-mix(in srgb, var(--leaderboard-accent, var(--white, #ffffff)) 9%, var(--bg, #0e0e10)); transform: translateX(3px); }
  .leaderboard-row::before { position: absolute; top: .8rem; bottom: .8rem; left: .25rem; width: .24rem; border-radius: 999px; background: linear-gradient(180deg, color-mix(in srgb, var(--row-accent) 54%, #000) 0%, var(--row-accent) 55%, color-mix(in srgb, var(--row-accent) 36%, #fff) 100%); box-shadow: 0 0 .8rem color-mix(in srgb, var(--row-accent) 25%, transparent); content: ''; }
  .leaderboard-row__rank { display: grid; justify-items: center; align-content: center; gap: .2rem; color: var(--row-accent); font: 700 .95rem/1 'Inter', sans-serif; }
  .leaderboard-row__rank-mark { display: inline-grid; place-items: center; width: 1.4rem; height: 1.4rem; color: var(--row-accent); }
  .leaderboard-row__rank-mark svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.55; }
  .leaderboard-row--first .leaderboard-row__rank-mark { width: 1.55rem; height: 1.55rem; }
  .leaderboard-row__rank-number { color: var(--row-accent); font-weight: 800; }
  .leaderboard-row__profile { display: flex; align-items: center; gap: .85rem; min-width: 0; }
  .leaderboard-row__avatar { display: grid; flex: 0 0 auto; place-items: center; width: 3rem; height: 3rem; overflow: hidden; border: 1px solid color-mix(in srgb, var(--row-accent) 28%, var(--row-line)); border-radius: 50%; background: var(--surface, #161619); color: var(--leaderboard-text, #f5f5f6); box-shadow: 0 0 0 .16rem color-mix(in srgb, var(--row-accent) 8%, transparent); }
  .leaderboard-row__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .leaderboard-row__avatar-initial { color: var(--row-accent); font: 700 1rem/1 'Inter', sans-serif; }
  .leaderboard-row__identity { display: grid; min-width: 0; max-width: 100%; gap: .35rem; }
  .leaderboard-row__identity strong { display: block; max-width: 100%; min-width: 0; overflow: hidden; color: var(--leaderboard-text, #f5f5f7); font: 750 1rem/1.1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__identity small { display: block; max-width: 100%; min-width: 0; overflow: hidden; color: var(--leaderboard-muted, #b7b8c2); font: 600 .72rem/1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; min-width: 0; gap: 1rem; }
  .leaderboard-row__metric { display: grid; align-content: center; min-width: 0; min-height: 2.8rem; gap: .4rem; padding-left: 0; border-left: 1px solid color-mix(in srgb, var(--row-line) 82%, transparent); }
  .leaderboard-row__metric:first-child { padding-left: 0; border-left: 0; }
  .leaderboard-row__metric-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
  .leaderboard-row__metric-value { display: flex; align-items: center; justify-content: center; min-width: 0; gap: .45rem; overflow: hidden; color: var(--leaderboard-text, #f5f5f7); font: 750 .82rem/1.1 'Inter', sans-serif; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__metric-value b,
  .leaderboard-row__metric-value small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__metric-value b { color: var(--leaderboard-text, #f5f5f7); font: 700 .78rem/1 var(--font-mono-stack, monospace); }
  .leaderboard-row__metric-value small { color: var(--leaderboard-muted, #b7b8c2); font-size: .72rem; }
  .leaderboard-row__rarity { color: var(--row-accent); }
  .leaderboard-row__metric--score .leaderboard-row__metric-value { justify-content: center; text-align: center; }
  .leaderboard-row__score { color: var(--row-accent); font: 850 1.15rem/1 'Inter', sans-serif; }
  .leaderboard-row__roll-swatch { display: block; flex: 0 0 1.15rem; width: 1.15rem; height: 1.15rem; border: 1px solid rgba(255,255,255,.72); border-radius: .28rem; box-shadow: 0 0 .8rem color-mix(in srgb, var(--roll-color) 45%, transparent); }

  @media (max-width: 620px) {
    .leaderboard-row { grid-template-columns: 2.25rem minmax(0, 1fr); gap: .65rem; min-height: 0; padding: .78rem; border-radius: 15px; }
    .leaderboard-row__profile { gap: .65rem; }
    .leaderboard-row__avatar { width: 2.65rem; height: 2.65rem; }
    .leaderboard-row__identity strong { font-size: .9rem; }
    .leaderboard-row__identity small { font-size: .66rem; }
    .leaderboard-row__metrics { grid-column: 2; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .4rem; margin-top: .15rem; }
    .leaderboard-row__metric { min-height: 2.5rem; gap: .28rem; padding-left: 0; border-left: 0; }
    .leaderboard-row__metric-label { font-size: .58rem; }
    .leaderboard-row__metric-value { gap: .28rem; font-size: .68rem; }
    .leaderboard-row__metric-value b { font-size: .61rem; }
    .leaderboard-row__metric-value small { font-size: .62rem; }
    .leaderboard-row__metric--score .leaderboard-row__metric-value { justify-content: center; text-align: center; }
    .leaderboard-row__score { font-size: .98rem; }
    .leaderboard-row__roll-swatch { flex-basis: .95rem; width: .95rem; height: .95rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .leaderboard-row { transition: none; }
  }
</style>
