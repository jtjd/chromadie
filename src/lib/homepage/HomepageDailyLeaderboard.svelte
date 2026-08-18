<script>
  import { getPublicProfilePath } from '../discoveryData.js';
  import { getProfileMediaUrl } from '../profileMedia.js';
  import { normalizeHexColor } from '../utils.js';

  export let rows = [];
  export let loading = true;
  export let error = '';
  export let resetLabel = '—';

  let failedAvatarSources = {};

  $: visibleRows = Array.isArray(rows) ? rows.slice(0, 3) : [];

  function getRowPath(row) {
    return row?.profilePath || getPublicProfilePath(row?.username) || '/leaderboard';
  }

  function getRowName(row) {
    return row?.displayName || row?.username || 'Unknown player';
  }

  function getAvatarInitial(row) {
    return getRowName(row).slice(0, 1).toUpperCase() || '✦';
  }

  function markAvatarFailed(username, source) {
    if (!username || !source) return;
    failedAvatarSources = { ...failedAvatarSources, [username]: source };
  }
</script>

<aside class="homepage-daily-leaderboard" aria-label="Daily highest roll" aria-busy={loading} aria-live="polite">
  <div class="homepage-daily-leaderboard__header">
    <div>
      <div class="homepage-daily-leaderboard__kicker">Daily highest roll</div>
      <span class="homepage-daily-leaderboard__scope">Today’s public rolls</span>
    </div>
    <span class="homepage-daily-leaderboard__reset">Resets in {resetLabel}</span>
  </div>
  <div class="homepage-daily-leaderboard__rule"></div>

  {#if loading}
    <div class="homepage-daily-leaderboard__state" role="status">Loading today’s board…</div>
  {:else if error}
    <div class="homepage-daily-leaderboard__state" role="alert">{error}</div>
  {:else if visibleRows.length}
    <ol class="homepage-daily-leaderboard__list">
      {#each visibleRows as row, index (row.username)}
        {@const color = normalizeHexColor(row.hexCode, row.profileAccent || '#8B7CF6')}
        {@const avatarSource = getProfileMediaUrl(row.avatarReference || row.avatarPath)}
        {@const rowName = getRowName(row)}
        <li>
          <a
            class="homepage-daily-leaderboard__row"
            href={getRowPath(row)}
            style={`--homepage-row-color: ${color};`}
            aria-label={`Open ${rowName}'s public profile, rank ${row.rank || index + 1}, score ${row.score === null || row.score === undefined ? 'unavailable' : row.score}`}
          >
            <span class="homepage-daily-leaderboard__rank">{String(row.rank || index + 1).padStart(2, '0')}</span>
            <span class="homepage-daily-leaderboard__avatar">
              {#if avatarSource && failedAvatarSources[row.username] !== avatarSource}
                <img src={avatarSource} alt="" loading="lazy" decoding="async" on:error={() => markAvatarFailed(row.username, avatarSource)} />
              {:else}
                <span aria-hidden="true">{getAvatarInitial(row)}</span>
              {/if}
            </span>
            <span class="homepage-daily-leaderboard__name">{rowName}</span>
            <strong class="homepage-daily-leaderboard__score">
              {row.score === null || row.score === undefined ? '—' : `+${Number(row.score).toLocaleString()} EP`}
            </strong>
            <i class="homepage-daily-leaderboard__dot" style={`background: ${color};`} aria-hidden="true"></i>
          </a>
        </li>
      {/each}
    </ol>
  {:else}
    <div class="homepage-daily-leaderboard__state">No public rolls are on today’s board yet.</div>
  {/if}
</aside>

<style>
  .homepage-daily-leaderboard { align-self: center; justify-self: end; width: min(100%, 300px); padding-top: 42px; }
  .homepage-daily-leaderboard__header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  .homepage-daily-leaderboard__kicker { color: rgba(250, 249, 252, .92); font: 600 .78rem / 1.2 var(--homepage-display); text-shadow: 0 1px 8px rgba(7, 4, 14, .62); }
  .homepage-daily-leaderboard__scope,
  .homepage-daily-leaderboard__reset { color: rgba(250, 249, 252, .68); font: 450 .62rem / 1.2 'Inter', sans-serif; text-shadow: 0 1px 3px rgba(7, 4, 14, .68); }
  .homepage-daily-leaderboard__scope { display: block; margin-top: 4px; }
  .homepage-daily-leaderboard__reset { white-space: nowrap; }
  .homepage-daily-leaderboard__rule { height: 1px; margin: 10px 0 8px; background: rgba(255, 255, 255, .13); }
  .homepage-daily-leaderboard__list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .homepage-daily-leaderboard__row { display: grid; grid-template-columns: 26px 30px minmax(0, 1fr) auto 10px; min-height: 58px; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid rgba(255, 255, 255, .07); border-radius: 10px; background: linear-gradient(100deg, rgba(16, 16, 24, .86), rgba(18, 17, 23, .74)); box-shadow: 0 10px 22px rgba(7, 4, 14, .13); color: inherit; text-decoration: none; transition: border-color .18s ease, background .18s ease, transform .18s ease; }
  .homepage-daily-leaderboard__row:hover,
  .homepage-daily-leaderboard__row:focus-visible { border-color: color-mix(in srgb, var(--homepage-row-color) 68%, white 32%); background: linear-gradient(100deg, rgba(21, 20, 30, .94), rgba(20, 19, 26, .86)); transform: translateX(3px); }
  .homepage-daily-leaderboard__row:focus-visible { outline: 2px solid var(--homepage-row-color); outline-offset: 3px; }
  .homepage-daily-leaderboard__rank { color: rgba(250, 249, 252, .56); font: 600 .76rem / 1 var(--homepage-display); }
  .homepage-daily-leaderboard__avatar { display: grid; width: 30px; height: 30px; place-items: center; overflow: hidden; border: 1px solid color-mix(in srgb, var(--homepage-row-color) 64%, white 36%); border-radius: 50%; background: rgba(255, 255, 255, .12); color: rgba(250, 249, 252, .9); box-shadow: 0 0 0 3px color-mix(in srgb, var(--homepage-row-color) 16%, transparent); font: 600 .7rem / 1 var(--homepage-display); }
  .homepage-daily-leaderboard__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .homepage-daily-leaderboard__name { min-width: 0; overflow: hidden; color: rgba(250, 249, 252, .94); font: 500 .76rem / 1.1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .homepage-daily-leaderboard__score { color: rgba(250, 249, 252, .9); font: 600 .64rem / 1 var(--homepage-display); white-space: nowrap; }
  .homepage-daily-leaderboard__dot { width: 9px; height: 9px; border-radius: 999px; box-shadow: 0 0 12px var(--homepage-row-color); }
  .homepage-daily-leaderboard__state { min-height: 58px; display: flex; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, .1); color: rgba(250, 249, 252, .68); font: 400 .72rem / 1.4 'Inter', sans-serif; }

  @media (max-width: 930px) {
    .homepage-daily-leaderboard { align-self: stretch; justify-self: stretch; width: min(100%, 560px); padding-top: 0; }
  }

  @media (max-width: 460px) {
    .homepage-daily-leaderboard__header { align-items: flex-start; flex-direction: column; gap: 5px; }
    .homepage-daily-leaderboard__row { grid-template-columns: 24px 30px minmax(0, 1fr) auto 9px; gap: 7px; padding-inline: 8px; }
    .homepage-daily-leaderboard__score { font-size: .6rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-daily-leaderboard__row { transition: none; }
  }
</style>
