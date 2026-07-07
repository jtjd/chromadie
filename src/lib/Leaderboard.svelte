<script>
  import { supabase } from './supabase';
  import { shopItems, selectedUserId } from './stores';
  import { escapeHtml, getTodayString } from './utils';
  import { getNameEffect, getTitleText } from './cosmetics';
  import { onMount, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let leaderboard = [];
  let loading = true;

  onMount(async () => {
    const today = getTodayString();
    const { data, error } = await supabase
      .from('leaderboard_view')
      .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics')
      .eq('roll_date', today)
      .order('score', { ascending: false })
      .limit(10);

    if (!error && data) {
      leaderboard = data;
    }
    loading = false;
  });

  function viewProfile(userId) {
    selectedUserId.set(userId);
    dispatch('navigate', 'profile');
  }
</script>

<div class="container">
  <div class="section-title">
    <div class="section-bar bar-spectrum"></div>
    <h2>Daily Leaderboard</h2>
  </div>

  {#if loading}
    <div class="card"><p>Loading today's top rollers...</p></div>
  {:else if leaderboard.length === 0}
    <div class="card"><p>No scores yet today. Roll to claim #1!</p></div>
  {:else}
    <div class="leaderboard-list">
      {#each leaderboard as row, index}
        {@const nameEff = getNameEffect(row.equipped_cosmetics)}
        {@const titleTxt = getTitleText(row.equipped_cosmetics)}
        <div class="leaderboard-row">
          <span class="lb-rank">#{index + 1}</span>
          <span class="lb-info">
            {#if titleTxt}
              <span class="title-chip">[{titleTxt}]</span>
            {/if}
            <!-- FIX: Use button instead of anchor to avoid full page reload -->
            <button class="lb-username-button" on:click={() => viewProfile(row.user_id)}>
              <span class="lb-username {nameEff.cls}" style="{nameEff.style}" data-text={row.username}>
                {escapeHtml(row.username)}
              </span>
            </button>
            {#if row.current_streak > 0}
              <span class="streak-chip">🔥 {row.current_streak}</span>
            {/if}
            <br>
            <span class="lb-sub" style="color:#666; font-size:0.75rem;">{row.hex_code} • {row.rarity}</span>
          </span>
          <span class="lb-score">{row.score.toLocaleString()}</span>
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
