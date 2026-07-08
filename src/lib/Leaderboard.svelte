<script>
  import { supabase } from './supabase';
  import { shopItems, selectedUserId } from './stores';
  import { escapeHtml, getTodayString } from './utils';
  import { getNameEffect, getTitleText, getLbTheme } from './cosmetics';
  import { onMount, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let activeTab = 'today';
  let leaderboard = [];
  let loading = true;

  async function fetchLeaderboard() {
    loading = true;
    let query;

    if (activeTab === 'today') {
      const today = getTodayString();
      query = supabase
        .from('leaderboard_view')
        .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics')
        .eq('roll_date', today)
        .order('score', { ascending: false })
        .limit(10);
    } else if (activeTab === 'roll') {
      query = supabase
        .from('all_time_leaderboard_view')
        .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics')
        .order('score', { ascending: false })
        .limit(10);
    } else if (activeTab === 'ep') {
      query = supabase
        .from('all_time_leaderboard_view')
        .select('user_id, username, current_streak, equipped_cosmetics, lifetime_ep')
        .order('lifetime_ep', { ascending: false })
        .limit(10);
    }

    const { data, error } = await query;
    if (!error && data) {
      leaderboard = data;
    } else {
      leaderboard = [];
    }
    loading = false;
  }

  function switchTab(tab) {
    if (tab === activeTab) return;
    activeTab = tab;
    fetchLeaderboard();
  }

  function viewProfile(userId) {
    selectedUserId.set(userId);
    dispatch('navigate', 'profile');
  }

  onMount(fetchLeaderboard);
</script>

<div class="container">
  <div class="section-title">
    <div class="section-bar bar-spectrum"></div>
    <h2>Leaderboard</h2>
  </div>

  <div class="lb-tabs">
    <button class="auth-tab" class:active={activeTab === 'today'} on:click={() => switchTab('today')}>Today</button>
    <button class="auth-tab" class:active={activeTab === 'roll'} on:click={() => switchTab('roll')}>All-Time Roll</button>
    <button class="auth-tab" class:active={activeTab === 'ep'} on:click={() => switchTab('ep')}>All-Time EP</button>
  </div>

  {#if loading}
    <div class="card"><p>Loading top rollers...</p></div>
  {:else if leaderboard.length === 0}
    <div class="card"><p>No scores yet. Roll to claim #1!</p></div>
  {:else}
    <div class="leaderboard-list">
      {#each leaderboard as row, index}
        {@const nameEff = getNameEffect(row.equipped_cosmetics)}
        {@const titleTxt = getTitleText(row.equipped_cosmetics)}
        {@const lbTheme = getLbTheme(row.equipped_cosmetics)}

        <!-- FIX: Applied lbTheme class and style to the row -->
        <div class="leaderboard-row {lbTheme.cls}" style="{lbTheme.style}">
          <span class="lb-rank">#{index + 1}</span>
          <span class="lb-info">
            {#if titleTxt}
              <span class="title-chip">[{titleTxt}]</span>
            {/if}
            <button class="lb-username-button" on:click={() => viewProfile(row.user_id)}>
              <span class="lb-username {nameEff.cls}" style="{nameEff.style}" data-text={row.username}>
                {escapeHtml(row.username)}
              </span>
            </button>
            {#if row.current_streak > 0}
              <span class="streak-chip">🔥 {row.current_streak}</span>
            {/if}

            {#if activeTab !== 'ep'}
              <br>
              <span class="lb-sub" style="color:#666; font-size:0.75rem;">{row.hex_code} • {row.rarity}</span>
            {/if}
          </span>

          {#if activeTab === 'ep'}
            <span class="lb-score">{row.lifetime_ep.toLocaleString()} EP</span>
          {:else}
            <span class="lb-score">{row.score.toLocaleString()}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .lb-username-button {
    background: none; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center;
  }
</style>
