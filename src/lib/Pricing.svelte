<script>
  import { onMount } from 'svelte';
  import { authInitialized, isAuthenticated, profile, profileEntitlements, session, fetchProfileEntitlements } from './stores.js';
  import { supabase } from './supabase.js';
  import { hasChromadiePlus } from './premiumEntitlements.js';
  import { isProfileFeatureEnabled } from './profileFeatureFlags.js';

  let busy = false;
  let restoreState = 'idle';
  let message = '';
  let returnSessionId = '';
  $: plusActive = hasChromadiePlus($profileEntitlements);
  $: commerceEnabled = isProfileFeatureEnabled('commerce', {
    userId: $session?.user?.id,
    isStaff: Boolean($profile?.is_staff)
  });

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    returnSessionId = params.get('session_id') || '';
    if (window.location.pathname === '/pricing/success') {
      void restoreAfterAuth();
    }
    else if (params.get('checkout') === 'cancelled') message = 'Checkout was cancelled. Nothing was charged.';
  });

  async function restoreAfterAuth() {
    if (!$authInitialized) {
      await new Promise(resolve => {
        let unsubscribe = () => {};
        unsubscribe = authInitialized.subscribe(initialized => {
          if (!initialized) return;
          queueMicrotask(() => {
            unsubscribe();
            resolve();
          });
        });
      });
    }
    await restoreCheckout();
  }

  async function beginCheckout() {
    if (busy || plusActive || !commerceEnabled) {
      if (!commerceEnabled && !plusActive) message = 'Purchases are temporarily paused while this rollout is being verified.';
      return;
    }
    if (!$session) {
      window.location.href = '/login?next=%2Fpricing';
      return;
    }
    busy = true;
    message = '';
    const { data, error } = await supabase.functions.invoke('create-premium-checkout', { body: {} });
    if (error || !data?.checkout_url) {
      message = data?.error || error?.message || 'Checkout could not be opened. Please try again.';
      busy = false;
      return;
    }
    window.location.assign(data.checkout_url);
  }

  async function restoreCheckout() {
    if (busy) return;
    if (!$authInitialized) {
      void restoreAfterAuth();
      return;
    }
    if (!$session) {
      const next = returnSessionId ? `/pricing/success?session_id=${encodeURIComponent(returnSessionId)}` : '/pricing/success';
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
      return;
    }
    if (!returnSessionId) {
      restoreState = 'missing';
      message = 'This return link is missing its checkout session. Your account was not changed.';
      return;
    }
    busy = true;
    restoreState = 'checking';
    message = '';
    const { data, error } = await supabase.functions.invoke('restore-premium-checkout', {
      body: { session_id: returnSessionId }
    });
    if (error || !data) {
      restoreState = 'error';
      message = data?.error || error?.message || 'We could not verify this checkout yet.';
      busy = false;
      return;
    }
    await fetchProfileEntitlements();
    restoreState = data.active ? 'active' : data.entitlement_status === 'processing' ? 'processing' : 'inactive';
    message = data.active
      ? 'Chromadie Plus is active for this account.'
      : data.entitlement_status === 'processing'
        ? 'Payment succeeded. Stripe is still confirming fulfillment; retry in a moment.'
        : 'This checkout has not completed, and your account was not changed.';
    busy = false;
  }
</script>

<svelte:head>
  <meta name="theme-color" content="#08090d" />
</svelte:head>

<section class="pricing-page" aria-labelledby="pricing-title">
  <div class="pricing-page__atmosphere" aria-hidden="true"></div>
  <div class="pricing-page__shell">
    <header class="pricing-hero">
      <div class="pricing-hero__heading">
        <p class="pricing-page__eyebrow">Chromadie Plus / expression, once</p>
        <h1 id="pricing-title">Make more <span>of your profile.</span></h1>
      </div>
      <div class="pricing-hero__side">
        <p>Keep the daily ritual, the color history, and everything you earn. Plus gives the page around your identity more room to become yours.</p>
        <div class="pricing-hero__signal" aria-label="Lifetime profile expression">
          <span>01</span>
          <strong>one identity / lifetime access</strong>
        </div>
      </div>
    </header>

    {#if message}
      <div class:pricing-page__notice--success={restoreState === 'active'} class="pricing-page__notice" role="status" aria-live="polite">
        <span>{message}</span>
        {#if restoreState === 'processing'}
          <button type="button" on:click={restoreCheckout} disabled={busy}>{busy ? 'Checking…' : 'Check again'}</button>
        {/if}
      </div>
    {/if}

    <section class="pricing-grid" aria-label="Free profile and Chromadie Plus comparison">
      <article class="pricing-card pricing-card--free">
        <div class="pricing-card__head">
          <p class="pricing-card__label"><span>01</span> Free / always</p>
          <h2>A complete identity.</h2>
          <p class="pricing-card__price">$0 <span>forever</span></p>
        </div>
        <p class="pricing-card__summary">Start with a beautiful public page and let each daily color add another chapter.</p>
        <ul>
          <li>Polished image-based public profile</li>
          <li>Daily color ritual, history, and collections</li>
          <li>Three structured profile templates</li>
          <li>About, projects, links, and provider widgets</li>
          <li>Earned cosmetics and profile progression</li>
        </ul>
        <a class="pricing-card__secondary" href={$isAuthenticated ? '/profile/settings' : '/signup'}>{$isAuthenticated ? 'Open Profile Studio' : 'Create a free profile'} <span aria-hidden="true">↗</span></a>
      </article>

      <article class="pricing-card pricing-card--plus">
        <div class="pricing-card__head">
          <p class="pricing-card__label"><span>02</span> Chromadie Plus / lifetime</p>
          <h2>More room for expression.</h2>
          <p class="pricing-card__price">$7.99 <span>USD, one time</span></p>
        </div>
        <p class="pricing-card__summary">A single purchase for the tools that help your profile hold more of your story.</p>
        <ul>
          <li>Everything in the complete free profile</li>
          <li>Premium structured templates and expression catalog</li>
          <li>Lifetime access on one Chromadie identity</li>
          <li>Future Plus profile-expression capacity as it launches</li>
          <li>No paid rank, rewards, achievements, or prestige</li>
        </ul>
        <button type="button" class="pricing-card__primary" on:click={beginCheckout} disabled={busy || plusActive || !commerceEnabled}>
          <span>{plusActive ? 'Chromadie Plus active' : !commerceEnabled ? 'Purchases temporarily paused' : busy ? 'Opening secure checkout…' : $isAuthenticated ? 'Buy lifetime access' : 'Sign in to buy'}</span>
          {#if !plusActive && commerceEnabled}<span aria-hidden="true">↗</span>{/if}
        </button>
        <p class="pricing-card__fineprint">Secure payment by Stripe. Refunds and chargebacks remove Plus presentation without deleting gameplay history or profile content.</p>
      </article>
    </section>

    <section class="pricing-page__promise" aria-labelledby="pricing-promise-title">
      <div class="pricing-page__promise-heading">
        <p class="pricing-page__eyebrow">The promise</p>
        <h2 id="pricing-promise-title">The color stays earned.</h2>
        <p>Premium changes how much of your identity you can express. It never changes what you have played for.</p>
      </div>
      <div class="pricing-page__promise-list">
        <div>
          <span>01</span>
          <p><strong>Play</strong> Daily rolls, rank, rewards, and prestige remain part of the ritual.</p>
        </div>
        <div>
          <span>02</span>
          <p><strong>Shape</strong> Plus adds creative capacity without making the free profile feel unfinished.</p>
        </div>
        <div>
          <span>03</span>
          <p><strong>Keep</strong> Your history and profile content stay yours through refunds and chargebacks.</p>
        </div>
      </div>
    </section>
  </div>
</section>

<style>
  .pricing-page {
    --pricing-ink: var(--site-ink, #f2f0eb);
    --pricing-muted: var(--site-muted, #aaa8b0);
    --pricing-faint: var(--site-faint, #7d7e87);
    --pricing-line: var(--site-line, rgba(255, 255, 255, 0.075));
    --pricing-line-strong: var(--site-line-strong, rgba(255, 255, 255, 0.15));
    --pricing-accent: var(--site-accent, var(--white, #ffffff));
    position: relative;
    isolation: isolate;
    min-height: 100%;
    overflow: hidden;
    color: var(--pricing-ink);
    background: #050506;
    font-family: var(--site-font, 'Inter', ui-sans-serif, system-ui, sans-serif);
  }
  .pricing-page::before {
    position: absolute;
    z-index: -1;
    inset: 0;
    content: '';
    pointer-events: none;
    background: radial-gradient(ellipse at 50% 0%, rgba(31, 26, 66, .28), transparent 58%);
    opacity: 1;
  }
  .pricing-page__atmosphere {
    position: absolute;
    z-index: -1;
    top: -9rem;
    left: 42%;
    width: min(60rem, 92vw);
    height: 42rem;
    transform: translateX(-50%);
    background: radial-gradient(circle at 61% 25%, color-mix(in srgb, var(--pricing-accent) 15%, transparent), transparent 44%), radial-gradient(circle at 28% 12%, rgba(86, 208, 197, 0.07), transparent 38%);
    pointer-events: none;
  }
  .pricing-page__shell { width: min(calc(100% - 48px), 1160px); margin: 0 auto; padding: clamp(3rem, 7vw, 6rem) 0 5rem; }
  .pricing-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, 29rem); align-items: end; gap: clamp(2rem, 7vw, 7.5rem); padding-bottom: clamp(3rem, 6vw, 5.25rem); border-bottom: 1px solid var(--pricing-line); }
  .pricing-hero > * { animation: pricing-enter 0.78s cubic-bezier(0.2, 0.72, 0.2, 1) both; }
  .pricing-hero > :nth-child(2) { animation-delay: 0.08s; }
  .pricing-page__eyebrow { margin: 0 0 0.85rem; color: var(--pricing-faint); font: 500 0.68rem / 1 var(--site-font, 'Inter', sans-serif); letter-spacing: 0.13em; text-transform: uppercase; }
  .pricing-hero h1 { max-width: 12ch; margin: 0; color: var(--pricing-ink); font: 650 clamp(3.15rem, 7.2vw, 6.2rem) / 0.9 var(--site-display, sans-serif); letter-spacing: -0.045em; }
  .pricing-hero h1 span { color: color-mix(in srgb, var(--pricing-accent) 66%, var(--pricing-ink)); text-shadow: 0 0 2rem color-mix(in srgb, var(--pricing-accent) 22%, transparent); }
  .pricing-hero__side { align-self: end; }
  .pricing-hero__side > p { max-width: 27rem; margin: 0 0 1.35rem; color: var(--pricing-muted); font-size: 1rem; line-height: 1.62; }
  .pricing-hero__signal { display: flex; align-items: center; gap: 0.7rem; color: var(--pricing-faint); font: 500 0.64rem / 1 var(--site-font, 'Inter', sans-serif); letter-spacing: 0.08em; text-transform: uppercase; }
  .pricing-hero__signal span { color: var(--pricing-accent); }
  .pricing-hero__signal strong { color: var(--pricing-ink); font-weight: 500; }
  .pricing-page__notice { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 1.35rem 0 0; padding: 0.9rem 1rem; border: 1px solid var(--pricing-line); border-radius: 18px; background: var(--site-surface-soft, rgba(255, 255, 255, 0.035)); color: var(--pricing-muted); font-size: 0.88rem; }
  .pricing-page__notice--success { border-color: rgba(107, 230, 178, 0.32); color: #bdf4dc; }
  .pricing-page__notice button { border: 0; background: transparent; color: inherit; font: inherit; text-decoration: underline; text-underline-offset: 0.2em; cursor: pointer; }
  .pricing-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: clamp(2.7rem, 6vw, 5.3rem); border-top: 1px solid var(--pricing-line); border-bottom: 1px solid var(--pricing-line); }
  .pricing-card { position: relative; display: flex; min-width: 0; flex-direction: column; gap: 1.65rem; padding: clamp(1.5rem, 4vw, 3.25rem) clamp(1rem, 4vw, 3.25rem) clamp(2rem, 4vw, 3.25rem); }
  .pricing-card + .pricing-card { border-left: 1px solid var(--pricing-line); }
  .pricing-card--plus { background: color-mix(in srgb, var(--pricing-accent) 5%, var(--site-surface, rgba(10, 10, 12, .58))); }
  .pricing-card--plus::before { position: absolute; top: 0; right: 0; width: 6rem; height: 1px; content: ''; background: var(--pricing-accent); box-shadow: 0 0 2rem color-mix(in srgb, var(--pricing-accent) 70%, transparent); }
  .pricing-card__head { min-height: 12rem; }
  .pricing-card__label { display: flex; align-items: center; gap: 0.55rem; margin: 0 0 1.6rem; color: var(--pricing-faint); font: 500 0.66rem / 1 var(--site-font, 'Inter', sans-serif); letter-spacing: 0.12em; text-transform: uppercase; }
  .pricing-card__label span { color: var(--pricing-accent); }
  .pricing-card h2 { max-width: 12ch; margin: 0; color: var(--pricing-ink); font: 650 clamp(1.8rem, 3.5vw, 3rem) / 0.96 var(--site-display, sans-serif); letter-spacing: -0.04em; }
  .pricing-card__price { margin: 1.8rem 0 0; color: var(--pricing-ink); font: 650 clamp(2.4rem, 5vw, 4.4rem) / 0.9 var(--site-display, sans-serif); letter-spacing: -0.05em; }
  .pricing-card__price span { display: inline-block; margin-left: 0.35rem; color: var(--pricing-faint); font: 500 0.66rem / 1 var(--site-font, 'Inter', sans-serif); letter-spacing: 0.09em; text-transform: uppercase; vertical-align: middle; }
  .pricing-card__summary { max-width: 27rem; min-height: 3.2rem; margin: 0; color: var(--pricing-muted); font-size: 0.93rem; line-height: 1.55; }
  .pricing-card ul { display: grid; gap: 0.85rem; margin: 0; padding: 1.4rem 0 0; border-top: 1px solid var(--pricing-line); list-style: none; color: var(--pricing-muted); font-size: 0.9rem; line-height: 1.45; }
  .pricing-card li { position: relative; padding-left: 1.25rem; }
  .pricing-card li::before { position: absolute; left: 0; content: '—'; color: var(--pricing-accent); }
  .pricing-card__primary, .pricing-card__secondary { display: inline-flex; align-items: center; justify-content: center; gap: 0.65rem; width: fit-content; min-height: 42px; margin-top: 0.4rem; padding: 0 18px; border-radius: 9px; font: 600 .88rem / 1 var(--site-display, sans-serif); text-decoration: none; cursor: pointer; transition: background-color var(--motion-base, 220ms) var(--motion-ease-standard, ease), border-color var(--motion-base, 220ms) var(--motion-ease-standard, ease), transform var(--motion-base, 220ms) var(--motion-ease-standard, ease); }
  .pricing-card__primary:hover:not(:disabled), .pricing-card__secondary:hover { transform: translateY(-1px); }
  .pricing-card__primary { border: 1px solid var(--pricing-ink); background: var(--pricing-ink); color: #090a0d; }
  .pricing-card__primary:hover:not(:disabled) { border-color: var(--pricing-accent); background: var(--pricing-accent); }
  .pricing-card__primary:disabled { cursor: default; opacity: 0.58; }
  .pricing-card__secondary { border: 1px solid var(--pricing-line-strong); background: transparent; color: var(--pricing-ink); }
  .pricing-card__secondary:hover { border-color: var(--pricing-accent); background: color-mix(in srgb, var(--pricing-accent) 9%, transparent); }
  .pricing-card__fineprint { max-width: 27rem; margin: 0; color: var(--pricing-faint); font-size: 0.72rem; line-height: 1.5; }
  .pricing-page__promise { display: grid; grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr); gap: clamp(2rem, 8vw, 9rem); padding: clamp(4.5rem, 9vw, 8rem) 0 1rem; }
  .pricing-page__promise-heading h2 { max-width: 11ch; margin: 0.8rem 0 1.15rem; color: var(--pricing-ink); font: 650 clamp(2.7rem, 5vw, 4.6rem) / 0.94 var(--site-display, sans-serif); letter-spacing: -0.043em; }
  .pricing-page__promise-heading > p:last-child { max-width: 25rem; margin: 0; color: var(--pricing-muted); font-size: 0.95rem; line-height: 1.62; }
  .pricing-page__promise-list { border-top: 1px solid var(--pricing-line); }
  .pricing-page__promise-list > div { display: grid; grid-template-columns: 2.2rem minmax(0, 1fr); gap: 0.85rem; padding: 1.35rem 0; border-bottom: 1px solid var(--pricing-line); }
  .pricing-page__promise-list span { color: var(--pricing-accent); font: 500 0.66rem / 1.4 var(--site-font, 'Inter', sans-serif); }
  .pricing-page__promise-list p { margin: 0; color: var(--pricing-muted); font-size: 0.92rem; line-height: 1.55; }
  .pricing-page__promise-list strong { color: var(--pricing-ink); font-weight: 600; }
  @keyframes pricing-enter { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: none; } }
  :global(.pricing-page a:focus-visible), :global(.pricing-page button:focus-visible) { outline: 2px solid var(--pricing-accent); outline-offset: 3px; }
  @media (max-width: 67.5rem) {
    .pricing-hero { grid-template-columns: 1fr; gap: 1.7rem; }
    .pricing-hero__side > p { max-width: 36rem; }
    .pricing-page__promise { gap: 3rem; }
  }
  @media (max-width: 48rem) {
    .pricing-page__shell { width: min(calc(100% - 2rem), 86.25rem); padding-top: 2.25rem; }
    .pricing-hero h1 { font-size: clamp(2.85rem, 13vw, 4.5rem); }
    .pricing-page__notice { align-items: flex-start; flex-direction: column; }
    .pricing-grid { grid-template-columns: 1fr; margin-top: 3rem; }
    .pricing-card + .pricing-card { border-top: 1px solid var(--pricing-line); border-left: 0; }
    .pricing-card__head { min-height: 0; }
    .pricing-card__summary { min-height: 0; }
    .pricing-card__primary, .pricing-card__secondary { width: 100%; }
    .pricing-page__promise { grid-template-columns: 1fr; gap: 2.4rem; padding-top: 4.5rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pricing-hero > * { animation: none; }
    .pricing-card__primary, .pricing-card__secondary { transition: none; }
  }
</style>
