<script>
  import { supabase } from './supabase';
  import { session, profile, authUser, equippedBadges, addToast, followedUsers, toggleFollow, isAuthenticated } from './stores';
  import { getNameEffect, getFrameEffect, getTitleText, getProfileBg, getProfileBorder, getLbTheme } from './cosmetics';
  import { getRank, getRankState } from './ranks';
  import { formatCount, getTodayString } from './utils';
  import { deleteAccount } from './accountDeletion';
  import ProfileAchievementCard from './ProfileAchievementCard.svelte';
  import { afterUpdate, createEventDispatcher } from 'svelte';
  import { SvelteDate } from 'svelte/reactivity';

  export let profileUsername = null;
  export let userId = null;
  const dispatch = createEventDispatcher();

  let targetProfile = null;
  let targetScores = [];
  let allAchievements = [];
  let unlockedAchievements = {};
  let loading = true;
  let totalRolls = 0;
  let rivalsData = [];

  let selectedBadges = [];
  let editMode = false;
  let moodColorInput = '';
  let deletePhrase = '';
  let deleteLoading = false;
  let deleteError = '';
  let deleteNotice = '';
  let loadRequestId = 0;
  let activeProfileKey = null;
  let followedSignature = '';

  $: pinnedAchievements = targetProfile?.equipped_badges
    ? targetProfile.equipped_badges.map(id => allAchievements.find(a => a.id === id)).filter(Boolean)
    : [];

  $: if (targetProfile) {
    selectedBadges = targetProfile.equipped_badges ? [...targetProfile.equipped_badges] : [];
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
      if (targetProfile) {
        targetProfile = {
          ...targetProfile,
          equipped_badges: data.badges
        };
      }
    } else {
      addToast(data.error, "error");
    }
  }

  async function saveMeta() {
    const colorToSave = moodColorInput === '' ? null : moodColorInput;

    const { data, error } = await supabase.rpc('update_profile_meta', {
      p_mood_color: colorToSave
    });

    if (error) {
      addToast(error.message, "error");
    } else if (data.success) {
      addToast("Profile updated!", "success");
      if (targetProfile) {
        targetProfile = {
          ...targetProfile,
          mood_color: data.mood_color
        };
      }
      editMode = false;
    } else {
      addToast(data.error, "error");
    }
  }

  function resetProfileState() {
    targetProfile = null;
    targetScores = [];
    allAchievements = [];
    unlockedAchievements = {};
    totalRolls = 0;
    rivalsData = [];
    selectedBadges = [];
    editMode = false;
    moodColorInput = '';
    deletePhrase = '';
    deleteLoading = false;
    deleteError = '';
    deleteNotice = '';
    loading = false;
  }

  async function handleDeleteAccount() {
    if (!isOwnProfile || deleteLoading) return;

    if (deletePhrase.trim().toUpperCase() !== 'DELETE') {
      deleteError = 'Type DELETE to confirm account deletion.';
      return;
    }

    deleteLoading = true;
    deleteError = '';
    deleteNotice = '';

    const result = await deleteAccount(supabase, 'DELETE');
    deleteLoading = false;

    if (!result.success) {
      deleteError = result.error?.message || 'Could not delete the account.';
      return;
    }

    deleteNotice = result.alreadyDeleted
      ? 'The account was already removed.'
      : 'Account deleted.';

    if (result.cleanup?.missing_profile && !result.alreadyDeleted) {
      deleteNotice = 'Account deleted. Some profile data was already missing.';
    }

    dispatch('accountdeleted', {
      alreadyDeleted: result.alreadyDeleted,
      message: deleteNotice,
      cleanup: result.cleanup
    });
  }

  function syncProfileData() {
    const currentUsername = $profile?.username || $authUser?.user_metadata?.username || '';
    const nextProfileKey = profileUsername
      ? `username:${profileUsername}:${currentUsername}`
      : userId
        ? `id:${userId}`
        : $isAuthenticated
          ? `self:${$session?.user.id}:${currentUsername}`
          : null;

    if (nextProfileKey !== activeProfileKey) {
      activeProfileKey = nextProfileKey;

      if (!nextProfileKey) {
        resetProfileState();
        return;
      }

      resetProfileState();
      void loadProfileData();
      return;
    }

    if (!nextProfileKey) {
      resetProfileState();
      return;
    }

    if (!isOwnProfile) {
      followedSignature = '';
      rivalsData = [];
      return;
    }

    const nextFollowedSignature = ($followedUsers || []).join('|');
    if (nextFollowedSignature !== followedSignature) {
      followedSignature = nextFollowedSignature;
      void fetchRivals($followedUsers);
    }
  }

  afterUpdate(syncProfileData);

  async function fetchRivals(followedIds) {
    if (!isOwnProfile || followedIds.length === 0) {
        rivalsData = [];
        return;
    }
    const today = getTodayString();
    const { data, error } = await supabase
        .from('leaderboard_view')
        .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics')
        .eq('roll_date', today)
        .in('user_id', followedIds)
        .order('score', { ascending: false });

    if (error) console.error('Error fetching rivals:', error);
    rivalsData = data || [];
  }

  async function loadProfileData() {
    const requestId = ++loadRequestId;
    loading = true;
    const lookupUsername = profileUsername?.trim() || '';
    const lookupId = userId || null;
    const currentUsername = $profile?.username || $authUser?.user_metadata?.username || '';
    const viewingOwnProfile = $isAuthenticated && (
      (!lookupUsername && (!lookupId || lookupId === $session?.user.id)) ||
      (lookupUsername && currentUsername && lookupUsername === currentUsername)
    );
    let profileId = lookupId;

    const { data: prof, error: profError } = viewingOwnProfile
      ? await supabase.rpc('get_my_profile')
      : await supabase
          .from('profiles')
          .select('id, username, current_streak, longest_streak, equipped_cosmetics, equipped_badges, mood_color, best_roll_score, best_roll_hex, best_roll_rarity')
          .eq(lookupUsername ? 'username' : 'id', lookupUsername || lookupId)
          .maybeSingle();

    if (requestId !== loadRequestId) return;

    if (prof && prof.success !== false) {
      targetProfile = prof;
      profileId = prof.id || lookupId;

      if (viewingOwnProfile) {
        const { count } = await supabase
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId);
        if (requestId !== loadRequestId) return;
        totalRolls = count || 0;

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const { data: scores } = await supabase
          .from('scores')
          .select('hex_code, score, rarity, roll_date, badges')
          .eq('user_id', profileId)
          .gte('roll_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('roll_date', { ascending: false });
        if (requestId !== loadRequestId) return;

        if (scores) targetScores = scores;
      } else {
        totalRolls = 0;
        targetScores = [];
      }
    } else {
      targetProfile = null;
      targetScores = [];
      totalRolls = 0;
    }

    if (profError && !viewingOwnProfile) {
      console.error('Error loading public profile:', profError);
    }

    const { data: ach } = await supabase.from('achievements').select('*');
    if (requestId !== loadRequestId) return;
    if (ach) allAchievements = ach;

    if (viewingOwnProfile) {
      const { data: unlocked } = await supabase.from('user_achievements').select('achievement_id, count').eq('user_id', profileId);
      if (requestId !== loadRequestId) return;
      if (unlocked) {
        const map = {};
        unlocked.forEach(u => map[u.achievement_id] = u);
        unlockedAchievements = map;
      }
    } else {
      unlockedAchievements = {};
    }

    loading = false;
  }

  $: rank = isOwnProfile ? getRank(targetProfile?.lifetime_ep || 0) : null;
  $: rankState = isOwnProfile ? getRankState(targetProfile?.lifetime_ep || 0) : null;
  $: cosmetics = targetProfile?.equipped_cosmetics || {};
  $: nameEff = getNameEffect(cosmetics);
  $: frameEff = getFrameEffect(cosmetics);
  $: titleTxt = getTitleText(cosmetics);
  $: bgEff = getProfileBg(cosmetics);
  $: borderEff = getProfileBorder(cosmetics);
  $: username = targetProfile?.username || 'Unknown Player';
  $: isOwnProfile = $isAuthenticated && targetProfile?.id === $session?.user.id;
  $: bestRoll = targetScores.length > 0 ? targetScores.reduce((max, s) => s.score > max.score ? s : max, targetScores[0]) : null;
  $: isFollowed = $followedUsers.includes(targetProfile?.id);

  $: moodStyle = targetProfile?.mood_color
    ? `background-image: radial-gradient(circle at top right, ${targetProfile.mood_color}33, transparent 60%);`
    : '';

  function viewProfile(targetUsername, targetId = null) {
    dispatch('navigate', { view: 'profile', username: targetUsername, userId: targetId });
  }

  function getProgress(achId) {
    if (/^roll_\d+$/.test(achId)) {
      const target = parseInt(achId.replace('roll_', ''));
      return { current: totalRolls, target: target };
    }
    if (/^streak_\d+$/.test(achId)) {
      const target = parseInt(achId.replace('streak_', ''));
      return { current: targetProfile?.longest_streak || 0, target: target };
    }
    if (/^score_\d+[km]$/.test(achId)) {
      const target = parseInt(achId.replace('score_', '').replace('k', '000').replace('m', '000000'));
      return { current: bestRoll?.score || 0, target: target };
    }
    return null;
  }

  $: heatmapData = (() => {
    const days = [];
    const today = new SvelteDate();
    for (let i = 29; i >= 0; i--) {
      const d = new SvelteDate(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const roll = targetScores.find(s => s.roll_date === dateStr);

      let intensity = 0;
      if (roll) {
        if (roll.rarity === 'Mythic') intensity = 5;
        else if (roll.rarity === 'Anomaly') intensity = 4;
        else if (roll.rarity === 'Epic') intensity = 4;
        else if (roll.rarity === 'Rare') intensity = 3;
        else if (roll.rarity === 'Uncommon') intensity = 2;
        else intensity = 1;
      }

      days.push({ date: dateStr, score: roll?.score || 0, intensity });
    }
    return days;
  })();
</script>

<div class="container profile-container">
  <div class="section-title">
    <div class="section-bar bar-purple"></div>
    <h2>{isOwnProfile ? 'Your Profile' : 'Player Profile'}</h2>
  </div>

  {#if loading}
    <div class="card"><p>Loading profile...</p></div>
  {:else if targetProfile}
    <div class="card mood-card {borderEff.cls}" style="{moodStyle}">
      {#if bgEff.style}
        <div class="profile-bg-layer" style="{bgEff.style}"></div>
      {/if}

      <div class="profile-content-layer">
        <div class="profile-header-row">
          <div class="profile-identity">
            {#if titleTxt}
              <div class="title-row">
                <span class="title-chip">[{titleTxt}]</span>
              </div>
            {/if}
            <div class="name-row">
              <span class="profile-name-frame {frameEff.cls}" style="{frameEff.style}">
                <span class="profile-username-large {nameEff.cls}" style="{nameEff.style}" data-text={username}>{username}</span>
              </span>
            </div>
            {#if rank}
              <div class="rank-chip" style="color: {rank.color}; border-color: {rank.color === 'var(--spectrum)' ? '#a15cff' : rank.color};">
                {rank.name} Rank
              </div>
              <div class="rank-explainer">
                <div class="rank-explainer-row">
                  <span>Lifetime EP</span>
                  <span>{rankState?.lifetimeEp?.toLocaleString() || 0} EP</span>
                </div>
                <div class="progress-bar-container" aria-hidden="true">
                  <div
                    class="progress-bar-fill"
                    style={`width: ${Math.round((rankState?.progress || 0) * 100)}%; background: ${rank.color};`}
                  ></div>
                </div>
                <p class="progress-text">
                  {#if rankState?.next}
                    {rankState.next.name} at {rankState.next.min.toLocaleString()} EP
                  {:else}
                    Highest rank reached
                  {/if}
                </p>
                <p class="rank-help">
                  Rank is based on lifetime EP earned, not EP spent in the shop.
                </p>
              </div>
            {/if}
          </div>

          <div class="header-actions">
            {#if isOwnProfile && !editMode}
              <button type="button" class="edit-btn" on:click={() => editMode = true}>🎨 Edit Mood</button>
            {/if}
            {#if !isOwnProfile && $isAuthenticated}
              <button
                type="button"
                class="rival-action-btn {isFollowed ? 'unfollow' : 'follow'}"
                aria-label={isFollowed ? `Remove ${username} from rivals` : `Add ${username} as a rival`}
                on:click={() => toggleFollow(targetProfile?.id)}
              >
                {#if isFollowed}✖ Unfollow{:else}+ Add Rival{/if}
              </button>
            {/if}
          </div>
        </div>

        {#if editMode}
          <div class="profile-meta-section">
            <div class="mood-picker">
              <span class="mood-label">Mood Color (Recent 30):</span>
              <div class="mood-options-scroll">
                <button type="button" class="mood-clear" on:click={() => moodColorInput = ''}>Clear</button>
                {#each targetScores as score (score.roll_date)}
                  <button
                    type="button"
                    class="mood-swatch {moodColorInput === score.hex_code ? 'selected' : ''}"
                    style="background-color: {score.hex_code};"
                    on:click={() => moodColorInput = score.hex_code}
                    title={score.hex_code}
                  ></button>
                {/each}
              </div>
            </div>

            <div class="edit-actions">
              <button type="button" class="save-btn" on:click={saveMeta}>Save</button>
              <button type="button" class="cancel-btn" on:click={() => { editMode = false; moodColorInput = targetProfile?.mood_color || ''; }}>Cancel</button>
            </div>
          </div>
        {/if}

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
          {#if isOwnProfile}
            <div class="stat-box">
              <span class="stat-value">💎 {targetProfile.lifetime_ep?.toLocaleString() || 0}</span>
              <span class="stat-label">Lifetime EP</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">💸 {targetProfile.ep_spent?.toLocaleString() || 0}</span>
              <span class="stat-label">EP Spent</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if targetScores.length > 0 || isOwnProfile}
      <div class="best-row-container" style="margin-top: 20px;">
        <div class="best-box">
          <div class="badges-title">Best Roll (30d)</div>
          {#if bestRoll}
            <div class="best-color-display" style="background-color: {bestRoll.hex_code};"></div>
            <p style="margin-top: 10px; color: var(--accent-green); font-weight: bold;">{bestRoll.score.toLocaleString()} EP</p>
            <p style="font-size: 0.8rem; color: var(--text-muted);">{bestRoll.rarity}</p>
          {:else}
            <p style="font-size: 0.8rem; color: var(--text-muted);">No rolls yet.</p>
          {/if}
        </div>

        <div class="best-box">
          <div class="badges-title">Activity (30d)</div>
          <div class="heatmap-grid">
            {#each heatmapData as day (day.date)}
              <div class="heatmap-cell intensity-{day.intensity}" title="{day.date}: {day.score.toLocaleString()} EP"></div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    {#if isOwnProfile}
      <div class="card" style="margin-top: 20px;">
        <div class="section-title">
          <div class="section-bar bar-purple"></div>
          <h2>Your Rivals Today</h2>
        </div>
        {#if rivalsData.length > 0}
          <div class="rivals-list">
            {#each rivalsData as rival (rival.user_id)}
              {@const rivalNameEff = getNameEffect(rival.equipped_cosmetics)}
              {@const rivalTitleTxt = getTitleText(rival.equipped_cosmetics)}
              {@const rivalLbTheme = getLbTheme(rival.equipped_cosmetics)}

              <div class="rival-row {rivalLbTheme.cls}" style="{rivalLbTheme.style}">
                <button type="button" class="rival-profile-btn lb-username" on:click={() => viewProfile(rival.username, rival.user_id)}>
                  {#if rivalTitleTxt}
                    <span class="title-chip">[{rivalTitleTxt}]</span>
                  {/if}
                  <span class="lb-username {rivalNameEff.cls}" style="{rivalNameEff.style}" data-text={rival.username}>
                    {rival.username}
                  </span>
                </button>
                <span class="rival-score">{rival.score.toLocaleString()}</span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-rivals">
            <p>You haven't added any rivals yet.</p>
            <p class="subtext">Visit other player profiles or use the <strong>+</strong> button on the leaderboard to start tracking your competition.</p>
          </div>
        {/if}
      </div>
    {/if}

    {#if isOwnProfile}
      <div class="card" style="margin-top: 20px;">
        <div class="section-title">
          <div class="section-bar bar-gold"></div>
          <h2>Achievements ({Object.keys(unlockedAchievements).length}/{allAchievements.length})</h2>
        </div>

        <div style="margin-bottom: 15px; text-align: left;">
          <button type="button" class="save-btn" style="width: auto; padding: 6px 16px;" on:click={saveBadges}>
            Save Pinned Badges ({selectedBadges.length}/3)
          </button>
        </div>

        <div class="achievements-grid">
          {#each allAchievements as ach (ach.id)}
            {@const isUnlocked = unlockedAchievements[ach.id] !== undefined}
            {@const achCount = isUnlocked ? unlockedAchievements[ach.id].count : 0}
            {@const isSelected = selectedBadges.includes(ach.id)}
            {@const progress = !isUnlocked ? getProgress(ach.id) : null}
            <ProfileAchievementCard
              ach={ach}
              isUnlocked={isUnlocked}
              achCount={achCount}
              isSelected={isSelected}
              isOwnProfile={isOwnProfile}
              progress={progress}
              formatCount={formatCount}
              onToggle={toggleBadge}
            />
          {/each}
        </div>
      </div>

      <div class="card danger-zone-card" style="margin-top: 20px;">
        <div class="section-title">
          <div class="section-bar bar-mono"></div>
          <h2>Danger Zone</h2>
        </div>
        <p class="danger-copy">
          Permanently delete your account, profile, scores, inventory, rivals, pinned achievements, and other app-owned account data.
        </p>
        <ul class="danger-list">
          <li>You will be signed out.</li>
          <li>Local account caches will be cleared by the deletion flow.</li>
          <li>This cannot be undone.</li>
        </ul>

        <p class="account-links">
          Review the <a href="/privacy">Privacy Policy</a> or <a href="/how-to-play">How to Play</a> before deleting.
        </p>

        <label class="delete-field" for="delete-confirm-input">
          <span class="field-label">Type DELETE to continue</span>
          <input
            id="delete-confirm-input"
            class="input-field"
            bind:value={deletePhrase}
            autocomplete="off"
            spellcheck="false"
            placeholder="DELETE"
          />
        </label>

        {#if deleteError}
          <p class="delete-error" role="alert">{deleteError}</p>
        {/if}
        {#if deleteNotice}
          <p class="delete-notice" role="status" aria-live="polite">{deleteNotice}</p>
        {/if}

        <button
          type="button"
          class="delete-account-btn"
          disabled={deleteLoading || deletePhrase.trim().toUpperCase() !== 'DELETE'}
          on:click={handleDeleteAccount}
        >
          {deleteLoading ? 'Deleting account...' : 'Delete account permanently'}
        </button>
      </div>
    {:else}
      <div class="card" style="margin-top: 20px;">
        <p class="info-text">Achievements are private. Pinned achievements and progress highlights are shown above.</p>
      </div>
    {/if}
  {:else}
    <div class="card"><p>Player not found.</p></div>
  {/if}
</div>

<style>
  .mood-card { position: relative; overflow: hidden; transition: background-image 0.5s ease; }
  .profile-bg-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; opacity: 0.6; }
  .profile-content-layer { position: relative; z-index: 1; }
  .profile-header-row { display: flex; justify-content: flex-start; align-items: flex-start; margin-bottom: 18px; gap: 18px; }
  .profile-identity { display: flex; flex: 0 1 auto; min-width: 0; flex-direction: column; gap: 6px; align-items: center; text-align: center; }
  .title-row { display: flex; align-items: center; justify-content: center; min-height: 18px; width: 100%; }
  .name-row { display: flex; align-items: center; justify-content: center; width: 100%; }
  .profile-name-frame { display: inline-flex; align-items: center; line-height: 1; }
  .profile-username-large { line-height: 1; }
  .title-chip { margin-right: 0; }
  .rank-chip { margin-top: 1px; align-self: center; }
  .header-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; padding-top: 2px; flex: 0 0 auto; margin-left: auto; }

  .rank-chip {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 3px 8px;
    border: 1px solid;
    border-radius: 4px;
    width: fit-content;
    background: rgba(0,0,0,0.3);
  }

  .rank-explainer {
    display: grid;
    gap: 6px;
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px solid var(--card-border);
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.22);
    max-width: 320px;
  }

  .rank-explainer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .rank-explainer-row span:last-child {
    color: #fff;
    font-weight: 700;
  }

  .rank-help {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.76rem;
    line-height: 1.45;
  }

  .edit-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-muted); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; white-space: nowrap; }
  .edit-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

  /* NEW: Prominent Rival Action Button */
  .rival-action-btn {
    background: var(--accent-purple);
    color: #fff;
    border: 1px solid transparent;
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .rival-action-btn:hover { background: #7c3aed; }
  .rival-action-btn.unfollow { background: rgba(255, 255, 255, 0.05); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
  .rival-action-btn.unfollow:hover { background: rgba(239, 68, 68, 0.2); }
  .edit-btn:focus-visible,
  .rival-action-btn:focus-visible,
  .mood-clear:focus-visible,
  .mood-swatch:focus-visible,
  .save-btn:focus-visible,
  .cancel-btn:focus-visible,
  .rival-profile-btn:focus-visible {
    outline: 2px solid var(--accent-purple);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 124, 246, 0.18);
  }

  .profile-meta-section { margin-bottom: 20px; text-align: left; }
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

  .heatmap-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
    margin-top: 10px;
  }
  .heatmap-cell {
    aspect-ratio: 1;
    border-radius: 2px;
    background-color: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .heatmap-cell.intensity-1 { background-color: rgba(16, 185, 129, 0.2); }
  .heatmap-cell.intensity-2 { background-color: rgba(16, 185, 129, 0.4); }
  .heatmap-cell.intensity-3 { background-color: rgba(59, 130, 246, 0.5); }
  .heatmap-cell.intensity-4 { background-color: rgba(168, 85, 247, 0.6); }
  .heatmap-cell.intensity-5 { background-color: rgba(241, 196, 15, 0.8); }

  .progress-bar-container {
    width: 100%;
    height: 5px;
    background: rgba(255,255,255,0.1);
    border-radius: 999px;
    margin-top: 6px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background: var(--accent-purple);
    border-radius: 999px;
    transition: width 0.3s ease;
  }
  .progress-text {
    font-size: 0.68rem;
    color: var(--text-muted);
    margin-top: 4px;
    font-family: 'JetBrains Mono', monospace;
  }

  .ach-icon { position: relative; font-size: 1.2rem; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 10px; flex-shrink: 0; }
  .mastery-count {
    position: absolute;
    top: -6px;
    right: -6px;
    background: var(--accent-purple);
    color: #fff;
    font-size: 0.58rem;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
  }

  .rivals-list { display: flex; flex-direction: column; gap: 8px; }
  .rival-row { display: flex; justify-content: space-between; align-items: center; gap: 10px 12px; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--card-border); flex-wrap: wrap; }
  .rival-row.lb-glow-theme { background: rgba(59, 130, 246, 0.14); border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 0 15px rgba(59, 130, 246, 0.22), inset 0 0 8px rgba(59, 130, 246, 0.12); }
  .rival-row.lb-gold-theme { background: linear-gradient(90deg, rgba(191, 149, 63, 0.9), rgba(252, 246, 186, 0.95), rgba(179, 135, 40, 0.92), rgba(251, 245, 183, 0.95)); border-color: rgba(255, 215, 0, 0.8); box-shadow: 0 0 15px rgba(255, 215, 0, 0.22); }
  .rival-row.lb-gold-theme .lb-username,
  .rival-row.lb-gold-theme .rival-score { color: #1a1a1a !important; -webkit-text-fill-color: #1a1a1a; text-shadow: 0 1px 1px rgba(255,255,255,0.4); }
  .rival-row.lb-spectrum-theme,
  .rival-row.lb-chroma-theme { border: 2px solid transparent; background-image: linear-gradient(rgba(10, 10, 13, 0.85), rgba(10, 10, 13, 0.85)), var(--spectrum); background-origin: border-box; background-clip: padding-box, border-box; background-size: 100% 100%, 300% 100%; animation: spectrumFlow 3s linear infinite; box-shadow: 0 0 15px rgba(168, 85, 247, 0.28); }
  .rival-profile-btn { background: none; border: none; padding: 0; cursor: pointer; text-align: left; min-width: 0; }

  /* NEW: Empty Rivals State */
  .empty-rivals { text-align: center; padding: 15px; color: var(--text-muted); }
  .empty-rivals p { margin-bottom: 5px; }
  .empty-rivals .subtext { font-size: 0.8rem; opacity: 0.8; }

  .danger-zone-card {
    border-color: rgba(239, 68, 68, 0.2);
    background:
      radial-gradient(circle at top right, rgba(239, 68, 68, 0.08), transparent 46%),
      rgba(255,255,255,0.03);
  }

  .danger-copy,
  .danger-list {
    margin: 0 0 0.9rem;
    color: var(--text-muted);
    line-height: 1.6;
    text-align: left;
  }

  .account-links {
    margin: 0 0 1rem;
    color: var(--text-muted);
    text-align: left;
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .account-links a {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .danger-list {
    padding-left: 1.1rem;
    display: grid;
    gap: 0.35rem;
  }

  .delete-field {
    display: grid;
    gap: 0.45rem;
    text-align: left;
    margin-bottom: 1rem;
  }

  .delete-error {
    margin: 0 0 0.75rem;
    color: #fca5a5;
    text-align: left;
  }

  .delete-notice {
    margin: 0 0 0.75rem;
    color: #6ee787;
    text-align: left;
  }

  .delete-account-btn {
    width: 100%;
    min-height: 48px;
    border-radius: 12px;
    border: 1px solid rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.12);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
  }

  .delete-account-btn:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.18);
    transform: translateY(-1px);
  }

  .delete-account-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (max-width: 768px) {
    .best-row-container { flex-direction: column; }
    .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .achievements-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  }

  @media (max-width: 600px) {
    .profile-header-row { flex-direction: column; align-items: stretch; gap: 12px; }
    .header-actions { align-items: flex-start; padding-top: 0; width: 100%; }
    .profile-identity { align-items: center; text-align: center; width: 100%; }
    .profile-name-frame { max-width: 100%; }
    .profile-username-large { font-size: 2rem; max-width: 100%; overflow-wrap: anywhere; }
    .rank-chip { align-self: center; }
    .mood-options-scroll { max-height: none; }
    .edit-actions { flex-direction: column; }
    .save-btn,
    .cancel-btn { width: 100%; }
    .rival-row { align-items: flex-start; }
    .rival-profile-btn { width: 100%; }
    .rival-score { width: 100%; text-align: right; }
    .best-row-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      width: 100%;
    }
    .best-box {
      min-width: 0;
      width: 100%;
    }
    .stats-grid { grid-template-columns: 1fr; }
    .achievements-grid { grid-template-columns: 1fr; }
  }
</style>
