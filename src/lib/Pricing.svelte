<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { authInitialized, isAuthenticated, profile, profileEntitlements, profileError, session, fetchProfileEntitlements } from './stores.js';
  import { supabase } from './supabase.js';
  import { hasChromadiePlus } from './premiumEntitlements.js';
  import { isProfileFeatureEnabled } from './profileFeatureFlags.js';
  import HomepageClaim from './homepage/HomepageClaim.svelte';

  let busy = false;
  let restoreState = 'idle';
  let message = '';
  let returnSessionId = '';
  const dispatch = createEventDispatcher();
  $: plusActive = hasChromadiePlus($profileEntitlements);
  $: featureContext = {
    userId: $session?.user?.id,
    isStaff: Boolean($profile?.is_staff)
  };
  $: commerceEnabled = isProfileFeatureEnabled('commerce', featureContext)
    && isProfileFeatureEnabled('profileMediaR2', featureContext);

  function forwardClaim(event) {
    dispatch('claim', event.detail);
  }

  function forwardProfile(event) {
    dispatch('profile', event.detail);
  }

  const comparisonRows = Object.freeze([
    {
      label: 'Public profile and daily rolls',
      free: true,
      plus: true
    },
    {
      label: 'Five profile layouts',
      free: true,
      plus: true
    },
    {
      label: 'Up to 6 profile links',
      free: true,
      plus: true
    },
    {
      label: 'Up to 10 projects',
      free: true,
      plus: true
    },
    {
      label: 'Up to 4 provider widgets',
      free: true,
      plus: true
    },
    {
      label: 'Background image and atmosphere',
      free: true,
      plus: true
    },
    {
      label: 'Background video hosting',
      free: false,
      plus: true
    },
    {
      label: 'Animated avatar hosting',
      free: false,
      plus: true
    },
    {
      label: 'Profile audio and playlists',
      free: false,
      plus: true
    },
    {
      label: 'Custom cursors',
      free: false,
      plus: true
    },
    {
      label: 'Custom OG/share image',
      free: false,
      plus: true
    },
    {
      label: 'Up to 1 GB hosted media',
      free: false,
      plus: true
    }
  ]);

  const faqRows = Object.freeze([
    {
      question: 'What is Chromadie Plus?',
      answer: 'A one-time $7.99 purchase for one Chromadie identity. It unlocks hosted media and custom cursor and share-image uploads; the core profile, game, and progression stay free.'
    },
    {
      question: 'What is included with a free profile?',
      answer: 'A public profile, daily rolls, history, collections, progression, five layouts, up to 6 links, 10 projects, and 4 provider widgets.'
    },
    {
      question: 'What can I upload with Plus?',
      answer: 'One background video, one animated avatar, profile audio and playlists, cursor assets, and one 1200×630 share image within a 1 GB media allowance.'
    },
    {
      question: 'How does the media limit work?',
      answer: 'The 1 GB allowance is shared across hosted video, avatar, audio, cursor, and share-image assets. Remove existing media before adding more when the allowance is full.'
    },
    {
      question: 'Is Plus a subscription?',
      answer: 'No. Plus is a single payment for lifetime access on one identity. Hosted media remains subject to the published file and storage limits.'
    },
    {
      question: 'Can I transfer Plus to another account?',
      answer: 'No. Plus stays with the account and identity that completed the purchase.'
    }
  ]);

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
      if (!commerceEnabled && !plusActive) message = 'Chromadie Plus is not available yet.';
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
  <div class="pricing-page__shell">
    <header class="pricing-hero">
      <h1 id="pricing-title">Pick your plan</h1>
      <p class="pricing-hero__summary">A complete profile is free. Plus adds hosted media for a one-time $7.99.</p>
    </header>

    {#if message}
      <div class:pricing-page__notice--success={restoreState === 'active'} class="pricing-page__notice" role="status" aria-live="polite">
        <span>{message}</span>
        {#if restoreState === 'processing'}
          <button type="button" on:click={restoreCheckout} disabled={busy}>{busy ? 'Checking…' : 'Check again'}</button>
        {/if}
      </div>
    {/if}

    <section class="pricing-plans" aria-labelledby="pricing-plans-title">
      <header class="pricing-section-heading">
        <h2 id="pricing-plans-title">Plans</h2>
      </header>

      <div class="pricing-grid" aria-label="Free profile and Chromadie Plus comparison">
        <article class="pricing-card pricing-card--free">
          <div class="pricing-card__head">
            <h2>Free</h2>
            <p class="pricing-card__price">$0 <span>forever</span></p>
          </div>
          <p class="pricing-card__includes">Includes:</p>
          <ul>
            <li>Public profile, daily rolls, history, and collections</li>
            <li>Five profile layouts</li>
            <li>Up to 6 links</li>
            <li>Up to 10 projects</li>
            <li>Up to 4 provider widgets</li>
            <li>Earned cosmetics and progression</li>
          </ul>
          <div class="pricing-card__actions">
            <a class="pricing-card__secondary" href={$isAuthenticated ? '/profile/settings' : '/signup'}>{$isAuthenticated ? 'Open Profile Studio' : 'Create a free profile'}</a>
          </div>
        </article>

        <article class="pricing-card pricing-card--plus">
          <div class="pricing-card__head">
            <h2>Chromadie Plus</h2>
            <p class="pricing-card__price">$7.99 <span>one-time payment</span></p>
            <p class="pricing-card__terms">USD · lifetime access · one identity · up to 1 GB shared media</p>
          </div>
          <p class="pricing-card__includes">Everything in Free, plus:</p>
          <ul>
            <li>Background video hosting</li>
            <li>Animated avatar hosting</li>
            <li>Profile audio and playlists</li>
            <li>Custom cursors</li>
            <li>Custom OG/share image upload</li>
            <li>Up to 1 GB shared media</li>
          </ul>
          <p class="pricing-card__fineprint">Secure checkout by Stripe. Taxes, if applicable, are shown at checkout. Refunds or chargebacks revoke Plus access without deleting your profile or history.</p>
          <div class="pricing-card__actions">
            {#if plusActive}
              <span class="pricing-card__availability pricing-card__availability--active" role="status">Chromadie Plus is active</span>
            {:else if !commerceEnabled}
              <span class="pricing-card__availability" role="status">Available soon · <a href="mailto:support@chromadie.com">Contact support</a></span>
            {:else}
              <button type="button" class="pricing-card__primary" on:click={beginCheckout} disabled={busy}>
                <span>{busy ? 'Opening secure checkout…' : $isAuthenticated ? 'Buy lifetime access' : 'Sign in to buy'}</span>
                <span aria-hidden="true">↗</span>
              </button>
            {/if}
          </div>
        </article>
      </div>
    </section>

    <section class="pricing-comparison" aria-labelledby="pricing-comparison-title">
      <header class="pricing-section-heading">
        <h2 id="pricing-comparison-title">Compare features</h2>
      </header>

      <div class="pricing-comparison__frame">
        <div class="pricing-comparison__scroller">
          <table class="pricing-comparison__table" aria-label="Free and Chromadie Plus feature comparison">
            <caption class="pricing-comparison__sr-only">Free and Chromadie Plus feature comparison</caption>
            <colgroup>
              <col class="pricing-comparison__feature-col" />
              <col class="pricing-comparison__plan-col" />
              <col class="pricing-comparison__plan-col" />
            </colgroup>
            <thead>
              <tr class="pricing-comparison__header-row">
                <th class="pricing-comparison__feature-heading" scope="col">Features</th>
                <th class="pricing-comparison__plan pricing-comparison__plan--plus" scope="col">
                  <span>Chromadie Plus</span>
                  <small>Paid once</small>
                </th>
                <th class="pricing-comparison__plan pricing-comparison__plan--free" scope="col">
                  <span>Free</span>
                  <small>No charge</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {#each comparisonRows as row (row.label)}
                <tr class="pricing-comparison__feature">
                  <th class="pricing-comparison__feature-label" scope="row">
                    <span class="pricing-comparison__feature-copy"><strong>{row.label}</strong></span>
                  </th>
                  <td class="pricing-comparison__status pricing-comparison__status--plus">
                    <span class:pricing-comparison__status-icon--included={row.plus} class="pricing-comparison__status-icon" aria-hidden="true">{row.plus ? '✓' : '×'}</span>
                    <span class="pricing-comparison__sr-only">{row.plus ? 'Included with Chromadie Plus' : 'Not included with Chromadie Plus'}</span>
                  </td>
                  <td class="pricing-comparison__status pricing-comparison__status--free">
                    <span class:pricing-comparison__status-icon--included={row.free} class="pricing-comparison__status-icon" aria-hidden="true">{row.free ? '✓' : '×'}</span>
                    <span class="pricing-comparison__sr-only">{row.free ? 'Included for free' : 'Requires Chromadie Plus'}</span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="pricing-faq" aria-labelledby="pricing-faq-title">
      <header class="pricing-section-heading">
        <h2 id="pricing-faq-title">FAQ</h2>
      </header>
      <div class="pricing-faq__list">
        {#each faqRows as row (row.question)}
          <details class="pricing-faq__item">
            <summary>
              <span>{row.question}</span>
              <span class="pricing-faq__icon" aria-hidden="true">+</span>
            </summary>
            <p>{row.answer}</p>
          </details>
        {/each}
      </div>
    </section>

    <section class="pricing-claim" aria-labelledby="pricing-claim-title">
      <header class="pricing-section-heading">
        <h2 id="pricing-claim-title">Claim your handle</h2>
      </header>
      <div class="pricing-claim__control">
        <HomepageClaim
          isAuthenticated={$isAuthenticated}
          accountReady={$authInitialized && (!$session || Boolean($profile))}
          accountUnavailable={$profileError}
          inputId="pricing-claim-username"
          anchorId="pricing-claim-control"
          buttonLabel="Claim"
          on:claim={forwardClaim}
          on:profile={forwardProfile}
        />
      </div>
    </section>
  </div>
</section>

<style>
  .pricing-page {
    --pricing-ink: var(--site-ink, #f2f0eb);
    --pricing-muted: color-mix(in srgb, var(--site-muted, #aaa8b0) 78%, var(--site-ink, #f2f0eb));
    --pricing-faint: color-mix(in srgb, var(--site-faint, #7d7e87) 72%, var(--site-ink, #f2f0eb));
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
  .pricing-page__shell { width: min(980px, calc(100% - 48px)); margin: 0 auto; padding: clamp(2.25rem, 4.5vw, 3.75rem) 0 3.5rem; }
  .pricing-hero { display: grid; justify-items: center; gap: 0.85rem; padding-bottom: clamp(2rem, 4vw, 3rem); text-align: center; }
  .pricing-hero h1 { margin: 0; color: var(--pricing-ink); font: 750 clamp(3.4rem, 6.3vw, 5.5rem) / 0.94 var(--site-display, var(--font-display-stack, sans-serif)); letter-spacing: -0.055em; }
  .pricing-hero__summary { max-width: 34rem; margin: 0; color: var(--pricing-muted); font: 600 0.88rem / 1.45 var(--site-font, var(--font-body-stack, sans-serif)); }
  .pricing-page__notice { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 0 0 2.75rem; padding: 0.9rem 1rem; border: 1px solid var(--pricing-line); border-radius: 0.65rem; background: var(--site-surface, var(--surface-2, #1e1e22)); color: var(--pricing-muted); font-size: 0.82rem; }
  .pricing-page__notice--success { border-color: rgba(107, 230, 178, 0.32); color: #bdf4dc; }
  .pricing-page__notice button { border: 0; background: transparent; color: inherit; font: inherit; text-decoration: underline; text-underline-offset: 0.2em; cursor: pointer; }
  .pricing-section-heading { margin: 0 0 1.15rem; }
  .pricing-section-heading h2 { margin: 0; color: var(--pricing-ink); font: 600 1.15rem / 1.2 var(--site-display, var(--font-display-stack, sans-serif)); letter-spacing: -0.02em; }
  .pricing-plans { margin-top: 0; }
  .pricing-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  .pricing-card { position: relative; display: flex; min-width: 0; flex-direction: column; gap: 1.25rem; padding: 1.4rem; border: 1px solid var(--pricing-line); border-radius: 0.65rem; background: var(--site-surface, var(--surface-2, #1e1e22)); }
  .pricing-card--plus { border-color: color-mix(in srgb, var(--pricing-accent) 38%, var(--pricing-line)); background: color-mix(in srgb, var(--pricing-accent) 8%, var(--site-surface, var(--surface-2, #1e1e22))); box-shadow: inset 0 2px 0 color-mix(in srgb, var(--pricing-accent) 72%, transparent); }
  .pricing-card__head { display: grid; gap: 0.55rem; }
  .pricing-card h2 { margin: 0; color: var(--pricing-ink); font: 600 clamp(1.4rem, 3vw, 2rem) / 1.05 var(--site-display, var(--font-display-stack, sans-serif)); letter-spacing: -0.035em; }
  .pricing-card__price { margin: 0.45rem 0 0; color: var(--pricing-ink); font: 650 clamp(2.25rem, 5vw, 3.7rem) / 0.9 var(--site-display, var(--font-display-stack, sans-serif)); letter-spacing: -0.05em; }
  .pricing-card__price span { display: inline-block; margin-left: 0.3rem; color: var(--pricing-faint); font: 500 0.7rem / 1 var(--site-font, var(--font-body-stack, sans-serif)); letter-spacing: 0.01em; vertical-align: middle; }
  .pricing-card__terms { margin: -.15rem 0 0; color: var(--pricing-muted); font: 500 .7rem / 1.35 var(--site-font, 'Inter', sans-serif); }
  .pricing-card__includes { margin: 0; color: var(--pricing-faint); font: 500 .64rem / 1 var(--site-font, 'Inter', sans-serif); letter-spacing: .1em; text-transform: uppercase; }
  .pricing-card--plus .pricing-card__includes { color: var(--pricing-accent); }
  .pricing-card ul { display: grid; gap: 0.65rem; margin: 0; padding: 0; list-style: none; color: var(--pricing-muted); font-size: 0.82rem; line-height: 1.45; }
  .pricing-card li { position: relative; padding-left: 1rem; }
  .pricing-card li::before { position: absolute; left: 0; content: '•'; color: var(--pricing-accent); }
  .pricing-card__actions { display: grid; gap: .75rem; margin-top: auto; }
  .pricing-card__primary, .pricing-card__secondary { display: inline-flex; align-items: center; justify-content: center; gap: 0.65rem; width: 100%; min-height: 42px; padding: 0 18px; border-radius: 9px; font: 600 .88rem / 1 var(--site-display, sans-serif); text-decoration: none; cursor: pointer; transition: background-color var(--motion-base, 220ms) var(--motion-ease-standard, ease), border-color var(--motion-base, 220ms) var(--motion-ease-standard, ease), transform var(--motion-base, 220ms) var(--motion-ease-standard, ease); }
  .pricing-card__primary:hover:not(:disabled), .pricing-card__secondary:hover { transform: translateY(-1px); }
  .pricing-card__primary { border: 1px solid var(--pricing-ink); background: var(--pricing-ink); color: #090a0d; }
  .pricing-card__primary:hover:not(:disabled) { border-color: var(--pricing-accent); background: var(--pricing-accent); }
  .pricing-card__primary:disabled { cursor: default; opacity: 0.58; }
  .pricing-card__secondary { border: 1px solid var(--pricing-line-strong); background: transparent; color: var(--pricing-ink); }
  .pricing-card__secondary:hover { border-color: var(--pricing-accent); background: color-mix(in srgb, var(--pricing-accent) 9%, transparent); }
  .pricing-card__availability { display: flex; min-height: 42px; align-items: center; justify-content: flex-start; gap: .35rem; width: 100%; color: var(--pricing-muted); font: 600 .78rem / 1.35 var(--site-font, 'Inter', sans-serif); }
  .pricing-card__availability::before { width: .42rem; height: .42rem; flex: 0 0 .42rem; border-radius: 50%; background: var(--pricing-faint); content: ''; }
  .pricing-card__availability a { color: var(--pricing-ink); text-underline-offset: .18em; }
  .pricing-card__availability--active { color: #bdf4dc; }
  .pricing-card__availability--active::before { background: #63e499; box-shadow: 0 0 .5rem rgba(99, 228, 153, .5); }
  .pricing-card__fineprint { max-width: 27rem; margin: 0; color: var(--pricing-faint); font-size: 0.72rem; line-height: 1.5; }
  .pricing-comparison { margin-top: clamp(3rem, 5vw, 4rem); }
  .pricing-comparison__frame { overflow: hidden; border: 1px solid var(--pricing-line); border-radius: 0.65rem; background: var(--site-surface, var(--surface-2, #1e1e22)); }
  .pricing-comparison__scroller { width: 100%; overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-color: var(--pricing-line-strong) transparent; }
  .pricing-comparison__table { width: 100%; min-width: 42rem; table-layout: fixed; border-collapse: separate; border-spacing: 0; }
  .pricing-comparison__feature-col { width: auto; }
  .pricing-comparison__plan-col { width: 10.5rem; }
  .pricing-comparison__header-row { border-bottom: 1px solid var(--pricing-line); }
  .pricing-comparison__feature-heading { padding: 1.2rem 1.35rem .9rem; color: var(--pricing-faint); font: 500 .68rem / 1 var(--site-font, 'Inter', sans-serif); letter-spacing: .12em; text-align: left; text-transform: uppercase; vertical-align: bottom; }
  .pricing-comparison__plan { min-height: 4.8rem; padding: .9rem 1rem; border-left: 1px solid var(--pricing-line); text-align: left; vertical-align: middle; }
  .pricing-comparison__plan--plus { border-color: color-mix(in srgb, var(--pricing-accent) 32%, var(--pricing-line)); background: linear-gradient(180deg, color-mix(in srgb, var(--pricing-accent) 14%, transparent), color-mix(in srgb, var(--pricing-accent) 5%, transparent)); box-shadow: inset 1px 0 color-mix(in srgb, var(--pricing-accent) 15%, transparent), inset -1px 0 color-mix(in srgb, var(--pricing-accent) 15%, transparent); }
  .pricing-comparison__plan--free { background: color-mix(in srgb, var(--site-surface, #0c0c0d) 85%, transparent); }
  .pricing-comparison__header-row > * { border-bottom: 1px solid var(--pricing-line); }
  .pricing-comparison__plan > span { display: block; color: var(--pricing-ink); font: 600 .82rem / 1.2 var(--site-display, sans-serif); }
  .pricing-comparison__plan--plus > span { color: var(--pricing-accent); }
  .pricing-comparison__plan small { display: block; margin-top: .2rem; color: var(--pricing-faint); font-size: .68rem; line-height: 1.3; }
  .pricing-comparison__feature + .pricing-comparison__feature > * { border-top: 1px solid var(--pricing-line); }
  .pricing-comparison__feature:hover > * { background: color-mix(in srgb, var(--pricing-accent) 3%, transparent); }
  .pricing-comparison__feature-label { min-width: 0; padding: .8rem 1.35rem; color: var(--pricing-ink); text-align: left; vertical-align: middle; }
  .pricing-comparison__feature-copy { min-width: 0; }
  .pricing-comparison__feature-copy strong { display: block; overflow-wrap: anywhere; color: var(--pricing-ink); font: 500 .84rem / 1.35 var(--site-font, 'Inter', sans-serif); }
  .pricing-comparison__status { position: relative; height: 3.45rem; padding: 0; border-left: 1px solid var(--pricing-line); text-align: center; vertical-align: middle; }
  .pricing-comparison__status--plus { background: color-mix(in srgb, var(--pricing-accent) 8%, transparent); box-shadow: inset 1px 0 color-mix(in srgb, var(--pricing-accent) 11%, transparent), inset -1px 0 color-mix(in srgb, var(--pricing-accent) 11%, transparent); }
  .pricing-comparison__status--free { background: color-mix(in srgb, var(--site-surface, #0c0c0d) 75%, transparent); }
  .pricing-comparison__status-icon { color: #ff647d; font: 500 1.05rem / 1 var(--site-font, 'Inter', sans-serif); }
  .pricing-comparison__status-icon--included { color: #63e499; }
  .pricing-comparison__sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
  .pricing-faq { margin-top: clamp(3rem, 5vw, 4rem); }
  .pricing-faq__list { overflow: hidden; border: 1px solid var(--pricing-line); border-radius: .65rem; background: var(--site-surface, var(--surface-2, #1e1e22)); }
  .pricing-faq__item + .pricing-faq__item { border-top: 1px solid var(--pricing-line); }
  .pricing-faq__item summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.15rem 1.35rem; color: var(--pricing-ink); font: 500 .84rem / 1.35 var(--site-font, 'Inter', sans-serif); cursor: pointer; list-style: none; }
  .pricing-faq__item summary::-webkit-details-marker { display: none; }
  .pricing-faq__item summary:hover { background: color-mix(in srgb, var(--pricing-accent) 3%, transparent); }
  .pricing-faq__item summary:focus-visible { outline: 2px solid var(--pricing-accent); outline-offset: -2px; }
  .pricing-faq__icon { flex: 0 0 1rem; color: var(--pricing-faint); font-size: 1.15rem; font-weight: 400; line-height: 1; text-align: center; transition: transform var(--motion-base, 220ms) var(--motion-ease-standard, ease); }
  .pricing-faq__item[open] .pricing-faq__icon { transform: rotate(45deg); color: var(--pricing-ink); }
  .pricing-faq__item p { max-width: 44rem; margin: -.15rem 1.35rem 1.15rem; color: var(--pricing-muted); font-size: .78rem; line-height: 1.55; }
  .pricing-claim { --homepage-accent: var(--pricing-accent); --homepage-accent-soft: color-mix(in srgb, var(--pricing-accent) 16%, transparent); --homepage-text: var(--pricing-ink); --homepage-secondary-muted: var(--pricing-muted); --homepage-secondary-shadow: none; --homepage-display: var(--site-display, sans-serif); margin-top: clamp(3rem, 5vw, 4rem); padding-top: 2rem; border-top: 1px solid var(--pricing-line); }
  .pricing-claim .pricing-section-heading { text-align: center; }
  .pricing-claim__control { display: flex; justify-content: center; margin-top: 1.1rem; }
  .pricing-claim__control :global(.homepage-claim-slot) { width: min(100%, 30rem); }
  :global(.pricing-page a:focus-visible), :global(.pricing-page button:focus-visible) { outline: 2px solid var(--pricing-accent); outline-offset: 3px; }
  @media (max-width: 48rem) {
    .pricing-page__shell { width: min(calc(100% - 2rem), 620px); padding-top: 2.25rem; }
    .pricing-hero h1 { font-size: clamp(2.8rem, 13vw, 4rem); }
    .pricing-page__notice { align-items: flex-start; flex-direction: column; }
    .pricing-grid { grid-template-columns: 1fr; }
    .pricing-card__primary, .pricing-card__secondary { width: 100%; }
    .pricing-comparison__frame { border-radius: 0.65rem; }
    .pricing-comparison__table { min-width: 0; }
    .pricing-comparison__plan-col { width: 6.4rem; }
    .pricing-comparison__feature-heading { padding: 1.1rem .7rem .8rem; }
    .pricing-comparison__plan { min-height: 5.9rem; padding: .85rem .65rem .75rem; }
    .pricing-comparison__plan > span { font-size: .72rem; }
    .pricing-comparison__plan small { font-size: .62rem; }
    .pricing-comparison__feature-label { padding: .75rem .7rem; }
    .pricing-comparison__feature-copy strong { font-size: .72rem; }
    .pricing-comparison__status { height: 3.25rem; }
    .pricing-faq__item summary { padding: 1rem .7rem; }
    .pricing-faq__item p { margin-inline: .7rem; font-size: .72rem; }
    .pricing-claim { padding-top: 1.5rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pricing-card__primary, .pricing-card__secondary, .pricing-faq__icon { transition: none; }
  }
</style>
