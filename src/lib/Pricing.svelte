<script>
  import { onMount } from 'svelte';
  import { authInitialized, isAuthenticated, profileEntitlements, session, fetchProfileEntitlements } from './stores.js';
  import { supabase } from './supabase.js';
  import { hasChromadiePlus } from './premiumEntitlements.js';

  let busy = false;
  let restoreState = 'idle';
  let message = '';
  let returnSessionId = '';
  $: plusActive = hasChromadiePlus($profileEntitlements);

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
    if (busy || plusActive) return;
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
  <div class="pricing-page__glow" aria-hidden="true"></div>
  <header class="pricing-page__intro">
    <p class="pricing-page__eyebrow">Expression, once</p>
    <h1 id="pricing-title">Make more of your profile.</h1>
    <p>Chromadie Plus expands the tools around your identity. Daily rolls, rank, achievements, rewards, and prestige stay earned through play.</p>
  </header>

  {#if message}
    <div class:pricing-page__notice--success={restoreState === 'active'} class="pricing-page__notice" role="status" aria-live="polite">
      <span>{message}</span>
      {#if restoreState === 'processing'}
        <button type="button" on:click={restoreCheckout} disabled={busy}>{busy ? 'Checking…' : 'Check again'}</button>
      {/if}
    </div>
  {/if}

  <div class="pricing-grid">
    <article class="pricing-card">
      <div>
        <p class="pricing-card__label">Free</p>
        <h2>A complete identity</h2>
        <p class="pricing-card__price">$0 <span>forever</span></p>
      </div>
      <ul>
        <li>Polished image-based public profile</li>
        <li>Daily color ritual, history, and collections</li>
        <li>Three structured profile templates</li>
        <li>About, projects, links, and provider widgets</li>
        <li>Earned cosmetics and profile progression</li>
      </ul>
      <a class="pricing-card__secondary" href={$isAuthenticated ? '/profile/settings' : '/signup'}>{$isAuthenticated ? 'Open Profile Studio' : 'Create a free profile'}</a>
    </article>

    <article class="pricing-card pricing-card--plus">
      <div>
        <p class="pricing-card__label">Chromadie Plus</p>
        <h2>More room for expression</h2>
        <p class="pricing-card__price">$7.99 <span>USD, lifetime</span></p>
      </div>
      <ul>
        <li>Everything in the complete free profile</li>
        <li>Premium structured templates and expression catalog</li>
        <li>Lifetime access on one Chromadie identity</li>
        <li>Future Plus profile-expression capacity as it launches</li>
        <li>No paid rank, rewards, achievements, or prestige</li>
      </ul>
      <button type="button" class="pricing-card__primary" on:click={beginCheckout} disabled={busy || plusActive}>
        {plusActive ? 'Chromadie Plus active' : busy ? 'Opening secure checkout…' : $isAuthenticated ? 'Buy lifetime access' : 'Sign in to buy'}
      </button>
      <p class="pricing-card__fineprint">Secure payment by Stripe. Refunds and chargebacks remove Plus presentation without deleting gameplay history or profile content.</p>
    </article>
  </div>
</section>

<style>
  .pricing-page {
    position: relative;
    isolation: isolate;
    width: min(100% - 2rem, 70rem);
    margin: 0 auto;
    padding: clamp(3rem, 7vw, 7rem) 0 6rem;
    color: #f4f2ec;
  }
  .pricing-page__glow {
    position: absolute;
    z-index: -1;
    top: 0;
    left: 50%;
    width: min(68rem, 110vw);
    height: 35rem;
    transform: translateX(-50%);
    background: radial-gradient(circle at 62% 25%, rgba(150, 121, 255, 0.14), transparent 48%), radial-gradient(circle at 30% 10%, rgba(86, 208, 197, 0.1), transparent 40%);
    pointer-events: none;
  }
  .pricing-page__intro { max-width: 46rem; margin-bottom: clamp(2.5rem, 5vw, 4.5rem); }
  .pricing-page__eyebrow, .pricing-card__label { margin: 0 0 0.8rem; color: #a9a5bb; font: 600 0.72rem/1.2 var(--font-mono-stack, ui-monospace, monospace); letter-spacing: 0.14em; text-transform: uppercase; }
  .pricing-page h1 { max-width: 12ch; margin: 0; font: 500 clamp(3rem, 8vw, 6.5rem)/0.92 var(--font-display-stack, sans-serif); letter-spacing: -0.055em; }
  .pricing-page__intro > p:last-child { max-width: 42rem; margin: 1.6rem 0 0; color: rgba(240, 240, 246, 0.66); font-size: clamp(1rem, 2vw, 1.18rem); line-height: 1.65; }
  .pricing-page__notice { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin: -1.5rem 0 2rem; padding: 0.9rem 1rem; border: 1px solid rgba(255,255,255,.12); border-radius: 0.75rem; background: rgba(255,255,255,.045); color: rgba(244,242,236,.8); }
  .pricing-page__notice--success { border-color: rgba(107, 230, 178, .32); color: #bdf4dc; }
  .pricing-page__notice button { border: 0; background: transparent; color: inherit; text-decoration: underline; cursor: pointer; }
  .pricing-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid rgba(255,255,255,.12); border-bottom: 1px solid rgba(255,255,255,.12); }
  .pricing-card { display: flex; flex-direction: column; gap: 2rem; min-width: 0; padding: clamp(1.5rem, 4vw, 3rem); }
  .pricing-card + .pricing-card { border-left: 1px solid rgba(255,255,255,.12); }
  .pricing-card--plus { background: linear-gradient(145deg, rgba(153,126,255,.09), rgba(255,255,255,.02) 55%); }
  .pricing-card h2 { margin: 0; font: 500 clamp(1.5rem, 3vw, 2.2rem)/1.1 var(--font-display-stack, sans-serif); }
  .pricing-card__price { margin: 1.5rem 0 0; font: 500 clamp(2rem, 5vw, 3.5rem)/1 var(--font-display-stack, sans-serif); }
  .pricing-card__price span { display: block; margin-top: .5rem; color: rgba(244,242,236,.5); font: 500 .72rem/1.3 var(--font-mono-stack, monospace); letter-spacing: .06em; text-transform: uppercase; }
  .pricing-card ul { display: grid; gap: .85rem; margin: 0; padding: 0; list-style: none; color: rgba(244,242,236,.68); line-height: 1.45; }
  .pricing-card li { position: relative; padding-left: 1.2rem; }
  .pricing-card li::before { content: '—'; position: absolute; left: 0; color: rgba(196,181,255,.75); }
  .pricing-card__primary, .pricing-card__secondary { display: inline-flex; justify-content: center; align-items: center; min-height: 3rem; margin-top: auto; padding: .75rem 1rem; border-radius: 999px; font: 650 .86rem/1 var(--font-body-stack, sans-serif); text-decoration: none; cursor: pointer; }
  .pricing-card__primary { border: 1px solid #eeeafc; background: #eeeafc; color: #101016; }
  .pricing-card__primary:disabled { cursor: default; opacity: .6; }
  .pricing-card__secondary { border: 1px solid rgba(255,255,255,.16); color: #f4f2ec; }
  .pricing-card__fineprint { margin: -1rem 0 0; color: rgba(244,242,236,.42); font-size: .74rem; line-height: 1.5; }
  :global(.pricing-page a:focus-visible), button:focus-visible { outline: 2px solid #c4b5ff; outline-offset: 3px; }
  @media (max-width: 700px) {
    .pricing-page { padding-top: 2.5rem; }
    .pricing-grid { grid-template-columns: 1fr; }
    .pricing-card + .pricing-card { border-top: 1px solid rgba(255,255,255,.12); border-left: 0; }
    .pricing-page__notice { align-items: flex-start; flex-direction: column; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pricing-page__glow { background: radial-gradient(circle at 50% 20%, rgba(150,121,255,.1), transparent 52%); }
  }
</style>
