<script>
  import { ACCOUNT_STATES } from './authState.js';
  import { getBadgeMeta } from './badgeData.js';
  import { loadDailyRollColor, loadProgressionData } from './progressionData.js';
  import { resolveProfileFeatureFlags } from './profileFeatureFlags.js';
  import { getVividHexColor } from './profileAppearanceColors.js';
  import { getRankState } from './ranks.js';
  import ProfileProgression from './ProfileProgression.svelte';
  import ProgressionPathIcon from './ProgressionPathIcon.svelte';
  import { accountState, authInitialized, isAuthenticated, profile, session } from './stores.js';
  import { supabase } from './supabase.js';
  import { normalizeHexColor } from './utils.js';

  let progression = null;
  let loading = true;
  let error = '';
  let loadedAccountId = '';
  let progressionLoaded = false;
  let dailyRollColor = '';
  let dailyRollData = null;
  let dailyRollError = '';
  let dailyRollLoaded = false;
  let requestId = 0;

  $: accountId = $session?.user?.id || $profile?.id || '';
  $: accountProfile = $profile?.id && accountId && $profile.id === accountId ? $profile : {};
  $: featureFlags = resolveProfileFeatureFlags({
    userId: accountProfile?.id || accountId,
    isStaff: Boolean(accountProfile?.is_staff)
  });
  $: todayColor = dailyRollColor;
  $: dailyRollHex = normalizeHexColor(dailyRollData?.hex_code || dailyRollData?.hex, '');
  $: hasRolledToday = dailyRollLoaded && Boolean(dailyRollData);
  $: rollSignals = resolveRollSignals(dailyRollData);
  $: accentColor = normalizeHexColor(todayColor, '#FFFFFF');
  $: accentVivid = getVividHexColor(accentColor, '#FFFFFF');
  $: accentInk = getReadableTextColor(accentVivid);
  $: currentStreak = Math.max(0, Number(progression?.currentStreak ?? accountProfile?.current_streak) || 0);
  $: lifetimeEp = Math.max(0, Number(progression?.currentEp ?? accountProfile?.lifetime_ep) || 0);
  $: pageRankState = getRankState(lifetimeEp);
  $: pageRankPercent = Math.round((pageRankState?.progress || 0) * 100);
  $: focusGoal = resolveFocusGoal(progression);
  $: pageLoading = !$authInitialized
    || $accountState === ACCOUNT_STATES.PROFILE_LOADING
    || ($accountState === ACCOUNT_STATES.AUTHENTICATED && loading && !progressionLoaded);
  $: signedOut = $authInitialized && $accountState === ACCOUNT_STATES.SIGNED_OUT;
  $: accountUnavailable = $authInitialized && $accountState === ACCOUNT_STATES.PROFILE_ERROR;
  $: authenticatedWithoutProfile = $authInitialized
    && $accountState === ACCOUNT_STATES.AUTHENTICATED
    && progressionLoaded
    && !accountProfile?.id;

  $: if ($authInitialized && $isAuthenticated && accountId && loadedAccountId !== accountId) {
    loadedAccountId = accountId;
    void loadProgressionContext(accountId);
  }

  $: if ($authInitialized && !$session && loadedAccountId) {
    clearProgressionContext();
  }

  function clearProgressionContext() {
    requestId += 1;
    loadedAccountId = '';
    progression = null;
    progressionLoaded = false;
    dailyRollColor = '';
    dailyRollData = null;
    dailyRollError = '';
    dailyRollLoaded = false;
    error = '';
    loading = false;
  }

  async function loadProgressionContext(userId) {
    const currentRequestId = ++requestId;
    loading = true;
    error = '';
    progressionLoaded = false;
    dailyRollData = null;
    dailyRollError = '';
    dailyRollLoaded = false;

    try {
      const [result, dailyRoll] = await Promise.all([
        loadProgressionData({
          supabaseClient: supabase,
          userId,
          fallbackEp: $profile?.lifetime_ep
        }),
        loadDailyRollColor(supabase, userId)
      ]);

      if (currentRequestId !== requestId || userId !== $session?.user?.id) return;

      progression = result.data || {};
      dailyRollColor = dailyRoll.color;
      dailyRollData = dailyRoll.data || null;
      dailyRollError = dailyRoll.error?.message || '';
      dailyRollLoaded = true;
      error = result.error?.message || '';
      progressionLoaded = true;
    } catch {
      if (currentRequestId === requestId) {
        progression = {};
        dailyRollData = null;
        dailyRollError = 'Daily roll status could not be read.';
        dailyRollLoaded = true;
        error = 'Progression could not be loaded. Please retry.';
        progressionLoaded = true;
      }
    } finally {
      if (currentRequestId === requestId) loading = false;
    }
  }

  function retry() {
    if (!accountId || !$isAuthenticated) return;
    void loadProgressionContext(accountId);
  }

  function resolveRollSignals(data) {
    const contributors = Array.isArray(data?.contributors) ? data.contributors : [];
    const traits = Array.isArray(data?.traits) ? data.traits : [];
    const conditionIds = Array.isArray(data?.condition_ids) ? data.condition_ids : [];
    const source = contributors.length ? contributors : traits.length ? traits : conditionIds;

    return source.slice(0, 3).map((item, index) => {
      const rawId = typeof item === 'string' ? item : item?.id || item?.key || '';
      const id = typeof rawId === 'string' ? rawId : '';
      const meta = id ? getBadgeMeta(id) : {};
      const points = Number(item?.awardedPoints ?? item?.points) || 0;
      return {
        id: id || `signal-${index}`,
        label: item?.name || item?.label || meta.name || id || 'Recorded signal',
        points,
        symbol: item?.symbol || meta.symbol || ''
      };
    });
  }

  function resolveFocusGoal(currentProgression = progression) {
    const candidates = [
      currentProgression?.nextJourney?.ritual,
      currentProgression?.nextJourney?.discovery,
      currentProgression?.nextJourney?.rank,
      currentProgression?.nextObjective
    ];
    return candidates.find(node => node && node.unlocked !== true && !node.unlockedAt && !node.unlocked_at) || null;
  }

  function getReadableTextColor(value) {
    const hex = normalizeHexColor(value, '#FFFFFF').slice(1);
    const channels = [0, 2, 4].map(offset => {
      const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
    return luminance > 0.179 ? '#0E0E10' : '#FFFFFF';
  }

  // The route has no page-level animation; child glass/accordion surfaces and
  // the shared button system own the prefers-reduced-motion fallbacks.
</script>

<svelte:head>
  <title>Progress · ChromaDie</title>
</svelte:head>

<div class="progression-page" style={`--progression-accent:${accentColor};--progression-accent-vivid:${accentVivid};--progression-accent-ink:${accentInk};--progression-accent-light:${accentVivid};--progression-accent-glow:color-mix(in srgb,${accentVivid} 42%,transparent);--progression-accent-glow-strong:color-mix(in srgb,${accentVivid} 68%,transparent)`}>
  <div class="progression-page__shell">
    <div class="progression-page__composition">
      <header class="progression-page__intro" aria-labelledby="progression-page-title">
        <div class="progression-page__intro-main">
          <h1 id="progression-page-title">Progress</h1>
          {#if accountProfile?.id}
            <section class="progression-page__account-bar progression-page__streak-strip" aria-label="Daily streak and roll status">
              <div class="progression-page__streak-copy">
                <ProgressionPathIcon track="ritual" state="active" />
                <strong>{currentStreak}-day streak</strong>
                {#if todayColor}<span class="progression-page__color-chip" style={`--data-color:${todayColor}`} aria-label={`Today's rolled color ${todayColor}`}></span>{/if}
                <span class="progression-page__streak-days" aria-hidden="true">
                  {#each [0, 1, 2, 3, 4, 5, 6] as day (day)}<span class="progression-page__streak-day" class:progression-page__streak-day--active={day === 0 && currentStreak > 0}></span>{/each}
                </span>
              </div>
              <div class="progression-page__account-actions">
                {#if hasRolledToday}
                  <span class="progression-page__roll-status" role="status"><span class="progression-page__roll-status-dot" aria-hidden="true"></span>Rolled today</span>
                {:else if dailyRollLoaded && dailyRollError}
                  <span class="progression-page__roll-status" role="status" title={dailyRollError}>Status unavailable</span>
                {:else if dailyRollLoaded}
                  <span class="progression-page__roll-status" role="status">Roll available</span>
                {:else}
                  <span class="progression-page__roll-status" role="status">Checking today</span>
                {/if}
              </div>
            </section>
          {/if}
        </div>
        {#if accountProfile?.id}
          <div class="progression-page__header-meta" aria-label="Active progress">
            <span>Active progress</span>
            <strong>{pageRankPercent}%</strong>
            <small>{pageRankState.current?.name || 'Unranked'} rank</small>
          </div>
        {/if}
      </header>

      {#if accountProfile?.id && error}
        <div class="progression-page__warning" role="status">
          <span>{error} Showing the profile record that is available.</span>
          <button type="button" on:click={retry} disabled={loading} aria-busy={loading}>Retry</button>
        </div>
      {/if}

      {#if pageLoading}
        <section class="progression-page__state" role="status" aria-live="polite" aria-busy="true">
          <div><strong>Loading progress</strong><p>Reading the progress earned by your account.</p></div>
        </section>
      {:else if signedOut}
        <section class="progression-page__state progression-page__state--guest" aria-labelledby="progression-guest-title">
          <div>
            <p class="progression-page__state-eyebrow">Personal record</p>
          <h2 id="progression-guest-title">Progress belongs to your profile.</h2>
            <p>Sign in to see your rank, streaks, discoveries, and cosmetic rewards. You can still try today’s color ritual first.</p>
          </div>
          <div class="progression-page__state-actions">
            <a class="site-button" href="/login?next=%2Fprogression">Sign in to continue</a>
            <a class="site-button site-button--secondary" href="/roll">Try a roll</a>
          </div>
        </section>
      {:else if accountUnavailable}
        <section class="progression-page__state" role="alert">
          <div><strong>Your account is unavailable right now.</strong><p>We could not read the progress that belongs to this profile. Try again in a moment.</p></div>
          <button type="button" class="site-button site-button--secondary" on:click={() => window.location.reload()}>Retry</button>
        </section>
      {:else if authenticatedWithoutProfile}
        <section class="progression-page__state" role="alert">
          <div><strong>Your profile is still loading.</strong><p>The progress record is ready, but the profile that owns it has not arrived yet. Try again in a moment.</p></div>
          <button type="button" class="site-button site-button--secondary" on:click={retry}>Retry</button>
        </section>
      {:else if error && !progressionLoaded}
        <section class="progression-page__state" role="alert">
          <div><strong>Progress unavailable</strong><p>{error}</p></div>
          <button type="button" class="site-button site-button--secondary" on:click={retry}>Retry</button>
        </section>
      {:else if accountProfile?.id}
        <ProfileProgression
          profile={accountProfile}
          timelineEvents={[]}
          collectionItems={[]}
          allAchievements={[]}
          unlockedAchievements={{}}
          {progression}
          {featureFlags}
          currentRollColor={todayColor}
          {dailyRollData}
          {dailyRollHex}
          {dailyRollLoaded}
          {dailyRollError}
          {hasRolledToday}
          {rollSignals}
          dailyFocusGoal={focusGoal}
          pageMode={true}
          analyticsSurface="progression"
        />
      {/if}
    </div>
  </div>
</div>

<style>
  .progression-page {
    --progression-line: var(--color-line-subtle);
    --progression-text: var(--color-ink-strong);
    --progression-muted: var(--color-ink-muted);
    min-height: calc(100dvh - 4.25rem);
    box-sizing: border-box;
    padding: 1.1rem 0 4rem;
    background: var(--bg, #0e0e10);
    color: var(--progression-text);
    font-family: var(--site-font, var(--font-body-stack, sans-serif));
    color-scheme: dark;
  }

  .progression-page__shell {
    width: min(1184px, calc(100% - 2rem));
    margin-inline: auto;
  }

  .progression-page__composition { display:grid; gap:1.4rem; }
  .progression-page__intro { display:block; padding-bottom:0; border-bottom:0; }
  .progression-page__intro-main { min-width:0; }

  .progression-page__state-eyebrow {
    margin: 0;
    color: var(--progression-muted);
    font: 600 .68rem/1 'Inter', sans-serif;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .progression-page__color-chip { display:none; }

  .progression-page__intro h1 {
    margin: 0;
    color: var(--progression-text);
    font: 800 clamp(2.7rem, 5vw, 4rem)/.9 var(--site-display, var(--font-display-stack, sans-serif));
    letter-spacing: -.065em;
    text-transform: uppercase;
  }

  .progression-page__header-meta {
    display:none;
    justify-items:end;
    gap:.2rem;
    min-width:9rem;
    color:var(--progression-muted);
    text-align:right;
  }

  .progression-page__header-meta span,
  .progression-page__header-meta small {
    color:var(--progression-muted);
    font:500 .72rem/1.25 var(--font-body-stack, sans-serif);
  }

  .progression-page__header-meta span { letter-spacing:.09em; text-transform:uppercase; }
  .progression-page__header-meta strong { color:var(--progression-text); font:600 1rem/1.1 var(--font-display-stack, sans-serif); }
  .progression-page__header-meta small { font-size:.68rem; }

  .progression-page__account-bar {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:1rem;
    width:max-content;
    max-width:100%;
    margin-top:.7rem;
    padding:.52rem .7rem;
    border:1px solid #5b3318;
    border-radius:999px;
    background:#1f140d;
  }

  .progression-page__streak-copy {
    display:flex;
    align-items:center;
    gap:.5rem;
    min-width:0;
  }

  .progression-page__streak-copy > :global(.progression-path-icon) { flex:0 0 1rem; width:1rem; height:1rem; color:#ff8b2b; }
  .progression-page__streak-copy strong { color:#ff9b3d; font:700 .68rem/1 var(--font-body-stack, sans-serif); letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; }
  .progression-page__streak-days { display:flex; align-items:center; gap:4px; margin-left:.25rem; }
  .progression-page__streak-day { display:block; flex:0 0 7px; width:7px; min-width:7px; max-width:7px; height:7px; aspect-ratio:1; box-sizing:border-box; border-radius:50%; background:#39414f; }
  .progression-page__streak-day--active { background:#ff8b2b; }

  .progression-page__roll-status { display:inline-flex; align-items:center; gap:.4rem; color:var(--progression-muted); font:600 .64rem/1 var(--font-mono-stack); letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; }
  .progression-page__roll-status-dot { width:.42rem; height:.42rem; border-radius:50%; background:var(--color-success,#6ee787); box-shadow:0 0 .5rem color-mix(in srgb,var(--color-success,#6ee787) 55%,transparent); }

  .progression-page__state,
  .progression-page__account-bar {
    box-shadow:none;
  }

  .progression-page__state,
  .progression-page__warning {
    border-radius:1rem;
  }

  .progression-page__state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    grid-column:1 / -1;
    padding: 1.4rem 1.5rem;
    border:1px solid var(--progression-line);
    background:var(--surface, #161619);
  }

  .progression-page__state strong {
    color: var(--progression-text);
    font: 600 1rem/1.2 var(--font-body-stack, sans-serif);
  }

  .progression-page__state p {
    max-width: 34rem;
    margin: .45rem 0 0;
    color: var(--progression-muted);
    font-size: .78rem;
    line-height: 1.5;
  }

  .progression-page__state--guest {
    align-items: flex-end;
    padding: clamp(1.5rem, 4vw, 3rem);
  }

  .progression-page__state--guest h2 {
    max-width: 36rem;
    margin: .7rem 0 0;
    color: var(--progression-text);
    font: 600 clamp(1.8rem, 4vw, 3.3rem)/.98 var(--font-display-stack, sans-serif);
    letter-spacing: -.045em;
  }

  .progression-page__state--guest p:not(.progression-page__state-eyebrow) {
    max-width: 33rem;
    margin-top: 1rem;
    font-size: .9rem;
  }

  .progression-page__state-actions,
  .progression-page__account-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: .55rem;
  }

  .progression-page__warning {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .75rem;
    padding:.8rem 1rem;
    border:1px solid var(--progression-line);
    color: var(--progression-muted);
    font-size: .76rem;
  }

  .progression-page__warning button {
    flex: 0 0 auto;
    min-height: 2.25rem;
    padding: .35rem .65rem;
    border: 1px solid var(--progression-line);
    border-radius: .6rem;
    background: transparent;
    color: var(--progression-text);
    font: inherit;
    cursor: pointer;
  }

  .progression-page__warning button:focus-visible {
    outline: 2px solid var(--progression-text);
    outline-offset: 2px;
  }

  .progression-page__warning button:disabled {
    cursor: wait;
    opacity: .6;
  }

  .progression-page :global(.profile-progression-surface--page) {
    margin-top: 0;
  }

  @media (max-width: 620px) {
    .progression-page {
      padding: 1rem 0 3.5rem;
    }

    .progression-page__shell {
      width: min(calc(100% - 2rem), 620px);
    }

    .progression-page__intro { align-items:flex-start; flex-direction:column; gap:1.25rem; }
    .progression-page__header-meta { justify-items:start; text-align:left; }
    .progression-page__account-bar { width:100%; }

    .progression-page__state,
    .progression-page__state--guest {
      align-items: flex-start;
      flex-direction: column;
    }

    .progression-page__state-actions,
    .progression-page__account-actions {
      justify-content: flex-start;
      width: 100%;
    }

    .progression-page__state-actions .site-button {
      flex: 1 1 auto;
    }

    .progression-page__warning {
      align-items: flex-start;
      flex-direction: column;
    }
    .progression-page__streak-copy { min-width:0; }
    .progression-page__streak-copy strong { overflow:hidden; text-overflow:ellipsis; }
    .progression-page__account-actions { flex:0 0 auto; }
  }

  @media (max-width:420px) {
    .progression-page__account-bar { align-items:flex-start; flex-direction:column; gap:.65rem; }
    .progression-page__streak-days { margin-left:0; }
  }
</style>
