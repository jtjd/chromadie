<script>
  import LeaderboardEntry from '../LeaderboardEntry.svelte';

  export let rows = [];
  export let currentUser = null;
  export let loading = true;
  export let error = '';
  export let resetLabel = '—';

  $: realRows = Array.isArray(rows) ? rows.slice(0, 5) : [];
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
      if (existingIndex >= 0) {
        mergedRows[existingIndex] = { ...mergedRows[existingIndex], ...signedInUser, isLocalEntry: true };
      }
    }

    return mergedRows
      .sort((left, right) => getRankValue(left) - getRankValue(right) || getScore(right) - getScore(left))
      .map((row, index) => ({ ...row, displayRank: getRankValue(row) === Number.MAX_SAFE_INTEGER ? index + 1 : getRankValue(row) }));
  }

  function limitVisibleRows(mergedRows) {
    return mergedRows.slice(0, 5);
  }

</script>

<aside class="homepage-daily-leaderboard" aria-label="Today’s top rolls" aria-busy={loading} aria-live="polite">
  <div class="homepage-daily-leaderboard__header">
    <div class="homepage-daily-leaderboard__kicker">Today’s top rolls</div>
    <span class="homepage-daily-leaderboard__reset" role="timer" aria-label={`Resets in ${resetLabel}`}>
      <span>Resets in</span>
      <strong>{resetLabel}</strong>
    </span>
  </div>

  {#if loading && !currentUser}
    <div class="homepage-daily-leaderboard__state" role="status">Loading today’s board…</div>
  {:else if error && !visibleRows.length}
    <div class="homepage-daily-leaderboard__state" role="alert">{error}</div>
  {:else if visibleRows.length}
    <div class="homepage-daily-leaderboard__column-headings" aria-hidden="true">
      <span></span>
      <span>Player</span>
      <span class="homepage-daily-leaderboard__column-heading-metrics">
        <span>Color</span>
        <span>Rarity</span>
        <span>Score</span>
      </span>
    </div>

    <ol class="homepage-daily-leaderboard__list">
      {#each visibleRows as row, index (row.username || row.profilePath || index)}
        <li
          class="homepage-daily-leaderboard__row"
        >
          <LeaderboardEntry
            item={row}
            position={index}
            compact={true}
            surface="homepage"
            navigateOnClick={false}
          />
        </li>
      {/each}
    </ol>
  {:else}
    <div class="homepage-daily-leaderboard__state">No public rolls are on today’s board yet.</div>
  {/if}

  {#if error && visibleRows.length}
    <div class="homepage-daily-leaderboard__state homepage-daily-leaderboard__state--quiet" role="status">
      Live board unavailable; the public board is still shown.
    </div>
  {/if}

  <a class="homepage-daily-leaderboard__more-link" href="/leaderboard">View full leaderboard</a>
</aside>

<style>
  .homepage-daily-leaderboard {
    --leaderboard-panel: #111115;
    --leaderboard-line: #30313b;
    --leaderboard-muted: #b7b8c2;
    --leaderboard-text: #f7f7fa;
    --leaderboard-accent: #aab1ff;
    position: relative;
    align-self: center;
    justify-self: end;
    width: min(100%, 380px);
    margin-top: 0;
    padding: 0;
    overflow: hidden;
    isolation: isolate;
    color-scheme: dark;
  }

  .homepage-daily-leaderboard > * { position: relative; z-index: 1; }
  .homepage-daily-leaderboard__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .homepage-daily-leaderboard__kicker { color: var(--homepage-text); font: 600 .98rem / 1.1 var(--homepage-display); letter-spacing: -.015em; }
  .homepage-daily-leaderboard__reset { display: inline-flex; min-height: 1.7rem; align-items: center; gap: .35rem; padding: .22rem .58rem; border: 1px solid rgba(255, 255, 255, .3); border-radius: 999px; background: rgba(16, 13, 24, .34); box-shadow: 0 .3rem 1rem rgba(8, 4, 16, .14); color: rgba(255, 255, 255, .9); font: 700 .68rem / 1 'Inter', sans-serif; letter-spacing: .01em; white-space: nowrap; }
  .homepage-daily-leaderboard__reset strong { color: #fff; font: 800 .72rem / 1 var(--font-mono-stack, monospace); letter-spacing: .025em; }
  .homepage-daily-leaderboard__column-headings { display: grid; grid-template-columns: 2.25rem minmax(7rem, 1fr) minmax(0, 1.5fr); gap: .55rem; align-items: end; min-height: 1.2rem; margin-top: 14px; padding: 0 .7rem .25rem; color: rgba(255, 255, 255, .84); font: 800 .6rem / 1 'Inter', sans-serif; letter-spacing: .1em; text-transform: uppercase; }
  .homepage-daily-leaderboard__column-heading-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .3rem; min-width: 0; }
  .homepage-daily-leaderboard__column-heading-metrics span { min-width: 0; overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
  .homepage-daily-leaderboard__list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .homepage-daily-leaderboard__row { min-width: 0; }
  .homepage-daily-leaderboard__state { display: flex; min-height: 58px; align-items: center; margin-top: 14px; padding: 0 10px; border: 1px solid var(--leaderboard-line); border-radius: 14px; background: var(--leaderboard-panel); color: var(--leaderboard-muted); font: 600 .72rem / 1.45 'Inter', sans-serif; }
  .homepage-daily-leaderboard__state--quiet { min-height: auto; margin-top: 10px; padding-top: 0; border: 0; background: transparent; color: rgba(248, 248, 248, .58); font-size: .66rem; }
  .homepage-daily-leaderboard__more-link { display: inline-flex; margin-top: 12px; color: rgba(255, 255, 255, .82); font: 600 .7rem / 1.3 'Inter', sans-serif; letter-spacing: .01em; text-decoration: none; transition: color .18s ease; }
  .homepage-daily-leaderboard__more-link:hover,
  .homepage-daily-leaderboard__more-link:focus-visible { color: var(--homepage-text); text-decoration: underline; text-underline-offset: 3px; }

  @media (max-width: 930px) {
    .homepage-daily-leaderboard { align-self: stretch; justify-self: stretch; width: min(100%, 560px); margin-top: 0; transform: none; }
  }

  @media (max-width: 620px) {
    .homepage-daily-leaderboard__column-headings { grid-template-columns: 2rem minmax(0, 1fr); gap: .5rem; padding-inline: .62rem; }
    .homepage-daily-leaderboard__column-heading-metrics { grid-column: 2; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .25rem; }
  }

  @media (max-width: 460px) {
    .homepage-daily-leaderboard__header { align-items: flex-start; flex-direction: column; gap: 8px; }
    .homepage-daily-leaderboard__reset { align-self: flex-start; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-daily-leaderboard__more-link { transition: none; }
  }
</style>
