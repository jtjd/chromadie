<script>
  import { createEventDispatcher } from 'svelte';
  import { loadRouteComponent } from './routeLoaders.js';

  export let loaderKey = '';
  export let staticComponent = null;
  export let componentKey = '';
  export let componentProps = {};
  export let loadingLabel = 'Loading';

  const dispatch = createEventDispatcher();
  let activeComponent = null;
  let activeProps = {};
  let activeKey = '';
  let activeTargetSignature = '';
  let loadRequestId = 0;
  let errorMessage = '';
  let loading = false;
  let retryNonce = 0;

  function forward(eventName, event) {
    dispatch(eventName, event.detail);
  }

  function retry() {
    retryNonce += 1;
  }

  async function resolveTarget(target) {
    const requestId = ++loadRequestId;
    loading = Boolean(target.loaderKey);
    errorMessage = '';

    if (target.staticComponent) {
      activeComponent = target.staticComponent;
      activeProps = target.componentProps;
      activeKey = target.componentKey;
      loading = false;
      dispatch('loaded', { componentKey: target.componentKey });
      return;
    }

    if (!target.loaderKey) {
      activeComponent = null;
      activeProps = {};
      activeKey = '';
      loading = false;
      return;
    }

    try {
      const component = await loadRouteComponent(target.loaderKey);
      if (requestId !== loadRequestId) return;

      activeComponent = component;
      activeProps = target.componentProps;
      activeKey = target.componentKey;
      loading = false;
      dispatch('loaded', { loaderKey: target.loaderKey, componentKey: target.componentKey });
    } catch (error) {
      if (requestId !== loadRequestId) return;
      loading = false;
      errorMessage = error instanceof Error ? error.message : 'This page could not be loaded.';
    }
  }

  function syncTarget(target) {
    if (target.signature === activeTargetSignature) {
      if (activeComponent && activeKey === target.componentKey) activeProps = target.componentProps;
      return;
    }
    activeTargetSignature = target.signature;
    void resolveTarget(target);
  }

  $: syncTarget({
    loaderKey,
    staticComponent,
    componentKey,
    componentProps,
    signature: `${loaderKey || 'static'}:${componentKey}:${retryNonce}`
  });
</script>

<div class="route-outlet" aria-busy={loading}>
  {#if activeComponent}
    {#key activeKey}
      <svelte:component
        this={activeComponent}
        {...activeProps}
        on:navigate={event => forward('navigate', event)}
        on:promptlogin={event => forward('promptlogin', event)}
        on:accountdeleted={event => forward('accountdeleted', event)}
        on:login={event => forward('login', event)}
        on:logout={event => forward('logout', event)}
        on:retry={event => forward('retry', event)}
        on:signup={event => forward('signup', event)}
        on:claim={event => forward('claim', event)}
        on:profile={event => forward('profile', event)}
        on:roll={event => forward('roll', event)}
        on:activecolor={event => forward('activecolor', event)}
      />
    {/key}
  {:else if errorMessage}
    <section class="route-outlet__state" role="alert" aria-live="polite">
      <p class="route-outlet__label">Could not open this page</p>
      <p class="route-outlet__message">Try loading it again.</p>
      <button type="button" class="route-outlet__retry" on:click={retry}>Retry</button>
    </section>
  {:else}
    <section class="route-outlet__state" role="status" aria-live="polite">
      <span class="route-outlet__indicator" aria-hidden="true"></span>
      <span>{loadingLabel}</span>
    </section>
  {/if}

  {#if activeComponent && errorMessage}
    <section class="route-outlet__error" role="alert" aria-live="polite">
      <span>Could not open the next page.</span>
      <button type="button" on:click={retry}>Retry</button>
    </section>
  {/if}
</div>

<style>
  .route-outlet {
    position: relative;
    z-index: 1;
    min-width: 0;
  }

  .route-outlet__state {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: min(100%, 34rem);
    min-height: 7rem;
    margin: 1rem auto;
    padding: 1rem 1.1rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.025);
    color: rgba(232, 238, 250, 0.68);
    font: 500 0.78rem / 1.4 var(--font-body-stack);
  }

  .route-outlet__label,
  .route-outlet__message { margin: 0; }
  .route-outlet__label { color: var(--color-ink-strong); font-weight: 600; }
  .route-outlet__message { color: var(--color-ink-muted); }

  .route-outlet__indicator {
    width: 0.55rem;
    height: 0.55rem;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--color-accent-bright);
    box-shadow: 0 0 1rem rgba(183, 253, 77, 0.5);
    animation: route-outlet-pulse 1.4s ease-in-out infinite;
  }

  .route-outlet__retry {
    margin-left: auto;
    padding: 0.55rem 0.75rem;
    border: 1px solid rgba(183, 253, 77, 0.35);
    border-radius: 999px;
    background: transparent;
    color: var(--color-accent-bright);
    font: 600 0.72rem / 1 var(--font-body-stack);
    cursor: pointer;
  }

  .route-outlet__retry:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 3px;
  }

  .route-outlet__error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 0.75rem auto;
    padding: 0.65rem 0.8rem;
    border: 1px solid rgba(255, 132, 132, 0.24);
    border-radius: 0.7rem;
    background: rgba(255, 132, 132, 0.05);
    color: rgba(255, 220, 220, 0.78);
    font: 500 0.74rem / 1.3 var(--font-body-stack);
  }

  .route-outlet__error button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-accent-bright);
    font: inherit;
    cursor: pointer;
  }

  @keyframes route-outlet-pulse {
    0%, 100% { opacity: 0.35; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .route-outlet__indicator { animation: none; opacity: 0.8; }
  }
</style>
