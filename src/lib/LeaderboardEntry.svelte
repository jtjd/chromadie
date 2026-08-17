<script>
  import { createEventDispatcher } from 'svelte';
  import { getPublicProfilePath } from './discoveryData.js';
  import { getProfileMediaUrl } from './profileMedia.js';

  export let item;
  export let position = 0;
  export let featured = false;
  export let variant = 'list';

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
  class:leaderboard-row--podium={variant === 'podium'}
  class="leaderboard-row"
  style={rowStyle}
  href={profilePath || '/leaderboard'}
  on:click={viewProfile}
  aria-label={`Open ${displayName}'s public profile, rank ${visiblePosition}, score ${scoreLabel}`}
>
  <span class="leaderboard-row__rank" aria-label={`Rank ${visiblePosition}`}>#{visiblePosition}</span>

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
    --row-line: var(--leaderboard-line, rgba(30, 25, 34, .14));
    position: relative;
    box-sizing: border-box;
    min-width: 0;
    color: var(--leaderboard-text, #1a1820);
    text-decoration: none;
    transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  .leaderboard-row:not(.leaderboard-row--podium) {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr) minmax(7rem, auto);
    gap: .85rem;
    align-items: center;
    min-height: 4.7rem;
    padding: .75rem .9rem;
    border: 1px solid var(--row-line);
    border-radius: .85rem;
    background: var(--leaderboard-panel, rgba(255, 255, 255, .76));
    box-shadow: 0 1.25rem 3rem rgba(35, 29, 42, .06);
  }
  .leaderboard-row:not(.leaderboard-row--podium):hover,
  .leaderboard-row:not(.leaderboard-row--podium):focus-visible { border-color: color-mix(in srgb, var(--leaderboard-accent, #9553ad) 55%, var(--row-line)); background: color-mix(in srgb, var(--leaderboard-accent, #9553ad) 6%, #fff); transform: translateX(3px); }
  .leaderboard-row:not(.leaderboard-row--podium):hover { border-color: color-mix(in srgb, var(--leaderboard-accent, #9553ad) 55%, var(--row-line)); background: color-mix(in srgb, var(--leaderboard-accent, #9553ad) 6%, #fff); transform: translateX(3px); }
  .leaderboard-row:not(.leaderboard-row--podium).leaderboard-row--first { border-color: color-mix(in srgb, var(--row-accent) 42%, var(--row-line)); }

  .leaderboard-row--podium {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: .15rem .2rem .35rem;
    background: transparent;
    text-align: center;
  }
  .leaderboard-row--podium:hover,
  .leaderboard-row--podium:focus-visible { background: transparent; transform: translateY(-3px); }
  .leaderboard-row--podium .leaderboard-row__rank { margin-bottom: .55rem; font-size: .68rem; letter-spacing: .02em; }
  .leaderboard-row--podium .leaderboard-row__profile { flex-direction: column; align-items: center; gap: .6rem; width: 100%; }
  .leaderboard-row--podium .leaderboard-row__avatar { width: 4.25rem; height: 4.25rem; border: 2px solid color-mix(in srgb, var(--row-accent) 72%, #fff); box-shadow: 0 0 0 .25rem color-mix(in srgb, var(--row-accent) 15%, transparent); }
  .leaderboard-row--podium.leaderboard-row--first .leaderboard-row__avatar { width: 5.25rem; height: 5.25rem; }
  .leaderboard-row--podium .leaderboard-row__identity { justify-items: center; width: 100%; gap: .28rem; }
  .leaderboard-row--podium .leaderboard-row__identity strong { font-size: .95rem; }
  .leaderboard-row--podium .leaderboard-row__identity small { font-size: .63rem; }
  .leaderboard-row--podium .leaderboard-row__score { justify-items: center; width: 100%; margin-top: .55rem; text-align: center; }
  .leaderboard-row--podium .leaderboard-row__score strong { font-size: .9rem; }
  .leaderboard-row--podium .leaderboard-row__score small { justify-content: center; font-size: .56rem; }

  .leaderboard-row__rank { color: var(--row-accent); font: 500 .9rem/1 'Inter', sans-serif; }
  .leaderboard-row__profile { display: flex; align-items: center; gap: .75rem; min-width: 0; }
  .leaderboard-row__avatar { display: grid; flex: 0 0 auto; place-items: center; width: 2.7rem; height: 2.7rem; overflow: hidden; border: 1px solid var(--row-line); border-radius: 50%; background: #e6e4e2; color: var(--leaderboard-text, #1a1820); }
  .leaderboard-row__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .leaderboard-row__avatar-initial { font: 500 .95rem/1 'Inter', sans-serif; }
  .leaderboard-row__identity { display: grid; min-width: 0; max-width: 100%; gap: .3rem; }
  .leaderboard-row__identity strong { display: block; max-width: 100%; min-width: 0; overflow: hidden; color: var(--leaderboard-text, #1a1820); font: 600 .86rem/1.1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__identity small { display: block; max-width: 100%; min-width: 0; overflow: hidden; color: var(--leaderboard-muted, #706b76); font: 400 .66rem/1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__score { display: grid; justify-items: end; min-width: 0; gap: .32rem; text-align: right; }
  .leaderboard-row__score strong { color: var(--leaderboard-text, #1a1820); font: 500 .95rem/1 'Inter', sans-serif; white-space: nowrap; }
  .leaderboard-row__score small { display: flex; align-items: center; max-width: 100%; overflow: hidden; color: var(--leaderboard-muted, #706b76); font: 400 .59rem/1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-row__score i { display: inline-block; flex: 0 0 auto; width: .45rem; height: .45rem; margin-right: .32rem; border: 1px solid color-mix(in srgb, var(--leaderboard-text, #1a1820) 25%, transparent); border-radius: 50%; }

  @media (max-width: 620px) {
    .leaderboard-row:not(.leaderboard-row--podium) { grid-template-columns: 2.25rem minmax(0, 1fr) 6.25rem; gap: .65rem; min-height: 4.45rem; padding-inline: .7rem; }
    .leaderboard-row__profile { gap: .6rem; }
    .leaderboard-row__avatar { width: 2.45rem; height: 2.45rem; }
    .leaderboard-row__score strong { font-size: .86rem; }
    .leaderboard-row__score small { max-width: 6.25rem; }
    .leaderboard-row--podium .leaderboard-row__avatar { width: 3.75rem; height: 3.75rem; }
    .leaderboard-row--podium.leaderboard-row--first .leaderboard-row__avatar { width: 4.6rem; height: 4.6rem; }
    .leaderboard-row--podium .leaderboard-row__identity strong { font-size: .82rem; }
    .leaderboard-row--podium .leaderboard-row__identity small { font-size: .55rem; }
    .leaderboard-row--podium .leaderboard-row__score strong { font-size: .78rem; }
    .leaderboard-row--podium .leaderboard-row__score small { font-size: .5rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .leaderboard-row { transition: none; }
  }
</style>
