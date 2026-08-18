<script>
  import RollPreview from './RollPreview.svelte';
  import { supabase } from './supabase';
  import { session, profile, authUser, authInitialized, guestProgressActive, fetchWalletBalance, fetchInventoryState, refreshProfileState, rerollShards, isAuthenticated, addToast } from './stores';
  import { createChallengeLink } from './challenges';
  import { sleep, getTodayString, normalizeHexColor } from './utils';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y';
  import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
  import { getBadgeMeta } from './badgeData';
  import { canInitiateRoll, createCanonicalRollData, getRollAccountMode, isRollReady, normalizeCanonicalRoll } from './rollState';
  import { normalizeNewMilestones } from './progressionState.js';
  import { getPercentileTier } from './rollPresentation.js';
  import { clearRerollLock, hasActiveRerollLock, requestRoll, setRerollLock } from './rollService.js';
  import { getAppOrigin } from './authUrls';
  import { trackProductEvent } from './productAnalytics.js';

  const dispatch = createEventDispatcher();
  export let profileMode = false;
  let phase = 'preroll';
  let loading = false;
  let error = null;

  let displayHex = '#000000';
  let displayColor = '#222';

  let score = 0;
  let rarity = '';
  let badges = [];
  let traits = [];
  let identity = '';
  let rollContributors = [];
  let displayScore = 0;
  let scanProgress = 0;
  let scoreCountUpInterval = null;

  let percentileDisplay = null;
  let copied = false;
  let countdownString = '24:00:00';
  let countdownInterval;
  let milestoneGranted = '';
  let newMilestones = [];

  let showImageModal = false;
  let imagePreviewUrl = '';
  let imageCopied = false;
  let imageDialog = null;
  let imageOpener = null;
  let guestProgressRestored = false;
  let rerollRequestInFlight = false;
  let initialStateKey = null;
  let initialStateRequestId = 0;
  let rollRequestId = 0;

  let cotwColor = null;
  let cotwHit = false;

  const SYSTEM_BADGE_IDS = ['beat_your_best', 'cotw_hit', 'streak_bonus_7', 'reroll_shard_earned', 'milestone_30', 'milestone_100', 'milestone_365'];

  $: systemBadges = badges.filter(b => SYSTEM_BADGE_IDS.includes(b));
  $: earnedAchievements = badges.filter(b => b.startsWith('ach_'));

  function isEpReward(badgeId) {
    return badgeId.startsWith('ach_') || SYSTEM_BADGE_IDS.includes(badgeId);
  }


  function sortBadgesDescending(arr) {
      return (arr || []).slice().sort((a, b) => getBadgeMeta(b).points - getBadgeMeta(a).points);
  }

  function setRollPresentationFromData(data) {
      const canonical = normalizeCanonicalRoll(data);
      traits = canonical.traits;
      identity = canonical.identity;
      rollContributors = canonical.contributors;
      badges = sortBadgesDescending(canonical.badges);
  }

  function getTomorrowMidnightUTC() {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  }

  function tickCountdown() {
      const diff = getTomorrowMidnightUTC().getTime() - Date.now();
      if (diff <= 0) {
          clearInterval(countdownInterval);
          phase = 'preroll';
          badges = [];
          traits = [];
          identity = '';
          rollContributors = [];
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
      const shareHex = normalizeHexColor(displayColor);
      const senderUsername = $profile?.username || $authUser?.user_metadata?.username || null;
      let shareUrl = getAppOrigin();

      const challengeLink = $isAuthenticated
        ? await createChallengeLink(supabase, {
            score,
            hex: shareHex,
            senderUsername
          })
        : { success: false };

      if (challengeLink.success && challengeLink.shareUrl) {
          shareUrl = new URL(challengeLink.shareUrl, getAppOrigin()).toString();
      } else if ($isAuthenticated) {
          addToast('The result was copied without a challenge link because the server could not create one.', 'error');
      }

      const callToAction = challengeLink.success ? `Challenge me: ${shareUrl}` : `Play ChromaDie: ${shareUrl}`;
      let shareString = `🎲 ChromaDie Daily Roll\n${shareHex} • ${score.toLocaleString()} pts • ${rarity}\n${callToAction}`;

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

  function resetRollPresentation() {
    if (scoreCountUpInterval) {
      clearInterval(scoreCountUpInterval);
      scoreCountUpInterval = null;
    }
    phase = 'preroll';
    loading = false;
    error = null;
    badges = [];
    traits = [];
    identity = '';
    rollContributors = [];
    displayHex = '#000000';
    displayColor = '#222';
    score = 0;
    rarity = '';
    displayScore = 0;
    scanProgress = 0;
    percentileDisplay = null;
    milestoneGranted = '';
    newMilestones = [];
    cotwHit = false;
    guestProgressRestored = false;
  }

  async function loadAuthenticatedRollState(userId, requestId) {
    loading = true;

    const { data: dbRoll, error: dailyRollError } = await supabase.rpc('get_my_daily_roll');

    if (requestId !== initialStateRequestId) return;

    if (dbRoll) {
      phase = 'results';
      score = dbRoll.score;
      displayScore = dbRoll.score;
      rarity = dbRoll.rarity;
      displayColor = dbRoll.hex_code;
      setRollPresentationFromData({ ...dbRoll, hex: dbRoll.hex_code });

      if (dbRoll.badges && dbRoll.badges.includes('cotw_hit')) {
          cotwHit = true;
      }

      const { data: percData } = await supabase.rpc('get_score_percentile', { p_score: dbRoll.score });
      if (requestId !== initialStateRequestId) return;
      if (percData) percentileDisplay = getPercentileTier(percData.percentile, percData.total_rollers);
    } else {
      phase = 'preroll';
      guestProgressRestored = false;
      if (!dailyRollError) {
        trackProductEvent('roll_ready', {
          surface: 'root',
          accountMode: 'authenticated'
        });
      }
    }

    loading = false;
  }

  async function loadGuestRollState(requestId) {
    const savedRoll = getSavedGuestRoll();

    if (requestId !== initialStateRequestId) return;

    if (savedRoll) {
      try {
        const rollData = JSON.parse(savedRoll);
        const validHex = normalizeHexColor(rollData?.hex, '');
        const validScore = Number.isSafeInteger(rollData?.score) && rollData.score >= 0 && rollData.score <= 10000000;
        const validRarity = ['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic'].includes(rollData?.rarity);
        if (rollData.date === getTodayString() && validHex && validScore && validRarity) {
          guestProgressRestored = true;
          guestProgressActive.set(true);
          phase = 'results';
          score = rollData.score; displayScore = rollData.score;
          rarity = rollData.rarity;
          displayColor = rollData.hex;
          setRollPresentationFromData(rollData);

          if (rollData.badges && rollData.badges.includes('cotw_hit')) {
              cotwHit = true;
          }

          const { data: percData } = await supabase.rpc('get_score_percentile', { p_score: rollData.score });
          if (requestId !== initialStateRequestId) return;
          if (percData) percentileDisplay = getPercentileTier(percData.percentile, percData.total_rollers);
          loading = false;
          return;
        }
        clearGuestRoll();
      } catch {
        clearGuestRoll();
      }
    }

    guestProgressRestored = false;
    guestProgressActive.set(false);
    phase = 'preroll';
    loading = false;
    trackProductEvent('roll_ready', {
      surface: 'root',
      accountMode: 'guest'
    });
  }

  async function syncInitialState() {
    if (!isRollReady($authInitialized)) return;

    const nextKey = $session?.user.id || 'guest';
    if (nextKey === initialStateKey) return;

    initialStateKey = nextKey;
    rollRequestId += 1;
    const requestId = ++initialStateRequestId;
    rerollRequestInFlight = false;
    error = null;
    resetRollPresentation();
    loading = true;

    if (getRollAccountMode($session) === 'authenticated') {
      guestProgressActive.set(false);
      await loadAuthenticatedRollState($session.user.id, requestId);
    } else {
      await loadGuestRollState(requestId);
    }
  }

  function handleGuestStorageChange(event) {
    if (event.key !== 'chromadie-roll' || $session?.user?.id) return;
    initialStateKey = null;
    void syncInitialState();
  }

  async function buildShareCardCanvas() {
    if (typeof document === 'undefined') return null;

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Font loading failure should not block image generation.
      }
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1200;
    exportCanvas.height = 630;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    const W = exportCanvas.width;
    const H = exportCanvas.height;
    const scoreText = Number(score || 0).toLocaleString();
    const cardColor = normalizeHexColor(displayColor || '#222222');

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, W, H);

    const backdrop = ctx.createLinearGradient(0, 0, W, H);
    backdrop.addColorStop(0, 'rgba(139, 124, 246, 0.18)');
    backdrop.addColorStop(0.55, 'rgba(10, 10, 13, 0.15)');
    backdrop.addColorStop(1, 'rgba(46, 211, 201, 0.10)');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, W, H);

    const accent = ctx.createLinearGradient(0, 0, W, 0);
    accent.addColorStop(0, '#ff4d4d');
    accent.addColorStop(0.2, '#ffab2e');
    accent.addColorStop(0.4, '#ffe14d');
    accent.addColorStop(0.6, '#6ee787');
    accent.addColorStop(0.8, '#4d7dff');
    accent.addColorStop(1, '#a15cff');
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 10);

    const cardX = 56;
    const cardY = 56;
    const cardW = 1088;
    const cardH = 518;
    const radius = 34;

    ctx.beginPath();
    ctx.moveTo(cardX + radius, cardY);
    ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, radius);
    ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, radius);
    ctx.arcTo(cardX, cardY + cardH, cardX, cardY, radius);
    ctx.arcTo(cardX, cardY, cardX + cardW, cardY, radius);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 16, 22, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 44px "Cabinet Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ChromaDie', 96, 132);

    ctx.fillStyle = '#767b8c';
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText('Daily Roll', 96, 164);

    const orbGlow = ctx.createRadialGradient(262, 326, 18, 262, 326, 150);
    orbGlow.addColorStop(0, cardColor);
    orbGlow.addColorStop(0.58, `${cardColor}CC`);
    orbGlow.addColorStop(0.82, `${cardColor}66`);
    orbGlow.addColorStop(1, `${cardColor}00`);
    ctx.fillStyle = orbGlow;
    ctx.beginPath();
    ctx.arc(262, 326, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cardColor;
    ctx.beginPath();
    ctx.arc(262, 326, 118, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '700 28px Inter, sans-serif';
    ctx.fillText(cardColor.toUpperCase(), 262, 482);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 92px "Cabinet Grotesk", sans-serif';
    ctx.fillText(scoreText, 460, 320);

    ctx.fillStyle = '#767b8c';
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillText('Entropy Points', 460, 368);

    const rarityColors = {
      Mythic: '#f1c40f',
      Epic: '#a15cff',
      Rare: '#3b82f6',
      Uncommon: '#10b981',
      Common: '#ffffff',
      Trash: '#767b8c'
    };
    ctx.fillStyle = rarityColors[rarity] || '#ffffff';
    ctx.font = '700 30px "Cabinet Grotesk", sans-serif';
    ctx.fillText((rarity || 'Common').toUpperCase(), 460, 420);

    ctx.fillStyle = '#767b8c';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText('Can you beat my color?', 460, 476);

    ctx.fillStyle = '#8b7cf6';
    ctx.font = '600 18px Inter, sans-serif';
    ctx.fillText(getAppOrigin().replace(/^https?:\/\//, ''), 460, 514);

    ctx.restore();
    return exportCanvas;
  }

  async function canvasToBlob(canvasEl) {
    return await new Promise(resolve => {
      canvasEl.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  async function generateShareImage() {
    const exportCanvas = await buildShareCardCanvas();
    if (!exportCanvas) return;

    imagePreviewUrl = exportCanvas.toDataURL('image/png');
    imageCopied = false;
    showImageModal = true;
    imageOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await tick();
    focusFirstElement(imageDialog) || imageDialog?.focus();
  }

  async function copyImageToClipboard() {
    const exportCanvas = await buildShareCardCanvas();
    if (!exportCanvas) return;

    const blob = await canvasToBlob(exportCanvas);
    if (!blob) return;

    try {
      if (navigator.clipboard?.write && window.ClipboardItem) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        imageCopied = true;
        addToast('Image copied to clipboard.', 'success');
        setTimeout(() => imageCopied = false, 2000);
        return;
      }

      throw new Error('Image clipboard is not supported in this browser.');
    } catch (err) {
      console.error('Clipboard write failed', err);
      addToast('Could not copy the share image in this browser.', 'error');
      imageCopied = false;
    }
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
    if (!canInitiateRoll({
      authInitialized: $authInitialized,
      loading,
      rerollRequestInFlight,
      isReroll,
      userId: $session?.user?.id || null,
      rerollShards: $rerollShards,
      rerollLocked: hasActiveRerollLock()
    })) {
      return;
    }

    loading = true;
    const requestId = ++rollRequestId;
    const requestUserId = $session?.user?.id || null;
    rerollRequestInFlight = isReroll;
    error = null;
    phase = 'rolling';
    badges = [];
    displayScore = 0;
    scanProgress = 0;
    percentileDisplay = null;
    milestoneGranted = '';
    newMilestones = [];
    cotwHit = false;

    if (isReroll) {
      setRerollLock();
    }

    const requestIsCurrent = () => requestId === rollRequestId
      && requestUserId === ($session?.user?.id || null);
    const abandonStaleRequest = () => {
      if (isReroll) clearRerollLock();
    };

    const { data, error: rpcError } = await requestRoll(supabase, isReroll);

    if (!requestIsCurrent()) {
      abandonStaleRequest();
      return;
    }

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
    if (!requestIsCurrent()) {
      clearInterval(scrambleInterval);
      abandonStaleRequest();
      return;
    }
    clearInterval(scrambleInterval);
    displayColor = '#222';

    const hexChars = data.hex.split('');
    for (let i = 0; i < 7; i++) {
      let currentText = hexChars.map((c, idx) => idx <= i ? c : '-').join('');
      displayHex = currentText;
      await sleep(500);
      if (!requestIsCurrent()) {
        abandonStaleRequest();
        return;
      }
    }

    await sleep(400);
    if (!requestIsCurrent()) {
      abandonStaleRequest();
      return;
    }
    const canonical = normalizeCanonicalRoll(data);
    displayColor = canonical.hex;

    traits = canonical.traits;
    identity = canonical.identity;
    rollContributors = canonical.contributors;
    const finalBadges = sortBadgesDescending(canonical.badges);
    const sortedBadgesForAnim = finalBadges.slice().sort((a, b) => getBadgeMeta(a).points - getBadgeMeta(b).points);

    for (const badgeId of sortedBadgesForAnim) {
      await sleep(700);
      if (!requestIsCurrent()) {
        abandonStaleRequest();
        return;
      }
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
    newMilestones = normalizeNewMilestones(data.new_milestones);

    if (data.badges && data.badges.includes('cotw_hit')) {
        cotwHit = true;
    }

    if (data.percentile !== undefined && data.total_rollers !== undefined) {
        percentileDisplay = getPercentileTier(data.percentile, data.total_rollers);
    }

    let targetScore = data.score;
    let currentScore = 0;
    if (scoreCountUpInterval) clearInterval(scoreCountUpInterval);
    scoreCountUpInterval = setInterval(() => {
      if (!requestIsCurrent()) {
        clearInterval(scoreCountUpInterval);
        scoreCountUpInterval = null;
        return;
      }
      currentScore += targetScore / 60;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        clearInterval(scoreCountUpInterval);
        scoreCountUpInterval = null;
      }
      displayScore = Math.floor(currentScore);
    }, 33);

    const rollData = createCanonicalRollData(data, getTodayString(), finalBadges);

    trackProductEvent('roll_completed', {
      surface: 'root',
      accountMode: getRollAccountMode($session),
      isReroll
    });

    if (!requestIsCurrent()) {
      abandonStaleRequest();
      return;
    }

    if (getRollAccountMode($session) === 'guest') {
      saveGuestRoll(rollData);
      guestProgressRestored = true;
      guestProgressActive.set(true);
    } else {
      const hadLaunchBadge = $profile?.equipped_badges?.includes('launch_edition');
      await Promise.all([
        refreshProfileState(requestUserId),
        fetchInventoryState(requestUserId),
        fetchWalletBalance(requestUserId)
      ]);
      if (!requestIsCurrent()) {
        abandonStaleRequest();
        return;
      }
      if (!hadLaunchBadge && $profile?.equipped_badges?.includes('launch_edition')) {
        addToast('Launch Edition badge unlocked!', 'success');
      }
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
    window.addEventListener('storage', handleGuestStorageChange);

    const { data: cotwData } = await supabase.from('meta').select('value').eq('key', 'cotw_target').single();
    if (cotwData?.value) {
        const [r, g, b] = cotwData.value.split(',');
        cotwColor = `rgb(${r}, ${g}, ${b})`;
    }
  });

  $: if ($authInitialized || $session) {
    void syncInitialState();
  }

  onDestroy(() => {
    rollRequestId += 1;
    if (scoreCountUpInterval) clearInterval(scoreCountUpInterval);
    clearInterval(countdownInterval);
    window.removeEventListener('storage', handleGuestStorageChange);
  });

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = showImageModal ? 'hidden' : '';
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });
</script>

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

<div class={'container game-container' + (profileMode ? ' game-container--profile' : '')}>
  {#if error}
    <p class="auth-error">{error}</p>
  {/if}

  {#if phase === 'preroll'}
    <div class="card">
      <h1>{profileMode ? 'Today’s color' : 'Daily Roll'}</h1>
      {#if $isAuthenticated}
        <p class="info-text">You can roll once a day. Your score counts on the leaderboard and adds to spendable EP; achievements and bonuses can add extra EP.</p>
      {:else}
        <p class="info-text">You can roll once a day in guest mode. Guest rolls stay on this device and do not earn account EP or enter leaderboards.</p>
      {/if}
      <button class="roll-btn" on:click={() => initiateRoll(false)} disabled={loading || !$authInitialized}>
        {loading ? 'Reading the spectrum…' : profileMode ? 'Reveal today’s color' : 'Roll the Die'}
      </button>

      {#if cotwColor}
        <div class="cotw-widget">
            <div class="cotw-info">
                <span class="cotw-title">🎯 Color of the Week</span>
                <span class="cotw-desc">
                  {#if $isAuthenticated}
                    Roll close to this color for <strong>+50,000 spendable EP</strong>. It will not change your leaderboard score.
                  {:else}
                    Signed-in players can earn <strong>+50,000 spendable EP</strong> for a close match. Guest rolls remain local-only.
                  {/if}
                </span>
            </div>
            <div class="cotw-swatch" style="background-color: {cotwColor};" title="Target Color"></div>
        </div>
      {/if}
    </div>

  {:else if phase === 'rolling'}
    <div class="card">
      <div class="results-header results-header-tight">
        <RollPreview displayColor={displayColor} rarity={rarity} />
        <div class="rolling-hex">{displayHex}</div>
      </div>
      <div class="scan-container">
        <div class="scan-bar" style="width: {scanProgress}%"></div>
      </div>
      <div class="badges-container badges-container-tight conditions-section">
        <div class="badges-title">Calculating your roll</div>
        <div class="badges-subtitle">
          {$isAuthenticated
            ? 'Roll score counts on the leaderboard and earns the same amount of spendable EP. Bonus EP goes only to your wallet.'
            : 'This score and its conditions are being calculated for your local-only guest result.'}
        </div>
        <div class="conditions-grid">
          {#each badges as badgeId (badgeId)}
            {@const badge = getBadgeMeta(badgeId)}
            <div class="badge-result rarity-{badge.rarity || 'Common'}">
              <span class="badge-symbol">{badge.symbol || '✨'}</span>
              <div class="badge-text">
                <span class="badge-title">{badge.name}</span>
                <span class="badge-desc">{badge.desc || ''}</span>
              </div>
              {#if badge.points > 0}
                <span class="badge-points" class:ep-points={isEpReward(badgeId)}>
                  +{badge.points.toLocaleString()} {$isAuthenticated ? (isEpReward(badgeId) ? 'bonus EP' : 'score + EP') : 'score'}
                </span>
              {:else}
                <span class="badge-points ep-points">Unlocked</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

  {:else if phase === 'results'}
    <div class="card">
      <div class="results-header results-header-tight">
        <div class="rarity-tag rarity-{rarity}">{rarity}</div>

        <RollPreview displayColor={displayColor} rarity={rarity} />

        <div class="hex-code">{displayColor}</div>
        {#if identity}
          <div class="identity-label">{identity}</div>
        {/if}
        <div class="score-label">{$isAuthenticated ? 'Leaderboard Score' : 'Local Guest Score'}</div>
        <div class="score-display">{displayScore.toLocaleString()}</div>
        <div class="score-help">
          {$isAuthenticated
            ? 'This sets your leaderboard position, and the same amount is added to your spendable EP. Bonus EP does not increase this score.'
            : 'This result is saved only in this browser for today. It does not enter a leaderboard or add EP to an account.'}
        </div>

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
          🎉 Color of the Week hit: +50,000 EP added to your wallet. Your leaderboard score is unchanged.
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

      {#if newMilestones.length}
        <div class="milestone-banner progression-unlock-banner" role="status" aria-live="polite">
          <strong>New expression unlocked</strong>
          {#each newMilestones as milestone (milestone.id)}
            <span>{milestone.reward?.name || milestone.name}</span>
          {/each}
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
          <button type="button" class="roll-btn" style="margin-top: 15px; display: inline-block;" on:click={() => dispatch('promptlogin', { mode: 'signup' })}>
            Create Account
          </button>
        </div>
      {/if}

      {#if traits.length > 0}
        <div class="trait-strip" aria-label="Color traits">
          {#each traits as trait (trait.id)}
            <span class="trait-pill">{trait.label}</span>
          {/each}
        </div>
      {/if}

      {#if systemBadges.length > 0}
        <div class="badges-container badges-container-tight" style="margin-top: 0; margin-bottom: 20px;">
          <div class="badges-title">EP Bonuses & Milestones</div>
          <div class="badges-subtitle">These rewards go to your wallet for Shop purchases. They do not change your leaderboard score.</div>
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
        <div class="badges-title">Score Contributors</div>
        <div class="badges-subtitle">
          {$isAuthenticated
            ? 'These points make up your leaderboard score and add the same amount to your spendable EP.'
            : 'These points make up your local guest score and are not added to an account wallet.'}
        </div>
        {#if rollContributors.length === 0}
          <div class="badge-result">
            <div class="badge-text">
              <span class="badge-title">Base roll score</span>
              <span class="badge-desc">No scoring conditions contributed beyond the base roll.</span>
            </div>
          </div>
        {:else}
          <div class="conditions-grid">
          {#each rollContributors as contributor (contributor.id)}
            {@const badge = getBadgeMeta(contributor.id)}
            <div class="badge-result rarity-{badge.rarity || 'Common'}">
              <span class="badge-symbol">{badge.symbol || '✨'}</span>
              <div class="badge-text">
                <span class="badge-title">{contributor.name || badge.name}</span>
                <span class="badge-desc">{badge.desc || 'Special condition met'}</span>
              </div>
              <span class="badge-points contributor-reward">
                <span>+{Number(contributor.awardedPoints || contributor.points || 0).toLocaleString()} score</span>
                {#if $isAuthenticated}<span class="contributor-ep">+ EP</span>{/if}
              </span>
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

      {#if $isAuthenticated}
        <div class="studio-onboarding">
          <div>
            <div class="studio-onboarding-title">Shape your profile</div>
            <div class="studio-onboarding-copy">Customize your name, profile surface, atmosphere, and expression layers in Profile Studio.</div>
          </div>
          <button type="button" class="chroma-btn studio-onboarding-btn" on:click={() => dispatch('navigate', { view: 'profile-settings' })}>
            Open Customize
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .results-header-tight { margin-bottom: 5px !important; }
  .post-score-actions { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 0 0 20px 0; flex-wrap: wrap; }
  .countdown-inline { color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-body-stack); background: rgba(255,255,255,0.03); padding: 6px 12px; border-radius: 9px; border: 1px solid var(--card-border); }
  .chroma-btn { display: inline-flex; align-items: center; gap: 5px; min-height: 42px; padding: 0 18px; border: 1px solid var(--card-border); border-radius: 9px; background: transparent; color: #f8f8f8; cursor: pointer; font: 600 .88rem/1 var(--font-body-stack); transition: transform 0.15s ease, background 0.18s ease, border-color 0.18s ease; }
  .chroma-btn:hover { transform: translateY(-1px); border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 9%, transparent); }
  .chroma-btn:active { transform: translateY(1px); }
  .reroll-btn { background: transparent; color: var(--color-accent-bright); border: 1px solid color-mix(in srgb, var(--color-accent) 58%, transparent); padding: 7px 18px; font-size: 0.85rem; border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font-body-stack); font-weight: 600; transition: all 0.2s; }
  .reroll-btn:hover { background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
  .reroll-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .identity-label {
    margin-top: 6px;
    color: var(--text-muted);
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0;
  }
  .score-help {
    max-width: 32rem;
    margin: 4px auto 0;
    color: var(--text-muted);
    font-size: 0.75rem;
    line-height: 1.45;
  }
  .trait-strip {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 0 20px;
  }
  .trait-pill {
    border: 1px solid var(--card-border);
    background: rgba(255, 255, 255, 0.045);
    color: var(--text-muted);
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }
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
  .contributor-reward {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .contributor-ep {
    color: #f1c40f;
    text-shadow: 0 0 8px rgba(241, 196, 15, 0.3);
  }
  .local-progress-banner {
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    color: color-mix(in srgb, var(--color-accent) 58%, #f8f4ff);
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
    border-radius: 18px;
    background: rgba(10, 10, 12, .58);
    border: 1px solid var(--card-border);
  }
  .guest-prompt-header {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    color: var(--color-accent);
    margin-bottom: 6px;
    font-family: var(--font-display-stack);
  }
  .guest-prompt-title {
    color: #fff;
    font-family: var(--font-display-stack);
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

  .studio-onboarding {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-top: 20px;
    padding: 16px 18px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    border-radius: 18px;
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    text-align: left;
  }
  .studio-onboarding-title {
    color: #fff;
    font-family: var(--font-display-stack);
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .studio-onboarding-copy {
    color: var(--text-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }
  .studio-onboarding-btn {
    flex: 0 0 auto;
  }

  .milestone-banner {
    background: rgba(245, 194, 111, .08);
    border: 1px solid rgba(245, 194, 111, .3);
    color: #f1c40f;
    padding: 12px;
    border-radius: 9px;
    margin-bottom: 20px;
    font-weight: 600;
    text-align: center;
    animation: badgePopIn 0.4s forwards;
  }

  .cotw-widget {
    margin-top: 25px; padding: 15px; background: var(--surface-panel-soft);
    border: 1px solid var(--color-line-subtle); border-radius: 18px;
    display: flex; align-items: center; justify-content: space-between; gap: 15px;
  }
  .cotw-info { text-align: left; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .cotw-title { font-size: 0.9rem; font-weight: 700; color: var(--color-accent); font-family: var(--font-display-stack); }
  .cotw-desc { font-size: 0.75rem; color: var(--text-muted); line-height: 1.35; }
  .cotw-swatch { width: 48px; height: 48px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 0 15px rgba(0,0,0,0.3); flex-shrink: 0; }

  .cotw-success-banner {
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    border-left: 4px solid var(--color-accent); color: #fff; padding: 12px 15px;
    border-radius: 9px; margin-bottom: 20px; font-weight: 600; text-align: left; font-size: 0.9rem;
  }

  .ep-points { color: #f1c40f !important; text-shadow: 0 0 10px rgba(241, 196, 15, 0.3) !important; }

  .image-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .image-modal-content { background: rgba(10, 10, 12, .92); border: 1px solid var(--card-border); border-radius: 18px; padding: 25px; max-width: 650px; width: 100%; max-height: calc(100dvh - 2rem); overflow-y: auto; text-align: center; }
  .image-modal-content h3 { margin: 0 0 20px 0; font-family: var(--font-display-stack); color: #fff; }
  .preview-img { width: 100%; max-height: min(63vw, calc(100dvh - 10rem)); object-fit: contain; border-radius: 8px; border: 1px solid var(--card-border); margin-bottom: 20px; }
  .modal-actions { display: flex; gap: 15px; justify-content: center; }
  .download-btn { background: #f8f8f8; color: #08080a; border: none; padding: 0 18px; min-height: 42px; border-radius: 9px; cursor: pointer; font-weight: 600; }
  .download-btn:hover { background: var(--color-accent); }
  .close-btn { background: transparent; color: #fff; border: 1px solid var(--card-border); padding: 0 18px; min-height: 42px; border-radius: 9px; cursor: pointer; font-weight: 500; }

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
    .roll-preview-frame {
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
    .studio-onboarding {
      align-items: stretch;
      flex-direction: column;
      padding: 15px;
    }
    .studio-onboarding-btn {
      width: 100%;
      justify-content: center;
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
      grid-template-columns: 28px minmax(0, 1fr);
      grid-template-areas:
        "icon text"
        "icon points";
      column-gap: 10px;
      row-gap: 7px;
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
      justify-self: start;
      align-self: start;
      width: auto;
      padding: 4px 7px;
      border: 1px solid currentColor;
      border-radius: 6px;
      background: rgba(255,255,255,0.035);
      font-size: 0.68rem;
      line-height: 1;
      text-align: left;
      white-space: nowrap;
    }
    .cotw-widget {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 12px 13px;
    }
    .cotw-info {
      gap: 3px;
    }
    .cotw-desc {
      font-size: 0.72rem;
    }
    .cotw-swatch {
      align-self: center;
      width: 44px;
      height: 44px;
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
