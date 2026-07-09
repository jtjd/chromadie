<script>
  import { supabase } from './supabase';
  import { session, authInitialized, fetchWalletBalance, rerollShards, profile, isAuthenticated } from './stores';
  import { sleep, getTodayString, normalizeHexColor } from './utils';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y';
  import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
  import { getRollEffect, getOrbShape } from './cosmetics';
  import { getBadgeMeta } from './badgeData';

  const dispatch = createEventDispatcher();
  let phase = 'preroll';
  let loading = false;
  let error = null;

  let displayHex = '#000000';
  let displayColor = '#222';

  let score = 0;
  let rarity = '';
  let badges = [];
  let displayScore = 0;
  let scanProgress = 0;

  let percentileDisplay = null;
  let copied = false;
  let countdownString = '24:00:00';
  let countdownInterval;
  let milestoneGranted = '';

  let showImageModal = false;
  let imagePreviewUrl = '';
  let imageCopied = false;
  let canvas;
  let imageDialog = null;
  let imageOpener = null;
  let guestProgressRestored = false;
  let rerollRequestInFlight = false;
  let initialStateKey = null;
  let initialStateRequestId = 0;

  let cotwColor = null;
  let cotwHit = false;

  const SYSTEM_BADGE_IDS = ['beat_your_best', 'cotw_hit', 'streak_bonus_7', 'reroll_shard_earned', 'milestone_30', 'milestone_100', 'milestone_365'];

  $: systemBadges = badges.filter(b => SYSTEM_BADGE_IDS.includes(b));
  $: rollBadges = badges.filter(b => !b.startsWith('ach_') && !SYSTEM_BADGE_IDS.includes(b));
  $: earnedAchievements = badges.filter(b => b.startsWith('ach_'));

  $: cosmetics = $profile?.equipped_cosmetics || {};
  $: rollEff = getRollEffect(cosmetics);
  $: orbEff = getOrbShape(cosmetics);

  function getPercentileTier(p, total) {
      if (total <= 1) return { text: "🏆 First roll of the day!", color: "#f1c40f", total };
      let rank = 100 - p;
      if (rank <= 1) return { text: "🔥 Top 1% today", color: "#f1c40f", total };
      if (rank <= 5) return { text: "⭐ Top 5% today", color: "#ffeb3b", total };
      if (rank <= 10) return { text: "🚀 Top 10% today", color: "#10b981", total };
      if (rank <= 25) return { text: "👍 Top 25% today", color: "#6ee787", total };
      if (rank <= 50) return { text: "📊 Above average today", color: "#e0e0e0", total };
      if (rank <= 75) return { text: "⚪ Around average today", color: "#8a8a9a", total };
      if (rank <= 90) return { text: "⚠️ Bottom 25% today", color: "#ff9800", total };
      if (rank <= 95) return { text: "🔻 Bottom 10% today", color: "#ef4444", total };
      return { text: "💀 Bottom 5% today", color: "#b91c1c", total };
  }

  function sortBadgesDescending(arr) {
      return (arr || []).slice().sort((a, b) => getBadgeMeta(b).points - getBadgeMeta(a).points);
  }

  function getTomorrowMidnightUTC() {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  }

  function tickCountdown() {
      const diff = getTomorrowMidnightUTC() - new Date();
      if (diff <= 0) {
          clearInterval(countdownInterval);
          phase = 'preroll';
          badges = [];
          displayScore = 0;
          scanProgress = 0;
          percentileDisplay = null;
          return;
      }
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      countdownString = `${h}:${m}:${s}`;
  }

  async function shareResultsText() {
      let badgeText = rollBadges.length > 0 ? rollBadges.map(b => getBadgeMeta(b).name).join(', ') : 'None';
      let achText = earnedAchievements.length > 0 ? earnedAchievements.map(b => getBadgeMeta(b).name).join(', ') : 'None';
      const shareHex = normalizeHexColor(displayColor);
      const hexNoHash = shareHex.substring(1);
      const shareUrl = `${window.location.origin}?challenge=${score}&hex=${hexNoHash}`;
      let shareString = `🎲 ChromaDie Daily Roll\nHex: ${shareHex}\nScore: ${score.toLocaleString()} pts\nRarity: ${rarity}\nConditions: ${badgeText}\nAchievements: ${achText}\n\nCan you beat my color? Roll yours here: ${shareUrl}`;

      try {
          await navigator.clipboard.writeText(shareString);
          copied = true;
          setTimeout(() => copied = false, 2000);
      } catch {
          console.error("Clipboard copy failed");
      }
  }

  function getSavedGuestRoll() {
    try {
      return localStorage.getItem('chromadie-roll');
    } catch {
      return null;
    }
  }

  function saveGuestRoll(rollData) {
    try {
      localStorage.setItem('chromadie-roll', JSON.stringify(rollData));
    } catch {
      // Ignore storage failures in private browsing or hardened browser modes.
    }
  }

  function clearGuestRoll() {
    try {
      localStorage.removeItem('chromadie-roll');
    } catch {
      // Ignore storage failures.
    }
  }

  function getRerollLockKey() {
    return `chromadie-reroll-lock:${getTodayString()}`;
  }

  function getRerollLockExpiry() {
    return Date.now() + 10000;
  }

  function setRerollLock() {
    try {
      localStorage.setItem(getRerollLockKey(), String(getRerollLockExpiry()));
    } catch {
      // Ignore storage failures.
    }
  }

  function clearRerollLock() {
    try {
      localStorage.removeItem(getRerollLockKey());
    } catch {
      // Ignore storage failures.
    }
  }

  function hasActiveRerollLock() {
    try {
      const expiry = Number(localStorage.getItem(getRerollLockKey()));
      if (!Number.isFinite(expiry)) return false;
      if (expiry <= Date.now()) {
        localStorage.removeItem(getRerollLockKey());
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  function resetRollPresentation() {
    phase = 'preroll';
    loading = false;
    error = null;
    badges = [];
    displayHex = '#000000';
    displayColor = '#222';
    score = 0;
    rarity = '';
    displayScore = 0;
    scanProgress = 0;
    percentileDisplay = null;
    milestoneGranted = '';
    cotwHit = false;
    guestProgressRestored = false;
  }

  async function loadAuthenticatedRollState(userId, requestId) {
    loading = true;

    const { data: dbRoll } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .eq('roll_date', getTodayString())
      .single();

    if (requestId !== initialStateRequestId) return;

    if (dbRoll) {
      phase = 'results';
      score = dbRoll.score;
      displayScore = dbRoll.score;
      rarity = dbRoll.rarity;
      badges = sortBadgesDescending(dbRoll.badges || []);
      displayColor = dbRoll.hex_code;

      if (dbRoll.badges && dbRoll.badges.includes('cotw_hit')) {
          cotwHit = true;
      }

      const { data: percData } = await supabase.rpc('get_score_percentile', { p_score: dbRoll.score });
      if (requestId !== initialStateRequestId) return;
      if (percData) percentileDisplay = getPercentileTier(percData.percentile, percData.total_rollers);
    } else {
      phase = 'preroll';
      guestProgressRestored = false;
    }

    loading = false;
  }

  async function loadGuestRollState(requestId) {
    const savedRoll = getSavedGuestRoll();

    if (requestId !== initialStateRequestId) return;

    if (savedRoll) {
      try {
        const rollData = JSON.parse(savedRoll);
        if (rollData.date === getTodayString()) {
          guestProgressRestored = true;
          phase = 'results';
          score = rollData.score; displayScore = rollData.score;
          rarity = rollData.rarity;
          badges = sortBadgesDescending(rollData.badges || []);
          displayColor = rollData.hex;

          if (rollData.badges && rollData.badges.includes('cotw_hit')) {
              cotwHit = true;
          }

          const { data: percData } = await supabase.rpc('get_score_percentile', { p_score: rollData.score });
          if (requestId !== initialStateRequestId) return;
          if (percData) percentileDisplay = getPercentileTier(percData.percentile, percData.total_rollers);
          loading = false;
          return;
        }
      } catch {
        clearGuestRoll();
      }
    }

    guestProgressRestored = false;
    phase = 'preroll';
    loading = false;
  }

  async function syncInitialState() {
    if (!$authInitialized) return;

    const nextKey = $session?.user.id || 'guest';
    if (nextKey === initialStateKey) return;

    initialStateKey = nextKey;
    const requestId = ++initialStateRequestId;
    rerollRequestInFlight = false;
    error = null;
    resetRollPresentation();
    loading = true;

    if ($session?.user?.id) {
      await loadAuthenticatedRollState($session.user.id, requestId);
    } else {
      await loadGuestRollState(requestId);
    }
  }

  async function generateShareImage() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 600;
    const H = 315;

    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, W, H);

    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0, '#ff4d4d');
    gradient.addColorStop(0.2, '#ffab2e');
    gradient.addColorStop(0.4, '#ffe14d');
    gradient.addColorStop(0.6, '#6ee787');
    gradient.addColorStop(0.8, '#4d7dff');
    gradient.addColorStop(1, '#a15cff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Space Grotesk", sans-serif';
    ctx.fillText('🎲 ChromaDie', 20, 50);

    ctx.shadowColor = displayColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = displayColor;
    ctx.beginPath();
    ctx.arc(150, 160, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(displayColor, 150, 270);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(score.toLocaleString(), 280, 160);

    ctx.fillStyle = '#767b8c';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText('Entropy Points', 280, 185);

    const rarityColors = { 'Mythic': '#f1c40f', 'Epic': '#a15cff', 'Rare': '#3b82f6', 'Uncommon': '#10b981', 'Common': '#fff', 'Trash': '#767b8c' };
    ctx.fillStyle = rarityColors[rarity] || '#fff';
    ctx.font = 'bold 20px "Space Grotesk", sans-serif';
    ctx.fillText(rarity.toUpperCase(), 280, 220);

    ctx.fillStyle = '#767b8c';
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText('Can you beat my color?', 280, 270);
    ctx.fillStyle = '#8b7cf6';
    ctx.fillText('chromadie.pages.dev', 280, 295);

    imagePreviewUrl = canvas.toDataURL('image/png');
    imageCopied = false;
    showImageModal = true;
    imageOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await tick();
    focusFirstElement(imageDialog) || imageDialog?.focus();
  }

  async function copyImageToClipboard() {
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          imageCopied = true;
          setTimeout(() => imageCopied = false, 2000);
        } else {
          throw new Error('Clipboard API not supported');
        }
      } catch (err) {
        console.error('Clipboard write failed', err);
        imageCopied = false;
      }
    }, 'image/png');
  }

  async function closeImageModal() {
    if (!showImageModal) return;
    showImageModal = false;
    await tick();
    restoreFocus(imageOpener);
    imageOpener = null;
  }

  function handleImageModalKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void closeImageModal();
      return;
    }

    trapFocus(event, imageDialog);
  }

  async function initiateRoll(isReroll = false) {
    if (!$authInitialized) {
      return;
    }

    if (isReroll && (loading || rerollRequestInFlight || !$session?.user?.id || $rerollShards <= 0 || hasActiveRerollLock())) {
      return;
    }

    loading = true;
    rerollRequestInFlight = isReroll;
    error = null;
    phase = 'rolling';
    badges = [];
    displayScore = 0;
    scanProgress = 0;
    percentileDisplay = null;
    milestoneGranted = '';
    cotwHit = false;

    if (isReroll) {
      setRerollLock();
    }

    const { data, error: rpcError } = await supabase.rpc('roll_die', { p_is_reroll: isReroll });

    if (rpcError || !data || !data.success) {
      error = rpcError?.message || "An error occurred while rolling. Please try again.";
      phase = 'preroll';
      loading = false;
      rerollRequestInFlight = false;
      if (isReroll) {
        clearRerollLock();
      }
      return;
    }

    let scrambleInterval = setInterval(() => {
      displayColor = `rgb(${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)})`;
      let scramble = '#';
      for(let i=1; i<7; i++) scramble += Math.floor(Math.random()*16).toString(16).toUpperCase();
      displayHex = scramble;
    }, 60);

    await sleep(2000);
    clearInterval(scrambleInterval);
    displayColor = '#222';

    const hexChars = data.hex.split('');
    for (let i = 0; i < 7; i++) {
      let currentText = hexChars.map((c, idx) => idx <= i ? c : '-').join('');
      displayHex = currentText;
      await sleep(500);
    }

    await sleep(400);
    displayColor = data.hex;

    const sortedBadgesForAnim = (data.badges || []).slice().sort((a, b) => getBadgeMeta(a).points - getBadgeMeta(b).points);

    for (const badgeId of sortedBadgesForAnim) {
      await sleep(700);
      badges = [badgeId, ...badges];
      const badgeMeta = getBadgeMeta(badgeId);
      if (badgeMeta.points >= 1000000) {
        document.querySelector('.container')?.classList.add('flash-jackpot', 'shake-screen');
        setTimeout(() => document.querySelector('.container')?.classList.remove('flash-jackpot', 'shake-screen'), 500);
      }
    }

    phase = 'results';
    score = data.score;
    rarity = data.rarity;
    milestoneGranted = data.milestone_granted || '';

    if (data.badges && data.badges.includes('cotw_hit')) {
        cotwHit = true;
    }

    if (data.percentile !== undefined && data.total_rollers !== undefined) {
        percentileDisplay = getPercentileTier(data.percentile, data.total_rollers);
    }

    let targetScore = data.score;
    let currentScore = 0;
    let countUpInterval = setInterval(() => {
      currentScore += targetScore / 60;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        clearInterval(countUpInterval);
      }
      displayScore = Math.floor(currentScore);
    }, 33);

    const rollData = {
      date: getTodayString(),
      hex: data.hex,
      score: data.score,
      rarity: data.rarity,
      badges: sortBadgesDescending(data.badges || [])
    };

    if (!$session?.user?.id) {
      saveGuestRoll(rollData);
      guestProgressRestored = true;
    } else {
      fetchWalletBalance();
    }

    rerollRequestInFlight = false;
    if (isReroll) {
      clearRerollLock();
    }
    loading = false;
  }

  onMount(async () => {
    tickCountdown();
    countdownInterval = setInterval(tickCountdown, 1000);

    const { data: cotwData } = await supabase.from('meta').select('value').eq('key', 'cotw_target').single();
    if (cotwData?.value) {
        const [r, g, b] = cotwData.value.split(',');
        cotwColor = `rgb(${r}, ${g}, ${b})`;
    }
  });

  $: if ($authInitialized || $session) {
    void syncInitialState();
  }

  onDestroy(() => clearInterval(countdownInterval));

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = showImageModal ? 'hidden' : '';
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });
</script>

<!-- Hidden Canvas for Image Generation -->
<canvas bind:this={canvas} width="600" height="315" style="display: none;"></canvas>

<!-- Image Preview Modal -->
{#if showImageModal}
  <div class="image-modal-overlay" role="presentation" on:click|self={closeImageModal}>
    <div
      class="image-modal-content"
      bind:this={imageDialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-image-title"
      tabindex="-1"
      on:keydown={handleImageModalKeydown}
    >
      <h3 id="share-image-title">Share Image</h3>
      <img src={imagePreviewUrl} alt="ChromaDie Share Card" class="preview-img" />
      <div class="modal-actions">
        <button type="button" class="download-btn" on:click={copyImageToClipboard}>
          {#if imageCopied}✅ Copied!{:else}📋 Copy Image{/if}
        </button>
        <button type="button" class="close-btn" on:click={closeImageModal}>Close</button>
      </div>
    </div>
  </div>
{/if}

<div class="container game-container">
  {#if error}
    <p class="auth-error">{error}</p>
  {/if}

  {#if phase === 'preroll'}
    <div class="card">
      <h1>Daily Roll</h1>
      <p class="info-text">You get one roll every 24 hours. Roll to receive a random 24-bit color and earn Entropy Points (EP).</p>
      <button class="roll-btn" on:click={() => initiateRoll(false)} disabled={loading || !$authInitialized}>
        {loading ? 'Rolling...' : 'Roll the Die'}
      </button>

      {#if cotwColor}
        <div class="cotw-widget">
            <div class="cotw-info">
                <span class="cotw-title">🎯 Color of the Week</span>
                <span class="cotw-desc">Roll close to this color for <strong>+50,000 EP</strong>!</span>
            </div>
            <div class="cotw-swatch" style="background-color: {cotwColor};" title="Target Color"></div>
        </div>
      {/if}
    </div>

  {:else if phase === 'rolling'}
    <div class="card">
      <div class="results-header results-header-tight">
        <!-- FIX: Applied orbEff.cls to the rolling orb -->
        <div class="final-color-display {orbEff.cls}" style="background-color: {displayColor};"></div>
        <div class="rolling-hex">{displayHex}</div>
      </div>
      <div class="scan-container">
        <div class="scan-bar" style="width: {scanProgress}%"></div>
      </div>
      <div class="rolling-badges-container">
        {#each badges as badgeId (badgeId)}
          {@const badge = getBadgeMeta(badgeId)}
          <div class="badge-pop rarity-{badge.rarity || 'Common'}">
            <span class="badge-symbol">{badge.symbol || '✨'}</span>
            <div class="badge-text">
              <span class="badge-title">{badge.name}</span>
              <span class="badge-desc">{badge.desc || ''}</span>
            </div>
            <span class="badge-points">+{badge.points.toLocaleString()}</span>
          </div>
        {/each}
      </div>
    </div>

  {:else if phase === 'results'}
    <div class="card">
      <div class="results-header results-header-tight">
        <div class="rarity-tag rarity-{rarity}">{rarity}</div>

        <div class="roll-effect-wrapper {rollEff.cls}" style="{rollEff.style}">
          <div class="final-color-display rarity-{rarity} {orbEff.cls}" style="background-color: {displayColor};"></div>
        </div>

        <div class="hex-code">{displayColor}</div>
        <div class="score-label">Leaderboard Score</div>
        <div class="score-display">{displayScore.toLocaleString()}</div>

        {#if percentileDisplay}
          <div class="rank-display" style="color: {percentileDisplay.color}; margin-top: 5px; font-weight: 700;">
            {percentileDisplay.text}
            <span style="color: var(--text-muted); font-weight: 500; font-size: 0.8rem;">
              (of {percentileDisplay.total.toLocaleString()} rollers)
            </span>
          </div>
        {/if}
      </div>

      {#if cotwHit}
        <div class="cotw-success-banner">
          🎉 Color of the Week Hit! +50,000 EP!
        </div>
      {/if}

      <div class="post-score-actions">
        <div class="countdown-inline">
          Next roll in: <span style="color: #fff; font-weight: 600;">{countdownString}</span>
        </div>
        <button class="chroma-btn" on:click={shareResultsText}>
          {copied ? '✅ Copied!' : '📋 Share Text'}
        </button>
        <button class="chroma-btn" on:click={generateShareImage}>
          🖼️ Share Image
        </button>

        {#if $isAuthenticated && $rerollShards > 0}
          <button class="reroll-btn" on:click={() => initiateRoll(true)} disabled={loading || rerollRequestInFlight || hasActiveRerollLock() || !$authInitialized}>
            🎲 Use Reroll Shard ({$rerollShards} left)
          </button>
        {/if}
      </div>

      {#if milestoneGranted}
        <div class="milestone-banner">
          🎁 Milestone Unlocked! You received the <strong>{milestoneGranted}</strong>!
        </div>
      {/if}

      {#if !$isAuthenticated && guestProgressRestored}
        <div class="local-progress-banner" role="status" aria-live="polite">
          Local-only progress restored. Create an account to save rolls to your profile.
        </div>
      {/if}

      {#if !$isAuthenticated}
        <div class="guest-prompt">
          <div class="guest-prompt-header">Guest Mode</div>
          <div class="guest-prompt-title">Save Your Progress</div>
          <div class="guest-prompt-copy">Create an account to compete on the leaderboard, earn EP, and unlock customizations.</div>
          <button type="button" class="roll-btn" style="margin-top: 15px; display: inline-block;" on:click={() => dispatch('promptlogin')}>
            Create Account
          </button>
        </div>
      {/if}

      {#if systemBadges.length > 0}
        <div class="badges-container badges-container-tight" style="margin-top: 0; margin-bottom: 20px;">
          <div class="badges-title">Bonuses & Milestones</div>
          {#each systemBadges as badgeId (badgeId)}
            {@const badge = getBadgeMeta(badgeId)}
            <div class="badge-result rarity-Mythic">
              <span class="badge-symbol">{badge.symbol || '✨'}</span>
              <div class="badge-text">
                <span class="badge-title">{badge.name}</span>
                <span class="badge-desc">{badge.desc || ''}</span>
              </div>
              {#if badge.points > 0}
                <span class="badge-points ep-points">+{badge.points.toLocaleString()} EP</span>
              {:else}
                <span class="badge-points" style="color: var(--accent-green); text-shadow: none;">Granted!</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="badges-container badges-container-tight conditions-section">
        <div class="badges-title">Conditions Met</div>
        {#if rollBadges.length === 0}
          <div class="badge-result">
            <div class="badge-text">
              <span class="badge-title">No special conditions met</span>
            </div>
          </div>
        {:else}
          <div class="conditions-grid">
          {#each rollBadges as badgeId (badgeId)}
            {@const badge = getBadgeMeta(badgeId)}
            <div class="badge-result rarity-{badge.rarity || 'Common'}">
              <span class="badge-symbol">{badge.symbol || '✨'}</span>
              <div class="badge-text">
                <span class="badge-title">{badge.name}</span>
                <span class="badge-desc">{badge.desc || 'Special condition met'}</span>
              </div>
              <span class="badge-points">+{badge.points.toLocaleString()}</span>
            </div>
          {/each}
          </div>
        {/if}
      </div>

      {#if earnedAchievements.length > 0}
        <div class="badges-container badges-container-tight" style="margin-top: 20px;">
          <div class="badges-title">Achievements Unlocked</div>
          <div class="badges-subtitle">Rewards add to your spendable EP balance, not your leaderboard score.</div>
          {#each earnedAchievements as badgeId (badgeId)}
            {@const badge = getBadgeMeta(badgeId)}
            <div class="badge-result rarity-Mythic">
              <span class="badge-symbol">{badge.symbol || '🏆'}</span>
              <div class="badge-text">
                <span class="badge-title">{badge.name}</span>
                <span class="badge-desc">{badge.desc}</span>
              </div>
              <span class="badge-points" style="color: #f1c40f; text-shadow: 0 0 10px rgba(241, 196, 15, 0.3);">+{badge.points.toLocaleString()} EP</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .results-header-tight { margin-bottom: 5px !important; }
  .post-score-actions { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 0 0 20px 0; flex-wrap: wrap; }
  .countdown-inline { color: var(--text-muted); font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; background: rgba(255,255,255,0.03); padding: 6px 12px; border-radius: 6px; border: 1px solid var(--card-border); }
  .chroma-btn { position: relative; isolation: isolate; background: #16171f; color: #fff; border: 1px solid transparent; padding: 7px 18px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-weight: 600; transition: transform 0.15s ease, box-shadow 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: inline-flex; align-items: center; gap: 5px; }
  .chroma-btn::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; z-index: -1; background: var(--spectrum); background-size: 300% 100%; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: spectrumFlow 5s linear infinite; }
  .chroma-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 124, 246, 0.25); }
  .chroma-btn:active { transform: translateY(1px); }
  .reroll-btn { background: rgba(139, 124, 246, 0.15); color: var(--accent-purple); border: 1px solid var(--accent-purple); padding: 7px 18px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-weight: 600; transition: all 0.2s; }
  .reroll-btn:hover { background: rgba(139, 124, 246, 0.3); }
  .reroll-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .badges-container-tight { margin-bottom: 0 !important; margin-top: 20px; }
  .conditions-section {
    align-items: stretch;
  }
  .conditions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 8px;
    width: 100%;
  }
  .conditions-grid .badge-result {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 12px;
    min-height: 72px;
    margin-bottom: 0;
  }
  .conditions-grid .badge-symbol {
    margin-top: 0;
  }
  .conditions-grid .badge-text {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .conditions-grid .badge-desc {
    line-height: 1.35;
  }
  .conditions-grid .badge-points {
    margin-left: 0;
    padding-left: 0;
    text-align: right;
    white-space: nowrap;
  }
  .local-progress-banner {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.35);
    color: #cfe8ff;
    padding: 12px 14px;
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 0.9rem;
    line-height: 1.5;
    text-align: left;
  }
  .guest-prompt {
    margin-bottom: 20px !important;
    text-align: center;
    border-left: none !important;
    padding: 18px 16px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--card-border);
  }
  .guest-prompt-header {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    color: var(--accent-purple);
    margin-bottom: 6px;
    font-family: 'Space Grotesk', sans-serif;
  }
  .guest-prompt-title {
    color: #fff;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.15rem;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .guest-prompt-copy {
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.55;
    max-width: 34rem;
    margin: 0 auto;
  }
  .badges-subtitle { font-size: 0.7rem; color: var(--text-muted); margin-bottom: 10px; text-align: left; opacity: 0.8; }

  .milestone-banner {
    background: rgba(241, 196, 15, 0.1);
    border: 1px solid rgba(241, 196, 15, 0.4);
    color: #f1c40f;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-weight: 600;
    text-align: center;
    animation: badgePopIn 0.4s forwards;
  }

  .cotw-widget {
    margin-top: 25px; padding: 15px; background: rgba(139, 124, 246, 0.05);
    border: 1px solid rgba(139, 124, 246, 0.2); border-radius: 12px;
    display: flex; align-items: center; justify-content: space-between; gap: 15px;
  }
  .cotw-info { text-align: left; display: flex; flex-direction: column; gap: 4px; }
  .cotw-title { font-size: 0.9rem; font-weight: 700; color: var(--accent-purple); font-family: 'Space Grotesk', sans-serif; }
  .cotw-desc { font-size: 0.75rem; color: var(--text-muted); }
  .cotw-swatch { width: 48px; height: 48px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 0 15px rgba(0,0,0,0.3); flex-shrink: 0; }

  .cotw-success-banner {
    background: linear-gradient(90deg, rgba(139, 124, 246, 0.2), rgba(0,0,0,0));
    border-left: 4px solid var(--accent-purple); color: #fff; padding: 12px 15px;
    border-radius: 8px; margin-bottom: 20px; font-weight: 600; text-align: left; font-size: 0.9rem;
  }

  .ep-points { color: #f1c40f !important; text-shadow: 0 0 10px rgba(241, 196, 15, 0.3) !important; }

  .image-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .image-modal-content { background: #16171f; border: 1px solid var(--card-border); border-radius: 16px; padding: 25px; max-width: 650px; width: 100%; text-align: center; }
  .image-modal-content h3 { margin: 0 0 20px 0; font-family: 'Space Grotesk', sans-serif; color: #fff; }
  .preview-img { width: 100%; border-radius: 8px; border: 1px solid var(--card-border); margin-bottom: 20px; }
  .modal-actions { display: flex; gap: 15px; justify-content: center; }
  .download-btn { background: var(--accent-purple); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
  .download-btn:hover { background: #7c3aed; }
  .close-btn { background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500; }

  @media (max-width: 600px) {
    .results-header {
      gap: 12px;
      margin-bottom: 22px;
    }
    .results-header-tight {
      margin-bottom: 0 !important;
    }
    .final-color-display {
      width: 116px;
      height: 116px;
    }
    .roll-effect-wrapper {
      width: 116px;
      height: 116px;
    }
    .rolling-hex {
      font-size: 1.35rem;
      letter-spacing: 2px;
      word-break: break-word;
    }
    .score-display {
      font-size: 2.4rem;
    }
    .hex-code {
      font-size: 0.95rem;
      letter-spacing: 1px;
      padding: 7px 12px;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .post-score-actions {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
    .countdown-inline,
    .chroma-btn,
    .reroll-btn {
      width: 100%;
      justify-content: center;
    }
    .guest-prompt {
      padding: 16px 14px;
    }
    .guest-prompt-title {
      font-size: 1.05rem;
    }
    .guest-prompt-copy {
      font-size: 0.88rem;
    }
    .badges-container {
      gap: 6px;
    }
    .badge-pop,
    .badge-result {
      align-items: flex-start;
      gap: 10px;
      padding: 9px 12px;
    }
    .badge-text {
      min-width: 0;
    }
    .badge-points {
      padding-left: 0;
      margin-left: 0;
      width: 100%;
      text-align: right;
    }
    .conditions-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .conditions-grid .badge-result {
      grid-template-columns: 28px minmax(0, 1fr) auto;
      grid-template-areas: "icon text points";
      column-gap: 10px;
      row-gap: 0;
      align-items: start;
      padding: 11px 12px;
      min-height: unset;
    }
    .conditions-grid .badge-symbol {
      grid-area: icon;
    }
    .conditions-grid .badge-text {
      grid-area: text;
    }
    .conditions-grid .badge-points {
      grid-area: points;
      justify-self: end;
      align-self: start;
      width: auto;
      text-align: right;
      white-space: nowrap;
    }
    .cotw-widget {
      flex-direction: column;
      align-items: stretch;
    }
    .cotw-swatch {
      align-self: flex-start;
    }
    .image-modal-content {
      padding: 18px 16px;
      border-radius: 14px;
    }
    .modal-actions {
      flex-direction: column;
    }
    .download-btn,
    .close-btn {
      width: 100%;
    }
  }
</style>
