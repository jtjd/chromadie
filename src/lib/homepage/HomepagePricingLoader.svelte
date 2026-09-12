<script>
  import { onMount } from 'svelte';

  export let isAuthenticated = false;

  let host;
  let pricingComponent = null;
  let failed = false;
  let disposed = false;

  async function load() {
    if (pricingComponent || failed) return;
    try {
      const module = await import('./HomepagePricing.svelte');
      if (!disposed) pricingComponent = module.default;
    } catch {
      if (!disposed) failed = true;
    }
  }

  onMount(() => {
    if (typeof IntersectionObserver === 'undefined') {
      void load();
      return () => { disposed = true; };
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        void load();
        observer.disconnect();
      }
    }, { rootMargin: '320px' });

    observer.observe(host);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  });
</script>

<div id="pricing" bind:this={host} class="homepage-pricing-loader" aria-busy={!pricingComponent}>
  {#if pricingComponent}
    <svelte:component this={pricingComponent} {isAuthenticated} sectionId="" />
  {:else if failed}
    <p class="homepage-pricing-loader__state" role="status">Pricing preview couldn’t load. <button type="button" on:click={load}>Retry</button></p>
  {/if}
</div>

<style>
  .homepage-pricing-loader { min-height: 1px; }

  .homepage-pricing-loader__state {
    width: min(1380px, calc(100% - 64px));
    margin: 72px auto;
    color: var(--homepage-secondary-muted);
    text-align: center;
  }

  .homepage-pricing-loader__state button {
    border: 0;
    background: none;
    color: var(--homepage-text);
    text-decoration: underline;
    cursor: pointer;
  }

  @media (max-width: 780px) {
    .homepage-pricing-loader__state { width: calc(100% - 30px); }
  }
</style>
