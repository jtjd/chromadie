<script>
  import RollRevealStage from './RollRevealStage.svelte';
  import RollPreRoll from './RollPreRoll.svelte';
  import RollResultBreakdown from './RollResultBreakdown.svelte';
  import RollResultHero from './RollResultHero.svelte';
  import RollResultRewards from './RollResultRewards.svelte';
  import RollResultActions from './RollResultActions.svelte';
  import { supabase } from './supabase';
  import { session, profile, authUser, authInitialized, accountState, guestProgressActive, fetchWalletBalance, fetchInventoryState, refreshProfileState, rerollShards, isAuthenticated, addToast, clearLocalAccountCache } from './stores';
  import { ACCOUNT_STATES } from './authState.js';
  import { createChallengeLink } from './challenges';
  import { getTodayString, normalizeHexColor } from './utils';
  import { getReadableTextColor } from './colorContrast.js';
  import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
  import { getBadgeMeta } from './badgeData';
  import { canInitiateRoll, createCanonicalRollData, getRollAccountMode, isRollReady, normalizeCanonicalRoll } from './rollState';
  import { normalizeNewMilestones } from './progressionState.js';
  import { getDisplayedBaseRollScore, getPercentileTier, sortRollBadgesDescending } from './rollPresentation.js';
  import { getRarityPresentation } from './rarityPresentation.js';
  import { getRank } from './ranks.js';
import { requestRoll } from './rollService.js';
import { executeRollAttempt } from './rollAttempt.js';
import { loadAuthenticatedRollSnapshot, loadGuestRollSnapshot } from './rollHydration.js';
import { runInitialRollHydration } from './rollInitialState.js';
import { runRollTextShare } from './rollTextShare.js';
  import {
    clearGuestRoll,
    clearRerollLock,
    GUEST_ROLL_STORAGE_KEY,
    hasActiveRerollLock,
    saveGuestRoll,
    setRerollLock
  } from './rollStorage.js';
  import { getAppOrigin } from './authUrls';
  import { trackProductEvent } from './productAnalytics.js';
  import { createScoreCountUpController } from './rollRevealController.js';
  import { ROLL_REVEAL_STEPS } from './rollReveal.js';
  import { playRollRevealSequence } from './rollRevealSequence.js';

  const dispatch = createEventDispatcher();
  export let profileMode = false;
  export let dedicated = false;
  export let surface = 'roll';
  export let signupNext = '/';
  export let showAcquisitionActions = false;
  let phase = 'preroll';
  let loading = false;
  let error = null;
  let copiedFeedbackVersion = 0;
  let rollTextShareAttemptId = 0;

  let displayHex = '#000000';
  let displayColor = '#222';

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
  let revealDetail = '';
  let revealSkipRequested = false;
  let revealConditions = [];
  let revealItemTotal = 0;
  let revealListElement = null;
  const scoreCountUp = createScoreCountUpController();

  let percentileDisplay = null;
  let copied = false;
  let countdownString = '24:00:00';
  let countdownInterval;
  let milestoneGranted = '';
  let newMilestones = [];

  let shareImageDialog = null;
  let RollShareImageDialogComponent = null;
  let guestProgressRestored = false;
  let rerollRequestInFlight = false;
  let rerollLocked = false;
  let initialStateKey = null;
  let initialStateDate = getTodayString();
  let initialStateRequestId = 0;
  let rollRequestId = 0;

  let cotwColor = null;
  let cotwHit = false;

  const SYSTEM_BADGE_IDS = ['beat_your_best', 'cotw_hit', 'streak_bonus_7', 'reroll_shard_earned', 'milestone_30', 'milestone_100', 'milestone_365'];
  $: systemBadges = badges.filter(b => SYSTEM_BADGE_IDS.includes(b));
  $: earnedAchievements = badges.filter(b => b.startsWith('ach_'));

  function dispatchRollState() {
    if (!dedicated) return;

    dispatch('rollstate', {
      accountKey: initialStateKey,
      phase,
      identity,
      hex: phase === 'results' ? normalizeHexColor(displayColor, '') : '',
      revealHex: phase === 'rolling' ? displayHex : '',
      rarity,
      score: Number(score) || 0,
      newProgressionUnlocks: newMilestones,
      weeklyFocusComplete: cotwHit
    });
  }

  function setRollPresentationFromData(data) {
      const canonical = normalizeCanonicalRoll(data);
      traits = canonical.traits;
      identity = canonical.identity;
      rollContributors = canonical.contributors;
      badges = sortRollBadgesDescending(canonical.badges);
  }

  function getTomorrowMidnightUTC() {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  }

  function tickCountdown() {
      rerollLocked = hasActiveRerollLock(undefined, Date.now(), $session?.user?.id || '');
      const diff = getTomorrowMidnightUTC().getTime() - Date.now();
      // A fresh tomorrow is always in the future. Compare the hydrated day
      // instead, including after a background tab resumes past midnight.
      if (initialStateDate !== getTodayString() && !loading) {
          initialStateKey = null;
          void syncInitialState();
      }
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      countdownString = `${h}:${m}:${s}`;
  }

  async function shareResultsText() {
      const shareAttemptId = ++rollTextShareAttemptId;
      const shareRequestId = rollRequestId;
      const shareAccountId = $session?.user?.id || null;
      const authenticated = $isAuthenticated;
      const rankName = authenticated ? getRank(Number($profile?.lifetime_ep) || 0).name : '';
      const earnedLine = authenticated
        ? newMilestones.length
          ? `Unlocked: ${newMilestones.map(milestone => milestone.reward?.name || milestone.name).join(', ')}`
          : `Rank: ${rankName}`
        : '';

      await runRollTextShare({
        requestId: shareRequestId,
        accountId: shareAccountId,
        authenticated,
        accountMode: getRollAccountMode($session),
        score,
        shareHex: normalizeHexColor(displayColor),
        rarity,
        earnedLine,
        senderUsername: $profile?.username || $authUser?.user_metadata?.username || null,
        appOrigin: getAppOrigin()
      }, {
        isCurrent: () => shareAttemptId === rollTextShareAttemptId
          && shareRequestId === rollRequestId
          && shareAccountId === ($session?.user?.id || null),
        createChallengeLink: payload => createChallengeLink(supabase, payload),
        writeText: text => navigator.clipboard.writeText(text),
        track: trackProductEvent,
        toast: addToast,
        onCopied: () => {
          const feedbackVersion = ++copiedFeedbackVersion;
          copied = true;
          setTimeout(() => {
            if (feedbackVersion === copiedFeedbackVersion) copied = false;
          }, 2000);
        }
      });
  }

  function prefersReducedMotion() {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function cancelScoreCountUp() {
    scoreCountUp.cancel();
  }

  function animateScoreCountUp(targetScore, requestIsCurrent, duration, reducedMotion = false, onProgress) {
    return scoreCountUp.animate({
      targetScore,
      isCurrent: requestIsCurrent,
      duration,
      reducedMotion,
      isSkipped: () => revealSkipRequested,
      onValue: value => { displayScore = value; },
      onProgress
    });
  }

  function skipReveal() {
    if (phase !== 'rolling') return;
    revealSkipRequested = true;
    revealDetail = 'Showing the confirmed result';
  }

  /** @param {Record<string, any>} patch */
  function applyRollRevealState(patch) {
    if (Object.hasOwn(patch, 'score')) score = patch.score;
    if (Object.hasOwn(patch, 'rarity')) rarity = patch.rarity;
    if (Object.hasOwn(patch, 'identity')) identity = patch.identity;
    if (Object.hasOwn(patch, 'traits')) traits = patch.traits;
    if (Object.hasOwn(patch, 'rollContributors')) rollContributors = patch.rollContributors;
    if (Object.hasOwn(patch, 'revealConditions')) revealConditions = patch.revealConditions;
    if (Object.hasOwn(patch, 'revealItemTotal')) revealItemTotal = patch.revealItemTotal;
    if (Object.hasOwn(patch, 'revealStep')) revealStep = patch.revealStep;
    if (Object.hasOwn(patch, 'revealDetail')) revealDetail = patch.revealDetail;
    if (Object.hasOwn(patch, 'displayHex')) displayHex = patch.displayHex;
    if (Object.hasOwn(patch, 'displayColor')) displayColor = patch.displayColor;
    if (Object.hasOwn(patch, 'displayScore')) displayScore = patch.displayScore;
    if (Object.hasOwn(patch, 'scanProgress')) scanProgress = patch.scanProgress;
  }

  async function presentRollResult(data, requestIsCurrent) {
    const reducedMotion = prefersReducedMotion();
    return playRollRevealSequence(data, {
      isCurrent: requestIsCurrent,
      isSkipped: () => revealSkipRequested,
      reducedMotion,
      applyState: applyRollRevealState,
      dispatchRollState,
      tick,
      scrollRevealList: behavior => revealListElement?.scrollTo({
        top: revealListElement.scrollHeight,
        behavior
      }),
      animateScoreCountUp
    });
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
    revealDetail = '';
    revealSkipRequested = false;
    revealConditions = [];
    revealItemTotal = 0;
    percentileDisplay = null;
    milestoneGranted = '';
    newMilestones = [];
    cotwHit = false;
    guestProgressRestored = false;
    copied = false;
  }

  function applyInitialRollSnapshot(snapshot, accountMode) {
    const isGuest = accountMode === 'guest';
    if (!isGuest && snapshot.error) error = snapshot.error.message || 'Today’s roll could not be loaded.';

    const roll = snapshot.roll;
    if (roll) {
      if (isGuest) {
        guestProgressRestored = true;
        guestProgressActive.set(true);
      }
      phase = 'results';
      score = roll.score;
      displayScore = roll.score;
      rarity = roll.rarity;
      displayColor = isGuest ? roll.hex : roll.hex_code;
      setRollPresentationFromData(isGuest ? roll : { ...roll, hex: roll.hex_code });

      if (roll.badges && roll.badges.includes('cotw_hit')) cotwHit = true;

      const percentileData = snapshot.percentileData;
      if (percentileData) {
        percentileDisplay = getPercentileTier(percentileData.percentile, percentileData.total_rollers);
      }
    } else {
      phase = 'preroll';
      guestProgressRestored = false;
      if (isGuest) guestProgressActive.set(false);
    }

    dispatchRollState();
    loading = false;
    if (!roll && (isGuest || !snapshot.error)) {
      trackProductEvent('roll_ready', { surface, accountMode });
    }
  }

  async function syncInitialState() {
    if (!isRollReady($authInitialized)) return;

    const nextKey = $session?.user.id || 'guest';
    if (nextKey === initialStateKey) return;

    initialStateKey = nextKey;
    initialStateDate = getTodayString();
    void shareImageDialog?.close(false);
    rollRequestId += 1;
    const requestId = ++initialStateRequestId;
    rerollRequestInFlight = false;
    error = null;
    resetRollPresentation();
    dispatchRollState();
    loading = true;

    const userId = getRollAccountMode($session) === 'authenticated' ? $session.user.id : null;
    if (userId) guestProgressActive.set(false);
    await runInitialRollHydration({
      userId,
      isRequestCurrent: () => requestId === initialStateRequestId,
      isSnapshotCurrent: () => requestId === initialStateRequestId
        && (!userId || userId === $session?.user?.id),
      loadAuthenticated: (accountId, isCurrent) => loadAuthenticatedRollSnapshot(supabase, {
        isCurrent: () => isCurrent() && accountId === $session?.user?.id
      }),
      loadGuest: isCurrent => loadGuestRollSnapshot({ supabaseClient: supabase, isCurrent }),
      applySnapshot: applyInitialRollSnapshot,
      onError: loadError => {
        error = loadError?.message || 'Today’s roll could not be loaded. Please try again.';
      },
      onFinally: () => { loading = false; }
    });
  }

  function handleGuestStorageChange(event) {
    if (event.key !== GUEST_ROLL_STORAGE_KEY || $session?.user?.id) return;
    initialStateKey = null;
    void syncInitialState();
  }

  async function generateShareImage() {
    const requestId = rollRequestId;
    if (!RollShareImageDialogComponent) {
      const { default: component } = await import('./RollShareImageDialog.svelte');
      if (requestId !== rollRequestId) return;
      RollShareImageDialogComponent = component;
      await tick();
    }
    if (requestId !== rollRequestId) return;
    await shareImageDialog?.open(requestId, () => requestId === rollRequestId);
  }

  async function initiateRoll(isReroll = false) {
    if (!canInitiateRoll({
      authInitialized: $authInitialized,
      loading,
      rerollRequestInFlight,
      isReroll,
      userId: $session?.user?.id || null,
      rerollShards: $rerollShards,
      rerollLocked: hasActiveRerollLock(undefined, Date.now(), $session?.user?.id || '')
    })) {
      return;
    }

    const previousResult = isReroll ? {
      score, rarity, badges, traits, identity, rollContributors, displayHex,
      displayColor, displayScore, percentileDisplay, milestoneGranted, newMilestones, cotwHit
    } : null;
    loading = true;
    void shareImageDialog?.close(false);
    const requestId = ++rollRequestId;
    const requestUserId = $session?.user?.id || null;
    const requestDate = getTodayString();
    rerollRequestInFlight = isReroll;
    error = null;
    phase = 'rolling';
    badges = [];
    displayHex = '#??????';
    displayColor = '#222';
    displayScore = 0;
    scanProgress = ROLL_REVEAL_STEPS[0].progress;
    revealStep = 0;
    revealDetail = 'Waiting for the server-confirmed roll';
    revealSkipRequested = false;
    revealConditions = [];
    revealItemTotal = 0;
    percentileDisplay = null;
    milestoneGranted = '';
    newMilestones = [];
    cotwHit = false;
    dispatchRollState();

    const rerollLockHandle = isReroll ? setRerollLock(undefined, Date.now(), requestUserId) : null;

    const requestIsCurrent = () => requestId === rollRequestId
      && requestUserId === ($session?.user?.id || null);
    const abandonStaleRequest = () => {
      if (rerollLockHandle) clearRerollLock(undefined, rerollLockHandle);
    };

    await executeRollAttempt({
      request: () => requestRoll(supabase, isReroll),
      isCurrent: requestIsCurrent,
      requestUserId,
      requestDate,
      saveGuestBeforeReveal: (data, date) => {
        // A confirmed guest result must survive navigation during its reveal.
        saveGuestRoll(createCanonicalRollData(data, date));
        guestProgressActive.set(true);
      },
      reveal: data => presentRollResult(data, requestIsCurrent),
      onRevealFailure: (_error, _data, canonical) => {
        displayHex = normalizeHexColor(canonical.hex, '#000000');
        displayColor = displayHex;
        displayScore = Number(canonical.score) || 0;
        addToast('Your roll was saved, but the reveal could not finish.', 'error');
      },
      onFailure: rpcError => {
        error = rpcError?.message || "An error occurred while rolling. Please try again.";
        if (previousResult) {
          ({ score, rarity, badges, traits, identity, rollContributors, displayHex,
            displayColor, displayScore, percentileDisplay, milestoneGranted, newMilestones, cotwHit } = previousResult);
          phase = 'results';
        } else phase = 'preroll';
        loading = false;
        rerollRequestInFlight = false;
        if (isReroll && rerollLockHandle) clearRerollLock(undefined, rerollLockHandle);
        dispatchRollState();
      },
      applyConfirmedResult: (data, canonical, date) => {
        traits = canonical.traits;
        identity = canonical.identity;
        rollContributors = canonical.contributors;
        const finalBadges = sortRollBadgesDescending(canonical.badges);
        badges = finalBadges;

        if (!prefersReducedMotion() && finalBadges.some(badgeId => getBadgeMeta(badgeId).points >= 1000000)) {
          document.querySelector('.container')?.classList.add('flash-jackpot', 'shake-screen');
          setTimeout(() => document.querySelector('.container')?.classList.remove('flash-jackpot', 'shake-screen'), 500);
        }

        score = data.score;
        rarity = data.rarity;
        milestoneGranted = data.milestone_granted || '';
        // Prefer the additive field, while the legacy response remains a
        // valid fallback during the migration window.
        newMilestones = normalizeNewMilestones(data.new_progression_unlocks);
        if (!newMilestones.length) {
          newMilestones = normalizeNewMilestones(data.new_milestones);
        }

        if (data.badges && data.badges.includes('cotw_hit')) {
          cotwHit = true;
          trackProductEvent('progression_weekly_focus_completed', {
            surface,
            accountMode: getRollAccountMode($session)
          });
        }

        if (data.percentile !== undefined && data.total_rollers !== undefined) {
          percentileDisplay = getPercentileTier(data.percentile, data.total_rollers);
        }

        phase = 'results';
        dispatchRollState();
        // The result card settles on the same confirmed score as its context.
        const rollData = createCanonicalRollData(data, date, finalBadges);

        trackProductEvent('roll_completed', {
          surface,
          accountMode: getRollAccountMode($session),
          isReroll
        });
        trackProductEvent('progression_roll_completed', {
          surface,
          accountMode: getRollAccountMode($session)
        });
        return rollData;
      },
      completeGuestResult: rollData => {
        saveGuestRoll(rollData);
        guestProgressRestored = true;
        guestProgressActive.set(true);
      },
      refreshAccount: async userId => {
        const hadLaunchBadge = $profile?.equipped_badges?.includes('launch_edition');
        const refreshResults = await Promise.allSettled([
          refreshProfileState(userId),
          fetchInventoryState(userId),
          fetchWalletBalance(userId)
        ]);
        return {
          refreshFailed: refreshResults.some(result => result.status === 'rejected')
            || (refreshResults[0].status === 'fulfilled' && !refreshResults[0].value),
          launchEditionUnlocked: !hadLaunchBadge
            && $profile?.equipped_badges?.includes('launch_edition')
        };
      },
      onAccountRefresh: refreshResult => {
        if (refreshResult.refreshFailed) {
          addToast('Your roll was saved, but account details could not refresh. Reload to update them.', 'error');
        }
        if (refreshResult.launchEditionUnlocked) addToast('Launch Edition badge unlocked!', 'success');
      },
      onStale: abandonStaleRequest,
      onComplete: () => {
        dispatchRollState();
        rerollRequestInFlight = false;
        if (isReroll && rerollLockHandle) clearRerollLock(undefined, rerollLockHandle);
        loading = false;
      }
    });
  }

  function beginGuestSignup(next = '') {
    if ($accountState !== ACCOUNT_STATES.SIGNED_OUT) return;
    const safeNext = typeof next === 'string' ? next : '';
    if (!$isAuthenticated) {
      clearGuestRoll();
      clearLocalAccountCache();
      guestProgressRestored = false;
      guestProgressActive.set(false);
    }
    trackProductEvent('progression_claim_started', { surface: 'roll', accountMode: 'guest' });
    dispatch('promptlogin', { mode: 'signup', ...(safeNext ? { next: safeNext } : {}) });
  }

  export function beginGuestSignupFromParent(next = signupNext) {
    beginGuestSignup(next);
  }

  onMount(async () => {
    tickCountdown();
    countdownInterval = setInterval(tickCountdown, 1000);
    window.addEventListener('storage', handleGuestStorageChange);

    if (dedicated) return;
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
    initialStateRequestId += 1;
    rollRequestId += 1;
    cancelScoreCountUp();
    clearInterval(countdownInterval);
    window.removeEventListener('storage', handleGuestStorageChange);
  });

</script>

{#if RollShareImageDialogComponent}
  <svelte:component
    this={RollShareImageDialogComponent}
    bind:this={shareImageDialog}
    score={score}
    {rarity}
    color={displayColor}
    ink={rollActionInk}
  />
{/if}

<div
  class={'container game-container' + (profileMode ? ' game-container--profile' : '') + (dedicated ? ' game-container--dedicated' : '') + (dedicated && rarity ? ' roll-rarity--' + rarity : '')}
  style={dedicated && rarity ? `--roll-rarity: ${getRarityPresentation(rarity || 'Common').color};` : ''}
>
  {#if error}
    <p class="auth-error" role="alert">{error}</p>
  {/if}

  {#if phase === 'preroll'}
    {#if dedicated}
      <RollPreRoll
        loading={loading}
        authInitialized={$authInitialized}
        isAuthenticated={$isAuthenticated}
        signedOut={$accountState === ACCOUNT_STATES.SIGNED_OUT}
        on:roll={() => initiateRoll(false)}
        on:signup={() => beginGuestSignup(signupNext)}
      />
    {:else}
      <div class="card roll-stage roll-stage--preroll">
        <h1>{profileMode ? 'Today’s color' : 'Daily Roll'}</h1>
        {#if $isAuthenticated}
          <p class="info-text">You can roll once a day. Your score counts on the leaderboard and adds to spendable EP; achievements and bonuses can add extra EP.</p>
        {:else}
          <p class="info-text">You can roll once a day in guest mode. Guest rolls stay on this device and do not earn account EP or enter leaderboards.</p>
        {/if}
        <button class="roll-btn" on:click={() => initiateRoll(false)} disabled={loading || !$authInitialized}>
          {loading ? 'Preparing roll…' : profileMode ? 'Reveal today’s color' : 'Roll the Die'}
        </button>
      </div>
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

  {:else if phase === 'rolling'}
    <RollRevealStage
      displayColor={displayColor}
      displayHex={displayHex}
      rarity={rarity || 'Common'}
      {revealStep}
      {revealDetail}
      {revealConditions}
      {revealItemTotal}
      {displayScore}
      {scanProgress}
      bind:revealListElement={revealListElement}
      on:skip={skipReveal}
    />

  {:else if phase === 'results'}
    <div class="card roll-stage roll-stage--results" style={`--roll-action-ink: ${rollActionInk}; --roll-result-color: ${normalizeHexColor(displayColor, '#ffffff')}; --roll-rarity: ${getRarityPresentation(rarity || 'Common').color};`} aria-labelledby="roll-result-title">
      <RollResultHero
        {displayColor}
        rarity={rarity || 'Common'}
        identity={identity || 'Today’s color'}
        traits={dedicated ? traits.slice(0, 2) : traits}
        totalScore={displayScore}
      />

      <RollResultBreakdown
        contributors={rollContributors}
        baseScore={getDisplayedBaseRollScore(displayScore, score, rollContributors)}
        totalScore={displayScore}
        showScore={false}
      />

      <div class="roll-result-footer">
        {#if !dedicated}<button
          type="button"
          class="roll-btn roll-action__button roll-action__button--claimed"
          style={`--roll-action-ink: ${rollActionInk};`}
          disabled
          aria-label={`Today's roll claimed for ${displayScore.toLocaleString()} score`}
        >
          <span class="roll-button-glyph" aria-hidden="true">✓</span>
          Claimed! +{displayScore.toLocaleString()}
        </button>{:else}
          <p class="roll-countdown" role="timer" aria-live="off">Next roll in <strong>{countdownString}</strong></p>
        {/if}

        {#if dedicated}
          <RollResultActions
            placement="dedicated"
            {showAcquisitionActions}
            isAuthenticated={$isAuthenticated}
            copied={copied}
            rerollShards={$rerollShards}
            rerollDisabled={loading || rerollRequestInFlight || rerollLocked || !$authInitialized}
            on:navigate={event => dispatch('navigate', event.detail)}
            on:share={shareResultsText}
            on:shareimage={generateShareImage}
            on:reroll={() => initiateRoll(true)}
          />
        {:else if showAcquisitionActions}
          <RollResultActions
            placement="acquisition"
            isAuthenticated={$isAuthenticated}
            isSignedOut={$accountState === ACCOUNT_STATES.SIGNED_OUT}
            copied={copied}
            on:navigate={event => dispatch('navigate', event.detail)}
            on:share={shareResultsText}
          />
        {/if}
      </div>

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

        <RollResultActions
          placement="post-score"
          isAuthenticated={$isAuthenticated}
          copied={copied}
          {countdownString}
          rerollShards={$rerollShards}
          rerollDisabled={loading || rerollRequestInFlight || rerollLocked || !$authInitialized}
          on:share={shareResultsText}
          on:shareimage={generateShareImage}
          on:reroll={() => initiateRoll(true)}
        />
      {/if}

      {#if milestoneGranted}
        <div class="milestone-banner">
          Milestone unlocked — you received <strong>{milestoneGranted}</strong>.
        </div>
      {/if}

      {#if !$isAuthenticated && guestProgressRestored && !dedicated}
        <div class="local-progress-banner" role="status" aria-live="polite">
          Preview restored on this device. It will be discarded when signup begins.
        </div>
      {/if}

      {#if !$isAuthenticated && !dedicated}
        <div class="guest-prompt">
          <div class="guest-prompt-copy">Save future rolls and earn EP.</div>
          <button type="button" class="roll-btn guest-prompt__button" on:click={() => beginGuestSignup(signupNext)}>
            Create an account
          </button>
        </div>
      {/if}

      {#if !dedicated}
        <RollResultRewards {systemBadges} {earnedAchievements} />
      {/if}

      {#if $isAuthenticated && !dedicated}
        <div class="studio-onboarding">
          <div>
            <div class="studio-onboarding-title">Make it yours</div>
            <div class="studio-onboarding-copy">Customize your profile surface and cosmetics.</div>
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
  :global(.game-container .chroma-btn) { display: inline-flex; align-items: center; gap: 5px; min-height: 42px; padding: 0 18px; border: 1px solid var(--card-border); border-radius: 9px; background: transparent; color: #f8f8f8; cursor: pointer; font: 600 .88rem/1 var(--font-body-stack); transition: transform 0.15s ease, background 0.18s ease, border-color 0.18s ease; }
  :global(.game-container .chroma-btn:hover) { transform: translateY(-1px); border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 9%, transparent); }
  :global(.game-container .chroma-btn:active) { transform: translateY(1px); }
  :global(.game-container .reroll-btn) { background: transparent; color: var(--color-accent-bright); border: 1px solid color-mix(in srgb, var(--color-accent) 58%, transparent); padding: 7px 18px; font-size: 0.85rem; border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font-body-stack); font-weight: 600; transition: all 0.2s; }
  :global(.game-container .reroll-btn:hover) { background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
  :global(.game-container .reroll-btn:disabled) { opacity: 0.5; cursor: not-allowed; }

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

  @media (max-width: 600px) {
    .final-color-display {
      width: 116px;
      height: 116px;
    }
    .roll-preview-frame {
      width: 116px;
      height: 116px;
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
    :global(.game-container .countdown-inline),
    :global(.game-container .chroma-btn),
    :global(.game-container .reroll-btn) {
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
  }

</style>
