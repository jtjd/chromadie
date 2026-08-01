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

<div class="container">
  <div class="card" role="alert">
    <h1>Account unavailable</h1>
    <p class="info-text">We could not load your account data. Retry or sign out, then sign in again.</p>
    <div class="button-row">
      <button type="button" class="roll-btn" on:click={retry}>Retry</button>
      <button type="button" class="roll-btn" on:click={logout}>Log Out</button>
    </div>
  </div>
</div>

<style>
  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1rem;
  }

  @media (max-width: 36rem) {
    .button-row { flex-direction: column; }
    .button-row > button { width: 100%; }
  }
</style>
