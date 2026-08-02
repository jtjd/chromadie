<script>
  import { supabase } from './supabase';
  import { session, profile, authUser, equippedBadges, addToast, followedUsers, toggleFollow, isAuthenticated } from './stores';
  import { getFrameEffect, getTitleText, getStaffTitleText, getProfileBg, getProfileBorder, getLbTheme } from './cosmetics';
  import { getRank, getRankState } from './ranks';
  import { formatCount, getTodayString } from './utils';
  import { deleteAccount } from './accountDeletion';
  import ProfileAchievementCard from './ProfileAchievementCard.svelte';
  import { isOwnProfileTarget } from './profileContract';
  import { loadProfileContext } from './profileData';
  import { afterUpdate, createEventDispatcher } from 'svelte';
  import { SvelteDate } from 'svelte/reactivity';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';

  export let profileUsername = null;
  export let userId = null;
  const dispatch = createEventDispatcher();
  const NON_PINNABLE_BADGE_IDS = new Set(['launch_edition']);
  const SCORE_ACHIEVEMENT_TARGETS = Object.freeze({
    score_50k: 50_000,
    score_100k: 100_000,
    score_200k: 200_000,
    score_1_5m: 1_500_000
  });

  let targetProfile = null;
  let targetScores = [];
  let allAchievements = [];
  let unlockedAchievements = {};
  let loading = true;
  let totalRolls = 0;
  let rivalsData = [];
  let loadError = '';
  let dataWarning = '';

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
    selectedBadges = targetProfile.equipped_badges
      ? targetProfile.equipped_badges.filter(id => !NON_PINNABLE_BADGE_IDS.has(id))
      : [];
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
    loadError = '';
    dataWarning = '';
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
        .select('user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges, is_staff, rank')
        .eq('roll_date', today)
        .in('user_id', followedIds)
        .order('score', { ascending: false })
        .order('user_id', { ascending: true });

    if (error) console.error('Error fetching rivals:', error);
    rivalsData = data || [];
  }

  async function loadProfileData() {
    const requestId = ++loadRequestId;
    loading = true;
    loadError = '';
    dataWarning = '';
    const currentUsername = $profile?.username || $authUser?.user_metadata?.username || '';
    const context = await loadProfileContext({
      supabaseClient: supabase,
      isAuthenticated: $isAuthenticated,
      sessionUserId: $session?.user?.id,
      currentUsername,
      profileUsername,
      userId
    });
    if (requestId !== loadRequestId) return;

    targetProfile = context.targetProfile;
    targetScores = context.targetScores;
    allAchievements = context.allAchievements;
    unlockedAchievements = context.unlockedAchievements;
    totalRolls = context.totalRolls;
    loadError = context.loadError;
    dataWarning = context.dataWarning;

    loading = false;
  }

  $: rank = targetProfile ? getRank(targetProfile.lifetime_ep || 0) : null;
  $: rankState = targetProfile ? getRankState(targetProfile.lifetime_ep || 0) : null;
  $: cosmetics = targetProfile?.equipped_cosmetics || {};
  $: nameRendererKey = String(cosmetics?.name_effect || '');
  $: frameEff = getFrameEffect(cosmetics);
  $: titleTxt = getTitleText(cosmetics);
  $: staffTitleTxt = getStaffTitleText(targetProfile?.is_staff);
  $: bgEff = getProfileBg(cosmetics);
  $: borderEff = getProfileBorder(cosmetics);
  $: username = targetProfile?.username || 'Unknown Player';
  $: isOwnProfile = isOwnProfileTarget({
    isAuthenticated: $isAuthenticated,
    sessionUserId: $session?.user?.id,
    profileId: targetProfile?.id
  });
  $: bestRoll = targetScores.length > 0 ? targetScores.reduce((max, s) => s.score > max.score ? s : max, targetScores[0]) : null;
  $: profileBestRoll = targetProfile?.best_roll_score
    ? {
        score: targetProfile.best_roll_score,
        hex_code: targetProfile.best_roll_hex,
        rarity: targetProfile.best_roll_rarity
      }
    : null;
  $: displayBestRoll = profileBestRoll || bestRoll;
  $: recentRollCount = targetScores.length;
  $: nameTodayColor = targetScores[0]?.hex_code || targetProfile?.mood_color || '#8B7CF6';
  $: nameRendererRecentColors = targetScores.slice(0, 6).map(score => score?.hex_code).filter(Boolean);
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
    if (SCORE_ACHIEVEMENT_TARGETS[achId]) {
      return {
        current: Number(displayBestRoll?.score) || 0,
        target: SCORE_ACHIEVEMENT_TARGETS[achId]
      };
    }
    return null;
  }

  function formatStat(value) {
    return formatCount(Number(value) || 0);
  }

  function formatFullValue(value) {
    return (Number(value) || 0).toLocaleString();
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

      days.push({ date: dateStr, score: roll?.score || 0, hex: roll?.hex_code || '', intensity });
    }
    return days;
  })();
</script>

<div class="container profile-container" aria-busy={loading}>
  <div class="section-title">
    <div class="section-bar bar-purple"></div>
    <h2>{isOwnProfile ? 'Your Profile' : 'Player Profile'}</h2>
  </div>

  {#if !loading && targetProfile}
    {#if dataWarning}<p class="auth-error" role="status">{dataWarning}</p>{/if}
    <div class="card mood-card {borderEff.cls}">
      {#if bgEff.style}
        <div class="profile-bg-layer" style="{bgEff.style}"></div>
      {/if}
      {#if targetProfile.mood_color}
        <div class="profile-mood-layer" style="{moodStyle}"></div>
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
                {#if nameRendererKey}
                  <NameEffectCanvas
                    text={username}
                    rendererKey={nameRendererKey}
                    todayColor={nameTodayColor}
                    recentColors={nameRendererRecentColors}
                    context="profile"
                    mode="animated"
                    semanticClass="profile-username-large"
                  />
                {:else}
                  <span class="profile-username-large">{username}</span>
                {/if}
              </span>
              {#if staffTitleTxt}
                <span class="title-chip staff-title">[{staffTitleTxt}]</span>
              {/if}
              {#if targetProfile.equipped_badges?.includes('launch_edition')}
                <span class="launch-edition-badge" title="Played during ChromaDie's launch month">Launch Edition</span>
              {/if}
            </div>
            {#if rank}
              <div class="rank-chip" style="color: {rank.color}; border-color: {rank.color === 'var(--spectrum)' ? '#a15cff' : rank.color};">
                {rank.name} Rank
              </div>
              <div class="rank-explainer">
                <div class="rank-explainer-row">
                  <span>Lifetime EP</span>
                  <span title={formatFullValue(rankState?.lifetimeEp)}>{formatStat(rankState?.lifetimeEp)} EP</span>
                </div>
                <div class="progress-bar-container" aria-hidden="true">
                  <div
                    class="progress-bar-fill"
                    style={`width: ${Math.round((rankState?.progress || 0) * 100)}%; background: ${rank.color};`}
                  ></div>
                </div>
                <p class="progress-text">
                  {#if rankState?.next}
                    {rankState.next.name} at {formatStat(rankState.next.min)} EP
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
                    aria-label={`Use ${score.hex_code} as mood color`}
                    aria-pressed={moodColorInput === score.hex_code}
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
            <span class="stat-value" title={formatFullValue(targetProfile.current_streak)}>🔥 {formatStat(targetProfile.current_streak)}</span>
            <span class="stat-label">Current Streak</span>
          </div>
          <div class="stat-box">
            <span class="stat-value" title={formatFullValue(targetProfile.longest_streak)}>🏆 {formatStat(targetProfile.longest_streak)}</span>
            <span class="stat-label">Longest Streak</span>
          </div>
          <div class="stat-box stat-box-primary">
            <span class="stat-value" title={formatFullValue(targetProfile.lifetime_ep)}>💎 {formatStat(targetProfile.lifetime_ep)}</span>
            <span class="stat-label">Lifetime EP</span>
          </div>
          {#if isOwnProfile}
            <div class="stat-box">
              <span class="stat-value" title={formatFullValue(targetProfile.ep_spent)}>💸 {formatStat(targetProfile.ep_spent)}</span>
              <span class="stat-label">EP Spent</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if displayBestRoll || targetProfile}
      <div class="best-row-container" style="margin-top: 20px;">
        <div class="best-box">
          <div class="badges-title">Best Roll</div>
          {#if displayBestRoll}
            <div class="best-roll-visual">
              <div class="best-color-display" style="background-color: {displayBestRoll.hex_code || '#222'};" title={displayBestRoll.hex_code || 'Color unavailable'}></div>
              <span class="best-roll-hex">{displayBestRoll.hex_code || 'Unknown color'}</span>
            </div>
            <p class="best-roll-score" title={formatFullValue(displayBestRoll.score)}>{formatStat(displayBestRoll.score)} EP</p>
            <p class="best-roll-rarity">{displayBestRoll.rarity || 'Unranked'}</p>
          {:else}
            <p style="font-size: 0.8rem; color: var(--text-muted);">No rolls yet.</p>
          {/if}
        </div>

        <div class="best-box">
          <div class="badges-title">Activity (30d)</div>
          <p class="activity-summary">
            {recentRollCount} roll{recentRollCount === 1 ? '' : 's'} in the last 30 days
            {#if targetProfile.current_streak}
              <span>• {formatStat(targetProfile.current_streak)} day streak</span>
            {/if}
          </p>
          <div class="heatmap-grid">
            {#each heatmapData as day (day.date)}
              <div
                class="heatmap-cell intensity-{day.intensity} {day.hex ? 'has-roll' : ''}"
                style={day.hex ? `background-color: ${day.hex};` : ''}
                title={day.hex ? `${day.date}: ${day.hex} • ${formatFullValue(day.score)} EP` : `${day.date}: No roll`}
                aria-label={day.hex ? `${day.date}, ${day.hex}, ${formatFullValue(day.score)} EP` : `${day.date}, no roll`}
                role="img"
              ></div>
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
              {@const rivalNameRendererKey = String(rival.equipped_cosmetics?.name_effect || '')}
              {@const rivalTitleTxt = getTitleText(rival.equipped_cosmetics)}
              {@const rivalStaffTitleTxt = getStaffTitleText(rival.is_staff)}
              {@const rivalLbTheme = getLbTheme(rival.equipped_cosmetics)}

              <div class="rival-row {rivalLbTheme.cls}" style="{rivalLbTheme.style}">
                <button type="button" class="rival-profile-btn" on:click={() => viewProfile(rival.username, rival.user_id)}>
                  {#if rivalTitleTxt}
                    <span class="title-chip">[{rivalTitleTxt}]</span>
                  {/if}
                  {#if rivalStaffTitleTxt}
                    <span class="title-chip staff-title">[{rivalStaffTitleTxt}]</span>
                  {/if}
                  {#if rivalNameRendererKey}
                    <NameEffectCanvas
                      text={rival.username}
                      rendererKey={rivalNameRendererKey}
                      todayColor={rival.hex_code || '#8B7CF6'}
                      context="card"
                      compact={true}
                      mode="static-signature"
                      semanticClass="lb-username"
                    />
                  {:else}
                    <span class="lb-username">{rival.username}</span>
                  {/if}
                </button>
                <span class="rival-score" title={formatFullValue(rival.score)}>{formatStat(rival.score)}</span>
              </div>
            {/each}
          </div>
        {:else if $followedUsers.length > 0}
          <div class="empty-rivals">
            <p>Your rivals have not rolled today.</p>
            <p class="subtext">Their scores will appear here after their next daily roll.</p>
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
  {:else if !loading}
    <div class="card" role={loadError ? 'alert' : undefined}>
      <p>{loadError || 'Player not found.'}</p>
      {#if loadError}
        <button type="button" class="save-btn" on:click={loadProfileData}>Retry</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .mood-card { position: relative; overflow: hidden; transition: background-image 0.5s ease; }
  .profile-bg-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    background-color: #0f1118;
    will-change: transform, opacity, filter;
  }
  .profile-bg-layer[style*="godRaysTurn"] { animation-duration: 5.5s !important; }
  .profile-bg-layer[style*="deepSpaceTwinkle"] { animation-duration: 6.2s !important; }
  .profile-bg-layer::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, rgba(2, 4, 10, 0.2), rgba(2, 4, 10, 0.38));
    pointer-events: none;
  }
  .profile-mood-layer { position: absolute; inset: 0; z-index: 1; pointer-events: none; mix-blend-mode: screen; opacity: 0.9; }
  .profile-content-layer { position: relative; z-index: 2; }
  .profile-header-row { display: flex; justify-content: flex-start; align-items: flex-start; margin-bottom: 18px; gap: 18px; }
  .profile-identity { display: flex; flex: 0 1 auto; min-width: 0; flex-direction: column; gap: 6px; align-items: center; text-align: center; }
  .title-row { display: flex; align-items: center; justify-content: center; min-height: 18px; width: 100%; }
  .name-row { display: flex; align-items: center; justify-content: center; width: 100%; }
  .profile-name-frame { display: inline-flex; align-items: center; line-height: 1; }
  .profile-username-large { line-height: 1; }
  .name-row { display: flex; align-items: center; justify-content: center; gap: 0.65rem; flex-wrap: wrap; }
  .launch-edition-badge { display: inline-flex; align-items: center; min-height: 1.4rem; padding: 0.15rem 0.5rem; border: 1px solid rgba(161, 92, 255, 0.55); border-radius: 999px; background: linear-gradient(135deg, rgba(94, 234, 212, 0.16), rgba(161, 92, 255, 0.2)); color: #d8c7ff; font: 700 0.65rem/1 var(--font-mono-stack); letter-spacing: 0.04em; text-transform: uppercase; }
  .title-chip { margin-right: 0; }
  .rank-chip { margin-top: 1px; align-self: center; }
  .header-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; padding-top: 2px; flex: 0 0 auto; margin-left: auto; }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
    align-items: stretch;
  }

  .stat-box {
    min-width: 0;
    min-height: 86px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
  }

  .stat-box-primary {
    border-color: rgba(139, 124, 246, 0.4);
    background: linear-gradient(145deg, rgba(139, 124, 246, 0.13), rgba(255,255,255,0.03));
  }

  .stat-value {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: clamp(1rem, 3vw, 1.4rem);
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
  }

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
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
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
  .mood-clear { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-muted); min-height: 44px; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; flex-shrink: 0; }
  .mood-swatch { width: 44px; height: 44px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.1s, border 0.2s; flex-shrink: 0; }
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
    gap: 5px;
    margin-top: 10px;
    width: 100%;
  }
  .heatmap-cell {
    aspect-ratio: 1;
    min-width: 0;
    border-radius: 2px;
    background-color: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.05);
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .heatmap-cell.has-roll { border-color: rgba(255,255,255,0.28); box-shadow: 0 0 8px rgba(255,255,255,0.12); }
  .heatmap-cell:hover { transform: scale(1.14); border-color: rgba(255,255,255,0.75); }
  .heatmap-cell.intensity-1 { background-color: rgba(16, 185, 129, 0.2); }
  .heatmap-cell.intensity-2 { background-color: rgba(16, 185, 129, 0.4); }
  .heatmap-cell.intensity-3 { background-color: rgba(59, 130, 246, 0.5); }
  .heatmap-cell.intensity-4 { background-color: rgba(168, 85, 247, 0.6); }
  .heatmap-cell.intensity-5 { background-color: rgba(241, 196, 15, 0.8); }

  .activity-summary {
    min-height: 2.4em;
    margin: 0;
    color: var(--text-muted);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .activity-summary span { color: #dbe4ff; }

  .best-row-container {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    gap: 16px;
    align-items: stretch;
  }

  .best-box {
    min-width: 0;
    margin: 0;
    overflow: hidden;
  }

  .best-roll-visual { display: grid; justify-items: center; gap: 8px; }

  .best-color-display {
    width: clamp(64px, 10vw, 88px);
    height: clamp(64px, 10vw, 88px);
    box-shadow: 0 0 26px rgba(255,255,255,0.12), inset 0 0 16px rgba(0,0,0,0.35);
  }

  .best-roll-hex {
    color: var(--text-muted);
    font-family: var(--font-mono-stack);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
  }

  .best-roll-score { margin: 10px 0 0; color: var(--accent-green); font-weight: 700; font-family: var(--font-mono-stack); }
  .best-roll-rarity { margin: 4px 0 0; color: var(--text-muted); font-size: 0.8rem; }

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
    font-family: var(--font-mono-stack);
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
