<script>
  import { ACCOUNT_STATES } from './authState.js';
  import { loadDailyRollColor, loadProgressionData } from './progressionData.js';
  import { resolveProfileFeatureFlags } from './profileFeatureFlags.js';
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
  let requestId = 0;

  $: accountId = $session?.user?.id || $profile?.id || '';
  $: accountProfile = $profile?.id && accountId && $profile.id === accountId ? $profile : {};
  $: featureFlags = resolveProfileFeatureFlags({
    userId: accountProfile?.id || accountId,
    isStaff: Boolean(accountProfile?.is_staff)
  });
  $: todayColor = dailyRollColor;
  $: accentColor = normalizeHexColor(todayColor, '#FFFFFF');
  $: accentInk = getReadableTextColor(accentColor);
  $: currentStreak = Math.max(0, Number(progression?.currentStreak ?? accountProfile?.current_streak) || 0);
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
    error = '';
    loading = false;
  }

  async function loadProgressionContext(userId) {
    const currentRequestId = ++requestId;
    loading = true;
    error = '';
    progressionLoaded = false;

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
      error = result.error?.message || '';
      progressionLoaded = true;
    } catch {
      if (currentRequestId === requestId) {
        progression = {};
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

  function formatNumber(value) {
    return Number(value || 0).toLocaleString();
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

  function focusProgressLabel(node) {
    if (!node) return 'Roll today';
    const current = Number(node?.progress?.current);
    const target = Number(node?.progress?.target ?? node?.progressTarget ?? node?.threshold);
    if (Number.isFinite(current) && Number.isFinite(target) && target > 0) {
      const rawUnit = node?.progress?.unit || (node?.track === 'rank' ? 'points' : 'rolls');
      const unit = String(rawUnit).toLowerCase() === 'ep' ? 'points' : rawUnit;
      return `${formatNumber(current)} / ${formatNumber(target)} ${unit}`;
    }
    if (node?.track === 'discovery') return 'Discover a rare color';
    return 'Keep rolling';
  }

  function focusStreakLabel(node) {
    const current = Number(node?.progress?.current);
    const target = Number(node?.progress?.target ?? node?.progressTarget ?? node?.threshold);
    if (node?.track === 'ritual' && Number.isFinite(target) && target > 0) {
      const safeCurrent = currentStreak || (Number.isFinite(current) ? Math.max(0, current) : 0);
      return `${formatNumber(safeCurrent)} of ${formatNumber(target)} days`;
    }
    return focusProgressLabel(node);
  }

  function focusStreakTitle(node) {
    const target = Number(node?.progress?.target ?? node?.progressTarget ?? node?.threshold);
    if (node?.track === 'ritual' && Number.isFinite(target) && target > 0) {
      return `${formatNumber(target)}-day streak`;
    }
    return node?.name || `${currentStreak}-day streak`;
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
  <title>Progression · ChromaDie</title>
</svelte:head>

<div class="progression-page" style={`--progression-accent:${accentColor};--progression-accent-ink:${accentInk};--progression-accent-light:color-mix(in srgb,${accentColor} 76%,white);--progression-accent-glow:color-mix(in srgb,${accentColor} 24%,transparent);--progression-accent-glow-strong:color-mix(in srgb,${accentColor} 40%,transparent)`}>
  <div class="progression-page__shell">
    <div class="progression-page__composition">
      <div class="progression-page__rail" style="--progression-rail-offset:clamp(7rem,17vh,10rem);align-self:start">
        <header class="progression-page__intro" aria-labelledby="progression-page-title">
          <h1 id="progression-page-title">Progression</h1>
          <p class="progression-page__scope">Rolls, rank, and unlocks.</p>
        </header>

        {#if accountProfile?.id}
          {#if error}
            <div class="progression-page__warning" role="status">
              <span>{error} Showing the profile record that is available.</span>
              <button type="button" on:click={retry} disabled={loading} aria-busy={loading}>Retry</button>
            </div>
          {/if}

          <section class="progression-page__account-bar progression-page__streak-strip" aria-label="Daily streak and roll action">
            <div class="progression-page__streak-copy">
              <ProgressionPathIcon track="ritual" state="active" />
              <div>
                <strong>{focusStreakTitle(focusGoal)}</strong>
                <small>{focusGoal ? focusStreakLabel(focusGoal) : 'Keep rolling'}</small>
              </div>
              {#if todayColor}<span class="progression-page__color-chip" style={`--data-color:${todayColor}`} aria-label={`Today's rolled color ${todayColor}`}></span>{/if}
            </div>
            <div class="progression-page__account-actions">
              <a class="site-button" href="/roll">{focusGoal?.track === 'discovery' ? 'Roll and explore' : 'Roll today'}</a>
            </div>
          </section>
        {/if}
      </div>

      {#if pageLoading}
        <section class="progression-page__state" role="status" aria-live="polite" aria-busy="true">
          <div><strong>Loading progression</strong><p>Reading the progression earned by your account.</p></div>
        </section>
      {:else if signedOut}
        <section class="progression-page__state progression-page__state--guest" aria-labelledby="progression-guest-title">
          <div>
            <p class="progression-page__state-eyebrow">Personal record</p>
            <h2 id="progression-guest-title">Progression belongs to your profile.</h2>
            <p>Sign in to see your rank, streaks, discoveries, and cosmetic rewards. You can still try today’s color ritual first.</p>
          </div>
          <div class="progression-page__state-actions">
            <a class="site-button" href="/login?next=%2Fprogression">Sign in to continue</a>
            <a class="site-button site-button--secondary" href="/roll">Try a roll</a>
          </div>
      </section>
      {:else if accountUnavailable}
        <section class="progression-page__state" role="alert">
          <div><strong>Your account is unavailable right now.</strong><p>We could not read the profile that owns this progression. Try again in a moment.</p></div>
          <button type="button" class="site-button site-button--secondary" on:click={() => window.location.reload()}>Retry</button>
      </section>
      {:else if authenticatedWithoutProfile}
        <section class="progression-page__state" role="alert">
          <div><strong>Your profile is still loading.</strong><p>The progression record is ready, but the profile that owns it has not arrived yet. Try again in a moment.</p></div>
          <button type="button" class="site-button site-button--secondary" on:click={retry}>Retry</button>
      </section>
      {:else if error && !progressionLoaded}
        <section class="progression-page__state" role="alert">
          <div><strong>Progression unavailable</strong><p>{error}</p></div>
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
    padding: clamp(3rem, 7vw, 6rem) 0 5rem;
    background: radial-gradient(circle at 72% 42%, color-mix(in srgb, var(--progression-accent) 14%, transparent), transparent 42rem), var(--bg, #0e0e10);
    color: var(--progression-text);
    font-family: var(--site-font, var(--font-body-stack, sans-serif));
    color-scheme: dark;
  }

  .progression-page__shell {
    width: min(1040px, calc(100% - 48px));
    margin-inline: auto;
  }

  .progression-page__composition { display:grid; grid-template-columns:minmax(13rem,.72fr) minmax(28rem,1.28fr); align-items:center; gap:clamp(2rem,6vw,5rem); }
  .progression-page__rail { padding-top:var(--progression-rail-offset); }
  .progression-page__intro {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    text-align: left;
  }

  .progression-page__state-eyebrow {
    margin: 0;
    color: var(--progression-muted);
    font: 600 .68rem/1 'Inter', sans-serif;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .progression-page__color-chip { display:inline-block; flex:0 0 1rem; width:1rem; height:1rem; border:1px solid rgba(255,255,255,.55); border-radius:50%; background:var(--data-color); }

  .progression-page__intro h1 {
    margin: .8rem 0 0;
    color: var(--progression-text);
    font: 700 clamp(2.6rem, 4vw, 3.5rem)/.96 var(--site-display, var(--font-display-stack, sans-serif));
    letter-spacing: -.06em;
  }

  .progression-page__scope {
    max-width: 20rem;
    margin: .85rem 0 0;
    color: var(--progression-muted);
    font-size: .85rem;
    line-height: 1.55;
  }

  .progression-page__state,
  .progression-page__account-bar {
    border: 1px solid var(--progression-line);
    border-radius: 18px;
    background: var(--surface, #161619);
  }

  .progression-page__state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    grid-column:1 / -1;
    padding: 1.4rem 1.5rem;
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
    margin: 2rem 0 -1.7rem;
    color: var(--progression-muted);
    font-size: .76rem;
  }

  .progression-page__warning button {
    flex: 0 0 auto;
    min-height: 2.25rem;
    padding: .35rem .65rem;
    border: 1px solid var(--progression-line);
    border-radius: .5rem;
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

  .progression-page__account-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    margin-top: 1.25rem;
    padding: 1rem 1.15rem;
  }

  .progression-page__streak-copy {
    display: flex;
    align-items: center;
    gap: .75rem;
    flex: 1;
    min-width: 0;
  }

  .progression-page__streak-copy > :global(.progression-path-icon) {
    flex: 0 0 1.5rem;
  }

  .progression-page__streak-copy > div {
    display: grid;
    gap: .2rem;
    min-width: 0;
  }

  .progression-page__streak-copy strong {
    color: var(--progression-text);
    font-size: .95rem;
  }

  .progression-page__streak-copy small {
    overflow: hidden;
    color: var(--progression-muted);
    font-size: .72rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progression-page :global(.profile-progression-surface--page) {
    margin-top: 0;
  }

  @media (max-width: 620px) {
    .progression-page {
      padding: 2.5rem 0 3.5rem;
    }

    .progression-page__shell {
      width: min(calc(100% - 30px), 620px);
    }

    .progression-page__state,
    .progression-page__state--guest,
    .progression-page__account-bar {
      align-items: flex-start;
      flex-direction: column;
    }

    .progression-page__state-actions,
    .progression-page__account-actions {
      justify-content: flex-start;
      width: 100%;
    }

    .progression-page__state-actions .site-button,
    .progression-page__account-actions .site-button {
      flex: 1 1 auto;
    }

    .progression-page__warning {
      align-items: flex-start;
      flex-direction: column;
      margin-bottom: -1rem;
    }
  }

  @media (max-width: 900px) {
    .progression-page__composition { grid-template-columns:minmax(0, 620px); justify-content:center; gap:2rem; }
    .progression-page__rail { padding-top:0; }
  }

  .progression-page__account-bar {
    border-color: var(--color-state-active, var(--progression-line));
    box-shadow: var(--shadow-card-glass);
  }

  .progression-page__streak-copy strong {
    font: 650 1.12rem/1.15 var(--font-display-stack, sans-serif);
    letter-spacing: -.015em;
  }

  .progression-page__streak-copy small {
    max-width: 38rem;
    overflow: visible;
    white-space: normal;
    line-height: 1.45;
  }

  .progression-page__streak-copy > :global(.progression-path-icon) { color: var(--progression-text); }
  .progression-page__streak-copy .progression-page__color-chip { margin-left: .15rem; }

  .progression-page__streak-strip {
    padding: 1rem;
  }

  .progression-page__account-actions { flex: 0 0 auto; }

  .progression-page__account-actions .site-button {
    border:1px solid var(--progression-accent);
    box-shadow:0 0 .85rem var(--progression-accent-glow);
  }

  .progression-page__account-actions .site-button:not(.site-button--secondary) {
    background:linear-gradient(135deg,var(--progression-accent-light),var(--progression-accent));
    color:var(--progression-accent-ink);
  }

  .progression-page__account-actions .site-button:hover,
  .progression-page__account-actions .site-button:focus-visible {
    box-shadow:0 0 1.2rem var(--progression-accent-glow-strong);
  }

  @media (max-width: 620px) {
    .progression-page__streak-strip {
      align-items: center;
      flex-direction: row;
      gap: .65rem;
    }

    .progression-page__streak-copy { min-width: 0; }
    .progression-page__streak-copy > div { min-width: 0; }
    .progression-page__account-actions { width: auto; }
    .progression-page__account-actions .site-button { flex: 0 0 auto; }
  }
</style>
