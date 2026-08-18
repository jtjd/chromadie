<main class="site-state-page" aria-labelledby="not-found-title">
  <section class="site-state-card">
    <p class="site-state-kicker">404</p>
    <h1 id="not-found-title">Page not found</h1>
    <p>That ChromaDie page does not exist or may have moved.</p>
    <div class="site-state-actions">
      <a class="site-button site-button--primary" href="/" on:click|preventDefault={() => dispatch('navigate', { view: 'home' })}>Back home</a>
    </div>
  </section>
</main>

<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>
