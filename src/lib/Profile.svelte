<script>
  import { supabase } from './supabase';
  import { session, equippedBadges, addToast } from './stores';
  import { getNameEffect, getFrameEffect, getTitleText, getProfileBg } from './cosmetics';

  export let userId = null;

  let targetProfile = null;
  let targetScores = [];
  let allAchievements = [];
  let unlockedAchievements = [];
  let loading = true;

  let selectedBadges = [];
  let editMode = false;
  let bioInput = '';
  let moodColorInput = '';

  $: pinnedAchievements = targetProfile?.equipped_badges
    ? targetProfile.equipped_badges.map(id => allAchievements.find(a => a.id === id)).filter(Boolean)
    : [];

  $: if (targetProfile) {
    selectedBadges = targetProfile.equipped_badges ? [...targetProfile.equipped_badges] : [];
    bioInput = targetProfile.bio || '';
    moodColorInput = targetProfile.mood_color || '';
  }

  function toggleBadge(id) {
    if (!isOwnProfile) return;
    if (selectedBadges.includes(id)) {
      selectedBadges = selectedBadges.filter(b => b !== id);
    } else if (selectedBadges.length < 3) {
      selectedBadges = [...selectedBadges, id];
    } else {
      addToast("You can only pin 3 achievements.", "error");
    }
  }

  async function saveBadges() {
    const { data, error } = await supabase.rpc('equip_badges', { p_badge_ids: selectedBadges });
    if (error) addToast("Error saving badges.");
    else if (data.success) {
      addToast("Pinned badges updated!", "success");
      equippedBadges.set(data.badges);
      if (targetProfile) targetProfile.equipped_badges = data.badges;
    } else {
      addToast(data.error, "error");
    }
  }

  async function saveMeta() {
    const colorToSave = moodColorInput === '' ? null : moodColorInput;
    const bioToSave = bioInput === '' ? null : bioInput;

    const { data, error } = await supabase.rpc('update_profile_meta', {
      p_bio: bioToSave,
      p_mood_color: colorToSave
    });

    if (error) {
      addToast(error.message, "error");
    } else if (data.success) {
      addToast("Profile updated!", "success");
      if (targetProfile) {
        targetProfile.bio = data.bio;
        targetProfile.mood_color = data.mood_color;
      }
      editMode = false;
    } else {
      addToast(data.error, "error");
    }
  }

  $: if (userId || $session) {
    loadProfileData(userId || $session.user.id);
  }

  async function loadProfileData(id) {
    loading = true;

    const { data: prof } = await supabase
      .from('profiles')
      .select('username, current_streak, longest_streak, ep_spent, lifetime_ep, equipped_cosmetics, equipped_badges, bio, mood_color')
      .eq('id', id)
      .single();

    if (prof) {
      targetProfile = prof;

      // FIX: Calculate date string directly to avoid Svelte 5 Date reactivity warning
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data: scores } = await supabase
        .from('scores')
        .select('hex_code, score, rarity, roll_date, badges')
        .eq('user_id', id)
        .gte('roll_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('roll_date', { ascending: false });

      if (scores) targetScores = scores;
    }

    const { data: ach } = await supabase.from('achievements').select('*');
    if (ach) allAchievements = ach;

    const { data: unlocked } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', id);
    if (unlocked) unlockedAchievements = unlocked.map(u => u.achievement_id);

    loading = false;
  }

  $: cosmetics = targetProfile?.equipped_cosmetics || {};
  $: nameEff = getNameEffect(cosmetics);
  $: frameEff = getFrameEffect(cosmetics);
  $: titleTxt = getTitleText(cosmetics);
  $: bgEff = getProfileBg(cosmetics);
  $: username = targetProfile?.username || 'Unknown Player';
  $: isOwnProfile = !userId || userId === $session?.user.id;
  $: bestRoll = targetScores.length > 0 ? targetScores.reduce((max, s) => s.score > max.score ? s : max, targetScores[0]) : null;

  $: moodStyle = targetProfile?.mood_color
    ? `background-image: radial-gradient(circle at top right, ${targetProfile.mood_color}33, transparent 60%);`
    : '';
</script>

<div class="container profile-container">
  <div class="section-title">
    <div class="section-bar bar-purple"></div>
    <h2>{isOwnProfile ? 'Your Profile' : 'Player Profile'}</h2>
  </div>

  {#if loading}
    <div class="card"><p>Loading profile...</p></div>
  {:else if targetProfile}
    <div class="card mood-card" style="{moodStyle}">
      {#if bgEff.style}
        <div class="profile-bg-layer" style="{bgEff.style}"></div>
      {/if}

      <div class="profile-content-layer">
        <div class="profile-header-row">
          <div class="profile-identity">
            {#if titleTxt}
              <span class="title-chip">[{titleTxt}]</span>
            {/if}
            <span class="profile-name-frame {frameEff.cls}" style="{frameEff.style}">
              <span class="profile-username-large {nameEff.cls}" style="{nameEff.style}" data-text={username}>{username}</span>
            </span>
          </div>

          {#if isOwnProfile && !editMode}
            <button class="edit-btn" on:click={() => editMode = true}>✏️ Edit</button>
          {/if}
        </div>

        <div class="bio-section">
          {#if editMode}
            <textarea class="bio-input" bind:value={bioInput} placeholder="Write a short bio (max 140 chars)..." maxlength="140"></textarea>

            <div class="mood-picker">
              <span class="mood-label">Mood Color (Recent 30):</span>
              <div class="mood-options-scroll">
                <button class="mood-clear" on:click={() => moodColorInput = ''}>Clear</button>
                {#each targetScores as score (score.roll_date)}
                  <button
                    class="mood-swatch {moodColorInput === score.hex_code ? 'selected' : ''}"
                    style="background-color: {score.hex_code};"
                    on:click={() => moodColorInput = score.hex_code}
                    title={score.hex_code}
                  ></button>
                {/each}
              </div>
            </div>

            <div class="edit-actions">
              <button class="save-btn" on:click={saveMeta}>Save</button>
              <button class="cancel-btn" on:click={() => { editMode = false; bioInput = targetProfile?.bio || ''; moodColorInput = targetProfile?.mood_color || ''; }}>Cancel</button>
            </div>
          {:else}
            <p class="bio-text">{targetProfile.bio || (isOwnProfile ? 'No bio set. Click edit to add one!' : 'This player has no bio.')}</p>
          {/if}
        </div>

        {#if pinnedAchievements.length > 0}
          <div class="pinned-achievements-section">
            <div class="pinned-title">Pinned Achievements</div>
            <div class="pinned-list">
              {#each pinnedAchievements as ach (ach.id)}
                <div class="pinned-item">
                  <span class="pinned-icon">{ach.icon}</span>
                  <div class="pinned-info">
                    <span class="pinned-name">{ach.name}</span>
                    <span class="pinned-desc">{ach.description}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

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
    </div>

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
            {#each targetScores.slice(0, 5) as score (score.roll_date)}
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

    <div class="card" style="margin-top: 20px;">
      <div class="section-title">
        <div class="section-bar bar-gold"></div>
        <h2>Achievements ({unlockedAchievements.length}/{allAchievements.length})</h2>
      </div>

      {#if isOwnProfile}
        <div style="margin-bottom: 15px; text-align: left;">
          <button class="save-btn" style="width: auto; padding: 6px 16px;" on:click={saveBadges}>
            Save Pinned Badges ({selectedBadges.length}/3)
          </button>
        </div>
      {/if}

      <div class="achievements-grid">
        {#each allAchievements as ach (ach.id)}
          {@const isUnlocked = unlockedAchievements.includes(ach.id)}
          {@const isSelected = selectedBadges.includes(ach.id)}
          <div
            class="achievement-box {isUnlocked ? 'unlocked' : 'locked'}"
            class:selected={isSelected}
            on:click={() => isUnlocked && toggleBadge(ach.id)}
            on:keydown={(e) => e.key === 'Enter' && isUnlocked && toggleBadge(ach.id)}
            role="button"
            tabindex="0"
            style="cursor: {isUnlocked && isOwnProfile ? 'pointer' : 'default'}; border-color: {isSelected ? 'var(--accent-purple)' : ''};"
          >
            <div class="ach-icon">{isUnlocked ? ach.icon : '🔒'}</div>
            <div class="ach-info">
              <div class="ach-name">{ach.name}</div>
              <div class="ach-desc">{ach.description}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="card"><p>Player not found.</p></div>
  {/if}
</div>

<style>
  .mood-card { position: relative; overflow: hidden; transition: background-image 0.5s ease; }
  .profile-bg-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; opacity: 0.6; }
  .profile-content-layer { position: relative; z-index: 1; }
  .profile-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; gap: 15px; }
  .profile-identity { display: flex; flex-direction: column; gap: 5px; }
  .edit-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-muted); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; white-space: nowrap; }
  .edit-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .bio-section { min-height: 60px; margin-bottom: 20px; text-align: left; }
  .bio-text { font-size: 0.9rem; color: var(--text-main); line-height: 1.4; opacity: 0.9; }
  .bio-input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--card-border); border-radius: 8px; padding: 10px; color: #fff; font-family: 'Inter', sans-serif; font-size: 0.9rem; resize: vertical; min-height: 60px; box-sizing: border-box; outline: none; transition: border 0.2s; }
  .bio-input:focus { border-color: var(--accent-purple); }
  .mood-picker { margin-top: 15px; text-align: left; }
  .mood-label { font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 8px; }
  .mood-options-scroll { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; max-height: 80px; overflow-y: auto; padding: 5px; border: 1px solid var(--card-border); border-radius: 8px; background: rgba(0,0,0,0.2); }
  .mood-clear { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-muted); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; flex-shrink: 0; }
  .mood-swatch { width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.1s, border 0.2s; flex-shrink: 0; }
  .mood-swatch:hover { transform: scale(1.1); }
  .mood-swatch.selected { border-color: #fff; box-shadow: 0 0 8px rgba(255,255,255,0.3); }
  .pinned-achievements-section { margin-bottom: 20px; background: rgba(0,0,0,0.2); border: 1px solid var(--card-border); border-radius: 12px; padding: 15px; text-align: left; }
  .pinned-title { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px; }
  .pinned-list { display: flex; flex-direction: column; gap: 10px; }
  .pinned-item { display: flex; align-items: center; gap: 12px; }
  .pinned-icon { font-size: 1.4rem; width: 36px; text-align: center; flex-shrink: 0; }
  .pinned-info { display: flex; flex-direction: column; gap: 2px; }
  .pinned-name { font-weight: 600; font-size: 0.9rem; color: #fff; }
  .pinned-desc { font-size: 0.75rem; color: var(--text-muted); }
  .edit-actions { display: flex; gap: 10px; margin-top: 15px; }
  .save-btn { background: var(--accent-purple); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; transition: background 0.2s; }
  .save-btn:hover { background: #7c3aed; }
  .cancel-btn { background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--card-border); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; width: 100%; }
  .achievement-box.selected { box-shadow: 0 0 12px rgba(139, 124, 246, 0.4); }
</style>
