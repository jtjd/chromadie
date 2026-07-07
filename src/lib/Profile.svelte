<script>
  import { supabase } from './supabase';
  import { profile, walletBalance, equippedItems, session } from './stores';
  import { getNameEffect, getFrameEffect, getTitleText } from './cosmetics';
  import { getTodayString } from './utils';

  export let userId = null; // If null, viewing own profile

  let targetProfile = null;
  let targetScores = [];
  let loading = true;

  // Fetch profile data for the viewed user
  $: if (userId || $session) {
    loadProfileData(userId || $session.user.id);
  }

  async function loadProfileData(id) {
    loading = true;

    // 1. Fetch Profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('username, current_streak, longest_streak, ep_spent, lifetime_ep, equipped_cosmetics')
      .eq('id', id)
      .single();

    if (prof) {
      targetProfile = prof;

      // 2. Fetch History (Last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: scores } = await supabase
        .from('scores')
        .select('hex_code, score, rarity, roll_date, badges')
        .eq('user_id', id)
        .gte('roll_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('roll_date', { ascending: false });

      if (scores) targetScores = scores;
    }

    loading = false;
  }

  // Reactive cosmetics for the viewed user
  $: cosmetics = targetProfile?.equipped_cosmetics || {};
  $: nameEff = getNameEffect(cosmetics);
  $: frameEff = getFrameEffect(cosmetics);
  $: titleTxt = getTitleText(cosmetics);
  $: username = targetProfile?.username || 'Unknown Player';
  $: isOwnProfile = !userId || userId === $session?.user.id;

  // FIX: Calculate best roll reactively in the script
  $: bestRoll = targetScores.length > 0
    ? targetScores.reduce((max, s) => s.score > max.score ? s : max, targetScores[0])
    : null;
</script>

<div class="container">
  <div class="section-title">
    <div class="section-bar bar-purple"></div>
    <h2>{isOwnProfile ? 'Your Profile' : 'Player Profile'}</h2>
  </div>

  {#if loading}
    <div class="card"><p>Loading profile...</p></div>
  {:else if targetProfile}
    <div class="card">
      <div style="margin-bottom: 20px;">
        {#if titleTxt}
          <span class="title-chip">[{titleTxt}]</span>
        {/if}
        <span class="profile-name-frame {frameEff.cls}" style="{frameEff.style}">
          <span class="profile-username-large {nameEff.cls}" style="{nameEff.style}" data-text={username}>{username}</span>
        </span>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-value">🔥 {targetProfile.current_streak || 0}</span>
          <span class="stat-label">Current Streak</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">🏆 {targetProfile.longest_streak || 0}</span>
          <span class="stat-label">Longest Streak</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">💎 {targetProfile.lifetime_ep?.toLocaleString() || 0}</span>
          <span class="stat-label">Lifetime EP</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">💸 {targetProfile.ep_spent?.toLocaleString() || 0}</span>
          <span class="stat-label">EP Spent</span>
        </div>
      </div>
    </div>

    <!-- Restored History & Best Color Sections -->
    {#if targetScores.length > 0}
      <div class="best-row-container" style="margin-top: 20px;">
        <div class="best-box">
          <div class="badges-title">Best Roll</div>
          {#if bestRoll}
            <div class="best-color-display" style="background-color: {bestRoll.hex_code};"></div>
            <p style="margin-top: 10px; color: var(--accent-green); font-weight: bold;">{bestRoll.score.toLocaleString()} EP</p>
            <p style="font-size: 0.8rem; color: var(--text-muted);">{bestRoll.rarity}</p>
          {/if}
        </div>

        <div class="best-box">
          <div class="badges-title">Roll History (30d)</div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            {#each targetScores.slice(0, 5) as score}
              <div class="history-row">
                <div class="history-color" style="background-color: {score.hex_code};"></div>
                <div style="flex: 1; text-align: left;">
                  <div class="history-date">{new Date(score.roll_date).toLocaleDateString()}</div>
                  <div class="history-score">{score.score.toLocaleString()} EP</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <div class="card"><p>Player not found.</p></div>
  {/if}
</div>
