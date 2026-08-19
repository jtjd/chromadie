<script>
  import { ACCOUNT_STATES } from './authState.js';
  import { loadProfileContext } from './profileData.js';
  import { resolveProfileFeatureFlags } from './profileFeatureFlags.js';
  import ProfileProgression from './ProfileProgression.svelte';
  import { getRankState } from './ranks.js';
  import { accountState, authInitialized, isAuthenticated, profile, session } from './stores.js';
  import { supabase } from './supabase.js';

  let context = null;
  let loading = true;
  let error = '';
  let loadedAccountId = '';
  let requestId = 0;

  $: accountId = $session?.user?.id || '';
  $: accountProfile = context?.targetProfile || $profile || {};
  $: featureFlags = resolveProfileFeatureFlags({
    userId: accountProfile?.id || accountId,
    isStaff: Boolean(accountProfile?.is_staff)
  });
  $: progression = context?.progression || {};
  $: lifetimeEp = Math.max(0, Number(progression?.currentEp ?? accountProfile?.lifetime_ep) || 0);
  $: rankState = getRankState(lifetimeEp);
  $: nextExpression = progression?.nextJourney?.ritual || progression?.nextJourney?.discovery || null;
  $: journeyState = progression?.journeyState || 'unavailable';
  $: pageLoading = !$authInitialized
    || $accountState === ACCOUNT_STATES.PROFILE_LOADING
    || ($accountState === ACCOUNT_STATES.AUTHENTICATED && loading && !context);
  $: signedOut = $authInitialized && $accountState === ACCOUNT_STATES.SIGNED_OUT;
  $: accountUnavailable = $authInitialized && $accountState === ACCOUNT_STATES.PROFILE_ERROR;

  $: if ($authInitialized && $isAuthenticated && accountId && loadedAccountId !== accountId) {
    loadedAccountId = accountId;
    void loadProgressionContext(accountId);
  }

  $: if ($authInitialized && !$session && loadedAccountId) {
    clearProgressionContext();
  }

  function clearProgressionContext() {
    loadedAccountId = '';
    context = null;
    error = '';
    loading = false;
  }

  async function loadProgressionContext(userId) {
    const currentRequestId = ++requestId;
    loading = true;
    error = '';

    try {
      const nextContext = await loadProfileContext({
        supabaseClient: supabase,
        isAuthenticated: true,
        sessionUserId: userId,
        currentUsername: $profile?.username || '',
        profileUsername: null,
        userId: null
      });

      if (currentRequestId !== requestId || userId !== $session?.user?.id) return;

      if (nextContext.loadError && !nextContext.targetProfile) {
        context = null;
        error = nextContext.loadError;
      } else {
        context = nextContext;
      }
    } catch {
      if (currentRequestId === requestId) {
        context = null;
        error = 'Progression could not be loaded. Please retry.';
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
</script>

<svelte:head>
  <title>Progression · ChromaDie</title>
</svelte:head>

<div class="progression-page">
  <div class="progression-page__shell">
    <header class="progression-page__intro" aria-labelledby="progression-page-title">
      <p class="progression-page__eyebrow">Your profile / progression</p>
      <h1 id="progression-page-title">Progression</h1>
      <p class="progression-page__scope">Rolls, discoveries, and expressions that shape your profile.</p>
    </header>

    {#if pageLoading}
      <section class="progression-page__state" role="status" aria-live="polite" aria-busy="true">
        <div><strong>Loading progression</strong><p>Reading the progression earned by your account.</p></div>
      </section>
    {:else if signedOut}
      <section class="progression-page__state progression-page__state--guest" aria-labelledby="progression-guest-title">
        <div>
          <p class="progression-page__state-eyebrow">Personal record</p>
          <h2 id="progression-guest-title">Progression belongs to your profile.</h2>
          <p>Sign in to see your rank, streaks, discoveries, and expression rewards. You can still try today’s color ritual first.</p>
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
    {:else if error && !context}
      <section class="progression-page__state" role="alert">
        <div><strong>Progression unavailable</strong><p>{error}</p></div>
        <button type="button" class="site-button site-button--secondary" on:click={retry}>Retry</button>
      </section>
    {:else if context?.targetProfile}
      {#if context.dataWarning}
        <p class="progression-page__warning" role="status">{context.dataWarning}</p>
      {/if}

      <section class="progression-page__account-bar" aria-label="Progression actions">
        <div class="progression-page__account-copy">
          <span class="progression-page__account-label">{accountProfile.display_name || accountProfile.username || 'Your profile'}</span>
          <strong>{rankState.next ? formatNumber(Math.max(0, rankState.next.min - lifetimeEp)) + ' EP to ' + rankState.next.name : 'Highest rank reached'}</strong>
          {#if nextExpression}<small>Next expression: {nextExpression.name}</small>{:else if journeyState === 'empty'}<small>No journey goals are published yet.</small>{:else if journeyState === 'partial'}<small>Some journey goals are unavailable.</small>{:else if journeyState === 'unavailable'}<small>Journey goals are unavailable.</small>{:else}<small>All journey goals complete.</small>{/if}
        </div>
        <div class="progression-page__account-actions">
          <a class="site-button" href="/roll">Roll today</a>
          <a class="site-button site-button--secondary" href="/profile/settings#customize-media">Equip expression</a>
        </div>
      </section>

      <ProfileProgression
        profile={context.targetProfile}
        timelineEvents={context.timelineEvents}
        collectionItems={context.collectionItems}
        allAchievements={context.allAchievements}
        unlockedAchievements={context.unlockedAchievements}
        {progression}
        {featureFlags}
        pageMode={true}
        analyticsSurface="progression"
      />
    {/if}
  </div>
</div>

<style>
  .progression-page {
    --progression-line: var(--border, rgba(255, 255, 255, .09));
    --progression-panel: var(--surface-2, #1e1e22);
    --progression-text: var(--text, #f5f5f6);
    --progression-muted: var(--text-muted, #8d8c92);
    --progression-faint: var(--text-faint, #59585e);
    min-height: calc(100dvh - 4.25rem);
    box-sizing: border-box;
    padding: clamp(3rem, 7vw, 6rem) 0 5rem;
    color: var(--progression-text);
    font-family: 'Inter', var(--font-body-stack, sans-serif);
    color-scheme: dark;
  }

  .progression-page__shell {
    width: min(980px, calc(100% - 48px));
    margin-inline: auto;
  }

  .progression-page__intro {
    display: flex;
    align-items: center;
    flex-direction: column;
    text-align: center;
  }

  .progression-page__eyebrow,
  .progression-page__state-eyebrow,
  .progression-page__account-label {
    margin: 0;
    color: var(--progression-faint);
    font: 600 .68rem/1 'Inter', sans-serif;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .progression-page__intro h1 {
    margin: .8rem 0 0;
    color: var(--progression-text);
    font: 750 clamp(3.4rem, 7vw, 5.8rem)/.94 'Manrope Variable', var(--font-display-stack, sans-serif);
    letter-spacing: -.06em;
  }

  .progression-page__scope {
    max-width: 34rem;
    margin: 1rem 0 0;
    color: var(--progression-muted);
    font-size: .82rem;
    line-height: 1.55;
  }

  .progression-page__state,
  .progression-page__account-bar {
    border: 1px solid var(--progression-line);
    border-radius: 18px;
    background: var(--progression-panel);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .18);
  }

  .progression-page__state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 10rem;
    margin-top: 3.15rem;
    padding: 1.4rem 1.5rem;
  }

  .progression-page__state strong {
    color: var(--progression-text);
    font: 600 1rem/1.2 'Inter', sans-serif;
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
    margin-top: 3.15rem;
    padding: clamp(1.5rem, 4vw, 3rem);
  }

  .progression-page__state--guest h2 {
    max-width: 36rem;
    margin: .7rem 0 0;
    color: var(--progression-text);
    font: 600 clamp(1.8rem, 4vw, 3.3rem)/.98 'Manrope Variable', var(--font-display-stack, sans-serif);
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
    margin: 2rem 0 -1.7rem;
    color: var(--progression-muted);
    font-size: .76rem;
  }

  .progression-page__account-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    margin-top: 3.15rem;
    padding: 1rem 1.15rem;
  }

  .progression-page__account-copy {
    display: grid;
    gap: .3rem;
    min-width: 0;
  }

  .progression-page__account-copy strong {
    color: var(--progression-text);
    font-size: .95rem;
  }

  .progression-page__account-copy small {
    overflow: hidden;
    color: var(--progression-muted);
    font-size: .72rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progression-page :global(.profile-progression-surface--page) {
    margin-top: 1rem;
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
  }

  @media (prefers-reduced-motion: reduce) {
    .progression-page {
      scroll-behavior: auto;
    }
  }
</style>
