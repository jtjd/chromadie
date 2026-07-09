<script>
  import { session, profile, equippedItems, selectedUserId } from './lib/stores';
  import { supabase, supabaseError } from './lib/supabase';
  import Auth from './lib/Auth.svelte';
  import Game from './lib/Game.svelte';
  import Shop from './lib/Shop.svelte';
  import Leaderboard from './lib/Leaderboard.svelte';
  import Profile from './lib/Profile.svelte';
  import Toast from './lib/Toast.svelte';
  import GuestLock from './lib/GuestLock.svelte';
  import { getNameEffect, getFrameEffect, getTitleText } from './lib/cosmetics';
  import { normalizeHexColor } from './lib/utils';
  import { onMount, onDestroy } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  const VALID_VIEWS = new Set(['game', 'shop', 'leaderboard', 'profile']);
  const VALID_LEADERBOARD_TABS = new Set(['today', 'rivals', 'weekly', 'monthly', 'roll']);
  let view = 'game';
  let leaderboardTab = 'today';
  let showAuthModal = false;
  let challengeData = null;

  supabase.auth.getSession().then(({ data }) => session.set(data.session));

  function parseRoute() {
    const params = new SvelteURLSearchParams(window.location.search);
    const routeView = params.get('view');
    const routeTab = params.get('tab');
    const routeProfileId = params.get('profile');
    const cScore = params.get('challenge');
    const cHex = params.get('hex');
    const isValidChallengeHex = /^[0-9A-Fa-f]{6}$/.test(cHex || '');

    view = VALID_VIEWS.has(routeView) ? routeView : 'game';
    leaderboardTab = VALID_LEADERBOARD_TABS.has(routeTab) ? routeTab : 'today';
    selectedUserId.set(routeProfileId || null);

    if (cScore && isValidChallengeHex) {
      const parsedScore = Number.parseInt(cScore, 10);
      challengeData = Number.isFinite(parsedScore) ? { score: parsedScore, hex: normalizeHexColor(cHex) } : null;
    } else {
      challengeData = null;
    }
  }

  function syncRoute() {
    if (typeof window === 'undefined') return;

    const params = new SvelteURLSearchParams();
    if (view !== 'game') params.set('view', view);
    if (view === 'leaderboard' && leaderboardTab !== 'today') {
      params.set('tab', leaderboardTab);
    }
    if (view === 'profile' && $selectedUserId) {
      params.set('profile', $selectedUserId);
    }
    if (challengeData?.score != null && challengeData?.hex) {
      params.set('challenge', String(challengeData.score));
      params.set('hex', challengeData.hex.replace('#', ''));
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, '', nextUrl);
    }
  }

  function setRoute(nextView, options = {}) {
    if (!VALID_VIEWS.has(nextView)) return;

    view = nextView;
    if (nextView !== 'leaderboard') {
      leaderboardTab = options.tab && VALID_LEADERBOARD_TABS.has(options.tab) ? options.tab : leaderboardTab;
    } else if (options.tab && VALID_LEADERBOARD_TABS.has(options.tab)) {
      leaderboardTab = options.tab;
    }

    if (nextView === 'profile') {
      selectedUserId.set(options.userId || null);
    } else {
      selectedUserId.set(null);
    }

    syncRoute();
  }

  function handlePopState() {
    parseRoute();
  }

  onMount(() => {
    parseRoute();
    window.addEventListener('popstate', handlePopState);
  });

  onDestroy(() => {
    window.removeEventListener('popstate', handlePopState);
  });

  function handleLogout() {
    try {
      localStorage.removeItem('chromadie-roll');
    } catch {
      // Ignore storage failures on hardened/private browsing setups.
    }
    supabase.auth.signOut();
    setRoute('game');
  }

  function handleNavClick(newView) {
    setRoute(newView);
  }

  function handleNavigation(event) {
    const { view: nextView, userId = null, tab = null } = event.detail || {};
    if (nextView) {
      setRoute(nextView, { userId, tab });
    }
  }

  $: userCosmetics = $equippedItems;
  $: nameEff = getNameEffect(userCosmetics);
  $: frameEff = getFrameEffect(userCosmetics);
  $: titleTxt = getTitleText(userCosmetics);
  $: username = $profile?.username || 'Guest';
  $: errorState = supabaseError;

  $: if ($session && showAuthModal) {
    showAuthModal = false;
  }
</script>

<Toast />

{#if errorState}
  <main class="bootstrap-error-shell">
    <section class="bootstrap-error-card glass-panel" role="alert" aria-live="polite">
      <p class="bootstrap-error-kicker">Configuration error</p>
      <h1>{errorState.title}</h1>
      <p class="bootstrap-error-message">{errorState.message}</p>
      {#if errorState.details}
        <p class="bootstrap-error-details">{errorState.details}</p>
      {/if}
      <p class="bootstrap-error-help">
        Set the required Supabase environment variables, rebuild, and redeploy. In development, check the console for the exact missing setting.
      </p>
    </section>
  </main>
{:else}
  {#if showAuthModal}
    <div class="auth-modal-overlay" role="button" tabindex="0" on:click|self={() => showAuthModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showAuthModal = false)}>
      <div class="auth-modal-content">
        <Auth />
      </div>
    </div>
  {/if}

  {#if challengeData && view === 'game'}
    <div class="challenge-banner">
      <div class="challenge-info">
        <span class="challenge-text">Player challenges you to beat:</span>
        <div class="challenge-stat">
          <span class="challenge-color" style="background-color: {challengeData.hex};"></span>
          <span class="challenge-score">{challengeData.score.toLocaleString()} pts</span>
        </div>
      </div>
      <button
        type="button"
        class="challenge-close"
        aria-label="Dismiss challenge banner"
        on:click={() => challengeData = null}
      >
        ✖
      </button>
    </div>
  {/if}

  <div id="header-mount">
    <header class="site-header">
      <a href="/" class="logo">🎲 ChromaDie</a>
      <nav class="nav-links">
        <button class="nav-link" class:active={view === 'game'} on:click={() => handleNavClick('game')}>Game</button>
        <button class="nav-link" class:active={view === 'shop'} on:click={() => handleNavClick('shop')}>Shop</button>
        <button class="nav-link" class:active={view === 'leaderboard'} on:click={() => setRoute('leaderboard', { tab: 'today' })}>Leaderboard</button>
        <button class="nav-link" class:active={view === 'profile'} on:click={() => handleNavClick('profile')}>Profile</button>

        {#if $session}
          <div class="user-chip {frameEff.cls}" style="{frameEff.style}">
            {#if titleTxt}
              <span class="title-chip">[{titleTxt}]</span>
            {/if}
            <span class="user-name {nameEff.cls}" style="{nameEff.style}" data-text={username}>
              {username}
            </span>
            <button class="logout-btn" on:click={handleLogout}>Log Out</button>
          </div>
        {:else}
          <button class="login-btn-header" on:click={() => showAuthModal = true}>Log In / Sign Up</button>
        {/if}
      </nav>
    </header>
  </div>

  {#if $session}
    {#if view === 'game'}
      <Game on:promptlogin={() => showAuthModal = true} />
    {:else if view === 'shop'}
      <Shop />
    {:else if view === 'leaderboard'}
      {#key `leaderboard:${leaderboardTab}`}
        <Leaderboard initialTab={leaderboardTab} on:navigate={handleNavigation} />
      {/key}
    {:else if view === 'profile'}
      <Profile userId={$selectedUserId} on:navigate={handleNavigation} />
    {/if}
  {:else}
    {#if view === 'game'}
      <Game on:promptlogin={() => showAuthModal = true} />
    {:else if view === 'leaderboard'}
      {#key `leaderboard:${leaderboardTab}`}
        <Leaderboard initialTab={leaderboardTab} on:navigate={handleNavigation} />
      {/key}
    {:else if view === 'profile' && $selectedUserId}
      <Profile userId={$selectedUserId} on:navigate={handleNavigation} />
    {:else}
      <GuestLock view={view} on:login={() => showAuthModal = true} />
    {/if}
  {/if}
{/if}

<style>
  .bootstrap-error-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
  }

  .bootstrap-error-card {
    width: min(720px, 100%);
    padding: 2rem;
    text-align: left;
    border-color: rgba(249, 115, 22, 0.35);
    background:
      radial-gradient(circle at top right, rgba(249, 115, 22, 0.16), transparent 45%),
      rgba(10, 10, 14, 0.9);
  }

  .bootstrap-error-kicker {
    margin: 0 0 0.65rem 0;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .bootstrap-error-card h1 {
    margin: 0 0 0.85rem 0;
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3rem);
    color: #fff;
  }

  .bootstrap-error-message,
  .bootstrap-error-details,
  .bootstrap-error-help {
    margin: 0.6rem 0 0 0;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .bootstrap-error-details {
    font-family: 'JetBrains Mono', monospace;
    color: #f9a8d4;
  }

  .auth-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000; display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .auth-modal-content {
    width: 100%; max-width: 450px; position: relative; z-index: 1;
  }

  .challenge-banner {
    max-width: 650px;
    margin: 20px auto 0;
    padding: 15px 20px;
    background: rgba(139, 124, 246, 0.1);
    border: 1px solid rgba(139, 124, 246, 0.4);
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    animation: slideDown 0.4s ease-out;
  }
  .challenge-info { display: flex; flex-direction: column; gap: 5px; }
  .challenge-text { font-size: 0.8rem; color: var(--text-muted); }
  .challenge-stat { display: flex; align-items: center; gap: 10px; }
  .challenge-color { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }
  .challenge-score { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--accent-purple); font-size: 1.1rem; }
  .challenge-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem; }
  .challenge-close:hover { color: #fff; }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
