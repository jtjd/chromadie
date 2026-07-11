<script>
  import { supabase } from './supabase';
  import { session, followedUsers, toggleFollow, isAuthenticated } from './stores';
  import { getTodayString } from './utils';
  import { getNameEffect, getTitleText, getLbTheme } from './cosmetics';
  import { onMount, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  export let initialTab = 'today';

  let activeTab = 'today';
  let leaderboard = [];
  let loading = true;
  let myRank = null;
  let myScore = null;

  function getSourceName(tab) {
    if (tab === 'today') return 'leaderboard_view';
    if (tab === 'weekly') return 'weekly_best_leaderboard_view';
    if (tab === 'monthly') return 'monthly_best_leaderboard_view';
    if (tab === 'roll') return 'all_time_leaderboard_view';
    return 'leaderboard_view';
  }

  async function fetchLeaderboard() {
    loading = true;
    myRank = null;
    myScore = null;
    let query;

    if (activeTab === 'today') {
      const today = getTodayString();
      query = supabase
        .from('leaderboard_view')
        .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges')
        .eq('roll_date', today)
        .order('score', { ascending: false })
        .limit(10);
    } else if (activeTab === 'rivals') {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_rivals_scores');
      if (!rpcError && rpcData) {
        leaderboard = rpcData;
      } else {
        leaderboard = [];
      }
      loading = false;
      return;
    } else if (activeTab === 'weekly') {
      query = supabase
        .from('weekly_best_leaderboard_view')
        .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges')
        .order('score', { ascending: false })
        .limit(10);
    } else if (activeTab === 'monthly') {
      query = supabase
        .from('monthly_best_leaderboard_view')
        .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges')
        .order('score', { ascending: false })
        .limit(10);
    } else if (activeTab === 'roll') {
      query = supabase
        .from('all_time_leaderboard_view')
        .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges')
        .order('score', { ascending: false })
        .limit(10);
    }

    const { data, error } = await query;
    if (!error && data) {
      leaderboard = data;
      await checkMyRank();
    } else {
      leaderboard = [];
    }
    loading = false;
  }

  async function checkMyRank() {
    if (!$isAuthenticated) return;
    if (activeTab === 'roll' || activeTab === 'rivals') {
      return;
    }

    const sourceName = getSourceName(activeTab);
    let myDataQuery = supabase
      .from(sourceName)
      .select('score')
      .eq('user_id', $session.user.id);

    if (activeTab === 'today') {
      myDataQuery = myDataQuery.eq('roll_date', getTodayString());
    }

    const { data: myData } = await myDataQuery.single();

    if (myData) {
      myScore = myData.score;
      const isInTop10 = leaderboard.some(row => row.user_id === $session.user.id);
      if (!isInTop10) {
        let rankQuery = supabase
          .from(sourceName)
          .select('*', { count: 'exact', head: true })
          .gt('score', myScore);
        if (activeTab === 'today') {
          rankQuery = rankQuery.eq('roll_date', getTodayString());
        }
        const { count } = await rankQuery;
        myRank = count + 1;
      }
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

  <div class="lb-tabs">
    <button class="auth-tab" class:active={activeTab === 'today'} on:click={() => switchTab('today')}>Today</button>
    <button class="auth-tab" class:active={activeTab === 'rivals'} on:click={() => switchTab('rivals')}>Rivals</button>
    <button class="auth-tab" class:active={activeTab === 'weekly'} on:click={() => switchTab('weekly')}>Weekly</button>
    <button class="auth-tab" class:active={activeTab === 'monthly'} on:click={() => switchTab('monthly')}>Monthly</button>
    <button class="auth-tab" class:active={activeTab === 'roll'} on:click={() => switchTab('roll')}>All-Time Roll</button>
  </div>

  {#if loading}
    <div class="card"><p>Loading top rollers...</p></div>
  {:else if leaderboard.length === 0}
    <div class="card"><p>No scores yet. Roll to claim #1!</p></div>
  {:else}
    <div class="leaderboard-list">
      {#each leaderboard as row, index (row.user_id)}
        {@const nameEff = getNameEffect(row.equipped_cosmetics)}
        {@const titleTxt = getTitleText(row.equipped_cosmetics)}
        {@const lbTheme = getLbTheme(row.equipped_cosmetics)}

        <div class="leaderboard-row {lbTheme.cls}" style="{lbTheme.style}">
          <span class="lb-rank">#{index + 1}</span>
          <span class="lb-info">
            {#if titleTxt}
              <span class="title-chip">[{titleTxt}]</span>
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
            <span class="lb-sub" style="color:#666; font-size:0.75rem;">{row.hex_code} • {row.rarity}</span>
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
            <span class="lb-sub" style="color:#666; font-size:0.75rem;">Your best roll this period</span>
          </span>
          <span class="lb-score">{myScore.toLocaleString()}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lb-username-button { background: none; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; }
  .launch-edition-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 1.45rem; height: 1.05rem; padding: 0 0.25rem; border: 1px solid rgba(161, 92, 255, 0.55); border-radius: 999px; background: linear-gradient(135deg, rgba(94, 234, 212, 0.16), rgba(161, 92, 255, 0.2)); color: #d8c7ff; font: 700 0.58rem/1 'JetBrains Mono', monospace; letter-spacing: 0.05em; vertical-align: middle; }
  .my-rank-row { display: flex; align-items: center; justify-content: space-between; background: rgba(139, 124, 246, 0.1); border: 1px dashed rgba(139, 124, 246, 0.5); padding: 12px 15px; border-radius: 12px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; margin-top: 10px; }
  .lb-actions { display: flex; align-items: center; gap: 10px; }
  .rival-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-muted); width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; transition: all 0.2s; line-height: 1; padding: 0; }
  .rival-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .rival-btn.unfollow { background: rgba(255, 255, 255, 0.05); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
  .rival-btn.unfollow:hover { background: rgba(239, 68, 68, 0.2); }
</style>
