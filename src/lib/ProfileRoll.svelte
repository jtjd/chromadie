<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import RollPreview from './RollPreview.svelte';
  import { supabase } from './supabase';
  import {
    addToast,
    authInitialized,
    fetchInventoryState,
    fetchWalletBalance,
    isAuthenticated,
    profile,
    refreshProfileState,
    rerollShards,
    session
  } from './stores';
  import { getBadgeMeta } from './badgeData';
  import { getPercentileTier } from './rollPresentation.js';
  import { canInitiateRoll, normalizeCanonicalRoll } from './rollState.js';
  import { clearRerollLock, hasActiveRerollLock, requestRoll, setRerollLock } from './rollService.js';
  import { trackProductEvent } from './productAnalytics.js';
  import { sleep, normalizeHexColor } from './utils.js';
  import Module from './foundation/Module.svelte';

  export let moduleSize = 'wide';
  export let compact = false;
  export let integrated = false;
  export let quiet = false;
  export let presentation = '';
  export let visualFixture = '';
  /** @type {Record<string, any> | null} */
  export let fixtureResult = null;

  const dispatch = createEventDispatcher();
  const REVEAL_STAGES = Object.freeze([
    'Charging the spectrum…',
    'Reading the chroma…',
    'Locking your color…',
    'Color locked.'
  ]);
  const REVEAL_SPECTRUM = Object.freeze([
    '#FF4D8D',
    '#FF8A4C',
    '#F7DA4B',
    '#63DE8B',
    '#43C8F5',
    '#756CFF',
    '#C65CFF',
    '#FF5DB1'
  ]);
  const REVEAL_PACE = 3;
  const REVEAL_DELAYS = Object.freeze(
    [100, 110, 120, 140, 175, 220, 280, 360].map(delay => delay * REVEAL_PACE)
  );
  const REVEAL_STEP_LABELS = Object.freeze(['Spectrum', 'Signal', 'Lock']);
  const SYSTEM_BADGE_IDS = new Set([
    'beat_your_best',
    'cotw_hit',
    'streak_bonus_7',
    'reroll_shard_earned',
    'milestone_30',
    'milestone_100',
    'milestone_365'
  ]);

  let phase = 'loading';
  let loading = true;
  let error = '';
  let displayHex = '#------';
  let displayColor = '#222222';
  let score = 0;
  let displayScore = 0;
  let rarity = '';
  let identity = '';
  let traits = [];
  let contributors = [];
  let revealedBadges = [];
  let newAchievements = [];
  let milestoneGranted = '';
  let cotwHit = false;
  let percentileDisplay = null;
  let countdownString = '24:00:00';
  let countdownInterval = null;
  let initialRequestId = 0;
  let rollRequestId = 0;
  let rerollRequestInFlight = false;
  let revealStage = 0;
  let skipRevealRequested = false;
  let freshReveal = false;
  let detailsOpen = true;
  let shareInProgress = false;
  let replayData = null;
  let replayCanonical = null;

  $: fixtureRollReady = visualFixture === 'guest-onboarding' && Boolean(fixtureResult);
  $: rewardBadges = revealedBadges.filter(id => SYSTEM_BADGE_IDS.has(id));
  $: canReroll = Boolean($isAuthenticated && Number($rerollShards) > 0);
  $: canReplayReveal = Boolean($isAuthenticated && $profile?.is_staff && replayData && replayCanonical);
  $: revealStatus = REVEAL_STAGES[revealStage] || REVEAL_STAGES[0];
  $: conditionSource = contributors.length
    ? contributors.map((contributor, index) => {
      const badge = getBadge(contributor?.id);
      return {
        id: 'contributor-' + (contributor?.id || 'unknown') + '-' + index,
        label: contributor?.name || badge.name || contributor?.id || 'Score condition',
        symbol: badge.symbol || '✦',
        points: Number(contributor?.awardedPoints ?? contributor?.points) || 0
      };
    })
    : traits.length
      ? traits.map((trait, index) => ({
        id: 'trait-' + (trait?.id || 'unknown') + '-' + index,
        label: trait?.label || trait?.name || trait?.id || 'Color trait',
        symbol: '✦',
        points: 0
      }))
      : revealedBadges
        .filter(id => !SYSTEM_BADGE_IDS.has(id) && !String(id).startsWith('ach_'))
        .map(id => {
          const badge = getBadge(id);
          return { id: 'badge-' + id, label: badge.name || id, symbol: badge.symbol || '✦', points: 0 };
        });
  $: headlineConditions = conditionSource.slice(0, integrated ? 3 : 4);
  $: revealIntensity = ['Mythic', 'Anomaly'].includes(rarity)
    ? 'high'
    : ['Epic', 'Rare'].includes(rarity)
      ? 'medium'
      : 'quiet';

  function prefersReducedMotion() {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function sortBadgesDescending(ids) {
    return (Array.isArray(ids) ? ids : [])
      .filter(id => typeof id === 'string')
      .slice(0, 80)
      .sort((left, right) => getBadgeMeta(right).points - getBadgeMeta(left).points);
  }

  function normalizeNewAchievements(entries) {
    return (Array.isArray(entries) ? entries : [])
      .filter(entry => entry && typeof entry.id === 'string')
      .slice(0, 12)
      .map(entry => ({
        id: entry.id,
        name: typeof entry.name === 'string' ? entry.name : getBadgeMeta('ach_' + entry.id).name,
        icon: typeof entry.icon === 'string' ? entry.icon : getBadgeMeta('ach_' + entry.id).symbol,
        epReward: Number(entry.ep_reward) || 0
      }));
  }

  function getBadge(id) {
    return getBadgeMeta(String(id || ''));
  }

  function getTomorrowMidnightUTC() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  }

  function tickCountdown() {
    const difference = getTomorrowMidnightUTC().getTime() - Date.now();
    const hours = Math.max(0, Math.floor(difference / 3600000));
    const minutes = Math.max(0, Math.floor((difference % 3600000) / 60000));
    const seconds = Math.max(0, Math.floor((difference % 60000) / 1000));
    countdownString = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  function clearRollState() {
    displayHex = '#------';
    displayColor = '#222222';
    score = 0;
    displayScore = 0;
    rarity = '';
    identity = '';
    traits = [];
    contributors = [];
    revealedBadges = [];
    newAchievements = [];
    milestoneGranted = '';
    cotwHit = false;
    percentileDisplay = null;
    revealStage = 0;
    skipRevealRequested = false;
    freshReveal = false;
    detailsOpen = true;
  }

  function applyServerPresentation(data, canonical, { animateScore = false, revealBadges = true, notifyProfile = true } = {}) {
    const safeCanonical = canonical || normalizeCanonicalRoll(data);
    displayHex = normalizeHexColor(safeCanonical.hex, '#000000');
    displayColor = displayHex;
    score = Number(safeCanonical.score) || 0;
    displayScore = animateScore ? 0 : score;
    rarity = safeCanonical.rarity || 'Common';
    identity = safeCanonical.identity;
    traits = safeCanonical.traits;
    contributors = safeCanonical.contributors;
    revealedBadges = revealBadges ? sortBadgesDescending(safeCanonical.badges) : [];
    newAchievements = normalizeNewAchievements(data?.new_achievements);
    milestoneGranted = typeof data?.milestone_granted === 'string' ? data.milestone_granted : '';
    cotwHit = safeCanonical.badges.includes('cotw_hit');
    percentileDisplay = data?.percentile !== undefined && data?.total_rollers !== undefined
      ? getPercentileTier(data.percentile, data.total_rollers)
      : null;
    if (notifyProfile) {
      // This event is presentation-only. The canonical server response remains
      // the authority for the roll and lets the profile color presentation follow it.
      dispatch('colorchange', { hex: displayHex, canonical: safeCanonical });
    }
  }

  function primeCanonicalConditions(canonical) {
    traits = Array.isArray(canonical?.traits) ? canonical.traits : [];
    contributors = Array.isArray(canonical?.contributors) ? canonical.contributors : [];
  }

  function setPrerollState() {
    clearRollState();
    phase = 'preroll';
    loading = false;
  }

  async function restoreTodayRoll() {
    const requestId = ++initialRequestId;
    const userId = $session?.user?.id || null;
    if (!$authInitialized || !$isAuthenticated || !userId) {
      error = 'Sign in to roll from your profile.';
      phase = 'error';
      loading = false;
      return;
    }

    phase = 'loading';
    loading = true;
    error = '';
    const { data, error: restoreError } = await supabase.rpc('get_my_daily_roll');
    if (requestId !== initialRequestId || userId !== ($session?.user?.id || null)) return;

    if (restoreError) {
      error = 'Today’s roll could not be restored. Please try again.';
      phase = 'error';
      loading = false;
      return;
    }

    if (!data) {
      setPrerollState();
      trackProductEvent('roll_ready', {
        surface: 'profile',
        accountMode: 'authenticated'
      });
      return;
    }

    replayData = { ...data, hex: data.hex_code || data.hex };
    replayCanonical = normalizeCanonicalRoll(replayData);
    applyServerPresentation(replayData, replayCanonical);
    revealStage = 3;
    phase = 'results';
    loading = false;

    const { data: percentile } = await supabase.rpc('get_score_percentile', { p_score: score });
    if (requestId !== initialRequestId || userId !== ($session?.user?.id || null)) return;
    if (percentile) percentileDisplay = getPercentileTier(percentile.percentile, percentile.total_rollers);
  }

  async function animateCanonicalResult(data, canonical, requestId, requestUserId) {
    const reducedMotion = prefersReducedMotion();
    displayColor = '#222222';
    displayHex = '#------';
    revealedBadges = [];
    revealStage = 0;
    // The secure roll response is already canonical at this point. Prime only
    // its condition metadata so the reveal can stage those conditions while
    // the visual spectrum is still resolving; score and rewards remain settled
    // by applyServerPresentation below.
    primeCanonicalConditions(canonical);

    for (let index = 0; index < REVEAL_SPECTRUM.length; index += 1) {
      if (skipRevealRequested) break;
      revealStage = index < 3 ? 0 : index < 6 ? 1 : 2;
      displayColor = REVEAL_SPECTRUM[index];
      dispatch('colorpreview', { hex: displayColor });
      if (!reducedMotion) await sleep(REVEAL_DELAYS[index]);
      if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) return false;
    }

    applyServerPresentation(data, canonical, {
      animateScore: true,
      revealBadges: false,
      notifyProfile: true
    });
    revealStage = 3;
    if (!reducedMotion && !skipRevealRequested) await sleep(480 * REVEAL_PACE);
    if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) return false;

    freshReveal = true;
    phase = 'results';

    const scoreTarget = score;
    const scoreSteps = reducedMotion || skipRevealRequested ? 1 : 12;
    for (let step = 1; step <= scoreSteps; step += 1) {
      const progress = step / scoreSteps;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      displayScore = Math.round(scoreTarget * easedProgress);
      if (!reducedMotion && !skipRevealRequested) await sleep(45 * REVEAL_PACE);
      if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) return false;
    }
    displayScore = scoreTarget;

    applyServerPresentation(data, canonical, { notifyProfile: false });
    return true;
  }

  function skipReveal() {
    skipRevealRequested = true;
    revealStage = 3;
  }

  async function shareRoll() {
    if (shareInProgress || phase !== 'results') return;
    shareInProgress = true;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const conditions = headlineConditions.map(condition => condition.label).join(', ');
    const text = `I rolled ${displayHex} for ${displayScore.toLocaleString()} EP (${rarity}) on ChromaDie.${conditions ? ` Conditions: ${conditions}.` : ''}`;

    try {
      let method = '';
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: `${displayHex} · ${displayScore.toLocaleString()} EP`, text, url });
        method = 'native';
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        method = 'clipboard';
      } else {
        throw new Error('Share is unavailable.');
      }
      trackProductEvent('profile_shared', { surface: 'roll', method });
      addToast(method === 'clipboard' ? 'Roll share text copied.' : 'Roll shared.', 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') addToast('Could not share this roll.', 'error');
    } finally {
      shareInProgress = false;
    }
  }

  async function replayReveal() {
    if (!canReplayReveal || loading) return;

    const requestId = ++rollRequestId;
    const requestUserId = $session?.user?.id || null;
    const savedData = replayData;
    const savedCanonical = replayCanonical;
    loading = true;
    error = '';
    phase = 'rolling';
    clearRollState();
    dispatch('rollstart', { replay: true });

    const animated = await animateCanonicalResult(savedData, savedCanonical, requestId, requestUserId);
    if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) return;

    loading = false;
    if (!animated) phase = 'results';
  }

  async function initiateRoll(isReroll = false) {
    if (!canInitiateRoll({
      authInitialized: $authInitialized || fixtureRollReady,
      loading,
      rerollRequestInFlight,
      isReroll,
      userId: $session?.user?.id || null,
      rerollShards: $rerollShards,
      rerollLocked: hasActiveRerollLock()
    })) return;

    const requestId = ++rollRequestId;
    const requestUserId = $session?.user?.id || null;
    loading = true;
    error = '';
    phase = 'rolling';
    clearRollState();
    dispatch('rollstart', { isReroll });

    if (visualFixture === 'guest-onboarding' && fixtureResult) {
      const canonical = normalizeCanonicalRoll(fixtureResult);
      const animated = await animateCanonicalResult(fixtureResult, canonical, requestId, requestUserId);
      if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) return;
      loading = false;
      if (!animated) phase = 'results';
      dispatch('rollcomplete', { data: fixtureResult, canonical, guest: true });
      return;
    }

    rerollRequestInFlight = isReroll;
    if (isReroll) setRerollLock();

    const abandonStaleRequest = () => {
      if (isReroll) clearRerollLock();
      rerollRequestInFlight = false;
    };

    const response = await requestRoll(supabase, isReroll);
    if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) {
      abandonStaleRequest();
      return;
    }

    if (!response.success || !response.data || !response.canonical) {
      error = response.error?.message || 'The server could not complete this roll. Please try again.';
      phase = 'preroll';
      loading = false;
      dispatch('rollcancel', { reason: 'server' });
      abandonStaleRequest();
      return;
    }

    replayData = {
      ...response.data,
      new_achievements: [],
      milestone_granted: null
    };
    replayCanonical = response.canonical;
    const animated = await animateCanonicalResult(response.data, response.canonical, requestId, requestUserId);
    if (!animated) {
      abandonStaleRequest();
      return;
    }

    trackProductEvent('roll_completed', {
      surface: 'profile',
      accountMode: 'authenticated',
      isReroll
    });
    phase = 'results';
    loading = false;
    const hadLaunchBadge = $profile?.equipped_badges?.includes('launch_edition');
    await Promise.all([
      refreshProfileState(requestUserId),
      fetchInventoryState(requestUserId),
      fetchWalletBalance(requestUserId)
    ]);

    if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) {
      abandonStaleRequest();
      return;
    }

    if (!hadLaunchBadge && $profile?.equipped_badges?.includes('launch_edition')) {
      addToast('Launch Edition badge unlocked!', 'success');
    }
    rerollRequestInFlight = false;
    if (isReroll) clearRerollLock();
    dispatch('rollcomplete', { data: response.data, canonical: response.canonical });
  }

  onMount(() => {
    detailsOpen = true;
    tickCountdown();
    countdownInterval = setInterval(tickCountdown, 1000);
    if (visualFixture === 'pre-roll') {
      setPrerollState();
      return;
    }
    if (visualFixture === 'guest-onboarding' && fixtureResult) {
      setPrerollState();
      return;
    }
    if (visualFixture === 'owner' && fixtureResult) {
      const canonical = normalizeCanonicalRoll(fixtureResult);
      applyServerPresentation(fixtureResult, canonical);
      revealStage = 3;
      phase = 'results';
      loading = false;
      return;
    }
    void restoreTodayRoll();
  });

  onDestroy(() => {
    initialRequestId += 1;
    rollRequestId += 1;
    if (countdownInterval) clearInterval(countdownInterval);
    if (rerollRequestInFlight) clearRerollLock();
  });
</script>

<Module size={moduleSize} tone="accent" className={'profile-roll' + (compact ? ' profile-roll--compact' : '') + (integrated ? ' profile-roll--integrated' : '') + (quiet ? ' profile-roll--quiet' : '') + (presentation ? ' profile-roll--presentation' : '')} eyebrow={integrated ? '' : 'Today’s living event'} title={integrated ? '' : 'Roll the next chapter'} description={integrated ? '' : 'Your daily color arrives here, then becomes part of the profile visitors remember.'}>
  {#if phase === 'loading'}
    <div class="profile-roll__state" role="status" aria-live="polite">
      <span class="profile-roll__pulse" aria-hidden="true"></span>
      <p>Checking today’s roll…</p>
    </div>
  {:else if phase === 'error'}
    <div class="profile-roll__state profile-roll__state--error" role="alert">
      <p>{error}</p>
      <button type="button" class="profile-roll__button profile-roll__button--secondary" on:click={restoreTodayRoll}>Retry</button>
    </div>
  {:else if phase === 'preroll'}
    <div class="profile-roll__ready">
      <div class="profile-roll__ready-copy">
        <div class="profile-roll__ready-meta">
          <p class="profile-roll__eyebrow">Today’s color</p>
          <div class="profile-roll__availability" aria-label={'Roll resets in ' + countdownString}>
            <span>Resets in</span>
            <strong>{countdownString}</strong>
          </div>
        </div>
        <h3>Roll your color.</h3>
        <p class="profile-roll__copy">One daily roll adds a new color to your profile.</p>
      </div>
      <button type="button" class="profile-roll__reveal-button" on:click={() => initiateRoll(false)} disabled={loading || (!$authInitialized && !fixtureRollReady)}>
        <span class="profile-roll__reveal-swatch" aria-hidden="true"><span></span></span>
        <span class="profile-roll__reveal-copy"><strong>{loading ? 'Preparing…' : 'Roll today'}</strong><small>One roll available</small></span>
        <span class="profile-roll__reveal-arrow" aria-hidden="true">→</span>
      </button>
    </div>
  {:else if phase === 'rolling'}
    <div class="profile-roll__rolling" data-reveal-stage={revealStage} role="status" aria-live="polite">
      <div class="profile-roll__scan-field" aria-hidden="true">
        <span class="profile-roll__spectrum-wash"></span>
        <span class="profile-roll__scan-orbit profile-roll__scan-orbit--one"></span>
        <span class="profile-roll__lock-ring"></span>
      </div>
      <div class="profile-roll__preview">
        <RollPreview displayColor={displayColor} rarity={rarity || 'Common'} />
      </div>
      <div class="profile-roll__rolling-copy">
        <div class="profile-roll__reading-line"><span aria-hidden="true"></span><p class="profile-roll__eyebrow">{revealStatus}</p></div>
        <p class="profile-roll__hex">{displayHex}</p>
        <h3>{revealStage === 3 ? 'This one is yours.' : 'Finding today’s signal.'}</h3>
        <p>{revealStage === 3 ? 'Adding it to your profile.' : 'The spectrum is narrowing.'}</p>
        <div class="profile-roll__stage-track" aria-hidden="true">
          {#each REVEAL_STEP_LABELS as label, index (label)}
            <span class:active={revealStage === index} class:complete={revealStage > index}>{label}</span>
          {/each}
        </div>
        {#if headlineConditions.length}
          <div class="profile-roll__rolling-conditions" aria-label="Score conditions being revealed">
            <p class="profile-roll__eyebrow">Conditions aligning</p>
            <div class="profile-roll__condition-list">
              {#each headlineConditions as condition, index (condition.id)}
                <span class="profile-roll__condition-chip profile-roll__condition--revealing" style={'--condition-delay: ' + (index * 0.55) + 's;'}>
                  <span aria-hidden="true">{condition.symbol}</span>
                  <strong>{condition.label}</strong>
                  {#if condition.points}<small>+{condition.points.toLocaleString()}</small>{/if}
                </span>
              {/each}
            </div>
          </div>
        {/if}
        <button type="button" class="profile-roll__skip" on:click={skipReveal}>Skip reveal</button>
      </div>
    </div>
  {:else if phase === 'results'}
    <div class={'profile-roll__result profile-roll__result--' + revealIntensity + (freshReveal ? ' profile-roll__result--fresh' : '')} role="status" aria-live="polite">
      <div class="profile-roll__result-head">
        <div class="profile-roll__preview">
        <RollPreview displayColor={displayColor} rarity={rarity || 'Common'} />
        </div>
        <div class="profile-roll__result-copy">
          <p class="profile-roll__eyebrow">{quiet ? 'Daily color' : 'Today’s color'}</p>
          <div class="profile-roll__identity-row">
            <p class="profile-roll__hex">{displayHex}</p>
            <span class="profile-roll__rarity">{rarity}</span>
          </div>
          <div class="profile-roll__score-row">
            <strong>{displayScore.toLocaleString()} <span>EP</span></strong>
          </div>
          {#if percentileDisplay}
            <p class="profile-roll__percentile" style={'color: ' + percentileDisplay.color + ';'}>
              {percentileDisplay.text} <span>(of {percentileDisplay.total.toLocaleString()} rollers)</span>
            </p>
          {/if}
        </div>
      </div>

      {#if headlineConditions.length}
        <div class="profile-roll__condition-rail" aria-label="Top scoring conditions">
          <div class="profile-roll__condition-list">
            {#each headlineConditions as condition (condition.id)}
              <span class="profile-roll__condition-chip">
                <span aria-hidden="true">{condition.symbol}</span>
                <strong>{condition.label}</strong>
                {#if condition.points}<small>+{condition.points.toLocaleString()}</small>{/if}
              </span>
            {/each}
            {#if conditionSource.length > headlineConditions.length}
              <span class="profile-roll__condition-chip profile-roll__condition-more">+{conditionSource.length - headlineConditions.length} more</span>
            {/if}
          </div>
        </div>
      {/if}

      <div class="profile-roll__result-actions">
        <button type="button" class="profile-roll__button profile-roll__button--share" on:click={shareRoll} disabled={shareInProgress}>
          {shareInProgress ? 'Sharing…' : 'Share roll'}
        </button>
      </div>

      <details class="profile-roll__details" bind:open={detailsOpen}>
        <summary>{detailsOpen ? 'Collapse score breakdown' : 'View score breakdown'}</summary>
        <div class="profile-roll__details-body">
          <div class="profile-roll__story">
            <div>
              <p class="profile-roll__eyebrow">{integrated ? 'A new chapter' : 'Profile story updated'}</p>
              <h3>{identity || 'A new color chapter has been recorded.'}</h3>
              <p>{integrated ? 'Today’s color is now part of your profile story.' : 'Today’s color is now part of your profile story.'}</p>
            </div>
            <div class="profile-roll__countdown"><span>Next roll</span><strong>{countdownString}</strong></div>
          </div>

          {#if traits.length}
            <div class="profile-roll__traits" aria-label="Server-reported color traits">
              {#each traits as trait (trait.id || trait.label)}
                <span>{trait.label || trait.name || trait.id}</span>
              {/each}
            </div>
          {/if}

          {#if revealedBadges.length || contributors.length}
            <div class="profile-roll__conditions">
              <div class="profile-roll__section-heading">
                <div>
                  <p class="profile-roll__eyebrow">Condition and reward record</p>
                  <h3>What the color revealed</h3>
                </div>
                <span>{conditionSource.length} recorded</span>
              </div>
              {#if contributors.length}
                <div class="profile-roll__contributors">
                  <p class="profile-roll__subheading">Score contributors</p>
                  {#each contributors as contributor (contributor.id)}
                    {@const contributorBadge = getBadge(contributor.id)}
                    <div class="profile-roll__contributor">
                      <span>{contributorBadge.symbol || '✦'}</span>
                      <strong>{contributor.name || contributorBadge.name || contributor.id}</strong>
                      <small>{Number(contributor.awardedPoints || contributor.points || 0).toLocaleString()} reported score</small>
                    </div>
                  {/each}
                </div>
              {/if}
              <div class="profile-roll__badge-list">
                {#each revealedBadges as badgeId (badgeId)}
                  {@const badge = getBadge(badgeId)}
                  <div class="profile-roll__badge">
                    <span class="profile-roll__badge-icon" aria-hidden="true">{badge.symbol || '✦'}</span>
                    <div><strong>{badge.name}</strong><p>{badge.desc || 'A server-reported color condition.'}</p></div>
                    {#if SYSTEM_BADGE_IDS.has(badgeId) || badgeId.startsWith('ach_')}
                      <span class="profile-roll__badge-label">Reward</span>
                    {:else}
                      <span class="profile-roll__badge-label">Condition</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="profile-roll__empty">No named conditions were returned for this color. The score is still recorded.</div>
          {/if}

          {#if newAchievements.length || rewardBadges.length || milestoneGranted || cotwHit}
            <div class="profile-roll__rewards" role="status" aria-live="polite">
              <p class="profile-roll__eyebrow">Account rewards</p>
              <h3>New progress landed</h3>
              {#if newAchievements.length}
                <ul>
                  {#each newAchievements as achievement (achievement.id)}
                    <li><span aria-hidden="true">{achievement.icon || '✦'}</span><strong>{achievement.name}</strong>{#if achievement.epReward} <small>+{achievement.epReward.toLocaleString()} bonus EP</small>{/if}</li>
                  {/each}
                </ul>
              {/if}
              {#if rewardBadges.length}<p>{rewardBadges.length} event reward{rewardBadges.length === 1 ? '' : 's'} recorded from this roll.</p>{/if}
              {#if milestoneGranted}<p>🎁 {milestoneGranted} was granted to your account.</p>{/if}
              {#if cotwHit}<p>🎯 Color of the Week matched; the wallet reward was added.</p>{/if}
            </div>
          {/if}

          <div class="profile-roll__next">
            <div>
              <p class="profile-roll__eyebrow">Tomorrow</p>
              <h3>Another color arrives tomorrow.</h3>
              <p>Come back when the next color is available.</p>
            </div>
            <div class="profile-roll__actions">
              {#if canReplayReveal}
                <button
                  type="button"
                  class="profile-roll__button profile-roll__button--replay"
                  on:click={replayReveal}
                  disabled={loading}
                  title="Presentation only—this does not create another roll or award rewards."
                >
                  Replay reveal
                </button>
              {/if}
              {#if canReroll}
                <button type="button" class="profile-roll__button profile-roll__button--reroll" on:click={() => initiateRoll(true)} disabled={loading || rerollRequestInFlight || hasActiveRerollLock() || !$authInitialized}>
                  Use reroll shard ({$rerollShards})
                </button>
              {/if}
            </div>
          </div>
        </div>
      </details>
    </div>
  {/if}
</Module>

<style>
  .profile-roll__state,
  .profile-roll__ready,
  .profile-roll__rolling,
  .profile-roll__story,
  .profile-roll__next { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); }
  .profile-roll__state { min-height: 9rem; color: var(--color-ink-muted); }
  .profile-roll__state p,
  .profile-roll__copy,
  .profile-roll__rolling-copy p,
  .profile-roll__story p,
  .profile-roll__next p { margin: 0; color: var(--color-ink-muted); line-height: 1.55; }
  .profile-roll__state--error { align-items: flex-start; flex-direction: column; color: var(--color-danger, #ff7b8d); }
  .profile-roll__pulse { width: 2.75rem; aspect-ratio: 1; border-radius: 50%; background: var(--profile-accent); box-shadow: 0 0 2rem color-mix(in srgb, var(--profile-accent) 60%, transparent); animation: profile-roll-pulse 1.5s ease-in-out infinite; }
  .profile-roll__ready { align-items: flex-end; flex-wrap: wrap; }
  .profile-roll__copy { max-width: 38rem; margin-top: var(--space-3); }
  .profile-roll__button { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 0 var(--space-5); background: var(--color-ink-strong); color: var(--color-canvas-deep); font: 600 var(--type-small) / 1 var(--font-body-stack); cursor: pointer; transition: transform var(--motion-fast) var(--motion-ease-standard), box-shadow var(--motion-base) var(--motion-ease-standard), opacity var(--motion-base) var(--motion-ease-standard); }
  .profile-roll__button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-accent); }
  .profile-roll__button:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-roll__button:disabled { cursor: wait; opacity: 0.55; }
  .profile-roll__button--secondary { border-color: color-mix(in srgb, var(--profile-accent) 55%, transparent); background: color-mix(in srgb, var(--profile-accent) 14%, transparent); color: var(--color-accent-bright); }
  .profile-roll__button--replay { border-color: color-mix(in srgb, var(--profile-accent) 42%, transparent); background: color-mix(in srgb, var(--profile-accent) 10%, transparent); color: color-mix(in srgb, var(--profile-accent) 48%, white); }
  .profile-roll__button--share { border-color: color-mix(in srgb, var(--profile-accent) 58%, transparent); background: color-mix(in srgb, var(--profile-accent) 16%, transparent); color: color-mix(in srgb, var(--profile-accent) 74%, white); }
  .profile-roll__button--reroll { min-height: 2.35rem; padding-inline: var(--space-4); border-color: color-mix(in srgb, var(--color-warning) 50%, transparent); background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning); font-size: var(--type-label); }
  .profile-roll__preview { display: grid; place-items: center; min-width: 9rem; }
  .profile-roll__preview :global(.roll-preview-frame) { transform: scale(0.72); transform-origin: center; }
  .profile-roll__rolling-copy h3,
  .profile-roll__story h3,
  .profile-roll__next h3,
  .profile-roll__section-heading h3,
  .profile-roll__rewards h3 { margin: var(--space-2) 0 var(--space-2); color: var(--color-ink-strong); font: 600 var(--type-h2) / 1.1 var(--font-display-stack); letter-spacing: -0.035em; }
  .profile-roll__hex { margin: 0; color: var(--color-ink-strong); font: 600 clamp(1.15rem, 3vw, 1.75rem) / 1 var(--font-mono-stack); letter-spacing: 0.06em; }
  .profile-roll__result { display: grid; gap: var(--space-4); }
  .profile-roll__result-head { display: grid; grid-template-columns: minmax(8rem, 11rem) 1fr; align-items: center; gap: var(--space-5); }
  .profile-roll__result-copy { min-width: 0; }
  .profile-roll__eyebrow { margin: 0; color: color-mix(in srgb, var(--profile-accent) 48%, white); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-roll__identity-row { display: flex; align-items: center; flex-wrap: wrap; gap: 0.65rem; margin-top: 0.35rem; }
  .profile-roll__score-row { display: flex; align-items: baseline; flex-wrap: wrap; margin-top: 0.8rem; }
  .profile-roll__score-row strong { display: inline-flex; align-items: baseline; color: var(--color-ink-strong); font: 600 clamp(2rem, 5vw, 3.5rem) / 0.95 var(--font-display-stack); letter-spacing: -0.06em; }
  .profile-roll__score-row strong span { margin-left: 0.45rem; padding-left: 0.5rem; border-left: 1px solid color-mix(in srgb, var(--profile-accent) 38%, var(--color-line-subtle)); color: var(--color-ink-muted); font: 600 0.68rem / 1 var(--font-mono-stack); letter-spacing: 0.1em; }
  .profile-roll__rarity { display: inline-flex; padding: 0.28rem 0.55rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 45%, transparent); border-radius: var(--radius-pill); color: color-mix(in srgb, var(--profile-accent) 48%, white); font: 700 0.62rem / 1 var(--font-mono-stack); text-transform: uppercase; letter-spacing: 0.08em; }
  .profile-roll__percentile { margin: var(--space-3) 0 0; font-weight: 700; }
  .profile-roll__percentile span { color: var(--color-ink-muted); font-size: var(--type-label); font-weight: 500; }
  .profile-roll__condition-rail { display: grid; gap: 0.65rem; margin-top: 0.15rem; padding-top: 0.8rem; border-top: 1px solid var(--color-line-subtle); }
  .profile-roll__condition-list { display: flex; flex-wrap: wrap; gap: 0.45rem; }
  .profile-roll__condition-chip { display: inline-flex; align-items: center; gap: 0.38rem; padding: 0.32rem 0.55rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 22%, var(--color-line-subtle)); border-radius: var(--radius-pill); background: color-mix(in srgb, var(--profile-accent) 8%, transparent); color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-roll__condition-chip strong { overflow: hidden; color: var(--color-ink-strong); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .profile-roll__condition-chip small { color: color-mix(in srgb, var(--profile-accent) 72%, white); font-size: 0.62rem; white-space: nowrap; }
  .profile-roll__condition-more { border-style: dashed; color: var(--color-ink-faint); }
  .profile-roll__story,
  .profile-roll__next,
  .profile-roll__conditions,
  .profile-roll__rewards { padding: var(--space-5); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-inset); }
  .profile-roll__story > div:first-child,
  .profile-roll__next > div:first-child { min-width: 0; }
  .profile-roll__countdown { display: grid; flex: 0 0 auto; gap: var(--space-2); text-align: right; }
  .profile-roll__countdown span { color: var(--color-ink-muted); font: var(--type-label) / 1 var(--font-mono-stack); text-transform: uppercase; letter-spacing: 0.08em; }
  .profile-roll__countdown strong { color: var(--color-ink-strong); font: 600 var(--type-h2) / 1 var(--font-mono-stack); }
  .profile-roll__traits { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .profile-roll__traits span { padding: var(--space-2) var(--space-3); border-radius: var(--radius-pill); background: color-mix(in srgb, var(--profile-accent) 15%, transparent); color: var(--color-ink); font-size: var(--type-label); }
  .profile-roll__section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
  .profile-roll__section-heading > span { color: var(--color-ink-muted); font: var(--type-label) / 1 var(--font-mono-stack); }
  .profile-roll__contributors { display: grid; gap: var(--space-2); margin: var(--space-4) 0; padding-top: var(--space-4); border-top: 1px solid var(--color-line-subtle); }
  .profile-roll__subheading { margin: 0; color: var(--color-ink-muted); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); text-transform: uppercase; letter-spacing: 0.08em; }
  .profile-roll__contributor { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: var(--surface-panel-soft); color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-roll__contributor strong { color: var(--color-ink); font-size: var(--type-small); }
  .profile-roll__contributor small { color: var(--color-ink-muted); font: var(--type-label) / 1.2 var(--font-mono-stack); }
  .profile-roll__badge-list { display: grid; gap: var(--space-2); }
  .profile-roll__badge { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-sm); background: var(--surface-panel-soft); }
  .profile-roll__badge-icon { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; background: color-mix(in srgb, var(--profile-accent) 16%, transparent); font-size: 1.1rem; }
  .profile-roll__badge strong { color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-roll__badge p { margin: var(--space-1) 0 0; color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.4; }
  .profile-roll__badge-label { color: var(--profile-accent); font: 700 var(--type-label) / 1 var(--font-mono-stack); text-transform: uppercase; }
  .profile-roll__rewards { border-color: color-mix(in srgb, var(--color-warning) 35%, var(--color-line-subtle)); background: color-mix(in srgb, var(--color-warning) 7%, var(--surface-inset)); }
  .profile-roll__rewards ul { display: grid; gap: var(--space-2); margin: var(--space-3) 0; padding: 0; list-style: none; }
  .profile-roll__rewards li { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); color: var(--color-ink); font-size: var(--type-small); }
  .profile-roll__rewards li span { font-size: 1.1rem; }
  .profile-roll__rewards li small { color: var(--color-warning); }
  .profile-roll__rewards p { margin: var(--space-2) 0 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.5; }
  .profile-roll__next { align-items: flex-end; }
  .profile-roll__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); }
  .profile-roll__empty { padding: var(--space-4); border: 1px dashed var(--color-line-subtle); border-radius: var(--radius-sm); color: var(--color-ink-muted); font-size: var(--type-small); }
  .profile-roll__result-actions { display: flex; align-items: center; justify-content: flex-start; gap: var(--space-2); }
  .profile-roll__details { display: grid; gap: var(--space-4); }
  .profile-roll__details summary { display: inline-flex; align-items: center; width: fit-content; min-height: 2.5rem; box-sizing: border-box; padding: .65rem .25rem; color: color-mix(in srgb, var(--profile-accent) 48%, white); cursor: pointer; font: 700 0.68rem / 1.2 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .profile-roll__details summary:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 4px; border-radius: var(--radius-sm); }
  .profile-roll__details-body { display: grid; gap: var(--space-5); padding-top: var(--space-2); }
  :global(.profile-roll--compact) :global(.foundation-module__description) { display: none; }
  :global(.profile-roll--compact) .profile-roll__ready { min-height: 9rem; }
  :global(.profile-roll--integrated) { padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
  :global(.profile-roll--integrated) :global(.foundation-module__body) { padding: 0; }
  :global(.profile-roll--integrated) .profile-roll__ready { align-items: center; flex-direction: row; gap: clamp(1.5rem, 5vw, 3.5rem); min-height: 0; }
  :global(.profile-roll--integrated) .profile-roll__button { min-height: 3rem; padding-inline: var(--space-6); border-radius: var(--radius-pill); }
  :global(.profile-roll--integrated) .profile-roll__rolling { min-height: 11rem; }
  :global(.profile-roll--integrated) .profile-roll__result { gap: var(--space-4); }
  :global(.profile-roll--integrated) .profile-roll__result-head { grid-template-columns: minmax(7rem, 9rem) 1fr; gap: var(--space-5); }
  :global(.profile-roll--integrated) .profile-roll__preview { min-width: 7rem; }
  :global(.profile-roll--integrated) .profile-roll__preview :global(.roll-preview-frame) { transform: scale(0.64); }
  :global(.profile-roll--integrated) .profile-roll__score-row strong { font-size: clamp(2rem, 5vw, 3.5rem); }
  :global(.profile-roll--integrated) .profile-roll__story,
  :global(.profile-roll--integrated) .profile-roll__next { padding: var(--space-4) 0 0; border: 0; border-top: 1px solid var(--color-line-subtle); border-radius: 0; background: transparent; }
  :global(.profile-roll--integrated) .profile-roll__details { margin-top: var(--space-2); }

  .profile-roll__ready {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
    align-items: center;
    gap: clamp(1.5rem, 5vw, 3.5rem);
    min-height: 15rem;
    padding: 1.5rem 0;
  }

  .profile-roll__ready-copy { display: grid; gap: 0.55rem; }
  .profile-roll__ready-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem 1rem; }
  .profile-roll__availability { display: inline-flex; align-items: baseline; gap: 0.4rem; color: var(--color-ink-muted); font: 600 0.64rem / 1 var(--font-mono-stack); letter-spacing: 0.06em; text-transform: uppercase; }
  .profile-roll__availability strong { color: color-mix(in srgb, var(--profile-accent) 72%, white); font-weight: 600; letter-spacing: 0.04em; }
  .profile-roll__ready-copy h3 { margin: 0; color: var(--color-ink-strong); font: 600 clamp(1.8rem, 4.5vw, 2.65rem) / 0.98 var(--font-display-stack); letter-spacing: -0.055em; }
  .profile-roll__ready .profile-roll__copy { display: block; max-width: 28rem; margin: 0.15rem 0 0; color: var(--color-ink-muted); font-size: 0.88rem; line-height: 1.55; }
  .profile-roll__reveal-button {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 6.25rem;
    padding: 0.75rem 1rem 0.75rem 0.8rem;
    border: 1px solid color-mix(in srgb, var(--profile-accent) 48%, rgba(230, 238, 255, 0.16));
    border-radius: 0.85rem;
    background: color-mix(in srgb, var(--profile-accent) 9%, var(--surface-panel-soft));
    color: var(--color-ink-strong);
    text-align: left;
    cursor: pointer;
    box-shadow: 0 0.7rem 1.8rem color-mix(in srgb, var(--profile-accent) 8%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    transition: transform var(--motion-fast) var(--motion-ease-emphasis), border-color var(--motion-base) var(--motion-ease-standard), background-color var(--motion-base) var(--motion-ease-standard), box-shadow var(--motion-base) var(--motion-ease-standard), opacity var(--motion-base) var(--motion-ease-standard);
  }
  .profile-roll__reveal-button:hover:not(:disabled) { transform: translateY(-2px); border-color: color-mix(in srgb, var(--profile-accent) 78%, white); background: color-mix(in srgb, var(--profile-accent) 15%, var(--surface-panel-soft)); box-shadow: 0 0.95rem 2.3rem color-mix(in srgb, var(--profile-accent) 15%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
  .profile-roll__reveal-button:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 4px; }
  .profile-roll__reveal-button:disabled { cursor: wait; opacity: 0.58; }
  .profile-roll__reveal-swatch { position: relative; display: grid; place-items: center; width: 3.7rem; height: 3.7rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 64%, white); border-radius: 0.55rem; background: linear-gradient(145deg, color-mix(in srgb, var(--profile-accent) 64%, white), color-mix(in srgb, var(--profile-accent) 22%, var(--surface-inset))); box-shadow: inset 0 0 0 0.25rem color-mix(in srgb, var(--profile-accent) 12%, transparent), 0 0 1.5rem color-mix(in srgb, var(--profile-accent) 17%, transparent); }
  .profile-roll__reveal-swatch::before { content: ''; position: absolute; inset: 0.65rem; border: 1px solid rgba(255, 255, 255, 0.42); border-radius: 0.25rem; transform: rotate(45deg); }
  .profile-roll__reveal-swatch span { position: relative; z-index: 1; width: 0.48rem; height: 0.48rem; border-radius: 0.1rem; background: rgba(255, 255, 255, 0.9); box-shadow: 0 0 0.8rem rgba(255, 255, 255, 0.78); }
  .profile-roll__reveal-copy { display: grid; min-width: 0; gap: 0.28rem; }
  .profile-roll__reveal-copy strong { overflow-wrap: anywhere; font: 600 0.88rem / 1.15 var(--font-body-stack); }
  .profile-roll__reveal-copy small { color: var(--color-ink-muted); font: 600 0.64rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .profile-roll__reveal-arrow { color: color-mix(in srgb, var(--profile-accent) 76%, white); font: 600 1.15rem / 1 var(--font-mono-stack); }

  .profile-roll__rolling { position: relative; display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); align-items: center; min-height: 13rem; overflow: visible; isolation: isolate; }
  .profile-roll__scan-field { position: absolute; z-index: 0; inset: -3rem -4rem; overflow: hidden; pointer-events: none; opacity: 0.9; }
  .profile-roll__spectrum-wash { position: absolute; inset: 5% 20% 5% 0; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--profile-accent) 28%, transparent), transparent 64%); filter: blur(1rem); animation: profile-roll-spectrum 0.85s ease-in-out infinite; }
  .profile-roll__scan-orbit { position: absolute; top: 50%; left: 28%; border: 1px solid color-mix(in srgb, var(--profile-accent) 36%, transparent); border-radius: 50%; transform: translate(-50%, -50%); }
  .profile-roll__scan-orbit--one { width: 11rem; height: 6rem; transform: translate(-50%, -50%) rotate(28deg); animation: profile-roll-orbit-one 3.2s ease-in-out infinite; }
  .profile-roll__lock-ring { position: absolute; top: 50%; left: 28%; width: 8rem; height: 8rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 82%, white); border-radius: 50%; opacity: 0; transform: translate(-50%, -50%) scale(0.45); }
  .profile-roll__rolling > :not(.profile-roll__scan-field) { position: relative; z-index: 1; }
  .profile-roll__rolling .profile-roll__preview { width: 7.5rem; min-width: 7.5rem; height: 7.5rem; }
  .profile-roll__rolling .profile-roll__preview :global(.roll-preview-frame) { width: 7.5rem; height: 7.5rem; transform: none; }
  .profile-roll__rolling .profile-roll__preview :global(.final-color-display) { width: 7.5rem; height: 7.5rem; }
  .profile-roll__rolling[data-reveal-stage='0'] .profile-roll__preview :global(.roll-preview-frame) { animation: profile-roll-charge 0.42s ease-in-out infinite; }
  .profile-roll__rolling[data-reveal-stage='1'] .profile-roll__preview :global(.roll-preview-frame) { animation: profile-roll-charge 0.62s ease-in-out infinite; }
  .profile-roll__rolling[data-reveal-stage='2'] .profile-roll__preview :global(.roll-preview-frame) { animation: profile-roll-narrow 0.82s var(--motion-ease-emphasis) both; }
  .profile-roll__rolling[data-reveal-stage='3'] .profile-roll__preview :global(.roll-preview-frame) { animation: profile-roll-lock 0.48s var(--motion-ease-emphasis) both; }
  .profile-roll__rolling[data-reveal-stage='3'] .profile-roll__lock-ring { animation: profile-roll-lock-ring 0.7s ease-out both; }
  .profile-roll__rolling[data-reveal-stage='3'] .profile-roll__scan-orbit,
  .profile-roll__rolling[data-reveal-stage='3'] .profile-roll__spectrum-wash { animation-play-state: paused; opacity: 0.18; }
  .profile-roll__rolling-copy { min-width: 0; }
  .profile-roll__reading-line { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
  .profile-roll__reading-line > span { width: 0.42rem; height: 0.42rem; flex: 0 0 auto; border-radius: 50%; background: var(--profile-accent); box-shadow: 0 0 0.8rem color-mix(in srgb, var(--profile-accent) 74%, transparent); animation: profile-roll-signal 1s ease-in-out infinite; }
  .profile-roll__rolling-copy h3 { margin: 0.5rem 0 0.35rem; color: var(--color-ink-strong); font: 600 clamp(1.2rem, 3.5vw, 1.65rem) / 1.04 var(--font-display-stack); letter-spacing: -0.045em; }
  .profile-roll__rolling-copy > p:not(.profile-roll__eyebrow):not(.profile-roll__hex) { max-width: 12rem; font-size: 0.78rem; }
  .profile-roll__stage-track { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.35rem; max-width: 15rem; margin-top: 0.85rem; }
  .profile-roll__stage-track span { padding-top: 0.4rem; border-top: 1px solid var(--color-line-subtle); color: var(--color-ink-faint); font: 600 0.56rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; transition: color 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
  .profile-roll__stage-track span.active,
  .profile-roll__stage-track span.complete { border-color: var(--profile-accent); color: color-mix(in srgb, var(--profile-accent) 52%, white); box-shadow: 0 -0.18rem 0.55rem color-mix(in srgb, var(--profile-accent) 24%, transparent); }
  .profile-roll__rolling-conditions { display: grid; gap: 0.45rem; margin-top: 0.9rem; }
  .profile-roll__rolling-conditions .profile-roll__eyebrow { margin: 0; }
  .profile-roll__condition--revealing { opacity: 0; transform: translateY(0.35rem) scale(0.96); animation: profile-roll-condition-reveal 0.42s var(--motion-ease-emphasis) var(--condition-delay, 0s) both; }
  .profile-roll__skip { display: inline-flex; align-items: center; min-height: 2.5rem; margin-top: 1rem; padding: .65rem .25rem; border: 0; background: transparent; color: var(--color-ink-faint); font: 600 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: color var(--motion-base) var(--motion-ease-standard); }
  .profile-roll__skip:hover { color: var(--color-ink-strong); }
  .profile-roll__skip:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 4px; border-radius: 0.25rem; }

  @keyframes profile-roll-pulse { 50% { opacity: 0.45; transform: scale(0.86); } }
  @keyframes profile-roll-signal { 50% { opacity: 0.35; transform: scale(0.72); } }
  @keyframes profile-roll-spectrum { 50% { opacity: 0.55; transform: scale(1.12); } }
  @keyframes profile-roll-charge { 0%, 100% { transform: scale(0.86); filter: saturate(1.25) brightness(0.92); } 50% { transform: scale(1.08); filter: saturate(1.65) brightness(1.28); } }
  @keyframes profile-roll-narrow { from { transform: scale(1.08) rotate(-4deg); filter: saturate(1.6) brightness(1.2); } to { transform: scale(0.9) rotate(0); filter: saturate(1.15) brightness(0.95); } }
  @keyframes profile-roll-lock { 0% { transform: scale(0.88); filter: brightness(0.9); } 48% { transform: scale(1.2); filter: brightness(1.65) saturate(1.5); } 100% { transform: scale(1); filter: brightness(1); } }
  @keyframes profile-roll-lock-ring { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45); } 24% { opacity: 0.9; } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.45); } }
  @keyframes profile-roll-orbit-one { 0%, 100% { transform: translate(-50%, -50%) rotate(20deg) scale(0.92); opacity: 0.55; } 50% { transform: translate(-50%, -50%) rotate(38deg) scale(1.08); opacity: 1; } }
  @keyframes profile-roll-result-enter { from { opacity: 0; transform: translateY(0.5rem); } to { opacity: 1; transform: none; } }
  @keyframes profile-roll-condition-reveal { from { opacity: 0; transform: translateY(0.35rem) scale(0.96); } to { opacity: 1; transform: none; } }
  @keyframes profile-roll-result-impact { 0% { transform: scale(0.78); filter: brightness(0.8); } 52% { transform: scale(var(--result-impact, 1.1)); filter: brightness(var(--result-brightness, 1.35)); } 100% { transform: scale(1); filter: brightness(1); } }

  .profile-roll__result--fresh .profile-roll__result-copy,
  .profile-roll__result--fresh .profile-roll__condition-rail { animation: profile-roll-result-enter 0.42s var(--motion-ease-emphasis) both; }
  .profile-roll__result--fresh .profile-roll__condition-rail { animation-delay: 0.16s; }
  .profile-roll__result--fresh .profile-roll__preview :global(.roll-preview-frame) { animation: profile-roll-result-impact 0.62s var(--motion-ease-emphasis) both; }
  .profile-roll__result--medium { --result-impact: 1.16; --result-brightness: 1.5; }
  .profile-roll__result--high { --result-impact: 1.24; --result-brightness: 1.8; }

  @media (max-width: 48rem) {
    .profile-roll__ready { grid-template-columns: 1fr; }
    .profile-roll__ready,
    .profile-roll__story,
    .profile-roll__next { align-items: flex-start; flex-direction: column; }
    .profile-roll__rolling { grid-template-columns: 1fr; justify-items: center; min-height: 17rem; gap: 0.4rem; }
    .profile-roll__rolling .profile-roll__preview { width: 7rem; min-width: 7rem; height: 7rem; }
    .profile-roll__rolling .profile-roll__preview :global(.roll-preview-frame),
    .profile-roll__rolling .profile-roll__preview :global(.final-color-display) { width: 7rem; height: 7rem; }
    .profile-roll__rolling-copy { width: 100%; text-align: center; }
    .profile-roll__reading-line { justify-content: center; }
    .profile-roll__stage-track { margin-inline: auto; }
    .profile-roll__rolling-copy > p:not(.profile-roll__eyebrow):not(.profile-roll__hex) { max-width: none; }
    .profile-roll__skip { margin-top: 0.8rem; }
    .profile-roll__scan-field { inset: -2rem -1rem; }
    .profile-roll__button,
    .profile-roll__reveal-button { width: 100%; }
    .profile-roll__result-head { grid-template-columns: 1fr; }
    .profile-roll__preview { min-height: 7rem; }
    .profile-roll__result-copy { width: 100%; }
    .profile-roll__countdown { text-align: left; }
    .profile-roll__actions { justify-content: flex-start; width: 100%; }
    .profile-roll__actions :global(.foundation-button),
    .profile-roll__actions .profile-roll__button { flex: 1 1 12rem; }
  }

  /* Compact profile layouts share this owner roll implementation, but their
     narrow containers need a bounded presentation independent of the browser
     viewport. The roll state, eligibility and server events remain shared. */
  :global(.profile-roll--presentation) {
    font-size: .78rem;
  }

  :global(.profile-roll--presentation) .profile-roll__ready {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: .5rem;
    min-height: 0;
    padding: .35rem 0;
  }

  :global(.profile-roll--presentation) .profile-roll__ready-copy { gap: .2rem; }
  :global(.profile-roll--presentation) .profile-roll__ready-copy h3 { font-size: .88rem; }
  :global(.profile-roll--presentation) .profile-roll__ready .profile-roll__copy,
  :global(.profile-roll--presentation) .profile-roll__availability { display: none; }
  :global(.profile-roll--presentation) .profile-roll__reveal-button { min-width: 0; min-height: 2.3rem; padding: .3rem .45rem; gap: .35rem; }
  :global(.profile-roll--presentation) .profile-roll__reveal-swatch { width: 1.7rem; height: 1.7rem; }
  :global(.profile-roll--presentation) .profile-roll__reveal-swatch::before { inset: .3rem; }
  :global(.profile-roll--presentation) .profile-roll__reveal-copy strong { font-size: .68rem; }
  :global(.profile-roll--presentation) .profile-roll__reveal-copy small { display: none; }

  :global(.profile-roll--presentation) .profile-roll__rolling {
    grid-template-columns: 2.25rem minmax(0, 1fr);
    min-height: 5.25rem;
    gap: .5rem;
  }
  :global(.profile-roll--presentation) .profile-roll__rolling .profile-roll__preview { width: 2.25rem; min-width: 2.25rem; height: 2.25rem; }
  :global(.profile-roll--presentation) .profile-roll__rolling .profile-roll__preview :global(.roll-preview-frame),
  :global(.profile-roll--presentation) .profile-roll__rolling .profile-roll__preview :global(.final-color-display) { width: 2.25rem; height: 2.25rem; }

  :global(.profile-roll--presentation) .profile-roll__result { gap: .45rem; padding: .35rem 0 0; }
  :global(.profile-roll--presentation) .profile-roll__result-head { grid-template-columns: 2.25rem minmax(0, 1fr); gap: .5rem; }
  :global(.profile-roll--presentation) .profile-roll__result .profile-roll__preview { min-width: 2.25rem; width: 2.25rem; height: 2.25rem; }
  :global(.profile-roll--presentation) .profile-roll__result .profile-roll__preview :global(.roll-preview-frame),
  :global(.profile-roll--presentation) .profile-roll__result .profile-roll__preview :global(.final-color-display) { width: 2.25rem; height: 2.25rem; transform: none; }
  :global(.profile-roll--presentation) .profile-roll__score-row strong { font-size: 1rem; }
  :global(.profile-roll--presentation) .profile-roll__condition-rail,
  :global(.profile-roll--presentation) .profile-roll__details,
  :global(.profile-roll--presentation) .profile-roll__result-actions { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .profile-roll__pulse { animation: none; }
    .profile-roll__button,
    .profile-roll__reveal-button,
    .profile-roll__skip,
    .profile-roll__stage-track span { transition-duration: 0.001ms; }
    .profile-roll__button:hover:not(:disabled),
    .profile-roll__reveal-button:hover:not(:disabled) { transform: none; }
    .profile-roll__reading-line > span,
    .profile-roll__condition--revealing,
    .profile-roll__spectrum-wash,
    .profile-roll__scan-orbit,
    .profile-roll__lock-ring,
    .profile-roll__rolling .profile-roll__preview :global(.roll-preview-frame),
    .profile-roll__result--fresh .profile-roll__result-copy,
    .profile-roll__result--fresh .profile-roll__condition-rail,
    .profile-roll__result--fresh .profile-roll__preview :global(.roll-preview-frame) { animation: none; }
    .profile-roll__condition--revealing { opacity: 1; transform: none; }
    .profile-roll__scan-field { opacity: 0.45; }
  }

  :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__ready {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem 1rem;
    min-height: 0;
  }
  :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__ready .profile-roll__copy,
  :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__percentile { display: none; }
  :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__reveal-button { width: auto; min-width: 12rem; min-height: 3.25rem; }
  :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__reveal-swatch { width: 2.55rem; height: 2.55rem; }
  :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__reveal-swatch::before { inset: 0.45rem; }
  :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__details { margin-top: 0; padding-top: 0.7rem; border-top: 1px solid var(--color-line-subtle); }

  @media (max-width: 48rem) {
    :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__ready { grid-template-columns: 1fr; }
    :global(.profile-roll--quiet.profile-roll--compact:not(.profile-roll--presentation)) .profile-roll__reveal-button { width: 100%; }
  }
</style>
