<script>
  import RollTile from './RollTile.svelte';
  import { supabase } from './supabase';
  import { session, profile, authUser, authInitialized, guestProgressActive, fetchWalletBalance, fetchInventoryState, refreshProfileState, rerollShards, isAuthenticated, addToast, clearLocalAccountCache } from './stores';
  import { createChallengeLink } from './challenges';
  import { sleep, getTodayString, normalizeHexColor } from './utils';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y';
  import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
  import { getBadgeMeta } from './badgeData';
  import { canInitiateRoll, createCanonicalRollData, getRollAccountMode, isRollReady, normalizeCanonicalRoll } from './rollState';
  import { normalizeNewMilestones } from './progressionState.js';
  import { getPercentileTier } from './rollPresentation.js';
  import { getRarityPresentation } from './rarityPresentation.js';
  import { getRank } from './ranks.js';
  import { clearRerollLock, hasActiveRerollLock, requestRoll, setRerollLock } from './rollService.js';
  import { getAppOrigin } from './authUrls';
  import { trackProductEvent } from './productAnalytics.js';
  import {
    getRevealHex,
    getRollRevealItems,
    getRollRevealTimeline,
    ROLL_REVEAL_SIGNAL_COLORS,
    ROLL_REVEAL_STEPS
  } from './rollReveal.js';

  const dispatch = createEventDispatcher();
  export let profileMode = false;
  export let dedicated = false;
  let phase = 'preroll';
  let loading = false;
  let error = null;

  let displayHex = '#000000';
  let displayColor = '#222';

  function getReadableTextColor(value) {
    const hex = normalizeHexColor(value, '#ffffff').slice(1);
    const channels = [0, 2, 4].map(offset => {
      const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
    return luminance > 0.179 ? '#0e0e10' : '#ffffff';
  }

  $: rollActionInk = getReadableTextColor(displayColor);

  let score = 0;
  let rarity = '';
  let badges = [];
  let traits = [];
  let identity = '';
  let rollContributors = [];
  let displayScore = 0;
  let scanProgress = 0;
  let revealStep = 0;
  let revealStatus = ROLL_REVEAL_STEPS[0].label;
  let revealDetail = '';
  let revealSkipRequested = false;
  let revealConditions = [];
  let revealItemTotal = 0;
  let scoreCountUpFrame = null;
  let scoreCountUpResolve = null;

  let percentileDisplay = null;
  let copied = false;
  let countdownString = '24:00:00';
  let countdownInterval;
  let milestoneGranted = '';
  let newMilestones = [];
  let lastUnlockAnalyticsKey = '';

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

  const MAX_STORED_ROLL_SCORE = 100000000;

  const SYSTEM_BADGE_IDS = ['beat_your_best', 'cotw_hit', 'streak_bonus_7', 'reroll_shard_earned', 'milestone_30', 'milestone_100', 'milestone_365'];
  $: systemBadges = badges.filter(b => SYSTEM_BADGE_IDS.includes(b));
  $: earnedAchievements = badges.filter(b => b.startsWith('ach_'));

  function dispatchRollState() {
    if (!dedicated) return;

    dispatch('rollstate', {
      phase,
      identity,
      hex: phase === 'results' ? normalizeHexColor(displayColor, '') : '',
      rarity,
      score: Number(score) || 0,
      currentStreak: Number($profile?.current_streak) || 0,
      longestStreak: Number($profile?.longest_streak) || 0,
      totalRolls: Number($profile?.total_rolls) || 0,
      lifetimeEp: Number($profile?.lifetime_ep) || 0,
      isAuthenticated: Boolean($isAuthenticated),
      newProgressionUnlocks: newMilestones,
      weeklyFocusComplete: cotwHit
    });
  }

  function getContributorPoints(contributor) {
    return Number(contributor?.awardedPoints || contributor?.points || 0);
  }

  function getBaseRollScore() {
    const contributorTotal = rollContributors.reduce((total, contributor) => total + getContributorPoints(contributor), 0);
    return Math.max(0, Number(displayScore || score || 0) - contributorTotal);
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
          dispatchRollState();
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
      const rankName = $isAuthenticated ? getRank(Number($profile?.lifetime_ep) || 0).name : '';
      const earnedLine = $isAuthenticated
        ? newMilestones.length
          ? `Unlocked: ${newMilestones.map(milestone => milestone.reward?.name || milestone.name).join(', ')}`
          : `Rank: ${rankName}`
        : '';
      let shareString = `🎲 ChromaDie Daily Roll\n${shareHex} • ${score.toLocaleString()} pts • ${rarity}${earnedLine ? `\n${earnedLine}` : ''}\n${callToAction}`;

      trackProductEvent('progression_share_started', {
        surface: 'roll',
        accountMode: getRollAccountMode($session),
        method: 'clipboard'
      });

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

  function prefersReducedMotion() {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function cancelScoreCountUp() {
    if (scoreCountUpFrame !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(scoreCountUpFrame);
    }
    scoreCountUpFrame = null;
    if (scoreCountUpResolve) {
      scoreCountUpResolve(false);
      scoreCountUpResolve = null;
    }
  }

  function animateScoreCountUp(targetScore, requestIsCurrent, duration, reducedMotion = false, onProgress) {
    cancelScoreCountUp();
    const progressHandler = typeof onProgress === 'function' ? onProgress : () => {};

    if (reducedMotion || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      displayScore = targetScore;
      progressHandler(1);
      return Promise.resolve(requestIsCurrent());
    }

    return new Promise(resolve => {
      scoreCountUpResolve = resolve;
      const startedAt = Date.now();
      const update = () => {
        if (!requestIsCurrent()) {
          scoreCountUpFrame = null;
          scoreCountUpResolve = null;
          resolve(false);
          return;
        }

        const progress = Math.min(1, (Date.now() - startedAt) / duration);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        displayScore = Math.floor(targetScore * easedProgress);
        progressHandler(progress);

        if (progress >= 1 || revealSkipRequested) {
          displayScore = targetScore;
          scoreCountUpFrame = null;
          scoreCountUpResolve = null;
          resolve(true);
          return;
        }

        scoreCountUpFrame = window.requestAnimationFrame(update);
      };

      scoreCountUpFrame = window.requestAnimationFrame(update);
    });
  }

  function skipReveal() {
    if (phase !== 'rolling') return;
    revealSkipRequested = true;
    revealStatus = ROLL_REVEAL_STEPS[revealStep]?.label || ROLL_REVEAL_STEPS[0].label;
    revealDetail = 'Showing the server-confirmed result';
  }

  async function presentRollResult(data, requestIsCurrent) {
    const canonical = normalizeCanonicalRoll(data);
    const reducedMotion = prefersReducedMotion();
    const conditionCount = Array.isArray(data?.conditions)
      ? data.conditions.length
      : canonical.contributors.length;
    const timing = getRollRevealTimeline({
      rarity: canonical.rarity,
      score: canonical.score,
      conditionCount,
      reducedMotion
    });
    const revealItems = getRollRevealItems(canonical, timing.conditionRevealCount);
    revealConditions = [];
    revealItemTotal = revealItems.length;

    const waitForBeat = async delay => {
      if (revealSkipRequested) return requestIsCurrent();
      if (delay > 0) await sleep(delay);
      return requestIsCurrent() && !revealSkipRequested;
    };
    const waitThroughStage = async (duration, messages, onBeat) => {
      const safeMessages = messages.length ? messages : [''];
      const beatDuration = duration / safeMessages.length;
      const beatHandler = typeof onBeat === 'function' ? onBeat : () => {};
      for (let index = 0; index < safeMessages.length; index += 1) {
        if (revealSkipRequested) return false;
        beatHandler(index, safeMessages[index]);
        if (!await waitForBeat(beatDuration)) return false;
      }
      return true;
    };
    const finalize = () => {
      const finalHex = normalizeHexColor(canonical.hex, '#000000');
      score = Number(canonical.score) || 0;
      rarity = canonical.rarity || 'Common';
      identity = canonical.identity;
      traits = canonical.traits;
      rollContributors = canonical.contributors;
      revealConditions = revealItems;
      revealStep = ROLL_REVEAL_STEPS.length - 1;
      revealStatus = ROLL_REVEAL_STEPS[ROLL_REVEAL_STEPS.length - 1].label;
      revealDetail = `${conditionCount} server-confirmed condition${conditionCount === 1 ? '' : 's'} secured`;
      displayHex = finalHex;
      displayColor = finalHex;
      displayScore = score;
      scanProgress = 100;
      return canonical;
    };

    displayColor = '#222';
    displayHex = getRevealHex(canonical.hex, 0);
    revealStep = 0;
    revealStatus = ROLL_REVEAL_STEPS[0].label;
    revealDetail = 'The server-confirmed signal is ready to read';
    scanProgress = ROLL_REVEAL_STEPS[0].progress;
    displayScore = 0;
    score = 0;
    rarity = '';
    identity = '';
    traits = [];
    rollContributors = [];

    if (!await waitThroughStage(
      timing.signal,
      ['Sampling hue', 'Measuring saturation', 'Mapping lightness', 'Preparing the condition scan'],
      (index, message) => {
        revealStatus = ROLL_REVEAL_STEPS[0].label;
        revealDetail = message;
        displayColor = ROLL_REVEAL_SIGNAL_COLORS[index % ROLL_REVEAL_SIGNAL_COLORS.length];
      }
    )) {
      if (!requestIsCurrent()) return null;
      if (revealSkipRequested) return finalize();
    }

    revealStep = 1;
    scanProgress = ROLL_REVEAL_STEPS[1].progress;
    for (const [index, lockedChannels] of [1, 2, 3].entries()) {
      if (revealSkipRequested) return finalize();
      revealStatus = ROLL_REVEAL_STEPS[1].label;
      revealDetail = `${['Red', 'Green', 'Blue'][index]} channel locked`;
      displayHex = getRevealHex(canonical.hex, lockedChannels);
      displayColor = ROLL_REVEAL_SIGNAL_COLORS[(index + 2) % ROLL_REVEAL_SIGNAL_COLORS.length];
      if (!await waitForBeat(timing.channel)) {
        if (!requestIsCurrent()) return null;
        if (revealSkipRequested) return finalize();
      }
    }

    displayHex = normalizeHexColor(canonical.hex, '#000000');
    displayColor = normalizeHexColor(canonical.hex, '#000000');
    revealStep = 2;
    scanProgress = ROLL_REVEAL_STEPS[2].progress;
    revealStatus = ROLL_REVEAL_STEPS[2].label;
    revealDetail = `${conditionCount} server-reported condition${conditionCount === 1 ? '' : 's'} found`;
    if (!await waitForBeat(timing.conditionIntro)) {
      if (!requestIsCurrent()) return null;
      if (revealSkipRequested) return finalize();
    }

    for (let index = 0; index < revealItems.length; index += 1) {
      if (revealSkipRequested) return finalize();
      const item = revealItems[index];
      revealConditions = [...revealConditions, item];
      revealDetail = item.kind === 'condition' && item.points > 0
        ? `${item.label} found · +${item.points.toLocaleString()} score`
        : `${item.label} checked`;
      if (!await waitForBeat(timing.conditionBeat)) {
        if (!requestIsCurrent()) return null;
        if (revealSkipRequested) return finalize();
      }
    }

    revealDetail = 'Validating the final pattern stack';
    if (!await waitForBeat(timing.conditionSettle)) {
      if (!requestIsCurrent()) return null;
      if (revealSkipRequested) return finalize();
    }

    if (revealSkipRequested) return finalize();
    revealStep = 3;
    scanProgress = ROLL_REVEAL_STEPS[3].progress;
    rarity = canonical.rarity || 'Common';
    identity = canonical.identity;
    revealStatus = ROLL_REVEAL_STEPS[3].label;
    const rarityMessages = rarity === 'Mythic'
      ? ['Comparing the full roll space', 'Rare convergence detected', 'Mythic threshold confirmed']
      : [`Comparing the full roll space`, `${rarity} threshold is in range`, 'Rarity signal confirmed'];
    if (!await waitThroughStage(timing.rarity, rarityMessages, (_index, message) => {
      revealDetail = message;
    })) {
      if (!requestIsCurrent()) return null;
      if (revealSkipRequested) return finalize();
    }

    if (revealSkipRequested) return finalize();
    revealStep = 4;
    scanProgress = ROLL_REVEAL_STEPS[4].progress;
    score = Number(canonical.score) || 0;
    rollContributors = canonical.contributors;
    traits = canonical.traits;
    revealStatus = ROLL_REVEAL_STEPS[4].label;
    revealDetail = 'Adding the confirmed score signals';
    const scoreComplete = await animateScoreCountUp(
      score,
      requestIsCurrent,
      timing.score,
      reducedMotion,
      progress => {
        revealDetail = progress < 0.35
          ? 'Adding the color signal'
          : progress < 0.75
            ? 'Adding condition bonuses'
            : 'Confirming the final total';
      }
    );
    if (!scoreComplete || !requestIsCurrent()) {
      if (!requestIsCurrent()) return null;
      if (revealSkipRequested) return finalize();
    }

    if (revealSkipRequested) return finalize();
    revealStep = 5;
    scanProgress = ROLL_REVEAL_STEPS[5].progress;
    revealStatus = ROLL_REVEAL_STEPS[5].label;
    revealDetail = `${conditionCount} condition${conditionCount === 1 ? '' : 's'} and ${score.toLocaleString()} score secured`;
    if (!await waitForBeat(timing.settle)) {
      if (!requestIsCurrent()) return null;
      if (revealSkipRequested) return finalize();
    }
    return finalize();
  }

  function resetRollPresentation() {
    cancelScoreCountUp();
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
    revealStep = 0;
    revealStatus = ROLL_REVEAL_STEPS[0].label;
    revealDetail = '';
    revealSkipRequested = false;
    revealConditions = [];
    revealItemTotal = 0;
    percentileDisplay = null;
    milestoneGranted = '';
    newMilestones = [];
    lastUnlockAnalyticsKey = '';
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

    dispatchRollState();
    loading = false;
  }

  async function loadGuestRollState(requestId) {
    const savedRoll = getSavedGuestRoll();

    if (requestId !== initialStateRequestId) return;

    if (savedRoll) {
      try {
        const rollData = JSON.parse(savedRoll);
        const validHex = normalizeHexColor(rollData?.hex, '');
        const validScore = Number.isSafeInteger(rollData?.score) && rollData.score >= 0 && rollData.score <= MAX_STORED_ROLL_SCORE;
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
          dispatchRollState();
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
    dispatchRollState();
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
    displayHex = '#------';
    displayColor = '#222';
    displayScore = 0;
    scanProgress = ROLL_REVEAL_STEPS[0].progress;
    revealStep = 0;
    revealStatus = ROLL_REVEAL_STEPS[0].label;
    revealDetail = 'Waiting for the server-confirmed roll';
    revealSkipRequested = false;
    revealConditions = [];
    revealItemTotal = 0;
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

    // The server has already returned the authoritative result. The staged
    // reveal below only explains that result to the player; it never chooses,
    // scores, or mutates the roll.
    const canonical = await presentRollResult(data, requestIsCurrent);
    if (!canonical) {
      abandonStaleRequest();
      return;
    }

    traits = canonical.traits;
    identity = canonical.identity;
    rollContributors = canonical.contributors;
    const finalBadges = sortBadgesDescending(canonical.badges);
    badges = finalBadges;

    if (finalBadges.some(badgeId => getBadgeMeta(badgeId).points >= 1000000)) {
      document.querySelector('.container')?.classList.add('flash-jackpot', 'shake-screen');
      setTimeout(() => document.querySelector('.container')?.classList.remove('flash-jackpot', 'shake-screen'), 500);
    }

    score = data.score;
    rarity = data.rarity;
    milestoneGranted = data.milestone_granted || '';
    // The additive field is preferred, while the legacy response remains a
    // valid fallback during the migration window.
    newMilestones = normalizeNewMilestones(data.new_progression_unlocks);
    if (!newMilestones.length) {
      newMilestones = normalizeNewMilestones(data.new_milestones);
    }

    if (newMilestones.length) {
      const unlockKey = newMilestones.map(milestone => milestone.id).join('|');
      if (unlockKey !== lastUnlockAnalyticsKey) {
        lastUnlockAnalyticsKey = unlockKey;
        for (const milestone of newMilestones) {
          trackProductEvent('progression_unlock_seen', {
            surface: dedicated ? 'dedicated-roll' : 'root-roll',
            accountMode: getRollAccountMode($session),
            track: milestone.track || 'rank'
          });
        }
      }
    }

    if (data.badges && data.badges.includes('cotw_hit')) {
        cotwHit = true;
        trackProductEvent('progression_weekly_focus_completed', {
          surface: dedicated ? 'dedicated-roll' : 'root-roll',
          accountMode: getRollAccountMode($session)
        });
    }

    if (data.percentile !== undefined && data.total_rollers !== undefined) {
        percentileDisplay = getPercentileTier(data.percentile, data.total_rollers);
    }

    phase = 'results';
    dispatchRollState();
    // The server-confirmed score was already counted during the rolling
    // timeline. Mount the final card atomically so the dedicated context and
    // result card settle on the same value.

    const rollData = createCanonicalRollData(data, getTodayString(), finalBadges);

    trackProductEvent('roll_completed', {
      surface: 'root',
      accountMode: getRollAccountMode($session),
      isReroll
    });
    trackProductEvent('progression_roll_completed', {
      surface: dedicated ? 'dedicated-roll' : 'root-roll',
      accountMode: getRollAccountMode($session)
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

    dispatchRollState();
    rerollRequestInFlight = false;
    if (isReroll) {
      clearRerollLock();
    }
    loading = false;
  }

  function beginGuestSignup() {
    if (!$isAuthenticated) {
      clearGuestRoll();
      clearLocalAccountCache();
      guestProgressRestored = false;
      guestProgressActive.set(false);
    }
    trackProductEvent('progression_claim_started', { surface: 'roll', accountMode: 'guest' });
    dispatch('promptlogin', { mode: 'signup' });
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
    cancelScoreCountUp();
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

<div
  class={'container game-container' + (profileMode ? ' game-container--profile' : '') + (dedicated ? ' game-container--dedicated' : '') + (dedicated && rarity ? ' roll-rarity--' + rarity : '')}
  style={dedicated && rarity ? `--roll-rarity: ${getRarityPresentation(rarity || 'Common').color};` : ''}
>
  {#if error}
    <p class="auth-error">{error}</p>
  {/if}

  {#if phase === 'preroll'}
    <div class="card roll-stage roll-stage--preroll">
      {#if dedicated}
        <div class="roll-card-header">
          <div>
            <p class="roll-card-header__title">Daily Roll</p>
            <p class="roll-card-header__meta">{$isAuthenticated ? 'Saved to your profile' : 'Saved on this device'}</p>
          </div>
        </div>
        <div class="roll-display roll-display--preview" aria-label="Daily roll preview">
          <RollTile displayColor="#28282C" rarity="Common" idle={true} label="Unrevealed daily roll" />
          <div class="roll-color-info">
            <div class="roll-color-rarity">DAILY ROLL</div>
            <div class="roll-color-name">Ready to reveal</div>
            <div class="roll-color-hex">Roll to discover today’s color</div>
          </div>
        </div>

        <button class="roll-btn roll-action__button" on:click={() => initiateRoll(false)} disabled={loading || !$authInitialized}>
          <span class="roll-button-glyph" aria-hidden="true">△</span>
          {loading ? 'Reading…' : 'Roll For Today'}
        </button>

        {#if !$isAuthenticated}
          <div class="guest-prompt guest-prompt--preroll">
            <div class="guest-prompt-copy">Roll first. When you create an account, your next saved roll starts your journey.</div>
            <button type="button" class="roll-btn guest-prompt__button" on:click={beginGuestSignup}>
              Create Account
            </button>
          </div>
        {/if}

      {:else}
        <h1>{profileMode ? 'Today’s color' : 'Daily Roll'}</h1>
        {#if $isAuthenticated}
          <p class="info-text">You can roll once a day. Your score counts on the leaderboard and adds to spendable EP; achievements and bonuses can add extra EP.</p>
        {:else}
          <p class="info-text">You can roll once a day in guest mode. Guest rolls stay on this device and do not earn account EP or enter leaderboards.</p>
        {/if}
        <button class="roll-btn" on:click={() => initiateRoll(false)} disabled={loading || !$authInitialized}>
          {loading ? 'Reading the spectrum…' : profileMode ? 'Reveal today’s color' : 'Roll the Die'}
        </button>
      {/if}

      {#if cotwColor && !dedicated}
        <div class="cotw-widget" aria-label={$isAuthenticated ? 'Color of the Week. Match this color for 50,000 spendable EP; it does not change your leaderboard score.' : 'Color of the Week. Sign in to earn 50,000 spendable EP for a close match.'}>
          <div class="cotw-info">
            <span class="cotw-title">Color of the Week</span>
            <span class="cotw-desc">
              {#if $isAuthenticated}
                Match for <strong>+50,000 EP</strong>
              {:else}
                Sign in to earn <strong>+50,000 EP</strong>
              {/if}
            </span>
          </div>
          <div class="cotw-swatch" style="background-color: {cotwColor};" title="Target Color"></div>
        </div>
      {/if}
    </div>

  {:else if phase === 'rolling'}
    <div class="card roll-stage roll-stage--rolling" aria-live="polite">
      <div class="roll-card-header">
        <div>
          <p class="roll-card-header__title">Daily Roll</p>
          <p class="roll-card-header__meta">Reading today’s color</p>
        </div>
        <span class="roll-mode-pill">IN PROGRESS</span>
      </div>
      <div class="roll-rolling-display" data-reveal-step={revealStep}>
        <RollTile displayColor={displayColor} rarity={rarity || 'Common'} label="Color being rolled" />
        <p class="roll-stage__eyebrow">{revealStatus}</p>
        <h2 class="roll-stage__title">{revealStep === ROLL_REVEAL_STEPS.length - 1 ? 'This one is yours.' : 'Finding your color.'}</h2>
        <div class="rolling-hex">{displayHex}</div>
        <p class="roll-stage__status" role="status">
          {revealDetail}
        </p>
        <div class="roll-reveal-steps" aria-label="Daily roll reveal stages">
          {#each ROLL_REVEAL_STEPS as step, index (step.id)}
            <span class:active={revealStep === index} class:complete={revealStep > index}>{step.label}</span>
          {/each}
        </div>
        {#if revealStep >= 2}
          <div class="roll-reveal-discovery" aria-label="Server-confirmed signals being revealed">
            <div class="roll-reveal-discovery__header">
              <span>Signal breakdown</span>
              <strong>{`${revealConditions.length}/${revealItemTotal} highlights`}</strong>
            </div>
            <div class="roll-reveal-discovery__list">
              {#each revealConditions as item (item.id)}
                <div class="roll-reveal-discovery__item">
                  <span class="roll-reveal-discovery__mark" aria-hidden="true">{item.kind === 'condition' ? '✦' : item.kind === 'trait' ? '✧' : '◌'}</span>
                  <span>{item.label}</span>
                  {#if item.points}<strong>+{item.points.toLocaleString()}</strong>{/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if revealStep >= 4}
          <div class="roll-score-reveal" aria-live="polite">
            <span>Confirmed score</span>
            <strong>{displayScore.toLocaleString()}</strong>
            <small>EP · counting live</small>
          </div>
        {/if}
      </div>
      <div class="scan-container" role="progressbar" aria-label="Daily roll reveal progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(scanProgress)}>
        <div class="scan-bar" style="width: {scanProgress}%"></div>
      </div>
      <div class="roll-progress-label">
        <span>{revealStatus}</span>
        <strong>{Math.round(scanProgress)}%</strong>
      </div>
      <button type="button" class="roll-reveal-skip" on:click={skipReveal}>
        Skip reveal
      </button>
    </div>

  {:else if phase === 'results'}
    <div class="card roll-stage roll-stage--results" style={`--roll-result-color: ${normalizeHexColor(displayColor, '#ffffff')}; --roll-rarity: ${getRarityPresentation(rarity || 'Common').color};`} aria-labelledby="roll-result-title">
        <div class="roll-card-header">
          <div>
            <p class="roll-card-header__title">Daily Roll</p>
            <p class="roll-card-header__meta">{$isAuthenticated ? 'Saved to your profile' : 'Saved on this device'}</p>
          </div>
        </div>
      <div class="roll-display" aria-live="polite">
        <RollTile displayColor={displayColor} rarity={rarity || 'Common'} label="Rolled color" />
        <div class="roll-color-info">
          <h2 id="roll-result-title" class="roll-color-name">{identity || 'Today’s color'}</h2>
          <div class="roll-result-meta">
            <div class="roll-color-hex">{displayColor}</div>
            <div class="roll-color-rarity" aria-label={`${rarity || 'Common'} rarity`} title={`${rarity || 'Common'} rarity`}>
              <span class="roll-color-rarity__icon" aria-hidden="true">{getRarityPresentation(rarity || 'Common').icon}</span>
              <span>{rarity || 'Common'}</span>
            </div>
          </div>
          {#if traits.length > 0}
            <div class="roll-attr-tags" aria-label="Color traits">
              {#each (dedicated ? traits.slice(0, 2) : traits) as trait (trait.id)}
                <span class="roll-attr-tag">{trait.label}</span>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="roll-breakdown roll-breakdown--result" aria-label="Score breakdown">
        <div class="roll-breakdown__header">Score Breakdown</div>
        <div class="roll-breakdown__list" role="list">
          {#if getBaseRollScore() > 0}
            <div class="roll-breakdown__row" role="listitem" aria-label={`Base roll: ${getBaseRollScore().toLocaleString()} score`}>
              <div class="roll-breakdown__label"><span class="roll-breakdown__icon">⚡</span>Base Roll</div>
              <div class="roll-breakdown__value">{getBaseRollScore().toLocaleString()} <span class="roll-breakdown__points">score</span></div>
            </div>
          {/if}
          {#each rollContributors as contributor (contributor.id)}
            {@const badge = getBadgeMeta(contributor.id)}
            {@const awardedPoints = getContributorPoints(contributor)}
            <div
              class="roll-breakdown__row"
              role="listitem"
              aria-label={(contributor.name || badge.name) + ': ' + (badge.desc || 'Special condition met') + '. +' + awardedPoints.toLocaleString() + ' score'}
              title={badge.desc || 'Special condition met'}
            >
              <div class="roll-breakdown__label"><span class="roll-breakdown__icon">{badge.symbol || '✨'}</span>{contributor.name || badge.name}</div>
              <div class="roll-breakdown__value">{awardedPoints.toLocaleString()} <span class="roll-breakdown__points">score</span></div>
            </div>
          {/each}
          <div class="roll-breakdown__row roll-breakdown__row--total roll-score-total">
            <div class="roll-breakdown__label">Total Earned</div>
            <div class="roll-breakdown__value">{displayScore.toLocaleString()} <span class="roll-breakdown__points">score</span></div>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="roll-btn roll-action__button roll-action__button--claimed"
        style={`--roll-action-ink: ${rollActionInk};`}
        disabled
        aria-label={dedicated ? `Next roll in ${countdownString}` : `Today's roll claimed for ${displayScore.toLocaleString()} score`}
      >
        <span class="roll-button-glyph" aria-hidden="true">{dedicated ? '◷' : '✓'}</span>
        {#if dedicated}
          Next roll · {countdownString}
        {:else}
          Claimed! +{displayScore.toLocaleString()}
        {/if}
      </button>

      {#if cotwHit}
        <div class="cotw-success-banner">
          Color of the Week hit — +50,000 EP added to your wallet. Your leaderboard score is unchanged.
        </div>
      {/if}

      {#if !dedicated}
        {#if percentileDisplay}
          <div class="rank-display" style="--rank-color: {percentileDisplay.color};">
            {percentileDisplay.text}
            <span class="rank-display__total">(of {percentileDisplay.total.toLocaleString()} rollers)</span>
          </div>
        {/if}

        <div class="post-score-actions" aria-label="Roll result actions">
          <div class="countdown-inline">
            <span class="countdown-inline__label">Next roll</span>
            <strong>{countdownString}</strong>
          </div>
          <button class="chroma-btn result-action result-action--primary" on:click={shareResultsText}>
            {copied ? 'Copied' : 'Share result'}
          </button>
          <button class="chroma-btn result-action" on:click={generateShareImage}>
            View image
          </button>

          {#if $isAuthenticated && $rerollShards > 0}
            <button class="reroll-btn result-action result-action--reroll" on:click={() => initiateRoll(true)} disabled={loading || rerollRequestInFlight || hasActiveRerollLock() || !$authInitialized}>
              Reroll · {$rerollShards} left
            </button>
          {/if}
        </div>
      {/if}

      {#if milestoneGranted}
        <div class="milestone-banner">
          Milestone unlocked — you received <strong>{milestoneGranted}</strong>.
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

      {#if !$isAuthenticated && guestProgressRestored && !dedicated}
        <div class="local-progress-banner" role="status" aria-live="polite">
          Preview restored on this device. It will be discarded when signup begins.
        </div>
      {/if}

      {#if !$isAuthenticated}
        <div class="guest-prompt">
          <div class="guest-prompt-copy">This preview will not transfer. Create an account to start saving future rolls.</div>
          <button type="button" class="roll-btn guest-prompt__button" on:click={beginGuestSignup}>
            Create Account
          </button>
        </div>
      {/if}

      {#if !dedicated}
        <div class="roll-detail-grid">
      {#if systemBadges.length > 0}
        <section class="roll-detail-section badges-container badges-container-tight" aria-labelledby="roll-rewards-title">
          <div class="roll-detail-section__heading">
            <div class="badges-title" id="roll-rewards-title">EP bonuses & milestones</div>
            <div class="badges-subtitle">Wallet rewards · separate from score</div>
          </div>
          {#each systemBadges as badgeId (badgeId)}
            {@const badge = getBadgeMeta(badgeId)}
            <div class="badge-result roll-detail-item rarity-Mythic">
              <span class="badge-symbol">{badge.symbol || '✨'}</span>
              <div class="badge-text">
                <span class="badge-title">{badge.name}</span>
                <span class="badge-desc">{badge.desc || ''}</span>
              </div>
              {#if badge.points > 0}
                <span class="badge-points ep-points">+{badge.points.toLocaleString()} EP</span>
              {:else}
                <span class="badge-points ep-points">Granted</span>
              {/if}
            </div>
          {/each}
        </section>
      {/if}

      {#if earnedAchievements.length > 0}
        <section class="roll-detail-section badges-container badges-container-tight" aria-labelledby="roll-achievements-title">
          <div class="roll-detail-section__heading">
            <div class="badges-title" id="roll-achievements-title">Achievements unlocked</div>
            <div class="badges-subtitle">New rewards from this roll</div>
          </div>
          {#each earnedAchievements as badgeId (badgeId)}
            {@const badge = getBadgeMeta(badgeId)}
            <div class="badge-result roll-detail-item rarity-Mythic">
              <span class="badge-symbol">{badge.symbol || '🏆'}</span>
              <div class="badge-text">
                <span class="badge-title">{badge.name}</span>
                <span class="badge-desc">{badge.desc}</span>
              </div>
              <span class="badge-points ep-points">+{badge.points.toLocaleString()} EP</span>
            </div>
          {/each}
        </section>
      {/if}
        </div>
      {/if}

      {#if $isAuthenticated && !dedicated}
        <div class="studio-onboarding">
          <div>
            <div class="studio-onboarding-title">Make it yours</div>
            <div class="studio-onboarding-copy">Customize your profile surface and expression.</div>
          </div>
          <button type="button" class="chroma-btn studio-onboarding-btn" on:click={() => dispatch('navigate', { view: 'profile-settings' })}>
            Customize
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .roll-rolling-display {
    position: relative;
    isolation: isolate;
    overflow: hidden;
  }
  .roll-rolling-display::before {
    position: absolute;
    z-index: -1;
    inset: 18% 12%;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--color-accent, #8b7cf6) 20%, transparent), transparent 68%);
    content: '';
    filter: blur(1rem);
    opacity: .65;
    animation: rollRevealGlow 1.8s ease-in-out infinite;
    pointer-events: none;
  }
  .roll-rolling-display > * { position: relative; z-index: 1; }
  .roll-reveal-steps {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 6px;
    width: min(100%, 360px);
    margin-top: 4px;
  }
  .roll-reveal-steps span {
    min-width: 0;
    padding-top: 6px;
    border-top: 1px solid color-mix(in srgb, var(--color-line-subtle, #ffffff) 80%, transparent);
    color: var(--text-faint, #767b8c);
    font: 600 .56rem/1.2 var(--font-mono-stack);
    letter-spacing: .04em;
    text-transform: uppercase;
    transition: color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }
  .roll-reveal-steps span.active,
  .roll-reveal-steps span.complete {
    border-color: var(--color-accent, #8b7cf6);
    color: var(--color-ink-strong, #ffffff);
    box-shadow: 0 -3px 10px color-mix(in srgb, var(--color-accent, #8b7cf6) 24%, transparent);
  }
  .roll-reveal-discovery {
    display: grid;
    gap: 8px;
    width: min(100%, 360px);
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--color-line-subtle, #ffffff) 72%, transparent);
  }
  .roll-reveal-discovery__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-muted, #a4a4b5);
    font: 600 .62rem/1.2 var(--font-mono-stack);
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .roll-reveal-discovery__header strong {
    color: var(--color-ink-strong, #ffffff);
    font-weight: 600;
    white-space: nowrap;
  }
  .roll-reveal-discovery__list { display: grid; gap: 5px; }
  .roll-reveal-discovery__item {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr) auto;
    align-items: center;
    gap: 7px;
    min-height: 24px;
    padding: 4px 7px;
    border: 1px solid color-mix(in srgb, var(--color-accent, #8b7cf6) 18%, var(--card-border, rgba(255, 255, 255, .12)));
    border-radius: 7px;
    background: color-mix(in srgb, var(--color-accent, #8b7cf6) 6%, transparent);
    color: var(--text-muted, #a4a4b5);
    font-size: .68rem;
    animation: rollRevealCondition .34s ease-out both;
  }
  .roll-reveal-discovery__item > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .roll-reveal-discovery__mark { color: var(--color-accent-bright, #c4b5fd); text-align: center; }
  .roll-reveal-discovery__item strong { color: var(--color-ink-strong, #ffffff); font: 600 .62rem/1 var(--font-mono-stack); white-space: nowrap; }
  .roll-score-reveal {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 7px;
    width: min(100%, 360px);
    margin-top: 12px;
    padding: 9px 11px;
    border: 1px solid color-mix(in srgb, var(--color-accent, #8b7cf6) 32%, var(--card-border, rgba(255, 255, 255, .12)));
    border-radius: 9px;
    background: color-mix(in srgb, var(--color-accent, #8b7cf6) 9%, transparent);
  }
  .roll-score-reveal span { color: var(--text-muted, #a4a4b5); font: 600 .62rem/1 var(--font-mono-stack); letter-spacing: .08em; text-transform: uppercase; }
  .roll-score-reveal strong { color: var(--color-ink-strong, #ffffff); font: 600 1.35rem/1 var(--font-display-stack); letter-spacing: -.04em; }
  .roll-score-reveal small { color: var(--text-muted, #a4a4b5); font: 600 .58rem/1 var(--font-mono-stack); letter-spacing: .06em; text-transform: uppercase; }
  .roll-reveal-skip {
    align-self: center;
    min-height: 36px;
    margin-top: 8px;
    padding: 6px 10px;
    border: 1px solid var(--card-border, rgba(255, 255, 255, .12));
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #a4a4b5);
    cursor: pointer;
    font: 600 .68rem/1 var(--font-mono-stack);
    letter-spacing: .08em;
    text-transform: uppercase;
    transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
  }
  .roll-reveal-skip:hover,
  .roll-reveal-skip:focus-visible {
    border-color: var(--color-accent, #8b7cf6);
    background: color-mix(in srgb, var(--color-accent, #8b7cf6) 10%, transparent);
    color: var(--color-ink-strong, #ffffff);
  }
  .roll-reveal-skip:focus-visible { outline: 2px solid var(--color-accent-bright, #c4b5fd); outline-offset: 3px; }
  @keyframes rollRevealGlow {
    0%, 100% { opacity: .45; transform: scale(.92); }
    50% { opacity: .8; transform: scale(1.08); }
  }
  @keyframes rollRevealCondition {
    from { opacity: 0; transform: translateY(4px) scale(.98); }
    to { opacity: 1; transform: none; }
  }

  .post-score-actions { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 0 0 20px 0; flex-wrap: wrap; }
  .countdown-inline { color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-body-stack); background: rgba(255,255,255,0.03); padding: 6px 12px; border-radius: 9px; border: 1px solid var(--card-border); }
  .chroma-btn { display: inline-flex; align-items: center; gap: 5px; min-height: 42px; padding: 0 18px; border: 1px solid var(--card-border); border-radius: 9px; background: transparent; color: #f8f8f8; cursor: pointer; font: 600 .88rem/1 var(--font-body-stack); transition: transform 0.15s ease, background 0.18s ease, border-color 0.18s ease; }
  .chroma-btn:hover { transform: translateY(-1px); border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 9%, transparent); }
  .chroma-btn:active { transform: translateY(1px); }
  .reroll-btn { background: transparent; color: var(--color-accent-bright); border: 1px solid color-mix(in srgb, var(--color-accent) 58%, transparent); padding: 7px 18px; font-size: 0.85rem; border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font-body-stack); font-weight: 600; transition: all 0.2s; }
  .reroll-btn:hover { background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
  .reroll-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .badges-container-tight { margin-bottom: 0 !important; margin-top: 20px; }
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
    .roll-reveal-steps span { font-size: .48rem; letter-spacing: 0; }
    .roll-reveal-discovery__header { font-size: .56rem; }
    .roll-reveal-skip { width: 100%; }
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

  @media (prefers-reduced-motion: reduce) {
    .roll-rolling-display::before { animation: none; }
    .roll-reveal-steps span { transition: none; }
    .roll-reveal-discovery__item { animation: none; }
    .roll-reveal-skip { transition: none; }
  }
</style>
