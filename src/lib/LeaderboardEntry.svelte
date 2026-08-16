<script>
  import { createEventDispatcher } from 'svelte';
  import { getPublicProfilePath } from './discoveryData.js';
  import { getProfileMediaUrl } from './profileMedia.js';

  export let item;
  export let position = 0;
  export let featured = false;

  const dispatch = createEventDispatcher();
  let failedAvatarSource = '';

  $: profilePath = getPublicProfilePath(item?.username);
  $: displayName = item?.displayName || item?.username || 'Unknown player';
  $: avatarSrc = getProfileMediaUrl(item?.avatarReference || item?.avatarPath);
  $: if (avatarSrc && avatarSrc !== failedAvatarSource) failedAvatarSource = '';
  $: score = item?.score === null || item?.score === undefined || item?.score === ''
    ? null
    : Number.isSafeInteger(Number(item.score)) ? Number(item.score) : null;
  $: scoreLabel = score === null ? '—' : score.toLocaleString();
  $: rollColor = item?.hexCode || item?.profileAccent || '#6e3e7f';
  $: scoreDetails = [item?.hexCode, item?.rarity, formatDate(item?.rollDate)].filter(Boolean).join(' · ');
  $: visiblePosition = item?.rank || position + 1;
  $: rankAccent = position === 0 ? '#e6bd5d' : position === 1 ? '#b9bec7' : position === 2 ? '#c17c55' : '#8d8b91';
  $: rowStyle = `--row-accent: ${rankAccent}; --roll-color: ${rollColor};`;

  function formatDate(value) {
    if (!value) return '';
    const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(parsed);
  }

  function viewProfile(event) {
    event?.preventDefault?.();
    if (!profilePath) return;
    dispatch('navigate', { view: 'profile', username: item.username, userId: null });
  }
</script>

<a
  class:leaderboard-row--featured={featured}
  class:leaderboard-row--first={position === 0}
  class="leaderboard-row"
  style={rowStyle}
  href={profilePath || '/leaderboard'}
  on:click={viewProfile}
  aria-label={`Open ${displayName}'s public profile, rank ${visiblePosition}, score ${scoreLabel}`}
>
  <span class="leaderboard-row__rank" aria-label={`Rank ${visiblePosition}`}>{visiblePosition}</span>

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
      <small>@{item.username}</small>
    </span>
  </span>

  <span class="leaderboard-row__score">
    <strong>{scoreLabel}</strong>
    <small><i style={`background: ${rollColor}`} aria-hidden="true"></i>{scoreDetails || 'Score details unavailable'}</small>
  </span>
</a>

<style>
  .leaderboard-row {
    --row-line: rgba(255, 255, 255, .1);
    display: grid;
    grid-template-columns: 3.75rem minmax(0, 1fr) minmax(7rem, auto);
    gap: 1.25rem;
    align-items: center;
    min-height: 6rem;
    box-sizing: border-box;
    padding: .85rem 1.4rem;
    border-bottom: 1px solid var(--row-line);
    background: #0d0d0e;
    color: #f5f4f7;
    text-decoration: none;
    transition: background-color 160ms ease;
  }
  .leaderboard-row:hover,
  .leaderboard-row:focus-visible { background: rgba(255, 255, 255, .045); }
  .leaderboard-row--featured { background: color-mix(in srgb, var(--row-accent) 7%, #0d0d0e); }
  .leaderboard-row--first { border-bottom-color: color-mix(in srgb, var(--row-accent) 34%, var(--row-line)); }
  .leaderboard-row__rank { color: var(--row-accent); font: 500 1rem/1 'Inter', sans-serif; }
  .leaderboard-row__profile { display: flex; align-items: center; gap: .8rem; min-width: 0; }
  .leaderboard-row__avatar { display: grid; flex: 0 0 auto; place-items: center; width: 2.65rem; height: 2.65rem; overflow: hidden; border: 1px solid rgba(255, 255, 255, .08); border-radius: 50%; background: #19191b; color: #d5d1d8; }
  .leaderboard-row__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .leaderboard-row__avatar-initial { font: 500 .95rem/1 'Inter', sans-serif; }
  .leaderboard-row__identity { display: grid; min-width: 0; gap: .3rem; }
  .leaderboard-row__identity strong { overflow: hidden; color: #f5f4f7; font: 600 .88rem/1.1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__identity small { overflow: hidden; color: #88868d; font: 400 .68rem/1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__score { display: grid; justify-items: end; min-width: 0; gap: .38rem; text-align: right; }
  .leaderboard-row__score strong { color: #e9e7eb; font: 500 1rem/1 'Inter', sans-serif; white-space: nowrap; }
  .leaderboard-row__score small { display: flex; align-items: center; max-width: 100%; overflow: hidden; color: #88868d; font: 400 .61rem/1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__score i { display: inline-block; flex: 0 0 auto; width: .48rem; height: .48rem; margin-right: .35rem; border: 1px solid rgba(255, 255, 255, .3); border-radius: 50%; }

  @media (max-width: 620px) {
    .leaderboard-row { grid-template-columns: 2.5rem minmax(0, 1fr) 6.75rem; gap: .75rem; min-height: 5.6rem; padding-inline: .8rem; }
    .leaderboard-row__profile { gap: .6rem; }
    .leaderboard-row__avatar { width: 2.45rem; height: 2.45rem; }
    .leaderboard-row__score strong { font-size: .86rem; }
    .leaderboard-row__score small { max-width: 6.75rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .leaderboard-row { transition: none; }
  }
</style>
