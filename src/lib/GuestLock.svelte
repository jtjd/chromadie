<script>
  import { createEventDispatcher } from 'svelte';
  export let view = '';
  export let guestActive = false;
  const dispatch = createEventDispatcher();
</script>

<div class="container">
  <div class="card">
    <h1>{view.charAt(0).toUpperCase() + view.slice(1)} Locked</h1>
    <p class="info-text">
      {guestActive
        ? 'Guest Mode is active. Your progress is saved locally on this device only. Create an account to save progress, compete on the leaderboards, and unlock cosmetics.'
        : 'You are signed out. You can roll locally without an account, or create an account to save progress, compete on leaderboards, and unlock cosmetics.'}
    </p>
    <button type="button" class="roll-btn" on:click={() => dispatch('login', { mode: 'signup' })}>
      Create Account
    </button>
  </div>
</div>
