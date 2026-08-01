<main class="container" aria-labelledby="not-found-title">
  <section class="card bootstrap-error-card">
    <p class="bootstrap-error-kicker">404</p>
    <h1 id="not-found-title">Page not found</h1>
    <p class="info-text">That ChromaDie page does not exist or may have moved.</p>
    <a class="roll-btn" href="/" on:click|preventDefault={() => dispatch('navigate', { view: 'home' })}>Back home</a>
  </section>
</main>

<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

