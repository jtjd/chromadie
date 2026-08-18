<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function retry() {
    dispatch('retry');
  }

  function logout() {
    dispatch('logout');
  }
</script>

<main class="site-state-page" aria-labelledby="account-unavailable-title">
  <section class="site-state-card" role="alert">
    <p class="site-state-kicker">Account</p>
    <h1 id="account-unavailable-title">Account unavailable</h1>
    <p>We could not load your account data. Retry or sign out, then sign in again.</p>
    <div class="site-state-actions">
      <button type="button" class="site-button site-button--primary" on:click={retry}>Retry</button>
      <button type="button" class="site-button site-button--secondary" on:click={logout}>Log out</button>
    </div>
  </section>
</main>

<style>
  .site-state-card .site-button { flex: 0 0 auto; }
</style>
