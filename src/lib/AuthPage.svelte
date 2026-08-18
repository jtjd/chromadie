<script>
  import { onMount, tick } from 'svelte';
  import Auth from './Auth.svelte';
  import SiteFooter from './SiteFooter.svelte';
  import SiteModeHeader from './SiteModeHeader.svelte';
  import { accountState, authEvent, authInitialized, authUser, isAuthenticated, profile, profileLoading, session } from './stores';
  import { buildAppUrl, getSafeNextUrl } from './authUrls.js';
  import { getCanonicalProfilePath } from './routeContract.js';

  export let initialTab = 'login';
  export let initialUsername = '';
  export let next = '';

  let redirected = false;

  function getFallbackProfileUrl() {
    const username = $profile?.username || $authUser?.user_metadata?.username;
    const path = getCanonicalProfilePath(username) || '/';
    return buildAppUrl(path);
  }

  function getRedirectUrl() {
    return getSafeNextUrl(next, getFallbackProfileUrl());
  }

  function navigateFromAuth(event) {
    const view = event.detail?.view;
    window.location.assign(view === 'leaderboard' ? '/leaderboard' : '/');
  }

  function openAuthRoute(event) {
    const mode = event.detail?.mode === 'signup' ? 'signup' : 'login';
    const query = mode === 'signup' && initialUsername
      ? `?username=${encodeURIComponent(initialUsername.trim().slice(0, 20))}`
      : '';
    window.location.assign(`/${mode}${query}`);
  }

  function redirectAfterAuth() {
    if (redirected || typeof window === 'undefined') return;
    redirected = true;
    window.location.replace(getRedirectUrl());
  }

  onMount(async () => {
    await tick();
    const firstField = document.querySelector('#username-input, #email-input');
    if (firstField instanceof HTMLElement) firstField.focus();
  });

  $: if (
    !redirected
    && $authInitialized
    && $session
    && !$profileLoading
    && ($authEvent === 'SIGNED_IN' || $authEvent === 'USER_UPDATED' || $authEvent === 'INITIAL_SESSION')
  ) {
    redirectAfterAuth();
  }
</script>

<svelte:head>
  <meta name="description" content={initialTab === 'signup' ? 'Create a ChromaDie account and keep building your public color identity.' : 'Sign in to keep your ChromaDie profile, rolls, and cosmetics in sync.'} />
</svelte:head>

<main class="auth-page site-atmosphere-page" aria-labelledby="auth-page-title">
  <div class="auth-page__content">
    <SiteModeHeader
      activeView="home"
      accountState={$accountState}
      isAuthenticated={$isAuthenticated}
      isHomeMode={true}
      isHomepageStyle={true}
      on:navigate={navigateFromAuth}
      on:login={openAuthRoute}
      on:claim={() => openAuthRoute({ detail: { mode: 'signup' } })}
    />

    <div class="auth-page__layout">
      <section class="auth-page__intro" aria-labelledby="auth-page-title">
        <p class="auth-page__kicker">{initialTab === 'signup' ? 'Claim your identity' : 'Return to your profile'}</p>
        <h1 id="auth-page-title">
          {#if initialTab === 'signup'}
            Make the page <span>yours.</span>
          {:else}
            Keep your color <span>story.</span>
          {/if}
        </h1>
        <p>
          {initialTab === 'signup'
            ? 'Claim a public identity that grows with every daily color roll.'
            : 'Keep your rolls, history, cosmetics, and profile expression connected wherever you sign in.'}
        </p>
        <div class="auth-page__promise" aria-label="Account benefits">
          <span>Daily color history</span>
          <span>Public profile identity</span>
          <span>Progress across devices</span>
        </div>
      </section>

      <section class="auth-page__stage" aria-label={initialTab === 'signup' ? 'Create account' : 'Sign in'}>
        <div class="auth-page__form">
          <Auth
            standalone={true}
            initialTab={initialTab}
            initialUsername={initialUsername}
            {next}
          />
        </div>
      </section>
    </div>

    <SiteFooter isAuthenticated={$isAuthenticated} />
  </div>
</main>

<style>
  .auth-page {
    --home-canvas: #0b0910;
    --home-deep: #07060b;
    --home-raised: rgba(12, 12, 15, 0.78);
    --home-line: rgba(255, 255, 255, 0.1);
    --home-ink: #f8f8f8;
    --home-ink-muted: #c4bdca;
    --home-ink-faint: #aaa2b0;
    --home-accent: var(--site-brand-accent, #D8A6FF);
    --home-font: 'Inter', ui-sans-serif, system-ui, sans-serif;
    --home-display: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
    --home-mono: 'Inter', ui-sans-serif, system-ui, sans-serif;
    position: relative;
    min-height: 100svh;
    overflow: hidden;
    isolation: isolate;
    background-color: var(--home-canvas);
    background-image: var(--site-atmosphere-veil), var(--site-atmosphere-image);
    background-position: center top;
    background-repeat: no-repeat;
    background-size: cover;
    background-attachment: fixed;
    color: var(--home-ink);
    font-family: var(--home-font);
  }
  .auth-page::before { position: fixed; z-index: -1; inset: 0; content: ''; pointer-events: none; background: radial-gradient(ellipse at 50% 0%, rgba(31, 26, 66, .34), transparent 58%); }
  .auth-page__content { position: relative; z-index: 1; min-height: 100svh; }
  .auth-page__layout { width: min(calc(100% - 48px), 1160px); margin-inline: auto; }
  .auth-page__layout { display: grid; min-height: calc(100svh - 8rem); grid-template-columns: minmax(0, 1fr) minmax(22rem, 31rem); align-items: center; gap: clamp(2.5rem, 8vw, 8rem); padding-block: clamp(3rem, 8vh, 7rem); }
  .auth-page__intro { max-width: 40rem; }
  .auth-page__kicker { margin: 0; color: #858690; font: 500 0.68rem / 1 var(--home-mono); letter-spacing: 0.13em; text-transform: uppercase; }
  .auth-page__intro h1 { max-width: 38rem; margin: 0.9rem 0 0; color: var(--home-ink); font: 600 clamp(3.1rem, min(6vw, 8.4vh), 5.5rem) / 0.9 var(--home-display); letter-spacing: -0.055em; }
  .auth-page__intro h1 :global(span) { color: color-mix(in srgb, var(--home-accent) 62%, #f2f0eb); text-shadow: 0 0 2.2rem color-mix(in srgb, var(--home-accent) 24%, transparent); }
  .auth-page__intro > p:not(.auth-page__kicker) { max-width: 31rem; margin: 1.5rem 0 0; color: var(--home-ink-muted); font-size: clamp(1rem, 1.5vw, 1.06rem); line-height: 1.6; }
  .auth-page__promise { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 2rem; }
  .auth-page__promise span { padding: 0.55rem 0.7rem; border: 1px solid var(--home-line); border-radius: 9px; color: var(--home-ink-muted); font: 500 0.72rem / 1 var(--home-font); }
  .auth-page__stage { position: relative; width: 100%; overflow: hidden; border: 1px solid var(--home-line); border-radius: 18px; background: rgba(10, 10, 12, 0.58); box-shadow: 0 1.9rem 5rem rgba(0, 0, 0, 0.4); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .auth-page__form { width: 100%; padding: clamp(0.85rem, 2vw, 1.25rem); }
  :global(.auth-page .auth-container) { max-width: none; padding: clamp(1.35rem, 3vw, 2.1rem); border-color: var(--home-line); border-radius: 18px; background: var(--home-raised); box-shadow: none; }
  :global(.auth-page .auth-title) { margin: 0.35rem 0 0; color: var(--home-ink); font: 600 clamp(1.65rem, 3vw, 2.35rem) / 1 var(--home-display); letter-spacing: -0.045em; }
  :global(.auth-page .auth-brand) { color: var(--home-ink-faint); font-family: var(--home-display); }
  :global(.auth-page .auth-kicker) { color: var(--home-accent); font-family: var(--home-font); }
  :global(.auth-page .auth-description), :global(.auth-page .field-hint), :global(.auth-page .auth-footnote) { color: var(--home-ink-muted); }
  :global(.auth-page .auth-header) { position: static; }
  :global(.auth-page .tabs a) { display: inline-flex; align-items: center; justify-content: center; color: inherit; text-decoration: none; }
  @media (max-width: 52rem) {
    .auth-page__layout { grid-template-columns: 1fr; gap: 2.25rem; padding-block: 3rem; }
    .auth-page__intro h1 { max-width: 30rem; font-size: clamp(2.8rem, 11vw, 4.6rem); }
    .auth-page__form { max-width: 34rem; margin-inline: auto; }
  }
  @media (max-width: 48rem) {
    .auth-page { background-position: 56% top; background-attachment: scroll; }
  }
  @media (max-width: 35rem) {
    .auth-page__layout { width: min(calc(100% - 2rem), 1160px); }
    .auth-page__layout { padding-block: 2.4rem; }
    .auth-page__intro h1 { font-size: clamp(2.55rem, 15vw, 4rem); }
    .auth-page__promise { display: grid; grid-template-columns: 1fr; }
    .auth-page__promise span { width: fit-content; }
  }
  @media (prefers-reduced-motion: reduce) {
    .auth-page *, .auth-page *::before, .auth-page *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>
