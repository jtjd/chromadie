<script>
  import { supabase } from './supabase';
  import { session, followedUsers, toggleFollow, isAuthenticated } from './stores';
  import { getTodayString } from './utils';
  import { getNameEffect, getTitleText, getStaffTitleText, getLbTheme, getRollEffect, getOrbShape, getProfileBorder } from './cosmetics';
  import { getBadgeMeta } from './badgeData';
  import { onMount, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  export let initialTab = 'today';

  let activeTab = 'today';
  let leaderboard = [];
  let loading = true;
  let myRank = null;
  let myScore = null;
  let loadError = '';

  const leaderboardColumns = 'user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges, is_staff, rank, identity, contributors, traits, condition_ids';
  const legacyLeaderboardColumns = 'user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges, is_staff';

  $: featuredRoll = activeTab === 'today' && leaderboard.length > 0 ? leaderboard[0] : null;
  $: featuredDetails = featuredRoll ? getRollDetails(featuredRoll) : null;
  $: featuredNameEffect = featuredRoll ? getNameEffect(featuredRoll.equipped_cosmetics) : { cls: '', style: '' };
  $: featuredTitle = featuredRoll ? getTitleText(featuredRoll.equipped_cosmetics) : '';
  $: featuredStaffTitle = featuredRoll ? getStaffTitleText(featuredRoll.is_staff) : '';
  $: featuredTheme = featuredRoll ? getLbTheme(featuredRoll.equipped_cosmetics) : { cls: '', style: '' };
  $: featuredRollEffect = featuredRoll ? getRollEffect(featuredRoll.equipped_cosmetics) : { cls: '', style: '' };
  $: featuredOrbShape = featuredRoll ? getOrbShape(featuredRoll.equipped_cosmetics) : { cls: '', style: '' };
  $: featuredBorder = featuredRoll ? getProfileBorder(featuredRoll.equipped_cosmetics) : { cls: '', style: '' };

  function getRollDetails(row) {
    return {
      identity: row?.identity || '',
      contributors: row?.contributors || [],
      traits: row?.traits || []
    };
  }

  function getSourceName(tab) {
    if (tab === 'today') return 'leaderboard_view';
    if (tab === 'weekly') return 'weekly_best_leaderboard_view';
    if (tab === 'monthly') return 'monthly_best_leaderboard_view';
    if (tab === 'roll') return 'all_time_leaderboard_view';
    return 'leaderboard_view';
  }

  function buildLeaderboardQuery(columns) {
    const sourceName = getSourceName(activeTab);
    let query = supabase.from(sourceName).select(columns);

    if (activeTab === 'today') {
      query = query.eq('roll_date', getTodayString());
    }

    return query
      .order('score', { ascending: false })
      .order('user_id', { ascending: true })
      .limit(10);
  }

  function isLeaderboardSchemaMismatch(error) {
    return error?.code === '42703' || error?.code === '42809' || error?.code === 'PGRST204';
  }

  function addLegacyRanks(rows) {
    let previousScore = null;
    let previousRank = 0;

    return rows.map((row, index) => {
      const score = Number(row.score);
      if (previousScore === null || score !== previousScore) previousRank = index + 1;
      previousScore = score;
      return { ...row, rank: previousRank };
    });
  }

  async function fetchLeaderboard() {
    loading = true;
    loadError = '';
    myRank = null;
    myScore = null;
    if (activeTab === 'rivals') {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_rivals_scores');
      if (!rpcError && rpcData) {
        leaderboard = rpcData;
      } else {
        leaderboard = [];
        loadError = 'The rivals leaderboard could not be loaded. Please retry.';
      }
      loading = false;
      return;
    }

    let usedLegacySchema = false;
    let { data, error } = await buildLeaderboardQuery(leaderboardColumns);

    if (isLeaderboardSchemaMismatch(error)) {
      usedLegacySchema = true;
      if (import.meta.env.DEV) {
        console.warn('Leaderboard database views are behind the frontend schema; using the legacy projection until migrations are deployed.', error);
      }
      ({ data, error } = await buildLeaderboardQuery(legacyLeaderboardColumns));
      if (!error && data) data = addLegacyRanks(data);
    }

    if (!error && data) {
      leaderboard = data;
      await checkMyRank(usedLegacySchema);
    } else {
      leaderboard = [];
      console.error('Leaderboard load failed.', error);
      loadError = 'The leaderboard could not be loaded. Please retry.';
    }
    loading = false;
  }

  async function checkMyRank(legacySchema = false) {
    if (!$isAuthenticated) return;
    if (activeTab === 'rivals') {
      return;
    }

    if (legacySchema) {
      const ownTopTenRow = leaderboard.find(row => row.user_id === $session.user.id);
      if (ownTopTenRow) myScore = ownTopTenRow.score;
      return;
    }

    const sourceName = getSourceName(activeTab);
    let myDataQuery = supabase
      .from(sourceName)
      .select('score, rank')
      .eq('user_id', $session.user.id);

    if (activeTab === 'today') {
      myDataQuery = myDataQuery.eq('roll_date', getTodayString());
    }

    const { data: myData } = await myDataQuery.single();

    if (myData) {
      myScore = myData.score;
      const isInTop10 = leaderboard.some(row => row.user_id === $session.user.id);
      if (!isInTop10) myRank = Number(myData.rank) || null;
    }
  }

  function switchTab(tab) {
    if (tab === activeTab) return;
    activeTab = tab;
    dispatch('navigate', { view: 'leaderboard', tab });
    fetchLeaderboard();
  }

  function viewProfile(username, userId = null) {
    dispatch('navigate', { view: 'profile', username, userId });
  }

  onMount(() => {
    activeTab = initialTab;
    fetchLeaderboard();
  });
</script>

<div class="container">
  <div class="section-title">
    <div class="section-bar bar-spectrum"></div>
    <h2>Leaderboard</h2>
  </div>

  <div class="lb-tabs" role="group" aria-label="Leaderboard period">
    <button aria-pressed={activeTab === 'today'} class="auth-tab" class:active={activeTab === 'today'} on:click={() => switchTab('today')}>Today</button>
    <button aria-pressed={activeTab === 'rivals'} class="auth-tab" class:active={activeTab === 'rivals'} on:click={() => switchTab('rivals')}>Rivals</button>
    <button aria-pressed={activeTab === 'weekly'} class="auth-tab" class:active={activeTab === 'weekly'} on:click={() => switchTab('weekly')}>Weekly</button>
    <button aria-pressed={activeTab === 'monthly'} class="auth-tab" class:active={activeTab === 'monthly'} on:click={() => switchTab('monthly')}>Monthly</button>
    <button aria-pressed={activeTab === 'roll'} class="auth-tab" class:active={activeTab === 'roll'} on:click={() => switchTab('roll')}>All-Time Roll</button>
  </div>

  {#if !loading && featuredRoll && featuredDetails}
    <article class="daily-feature {featuredTheme.cls} {featuredBorder.cls}" style="{featuredTheme.style}; {featuredBorder.style}">
      <div class="daily-feature-kicker"><span>✦</span> Top roll of the day <span class="daily-feature-date">{getTodayString()}</span></div>
      <div class="daily-feature-player-area">
        <div class="daily-feature-player-label">Earned by</div>
        <div class="daily-feature-player">
          {#if featuredTitle}<span class="title-chip">[{featuredTitle}]</span>{/if}
          {#if featuredStaffTitle}<span class="title-chip staff-title">[{featuredStaffTitle}]</span>{/if}
          <button type="button" class="lb-username-button" on:click={() => viewProfile(featuredRoll.username, featuredRoll.user_id)} aria-label={`View profile for ${featuredRoll.username}`}>
            <span class="lb-username daily-feature-name {featuredNameEffect.cls}" style={featuredNameEffect.style} data-text={featuredRoll.username}>{featuredRoll.username}</span>
          </button>
          {#if featuredRoll.equipped_badges?.includes('launch_edition')}<span class="launch-edition-badge">LE</span>{/if}
        </div>
      </div>
      <div class="daily-feature-content">
        <div class="daily-roll-visual" aria-label={`Top roll ${featuredRoll.hex_code}`}>
          <div class="daily-roll-stage">
          <div class="daily-roll-rarity rarity-{featuredRoll.rarity}">{featuredRoll.rarity}</div>
          <div class="roll-effect-wrapper daily-roll-effect {featuredRollEffect.cls}" style={featuredRollEffect.style}>
            <div class="final-color-display rarity-{featuredRoll.rarity} {featuredOrbShape.cls}" style="background-color: {featuredRoll.hex_code};"></div>
          </div>
          </div>
          <div class="daily-roll-hex">{featuredRoll.hex_code}</div>
        </div>
        <div class="daily-feature-details">
          <div class="daily-feature-score-label">LEADERBOARD SCORE</div>
          <div class="daily-feature-score">{featuredRoll.score.toLocaleString()} <span>EP</span></div>
          {#if featuredDetails.identity}<div class="daily-feature-identity"><span>IDENTITY</span>{featuredDetails.identity}</div>{/if}
          <div class="daily-feature-stats" aria-label="Roll details">
            <span><b>RGB</b> {featuredRoll.hex_code.replace('#', '').match(/.{2}/g)?.join(' · ')}</span>
            <span><b>{featuredDetails.contributors.length}</b> condition{featuredDetails.contributors.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>
      <div class="daily-feature-conditions">
        <div class="daily-feature-conditions-title">Conditions met</div>
        {#if featuredDetails.contributors.length > 0}
          <div class="daily-condition-list">
            {#each featuredDetails.contributors.slice(0, 6) as condition (condition.id)}
              {@const badge = getBadgeMeta(condition.id)}
              <span class="daily-condition" title={badge.desc || condition.name}>
                <span>{badge.symbol || '✦'}</span> {condition.name || badge.name}
              </span>
            {/each}
            {#if featuredDetails.contributors.length > 6}<span class="daily-condition more-condition">+{featuredDetails.contributors.length - 6} more</span>{/if}
          </div>
        {:else}
          <span class="daily-feature-no-conditions">Base roll only</span>
        {/if}
      </div>
    </article>
  {/if}

  {#if loading}
    <div class="card"><p>Loading top rollers...</p></div>
  {:else if loadError}
    <div class="card" role="alert">
      <p>{loadError}</p>
      <button type="button" class="auth-tab" on:click={fetchLeaderboard}>Retry</button>
    </div>
  {:else if leaderboard.length === 0}
    <div class="card"><p>No scores yet. Roll to claim #1!</p></div>
  {:else}
    <div class="leaderboard-list">
      {#each leaderboard as row, index (row.user_id)}
        {@const nameEff = getNameEffect(row.equipped_cosmetics)}
        {@const titleTxt = getTitleText(row.equipped_cosmetics)}
        {@const staffTitleTxt = getStaffTitleText(row.is_staff)}
        {@const lbTheme = getLbTheme(row.equipped_cosmetics)}

        <div class="leaderboard-row {lbTheme.cls}" style="{lbTheme.style}">
          <span class="lb-rank">#{row.rank || index + 1}</span>
          <span class="lb-info">
            {#if titleTxt}
              <span class="title-chip">[{titleTxt}]</span>
            {/if}
            {#if staffTitleTxt}
              <span class="title-chip staff-title">[{staffTitleTxt}]</span>
            {/if}
            <button
              type="button"
              class="lb-username-button"
              aria-label={`View profile for ${row.username}`}
              on:click={() => viewProfile(row.username, row.user_id)}
            >
              <span class="lb-username {nameEff.cls}" style="{nameEff.style}" data-text={row.username}>
                {row.username}
              </span>
            </button>
            {#if row.equipped_badges?.includes('launch_edition')}
              <span class="launch-edition-badge" title="Played during ChromaDie's launch month" aria-label="Launch Edition player">LE</span>
            {/if}
            {#if row.current_streak > 0}
              <span class="streak-chip">🔥 {row.current_streak}</span>
            {/if}

            <br>
            <span class="lb-sub" style="color:var(--text-muted); font-size:0.75rem;">{row.hex_code} • {row.rarity}</span>
          </span>

          <span class="lb-actions">
            <span class="lb-score">{row.score.toLocaleString()}</span>
            {#if $isAuthenticated && row.user_id !== $session.user.id}
              {#if $followedUsers.includes(row.user_id)}
                <button
                  type="button"
                  class="rival-btn unfollow"
                  aria-label={`Remove ${row.username} from rivals`}
                  on:click={() => toggleFollow(row.user_id)}
                  title="Unfollow"
                >
                  ✖
                </button>
              {:else if $followedUsers.length < 5}
                <button
                  type="button"
                  class="rival-btn"
                  aria-label={`Add ${row.username} as a rival`}
                  on:click={() => toggleFollow(row.user_id)}
                  title="Add Rival"
                >
                  +
                </button>
              {/if}
            {/if}
          </span>
        </div>
      {/each}

      {#if myRank}
        <div class="my-rank-row">
          <span class="lb-rank">#{myRank}</span>
          <span class="lb-info">
            <span class="lb-username-button" aria-hidden="true">
              <span class="lb-username">You</span>
            </span>
            <br>
            <span class="lb-sub" style="color:var(--text-muted); font-size:0.75rem;">Your best roll this period</span>
          </span>
          <span class="lb-score">{myScore.toLocaleString()}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lb-username-button { background: none; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; }
  .daily-feature { position: relative; overflow: hidden; margin: 0 0 18px; padding: 19px 22px 17px; border: 1px solid rgba(241, 196, 15, 0.48); border-radius: 17px; background: radial-gradient(circle at 7% 20%, rgba(241, 196, 15, 0.16), transparent 32%), radial-gradient(circle at 92% 0%, rgba(34, 211, 238, 0.1), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.065), rgba(139,124,246,0.085)); box-shadow: 0 14px 38px rgba(0,0,0,0.24), inset 0 1px rgba(255,255,255,0.1); }
  .daily-feature::after { content: ''; position: absolute; width: 240px; height: 240px; right: -110px; top: -130px; border-radius: 50%; background: rgba(34,211,238,0.075); filter: blur(5px); pointer-events: none; }
  .daily-feature-kicker { position: relative; z-index: 1; display: flex; align-items: center; gap: 7px; color: #f1c40f; font: 800 0.7rem/1.2 'JetBrains Mono', monospace; letter-spacing: 0.11em; text-transform: uppercase; }
  .daily-feature-kicker span:first-child { font-size: 1rem; }
  .daily-feature-date { margin-left: auto; color: var(--text-muted); font-size: 0.65rem; font-weight: 500; letter-spacing: 0.03em; }
  .daily-feature-player-area { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: fit-content; min-width: 224px; max-width: 100%; margin: 17px auto 12px; padding: 10px 20px 11px; border: 1px solid rgba(157,166,194,0.25); border-radius: 12px; background: linear-gradient(135deg, rgba(8,12,29,0.46), rgba(80,64,140,0.18)); box-shadow: inset 0 1px rgba(255,255,255,0.08), 0 8px 20px rgba(0,0,0,0.12); text-align: center; }
  .daily-feature-player-label { color: #9da6c2; font: 700 0.62rem/1 'JetBrains Mono', monospace; letter-spacing: 0.12em; margin-bottom: 7px; text-transform: uppercase; }
  .daily-feature-player { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 7px; }
  .daily-feature-content { position: relative; z-index: 1; display: grid; grid-template-columns: 154px minmax(0, 1fr); gap: 28px; align-items: center; max-width: 520px; margin: 0 auto; }
  .daily-roll-visual { display: flex; flex-direction: column; align-items: center; gap: 7px; min-width: 0; }
  .daily-roll-stage { position: relative; display: flex; width: 148px; height: 142px; align-items: center; justify-content: center; }
  .daily-roll-rarity { position: absolute; top: 1px; color: #71809e; font: 800 0.6rem/1 'JetBrains Mono', monospace; letter-spacing: 0.13em; text-transform: uppercase; }
  .daily-roll-effect { width: 126px; height: 126px; overflow: visible; }
  .daily-roll-effect .final-color-display { width: 72px; height: 72px; }
  .daily-roll-hex { color: #eef2ff; font: 800 0.82rem/1 'JetBrains Mono', monospace; letter-spacing: 0.03em; }
  .daily-feature-details { min-width: 0; padding: 5px 0 3px; border-left: 1px solid rgba(157,166,194,0.2); padding-left: 25px; }
  .daily-feature-score-label { color: #9da6c2; font: 800 0.6rem/1 'JetBrains Mono', monospace; letter-spacing: 0.13em; }
  .daily-feature-name { color: #f3f5ff; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; text-shadow: 0 0 18px rgba(139,124,246,0.3); }
  .daily-feature-score { margin-top: 7px; color: #ffd34f; font: 900 1.72rem/1 'JetBrains Mono', monospace; letter-spacing: -0.04em; text-shadow: 0 0 18px rgba(241,196,15,0.24); }
  .daily-feature-score span { color: #9da6c2; font: 800 0.65rem/1 'JetBrains Mono', monospace; letter-spacing: 0.08em; }
  .daily-feature-identity { display: flex; flex-direction: column; gap: 4px; color: #c0c9e1; font: 600 0.74rem/1.15 'JetBrains Mono', monospace; margin-top: 10px; }
  .daily-feature-identity span { color: #71809e; font-size: 0.58rem; font-weight: 800; letter-spacing: 0.12em; }
  .daily-feature-stats { display: flex; flex-direction: column; gap: 6px; color: #9da6c2; font: 600 0.65rem/1 'JetBrains Mono', monospace; margin-top: 12px; }
  .daily-feature-stats b { color: #d4dcf4; font-weight: 800; letter-spacing: 0.08em; }
  .daily-feature-conditions { position: relative; z-index: 1; border-top: 1px solid rgba(157,166,194,0.2); margin-top: 17px; padding-top: 12px; }
  .daily-feature-conditions-title { color: #9da6c2; font: 800 0.62rem/1 'JetBrains Mono', monospace; letter-spacing: 0.13em; text-transform: uppercase; margin-bottom: 9px; }
  .daily-condition-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .daily-condition { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; border: 1px solid rgba(157,166,194,0.24); border-radius: 999px; background: rgba(5,8,20,0.3); color: #d2d8e9; font: 600 0.68rem/1 'Inter', sans-serif; }
  .daily-condition > span { color: #ffd34f; }
  .daily-condition.more-condition { color: var(--text-muted); }
  .daily-feature-no-conditions { color: var(--text-muted); font-size: 0.75rem; }
  .launch-edition-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 1.45rem; height: 1.05rem; padding: 0 0.25rem; border: 1px solid rgba(161, 92, 255, 0.55); border-radius: 999px; background: linear-gradient(135deg, rgba(94, 234, 212, 0.16), rgba(161, 92, 255, 0.2)); color: #d8c7ff; font: 700 0.58rem/1 'JetBrains Mono', monospace; letter-spacing: 0.05em; vertical-align: middle; }
  .my-rank-row { display: flex; align-items: center; justify-content: space-between; background: rgba(139, 124, 246, 0.1); border: 1px dashed rgba(139, 124, 246, 0.5); padding: 12px 15px; border-radius: 12px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; margin-top: 10px; }
  .lb-actions { display: flex; align-items: center; gap: 10px; }
  .rival-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-muted); width: 44px; height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; transition: all 0.2s; line-height: 1; padding: 0; }
  .rival-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .rival-btn.unfollow { background: rgba(255, 255, 255, 0.05); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
  .rival-btn.unfollow:hover { background: rgba(239, 68, 68, 0.2); }
  @media (max-width: 560px) {
    .daily-feature { padding: 16px 14px 14px; }
    .daily-feature-player-area { min-width: 196px; padding-left: 14px; padding-right: 14px; }
    .daily-feature-content { grid-template-columns: 108px minmax(0, 1fr); gap: 13px; }
    .daily-roll-stage { width: 106px; height: 132px; }
    .daily-roll-effect { width: 112px; height: 112px; }
    .daily-roll-effect .final-color-display { width: 62px; height: 62px; }
    .daily-feature-details { padding-left: 14px; }
    .daily-feature-name { font-size: 1.08rem; }
    .daily-feature-score { font-size: 1.3rem; letter-spacing: -0.06em; }
    .daily-feature-date { font-size: 0.56rem; }
    .daily-feature-stats { gap: 7px; font-size: 0.59rem; }
    .daily-condition { font-size: 0.64rem; padding: 5px 7px; }
  }
  @media (min-width: 700px) {
    .daily-feature { width: min(650px, calc(100vw - 80px)); margin-left: 50%; margin-right: 0; transform: translateX(-50%); }
    .daily-feature-content { max-width: 570px; grid-template-columns: 172px minmax(0, 1fr); gap: 32px; }
    .daily-roll-stage { width: 166px; height: 150px; }
    .daily-roll-effect { width: 140px; height: 140px; }
    .daily-roll-effect .final-color-display { width: 78px; height: 78px; }
  }
</style>
