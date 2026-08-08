<script>
  import { onMount, tick } from 'svelte';
  import Auth from './Auth.svelte';
  import { authEvent, authInitialized, authUser, profile, profileLoading, session } from './stores';
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

<main class="auth-page" aria-labelledby="auth-page-title">
  <div class="auth-page__grain" aria-hidden="true"></div>
  <header class="auth-page__header">
    <a class="auth-page__brand" href="/" aria-label="ChromaDie home">chm<span>.lol</span></a>
    <a class="auth-page__back" href="/">Back to home</a>
  </header>

  <div class="auth-page__layout">
    <section class="auth-page__intro" aria-labelledby="auth-page-title">
      <p class="auth-page__kicker">Your profile starts here</p>
      <h1 id="auth-page-title">{initialTab === 'signup' ? 'Make the page yours.' : 'Welcome back to your color story.'}</h1>
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

    <section class="auth-page__form" aria-label={initialTab === 'signup' ? 'Create account' : 'Sign in'}>
      <Auth
        standalone={true}
        initialTab={initialTab}
        initialUsername={initialUsername}
        {next}
      />
    </section>
  </div>

  <footer class="auth-page__footer">
    <span>ChromaDie</span>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
  </footer>
</main>

<style>
  .auth-page {
    position: relative;
    display: flex;
    min-height: 100dvh;
    flex-direction: column;
    overflow: hidden;
    padding: 1.1rem clamp(1rem, 4vw, 4rem) 1.5rem;
    background:
      radial-gradient(circle at 18% 18%, rgba(141, 124, 246, 0.14), transparent 34%),
      radial-gradient(circle at 84% 72%, rgba(183, 253, 77, 0.06), transparent 30%),
      #08090c;
    color: var(--color-ink-strong);
  }
  .auth-page__grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.36; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0 1px, transparent 1px 4px); }
  .auth-page__header, .auth-page__footer, .auth-page__layout { position: relative; z-index: 1; width: min(100%, 78rem); margin-inline: auto; }
  .auth-page__header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 3rem; }
  .auth-page__brand { color: #f1f2ef; font: 700 0.83rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-decoration: none; }
  .auth-page__brand span { color: var(--color-ink-muted); }
  .auth-page__back { color: var(--color-ink-muted); font-size: 0.78rem; text-decoration: none; }
  .auth-page__back:hover, .auth-page__back:focus-visible { color: var(--color-ink-strong); }
  .auth-page__layout { display: grid; flex: 1; grid-template-columns: minmax(0, 1fr) minmax(22rem, 30rem); align-items: center; gap: clamp(2rem, 8vw, 8rem); padding-block: clamp(3rem, 10vh, 8rem); }
  .auth-page__intro { max-width: 38rem; }
  .auth-page__kicker { margin: 0 0 1rem; color: var(--color-accent-bright); font: 600 0.67rem / 1 var(--font-mono-stack); letter-spacing: 0.15em; text-transform: uppercase; }
  .auth-page__intro h1 { max-width: 35rem; margin: 0; color: #f3f2ee; font: 650 clamp(2.8rem, 6vw, 6.25rem) / 0.92 var(--font-display); letter-spacing: -0.055em; }
  .auth-page__intro > p:not(.auth-page__kicker) { max-width: 31rem; margin: 1.5rem 0 0; color: var(--color-ink-muted); font-size: clamp(1rem, 1.5vw, 1.2rem); line-height: 1.55; }
  .auth-page__promise { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 2rem; }
  .auth-page__promise span { padding: 0.55rem 0.7rem; border: 1px solid var(--color-line-subtle); border-radius: 999px; color: var(--color-ink-muted); font: 500 0.66rem / 1 var(--font-mono-stack); }
  .auth-page__form { width: 100%; }
  :global(.auth-page .auth-container) { max-width: none; padding: clamp(1.35rem, 3vw, 2.35rem); }
  :global(.auth-page .auth-title) { margin: 0.35rem 0 0; color: var(--color-ink-strong); font: 650 clamp(1.65rem, 3vw, 2.35rem) / 1 var(--font-display); letter-spacing: -0.045em; }
  :global(.auth-page .auth-header) { position: static; }
  :global(.auth-page .tabs a) { display: inline-flex; align-items: center; justify-content: center; color: inherit; text-decoration: none; }
  .auth-page__footer { display: flex; flex-wrap: wrap; gap: 1rem; color: var(--color-ink-faint); font: 500 0.66rem / 1 var(--font-mono-stack); }
  .auth-page__footer a { color: inherit; text-decoration: none; }
  .auth-page__footer a:hover, .auth-page__footer a:focus-visible { color: var(--color-ink-strong); }
  @media (max-width: 52rem) {
    .auth-page__layout { grid-template-columns: 1fr; gap: 2.25rem; padding-block: 3rem; }
    .auth-page__intro h1 { max-width: 30rem; font-size: clamp(2.8rem, 11vw, 4.6rem); }
    .auth-page__form { max-width: 34rem; margin-inline: auto; }
  }
  @media (max-width: 35rem) {
    .auth-page { padding-inline: 0.75rem; }
    .auth-page__header { min-height: 2.75rem; }
    .auth-page__layout { padding-block: 2.4rem; }
    .auth-page__intro h1 { font-size: clamp(2.55rem, 15vw, 4rem); }
    .auth-page__promise { display: grid; grid-template-columns: 1fr; }
    .auth-page__promise span { width: fit-content; }
  }
  @media (prefers-reduced-motion: reduce) {
    .auth-page *, .auth-page *::before, .auth-page *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>
