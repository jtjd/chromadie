<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import RollPreview from './RollPreview.svelte';
  import { supabase } from './supabase';
  import {
    addToast,
    authInitialized,
    equippedItems,
    fetchInventoryState,
    fetchWalletBalance,
    isAuthenticated,
    profile,
    refreshProfileState,
    rerollShards,
    session
  } from './stores';
  import { getBadgeMeta } from './badgeData';
  import { getOrbShape, getRollEffect } from './cosmetics';
  import { getPercentileTier } from './rollPresentation.js';
  import { canInitiateRoll, normalizeCanonicalRoll } from './rollState.js';
  import { clearRerollLock, hasActiveRerollLock, requestRoll, setRerollLock } from './rollService.js';
  import { trackProductEvent } from './productAnalytics.js';
  import { sleep, normalizeHexColor } from './utils.js';
  import Button from './foundation/Button.svelte';
  import Module from './foundation/Module.svelte';

  export let moduleSize = 'wide';

  const dispatch = createEventDispatcher();
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

  $: cosmetics = $equippedItems || {};
  $: rollEff = getRollEffect(cosmetics);
  $: orbEff = getOrbShape(cosmetics);
  $: rewardBadges = revealedBadges.filter(id => SYSTEM_BADGE_IDS.has(id));
  $: canReroll = Boolean($isAuthenticated && Number($rerollShards) > 0);

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
  }

  function applyServerPresentation(data, canonical) {
    const safeCanonical = canonical || normalizeCanonicalRoll(data);
    displayHex = normalizeHexColor(safeCanonical.hex, '#000000');
    displayColor = displayHex;
    score = Number(safeCanonical.score) || 0;
    displayScore = score;
    rarity = safeCanonical.rarity || 'Common';
    identity = safeCanonical.identity;
    traits = safeCanonical.traits;
    contributors = safeCanonical.contributors;
    revealedBadges = sortBadgesDescending(safeCanonical.badges);
    newAchievements = normalizeNewAchievements(data?.new_achievements);
    milestoneGranted = typeof data?.milestone_granted === 'string' ? data.milestone_granted : '';
    cotwHit = safeCanonical.badges.includes('cotw_hit');
    percentileDisplay = data?.percentile !== undefined && data?.total_rollers !== undefined
      ? getPercentileTier(data.percentile, data.total_rollers)
      : null;
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

    applyServerPresentation({ ...data, hex: data.hex_code || data.hex }, normalizeCanonicalRoll({ ...data, hex: data.hex_code || data.hex }));
    phase = 'results';
    loading = false;

    const { data: percentile } = await supabase.rpc('get_score_percentile', { p_score: score });
    if (requestId !== initialRequestId || userId !== ($session?.user?.id || null)) return;
    if (percentile) percentileDisplay = getPercentileTier(percentile.percentile, percentile.total_rollers);
  }

  async function animateCanonicalResult(data, canonical, requestId, requestUserId) {
    const safeHex = normalizeHexColor(canonical.hex, '#222222');
    const delay = prefersReducedMotion() ? 0 : 160;
    displayColor = '#222222';
    displayHex = '#------';
    revealedBadges = [];

    for (let index = 0; index < 6; index += 1) {
      displayHex = '#' + safeHex.slice(1, index + 2) + '-'.repeat(5 - index);
      if (delay) await sleep(delay);
      if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) return false;
    }

    displayHex = safeHex;
    displayColor = safeHex;
    const badges = sortBadgesDescending(canonical.badges).slice().reverse();
    for (const badgeId of badges) {
      if (delay) await sleep(delay);
      if (requestId !== rollRequestId || requestUserId !== ($session?.user?.id || null)) return false;
      revealedBadges = [badgeId, ...revealedBadges];
    }

    applyServerPresentation(data, canonical);
    return true;
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
    })) return;

    const requestId = ++rollRequestId;
    const requestUserId = $session?.user?.id || null;
    loading = true;
    error = '';
    phase = 'rolling';
    clearRollState();
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
      abandonStaleRequest();
      return;
    }

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
    tickCountdown();
    countdownInterval = setInterval(tickCountdown, 1000);
    void restoreTodayRoll();
  });

  onDestroy(() => {
    initialRequestId += 1;
    rollRequestId += 1;
    if (countdownInterval) clearInterval(countdownInterval);
    if (rerollRequestInFlight) clearRerollLock();
  });
</script>

<Module size={moduleSize} tone="accent" className="profile-roll" eyebrow="Today’s living event" title="Roll the next chapter" description="Your daily color arrives here, then becomes part of the profile visitors remember.">
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
      <div>
        <p class="profile-roll__lead">Your profile is ready for today’s mark.</p>
        <p class="profile-roll__copy">The server will determine the color, score, rarity, conditions, and any earned rewards.</p>
      </div>
      <div class="profile-roll__availability">
        <span>Available now</span>
        <strong>One owner roll</strong>
      </div>
      <button type="button" class="profile-roll__button" on:click={() => initiateRoll(false)} disabled={loading || !$authInitialized}>
        {loading ? 'Rolling…' : 'Roll today’s color'}
      </button>
    </div>
  {:else if phase === 'rolling'}
    <div class="profile-roll__rolling" role="status" aria-live="polite">
      <div class="profile-roll__preview">
        <RollPreview effectCls={rollEff.cls} effectStyle={rollEff.style} orbCls={orbEff.cls} displayColor={displayColor} rarity={rarity || 'Common'} />
      </div>
      <div class="profile-roll__rolling-copy">
        <p class="profile-roll__hex">{displayHex}</p>
        <h3>Reading the server result…</h3>
        <p>The profile will update when the canonical color is ready.</p>
      </div>
    </div>
  {:else if phase === 'results'}
    <div class="profile-roll__result">
      <div class="profile-roll__result-head">
        <div class="profile-roll__preview">
          <RollPreview effectCls={rollEff.cls} effectStyle={rollEff.style} orbCls={orbEff.cls} displayColor={displayColor} rarity={rarity || 'Common'} />
        </div>
        <div class="profile-roll__result-copy">
          <p class="profile-roll__eyebrow">Canonical result</p>
          <p class="profile-roll__hex">{displayHex}</p>
          <div class="profile-roll__score-row">
            <strong>{displayScore.toLocaleString()}</strong>
            <span>leaderboard score + EP</span>
          </div>
          <span class="profile-roll__rarity">{rarity}</span>
          {#if percentileDisplay}
            <p class="profile-roll__percentile" style={'color: ' + percentileDisplay.color + ';'}>
              {percentileDisplay.text} <span>(of {percentileDisplay.total.toLocaleString()} rollers)</span>
            </p>
          {/if}
        </div>
      </div>

      <div class="profile-roll__story">
        <div>
          <p class="profile-roll__eyebrow">Profile story updated</p>
          <h3>{identity || 'A new color chapter has been recorded.'}</h3>
          <p>Today’s color is now part of your recent public profile story. Visitors see the safe public presentation; account progress stays owner-only.</p>
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

      {#if revealedBadges.length}
        <div class="profile-roll__conditions">
          <div class="profile-roll__section-heading">
            <div>
              <p class="profile-roll__eyebrow">Condition and reward record</p>
              <h3>What the server found</h3>
            </div>
            <span>{revealedBadges.length} recorded</span>
          </div>
          {#if contributors.length}
            <div class="profile-roll__contributors">
              <p class="profile-roll__subheading">Server-reported score contributors</p>
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
        <div class="profile-roll__empty">No named conditions were returned for this color. The canonical score is still recorded.</div>
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
          {#if cotwHit}<p>🎯 Color of the Week matched; the server added the wallet reward.</p>{/if}
        </div>
      {/if}

      <div class="profile-roll__next">
        <div>
          <p class="profile-roll__eyebrow">Next action</p>
          <h3>Give this identity somewhere to go.</h3>
          <p>Style the profile, compare the score, or come back when the next color is available.</p>
        </div>
        <div class="profile-roll__actions">
          <Button href="/shop" variant="secondary" size="sm">Style in shop</Button>
          <Button href="/leaderboard" variant="ghost" size="sm">View leaderboard</Button>
          {#if canReroll}
            <button type="button" class="profile-roll__button profile-roll__button--reroll" on:click={() => initiateRoll(true)} disabled={loading || rerollRequestInFlight || hasActiveRerollLock() || !$authInitialized}>
              Use reroll shard ({$rerollShards})
            </button>
          {/if}
        </div>
      </div>
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
  .profile-roll__lead,
  .profile-roll__copy,
  .profile-roll__rolling-copy p,
  .profile-roll__story p,
  .profile-roll__next p { margin: 0; color: var(--color-ink-muted); line-height: 1.55; }
  .profile-roll__state--error { align-items: flex-start; flex-direction: column; color: var(--color-danger, #ff7b8d); }
  .profile-roll__pulse { width: 2.75rem; aspect-ratio: 1; border-radius: 50%; background: var(--profile-accent); box-shadow: 0 0 2rem color-mix(in srgb, var(--profile-accent) 60%, transparent); animation: profile-roll-pulse 1.5s ease-in-out infinite; }
  .profile-roll__ready { align-items: flex-end; flex-wrap: wrap; }
  .profile-roll__lead { color: var(--color-ink-strong); font: 600 var(--type-h2) / 1.1 var(--font-display-stack); letter-spacing: -0.035em; }
  .profile-roll__copy { max-width: 38rem; margin-top: var(--space-3); }
  .profile-roll__availability { display: grid; gap: var(--space-1); min-width: 9rem; color: var(--color-ink-muted); font: var(--type-label) / 1.3 var(--font-mono-stack); text-transform: uppercase; letter-spacing: 0.08em; }
  .profile-roll__availability strong { color: var(--profile-accent); font: 600 var(--type-small) / 1.3 var(--font-body-stack); text-transform: none; letter-spacing: 0; }
  .profile-roll__button { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 0 var(--space-5); background: var(--color-ink-strong); color: var(--color-canvas-deep); font: 600 var(--type-small) / 1 var(--font-body-stack); cursor: pointer; transition: transform var(--motion-fast) var(--motion-ease-standard), box-shadow var(--motion-base) var(--motion-ease-standard), opacity var(--motion-base) var(--motion-ease-standard); }
  .profile-roll__button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-accent); }
  .profile-roll__button:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-roll__button:disabled { cursor: wait; opacity: 0.55; }
  .profile-roll__button--secondary { border-color: color-mix(in srgb, var(--profile-accent) 55%, transparent); background: color-mix(in srgb, var(--profile-accent) 14%, transparent); color: var(--color-accent-bright); }
  .profile-roll__button--reroll { min-height: 2.35rem; padding-inline: var(--space-4); border-color: color-mix(in srgb, var(--color-warning) 50%, transparent); background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning); font-size: var(--type-label); }
  .profile-roll__rolling { align-items: center; min-height: 11rem; }
  .profile-roll__preview { display: grid; place-items: center; min-width: 9rem; }
  .profile-roll__preview :global(.roll-effect-wrapper) { transform: scale(0.72); transform-origin: center; }
  .profile-roll__rolling-copy { flex: 1; }
  .profile-roll__rolling-copy h3,
  .profile-roll__story h3,
  .profile-roll__next h3,
  .profile-roll__section-heading h3,
  .profile-roll__rewards h3 { margin: var(--space-2) 0 var(--space-2); color: var(--color-ink-strong); font: 600 var(--type-h2) / 1.1 var(--font-display-stack); letter-spacing: -0.035em; }
  .profile-roll__hex { margin: 0; color: var(--color-ink-strong); font: 600 clamp(1.15rem, 3vw, 1.75rem) / 1 var(--font-mono-stack); letter-spacing: 0.06em; }
  .profile-roll__result { display: grid; gap: var(--space-5); }
  .profile-roll__result-head { display: grid; grid-template-columns: minmax(8rem, 11rem) 1fr; align-items: center; gap: var(--space-5); }
  .profile-roll__result-copy { min-width: 0; }
  .profile-roll__eyebrow { margin: 0; color: var(--profile-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-roll__score-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-3); }
  .profile-roll__score-row strong { color: var(--color-ink-strong); font: 600 clamp(2rem, 5vw, 3.5rem) / 0.95 var(--font-display-stack); letter-spacing: -0.06em; }
  .profile-roll__score-row span { color: var(--color-ink-muted); font-size: var(--type-small); }
  .profile-roll__rarity { display: inline-flex; margin-top: var(--space-3); padding: var(--space-2) var(--space-3); border: 1px solid color-mix(in srgb, var(--profile-accent) 45%, transparent); border-radius: var(--radius-pill); color: var(--profile-accent); font: 700 var(--type-label) / 1 var(--font-mono-stack); text-transform: uppercase; letter-spacing: 0.08em; }
  .profile-roll__percentile { margin: var(--space-3) 0 0; font-weight: 700; }
  .profile-roll__percentile span { color: var(--color-ink-muted); font-size: var(--type-label); font-weight: 500; }
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

  @keyframes profile-roll-pulse { 50% { opacity: 0.45; transform: scale(0.86); } }

  @media (max-width: 48rem) {
    .profile-roll__ready,
    .profile-roll__rolling,
    .profile-roll__story,
    .profile-roll__next { align-items: flex-start; flex-direction: column; }
    .profile-roll__availability { min-width: 0; }
    .profile-roll__button { width: 100%; }
    .profile-roll__result-head { grid-template-columns: 1fr; }
    .profile-roll__preview { min-height: 7rem; }
    .profile-roll__result-copy { width: 100%; }
    .profile-roll__countdown { text-align: left; }
    .profile-roll__actions { justify-content: flex-start; width: 100%; }
    .profile-roll__actions :global(.foundation-button),
    .profile-roll__actions .profile-roll__button { flex: 1 1 12rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-roll__pulse { animation: none; }
    .profile-roll__button { transition-duration: 0.001ms; }
    .profile-roll__button:hover:not(:disabled) { transform: none; }
  }
</style>
