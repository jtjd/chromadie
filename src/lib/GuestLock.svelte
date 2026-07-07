<script>
  import { createEventDispatcher } from 'svelte';
  export let view = '';
  const dispatch = createEventDispatcher();
</script>

<div class="container">
  <div class="card">
    <h1>{view.charAt(0).toUpperCase() + view.slice(1)} Locked</h1>
    <p class="info-text">
      You're playing as a guest. Create an account to save your progress, compete on the leaderboards, and unlock cosmetics.
    </p>
    <button class="roll-btn" on:click={() => dispatch('login')}>
      Create Account
    </button>
  </div>
</div>
