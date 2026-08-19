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
  <div class="progression-page__ambient" aria-hidden="true"></div>
  <div class="progression-page__shell">
    <header class="progression-page__hero" aria-labelledby="progression-page-title">
      <div class="progression-page__hero-copy">
        <p class="progression-page__eyebrow">Your identity / in motion</p>
        <h1 id="progression-page-title">Progression that <span>stays yours.</span></h1>
        <p class="progression-page__lede">Every color adds another mark to the profile you are building. Keep the ritual, find the strange, and turn the work into expression.</p>
      </div>

      {#if context?.targetProfile}
        <div class="progression-page__hero-signal" aria-label={`${rankState.current.name} rank, ${formatNumber(lifetimeEp)} lifetime EP`}>
          <span class="progression-page__hero-signal-label">Current signal</span>
          <strong style={`--progression-rank-color:${rankState.current.color}`}>{rankState.current.name}</strong>
          <small>{formatNumber(lifetimeEp)} lifetime EP</small>
        </div>
      {:else}
        <div class="progression-page__hero-signal" aria-hidden="true">
          <span class="progression-page__hero-signal-mark">✦</span>
          <small>One roll at a time.</small>
        </div>
      {/if}
    </header>

    {#if pageLoading}
      <section class="progression-page__state" role="status" aria-live="polite" aria-busy="true">
        <span class="progression-page__state-mark" aria-hidden="true">✦</span>
        <div><strong>Reading your color story</strong><p>Loading the progression earned by your account.</p></div>
      </section>
    {:else if signedOut}
      <section class="progression-page__state progression-page__state--guest" aria-labelledby="progression-guest-title">
        <div>
          <p class="progression-page__state-eyebrow">A private record</p>
          <h2 id="progression-guest-title">Your next chapter starts with a roll.</h2>
          <p>Sign in to see your rank, streaks, discoveries, and expression rewards. You can still try today’s color ritual first.</p>
        </div>
        <div class="progression-page__state-actions">
          <a class="progression-page__button progression-page__button--primary" href="/login?next=%2Fprogression">Sign in to continue <span aria-hidden="true">↗</span></a>
          <a class="progression-page__button" href="/roll">Try a roll <span aria-hidden="true">→</span></a>
        </div>
      </section>
    {:else if accountUnavailable}
      <section class="progression-page__state" role="alert">
        <div><strong>Your account is unavailable right now.</strong><p>We could not read the profile that owns this progression. Try again in a moment.</p></div>
        <button type="button" class="progression-page__button" on:click={() => window.location.reload()}>Retry</button>
      </section>
    {:else if error && !context}
      <section class="progression-page__state" role="alert">
        <div><strong>Progression unavailable</strong><p>{error}</p></div>
        <button type="button" class="progression-page__button" on:click={retry}>Retry</button>
      </section>
    {:else if context?.targetProfile}
      {#if context.dataWarning}
        <p class="progression-page__warning" role="status">{context.dataWarning}</p>
      {/if}

      <section class="progression-page__account-bar" aria-label="Progression actions">
        <div class="progression-page__account-copy">
          <span class="progression-page__account-label">{accountProfile.display_name || accountProfile.username || 'Your profile'}</span>
          <strong>{rankState.next ? `${formatNumber(Math.max(0, rankState.next.min - lifetimeEp))} EP to ${rankState.next.name}` : 'Highest rank reached'}</strong>
          {#if nextExpression}<small>Next expression: {nextExpression.name}</small>{:else}<small>Your published journey is complete.</small>{/if}
        </div>
        <div class="progression-page__account-actions">
          <a class="progression-page__button progression-page__button--primary" href="/roll">Roll today <span aria-hidden="true">→</span></a>
          <a class="progression-page__button" href="/profile/settings#customize-media">Equip expression <span aria-hidden="true">↗</span></a>
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
  :global(body:has(.progression-page)),
  :global(.app-shell--site:has(.progression-page)),
  :global(.app-main--site:has(.progression-page)) {
    background-color: var(--bg, #0e0e10);
    background-image: none;
  }

  :global(.app-shell--site:has(.progression-page) .site-footer) {
    --site-footer-border: var(--border);
    --site-footer-muted: var(--text-muted);
    --site-footer-ink: var(--text);
    background: transparent;
  }

  .progression-page {
    --progression-bg: var(--bg, #0e0e10);
    --progression-panel: var(--surface, #161619);
    --progression-raised: var(--surface-2, #1e1e22);
    --progression-line: var(--border, rgba(255, 255, 255, .09));
    --progression-text: var(--text, #f5f5f6);
    --progression-muted: var(--text-muted, #8d8c92);
    --progression-faint: var(--text-faint, #59585e);
    --progression-accent: var(--white, #ffffff);
    position: relative;
    isolation: isolate;
    min-height: calc(100dvh - 88px);
    overflow: hidden;
    padding: clamp(3rem, 7vw, 6rem) 0 5rem;
    color: var(--progression-text);
    font-family: 'Inter', var(--font-body-stack, sans-serif);
  }

  .progression-page__ambient {
    position: absolute;
    z-index: -1;
    top: -16rem;
    left: 50%;
    width: min(60rem, 90vw);
    height: 42rem;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(139, 124, 246, .13), transparent 68%);
    transform: translateX(-50%);
    pointer-events: none;
  }

  .progression-page__shell { width: min(1120px, calc(100% - 48px)); margin-inline: auto; }
  .progression-page__hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(13rem, 18rem); align-items: end; gap: clamp(2rem, 7vw, 8rem); }
  .progression-page__hero-copy { max-width: 48rem; }
  .progression-page__eyebrow,
  .progression-page__state-eyebrow,
  .progression-page__account-label { margin: 0; color: var(--progression-faint); font: 600 .68rem/1 'Inter', sans-serif; letter-spacing: .14em; text-transform: uppercase; }
  .progression-page__hero h1 { max-width: 48rem; margin: .85rem 0 0; color: var(--progression-text); font: 650 clamp(3.2rem, 7vw, 6.6rem)/.9 'Manrope Variable', var(--font-display-stack, sans-serif); letter-spacing: -.065em; }
  .progression-page__hero h1 span { color: color-mix(in srgb, var(--progression-accent) 62%, #b8b5c6); }
  .progression-page__lede { max-width: 38rem; margin: 1.35rem 0 0; color: var(--progression-muted); font-size: .94rem; line-height: 1.65; }
  .progression-page__hero-signal { display: grid; justify-items: start; gap: .35rem; padding: 1rem 0 0 1rem; border-left: 1px solid var(--progression-line); }
  .progression-page__hero-signal-label { color: var(--progression-muted); font-size: .7rem; }
  .progression-page__hero-signal strong { color: var(--progression-rank-color, var(--progression-text)); font: 650 2rem/1 'Manrope Variable', var(--font-display-stack, sans-serif); }
  .progression-page__hero-signal small { color: var(--progression-faint); font: 500 .68rem/1.3 'Inter', sans-serif; }
  .progression-page__hero-signal-mark { color: var(--progression-accent); font-size: 2rem; line-height: 1; }
  .progression-page__state { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 10rem; margin-top: 3.2rem; padding: 1.4rem 1.5rem; border: 1px solid var(--progression-line); border-radius: 18px; background: color-mix(in srgb, var(--progression-raised) 78%, transparent); box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .18); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .progression-page__state-mark { display: grid; width: 2.4rem; height: 2.4rem; flex: 0 0 auto; place-items: center; color: var(--progression-accent); border: 1px solid var(--progression-line); border-radius: 50%; }
  .progression-page__state strong { color: var(--progression-text); font: 600 1rem/1.2 'Inter', sans-serif; }
  .progression-page__state p { max-width: 34rem; margin: .45rem 0 0; color: var(--progression-muted); font-size: .78rem; line-height: 1.5; }
  .progression-page__state--guest { align-items: end; margin-top: 3.2rem; padding: clamp(1.5rem, 4vw, 3rem); }
  .progression-page__state--guest h2 { max-width: 36rem; margin: .7rem 0 0; color: var(--progression-text); font: 600 clamp(1.8rem, 4vw, 3.3rem)/.98 'Manrope Variable', var(--font-display-stack, sans-serif); letter-spacing: -.045em; }
  .progression-page__state--guest p:not(.progression-page__state-eyebrow) { max-width: 33rem; margin-top: 1rem; font-size: .9rem; }
  .progression-page__state-actions,
  .progression-page__account-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .55rem; }
  .progression-page__button { display: inline-flex; min-height: 2.7rem; align-items: center; justify-content: center; gap: .55rem; padding: .55rem .85rem; border: 1px solid var(--progression-line); border-radius: 9px; background: transparent; color: var(--progression-muted); font: 600 .73rem/1 'Inter', sans-serif; text-decoration: none; white-space: nowrap; cursor: pointer; }
  .progression-page__button:hover, .progression-page__button:focus-visible { border-color: var(--progression-text); color: var(--progression-text); }
  .progression-page__button--primary { border-color: var(--progression-text); background: var(--progression-text); color: #09090b; }
  .progression-page__button--primary:hover, .progression-page__button--primary:focus-visible { border-color: var(--progression-accent); background: var(--progression-accent); color: #09090b; }
  .progression-page__warning { margin: 2rem 0 -1.7rem; color: #f5c26f; font-size: .76rem; }
  .progression-page__account-bar { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; margin-top: 3.2rem; padding: 1rem 1.15rem; border: 1px solid var(--progression-line); border-radius: 18px; background: color-mix(in srgb, var(--progression-panel) 80%, transparent); }
  .progression-page__account-copy { display: grid; gap: .3rem; min-width: 0; }
  .progression-page__account-copy strong { color: var(--progression-text); font-size: .95rem; }
  .progression-page__account-copy small { overflow: hidden; color: var(--progression-muted); font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
  .progression-page :global(.profile-progression-surface--page) { margin-top: 1rem; border-color: color-mix(in srgb, var(--progression-accent) 18%, var(--progression-line)); background: color-mix(in srgb, var(--progression-panel) 93%, transparent); box-shadow: 0 1.8rem 5rem rgba(0, 0, 0, .2); }
  .progression-page a:focus-visible, .progression-page button:focus-visible { outline: 2px solid var(--progression-accent); outline-offset: 3px; }

  @media (max-width: 760px) {
    .progression-page__shell { width: min(calc(100% - 30px), 620px); }
    .progression-page__hero { grid-template-columns: 1fr; gap: 1.5rem; }
    .progression-page__hero-signal { width: fit-content; padding: .8rem 0 0; border-top: 1px solid var(--progression-line); border-left: 0; }
    .progression-page__state, .progression-page__state--guest, .progression-page__account-bar { align-items: flex-start; flex-direction: column; }
    .progression-page__state-actions, .progression-page__account-actions { justify-content: flex-start; }
    .progression-page__account-actions { width: 100%; }
  }

  @media (max-width: 480px) {
    .progression-page { padding-top: 2.5rem; }
    .progression-page__hero h1 { font-size: clamp(2.85rem, 14vw, 4.3rem); }
    .progression-page__button { flex: 1 1 auto; }
    .progression-page__state-actions, .progression-page__account-actions { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .progression-page__ambient { display: none; }
  }
</style>
