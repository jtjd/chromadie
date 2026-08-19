<script>
  import { getPublicProfilePath } from '../discoveryData.js';
  import { getProfileMediaUrl } from '../profileMedia.js';
  import { normalizeHexColor } from '../utils.js';

  export let rows = [];
  export let currentUser = null;
  export let loading = true;
  export let error = '';
  export let resetLabel = '—';
  let failedAvatarSources = {};

  $: realRows = Array.isArray(rows) ? rows.slice(0, 2) : [];
  $: visibleRows = limitVisibleRows(mergeVisibleRows(realRows, currentUser));

  function getScore(row) {
    const score = Number(row?.score);
    return Number.isFinite(score) ? score : Number.NEGATIVE_INFINITY;
  }

  function getRankValue(row) {
    const rank = Number(row?.rank ?? row?.displayRank);
    return Number.isSafeInteger(rank) && rank > 0 ? rank : Number.MAX_SAFE_INTEGER;
  }

  function mergeVisibleRows(topRows, signedInUser) {
    const mergedRows = topRows.slice();

    if (signedInUser?.username) {
      const key = signedInUser.username.toLowerCase();
      const existingIndex = mergedRows.findIndex(row => row?.username?.toLowerCase() === key);
      const merged = { ...(existingIndex >= 0 ? mergedRows[existingIndex] : {}), ...signedInUser, isLocalEntry: true };
      if (existingIndex >= 0) mergedRows[existingIndex] = merged;
      else mergedRows.push(merged);
    }

    return mergedRows
      .sort((left, right) => getRankValue(left) - getRankValue(right) || getScore(right) - getScore(left))
      .map((row, index) => ({ ...row, displayRank: getRankValue(row) === Number.MAX_SAFE_INTEGER ? index + 1 : getRankValue(row) }));
  }

  function limitVisibleRows(mergedRows) {
    const limitedRows = mergedRows.slice(0, 2);
    const localRow = mergedRows.find(row => row?.isLocalEntry);
    if (localRow && !limitedRows.includes(localRow)) return [limitedRows[0], localRow].filter(Boolean);
    return limitedRows;
  }

  function getRowPath(row) {
    return row?.profilePath || getPublicProfilePath(row?.username) || '/leaderboard';
  }

  function getRowName(row) {
    return row?.displayName || row?.username || 'Unknown player';
  }

  function getAvatarInitial(row) {
    return getRowName(row).slice(0, 1).toUpperCase() || '✦';
  }

  function getRowRank(row, index) {
    return row?.displayRank || row?.rank || index + 1;
  }

  function getRowLabel(row, index) {
    const rank = getRowRank(row, index);
    if (row?.isLocalEntry) return `Open your public profile, rank ${rank}, score ${row.score}`;
    return `Open ${getRowName(row)}'s public profile, rank ${rank}, score ${row.score === null || row.score === undefined ? 'unavailable' : row.score}`;
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

  {#if loading && !currentUser}
    <div class="homepage-daily-leaderboard__state" role="status">Loading today’s board…</div>
  {:else if error && !visibleRows.length}
    <div class="homepage-daily-leaderboard__state" role="alert">{error}</div>
  {:else if visibleRows.length}
    <ol class="homepage-daily-leaderboard__list">
      {#each visibleRows as row, index (row.isLocalEntry ? `homepage-current:${row.username}` : row.username || row.profilePath || index)}
        {@const color = normalizeHexColor(row.hexCode, row.profileAccent || '#8B7CF6')}
        {@const avatarSource = getProfileMediaUrl(row.avatarReference || row.avatarPath)}
        {@const rowName = getRowName(row)}
        <li>
          <a
            class="homepage-daily-leaderboard__row"
            class:homepage-daily-leaderboard__row--you={row.isLocalEntry}
            class:homepage-daily-leaderboard__row--top={getRowRank(row, index) === 1}
            href={getRowPath(row)}
            style={`--homepage-row-color: ${color};`}
            aria-label={getRowLabel(row, index)}
          >
            <span class="homepage-daily-leaderboard__rank">{String(getRowRank(row, index)).padStart(2, '0')}</span>
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

  {#if error && visibleRows.length}
    <div class="homepage-daily-leaderboard__state homepage-daily-leaderboard__state--quiet" role="status">
      {currentUser ? 'Live board unavailable; your current rank is still shown.' : 'Live board unavailable; the public board is still shown.'}
    </div>
  {/if}

  <a class="homepage-daily-leaderboard__more-link" href="/leaderboard">View full leaderboard</a>
</aside>

<style>
  .homepage-daily-leaderboard { position: relative; align-self: center; justify-self: end; width: min(100%, 380px); margin-top: 0; padding: 18px; overflow: hidden; isolation: isolate; border: 1px solid rgba(255, 255, 255, .08); border-radius: 20px; background: rgba(20, 18, 30, .55); box-shadow: 0 8px 32px rgba(0, 0, 0, .25), 0 0 36px color-mix(in srgb, var(--homepage-roll-accent, var(--homepage-accent)) 12%, transparent); backdrop-filter: blur(20px) saturate(120%); -webkit-backdrop-filter: blur(20px) saturate(120%); transform: translateY(clamp(-3.5rem, -6vh, -2rem)); }
  .homepage-daily-leaderboard::before { position: absolute; top: -5rem; right: -4rem; width: 15rem; height: 15rem; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--homepage-roll-accent, var(--homepage-accent)) 18%, transparent), transparent 70%); content: ''; opacity: .65; pointer-events: none; }
  .homepage-daily-leaderboard > * { position: relative; z-index: 1; }
  .homepage-daily-leaderboard__header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  .homepage-daily-leaderboard__kicker { color: var(--homepage-text); font: 600 .98rem / 1.1 var(--homepage-display); letter-spacing: -.015em; }
  .homepage-daily-leaderboard__scope,
  .homepage-daily-leaderboard__reset { color: var(--homepage-secondary-muted); font: 500 .68rem / 1.45 'Inter', sans-serif; letter-spacing: .01em; }
  .homepage-daily-leaderboard__scope { display: block; margin-top: 3px; }
  .homepage-daily-leaderboard__reset { white-space: nowrap; }
  .homepage-daily-leaderboard__list { display: grid; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }
  .homepage-daily-leaderboard__row { display: grid; grid-template-columns: 28px 38px minmax(0, 1fr) auto 10px; min-height: 58px; align-items: center; gap: 9px; padding: 0 10px; border: 1px solid rgba(255, 255, 255, .08); border-radius: 14px; background: rgba(255, 255, 255, .065); box-shadow: 0 8px 18px rgba(7, 4, 14, .12); color: inherit; text-decoration: none; transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease; }
  .homepage-daily-leaderboard__row:hover,
  .homepage-daily-leaderboard__row:focus-visible { border-color: color-mix(in srgb, var(--homepage-row-color) 68%, white 32%); background: rgba(255, 255, 255, .12); box-shadow: 0 10px 22px rgba(7, 4, 14, .18); transform: translateX(3px); }
  .homepage-daily-leaderboard__row--you { border-color: color-mix(in srgb, var(--homepage-row-color) 70%, white 30%); background: color-mix(in srgb, var(--homepage-row-color) 16%, rgba(255, 255, 255, .68)); box-shadow: 0 8px 20px rgba(7, 4, 14, .16), 0 0 0 1px color-mix(in srgb, var(--homepage-row-color) 18%, transparent); color: #17151b; }
  .homepage-daily-leaderboard__row--you:hover,
  .homepage-daily-leaderboard__row--you:focus-visible { border-color: color-mix(in srgb, var(--homepage-row-color) 82%, white 18%); background: color-mix(in srgb, var(--homepage-row-color) 22%, rgba(255, 255, 255, .74)); }
  .homepage-daily-leaderboard__row:focus-visible { outline: 2px solid var(--homepage-row-color); outline-offset: 3px; }
  .homepage-daily-leaderboard__rank { color: rgba(250, 249, 252, .68); font: 600 .86rem / 1 var(--homepage-display); }
  .homepage-daily-leaderboard__row--you .homepage-daily-leaderboard__rank { color: #17151b; }
  .homepage-daily-leaderboard__avatar { display: grid; width: 38px; height: 38px; place-items: center; overflow: hidden; border: 1px solid color-mix(in srgb, var(--homepage-row-color) 64%, white 36%); border-radius: 50%; background: rgba(255, 255, 255, .12); color: rgba(250, 249, 252, .9); box-shadow: 0 0 0 3px color-mix(in srgb, var(--homepage-row-color) 16%, transparent); font: 600 .78rem / 1 var(--homepage-display); }
  .homepage-daily-leaderboard__row--you .homepage-daily-leaderboard__avatar { background: color-mix(in srgb, var(--homepage-row-color) 20%, white 80%); color: #17151b; box-shadow: 0 0 0 3px color-mix(in srgb, var(--homepage-row-color) 24%, transparent), 0 0 20px color-mix(in srgb, var(--homepage-row-color) 40%, transparent); }
  .homepage-daily-leaderboard__row--top .homepage-daily-leaderboard__avatar { box-shadow: 0 0 0 3px color-mix(in srgb, var(--homepage-row-color) 20%, transparent), 0 0 24px color-mix(in srgb, var(--homepage-row-color) 42%, transparent); }
  .homepage-daily-leaderboard__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .homepage-daily-leaderboard__name { min-width: 0; overflow: hidden; color: rgba(250, 249, 252, .98); font: 600 1rem / 1.1 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .homepage-daily-leaderboard__row--you .homepage-daily-leaderboard__name { color: #17151b; font-weight: 700; }
  .homepage-daily-leaderboard__score { color: rgba(250, 249, 252, .98); font: 700 .84rem / 1 var(--homepage-display); white-space: nowrap; }
  .homepage-daily-leaderboard__row--you .homepage-daily-leaderboard__score { color: #17151b; }
  .homepage-daily-leaderboard__dot { width: 10px; height: 10px; border-radius: 999px; box-shadow: 0 0 13px var(--homepage-row-color); }
  .homepage-daily-leaderboard__state { min-height: 58px; display: flex; align-items: center; margin-top: 14px; padding: 0 10px; border: 1px solid rgba(255, 255, 255, .08); border-radius: 14px; background: rgba(255, 255, 255, .065); color: var(--homepage-secondary-muted); font: 500 .76rem / 1.45 'Inter', sans-serif; letter-spacing: .01em; }
  .homepage-daily-leaderboard__state--quiet { min-height: auto; margin-top: 10px; padding-top: 0; border: 0; background: transparent; color: rgba(248, 248, 248, .58); font-size: .66rem; }
  .homepage-daily-leaderboard__more-link { display: inline-flex; margin-top: 12px; color: rgba(248, 248, 248, .68); font: 500 .68rem / 1.3 'Inter', sans-serif; letter-spacing: .01em; text-decoration: none; transition: color .18s ease; }
  .homepage-daily-leaderboard__more-link:hover,
  .homepage-daily-leaderboard__more-link:focus-visible { color: var(--homepage-text); text-decoration: underline; text-underline-offset: 3px; }

  @media (max-width: 930px) {
    .homepage-daily-leaderboard { align-self: stretch; justify-self: stretch; width: min(100%, 560px); margin-top: 0; transform: none; }
  }

  @media (max-width: 460px) {
    .homepage-daily-leaderboard { padding: 16px; }
    .homepage-daily-leaderboard__header { align-items: flex-start; flex-direction: column; gap: 5px; }
    .homepage-daily-leaderboard__row { grid-template-columns: 24px 32px minmax(0, 1fr) auto 9px; min-height: 54px; gap: 7px; padding-inline: 9px; }
    .homepage-daily-leaderboard__avatar { width: 32px; height: 32px; }
    .homepage-daily-leaderboard__name { font-size: .9rem; }
    .homepage-daily-leaderboard__score { font-size: .7rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-daily-leaderboard__row,
    .homepage-daily-leaderboard__more-link { transition: none; }
  }
</style>
