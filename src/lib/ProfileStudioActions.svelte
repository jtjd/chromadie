<script>
  import { createEventDispatcher } from 'svelte';

  export let dirty = false;
  export let saving = false;
  export let status = '';
  export let error = '';

  const dispatch = createEventDispatcher();
</script>

<section class="profile-studio-actions" aria-label="Profile publishing actions">
  {#if error}
    <p class="profile-studio-actions__message" role="alert">{error}</p>
  {:else if status}
    <p class="profile-studio-actions__message" role="status" aria-live="polite">{status}</p>
  {/if}
  <button type="button" class="profile-studio-actions__publish" on:click={() => dispatch('publish')} disabled={!dirty || saving}>
    {saving ? 'Publishing…' : 'Publish profile'}
  </button>
</section>

<style>
  .profile-studio-actions { display: inline-flex; align-items: center; justify-content: flex-end; gap: .7rem; min-width: 0; }
  .profile-studio-actions__publish { min-height: 2.3rem; padding: 0 1.05rem; border: 1px solid var(--studio-accent, #00ffb3); border-radius: .45rem; background: var(--studio-accent, #00ffb3); color: #050506; font: 700 .72rem/1 'Clash Display', var(--font-display-stack, sans-serif); white-space: nowrap; cursor: pointer; }
  .profile-studio-actions__publish:hover:not(:disabled) { border-color: #f8f8f8; background: #f8f8f8; }
  .profile-studio-actions__publish:disabled { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.12); color: rgba(255,255,255,.42); cursor: default; }
  .profile-studio-actions__message { max-width: 15rem; margin: 0; color: var(--studio-muted, #8f9099); font: 500 .66rem/1.35 'Inter', sans-serif; text-align: right; }
  .profile-studio-actions__message[role="alert"] { color: #ff5578; }
  @media (max-width: 700px) {
    .profile-studio-actions__message { position: fixed; top: 4.35rem; left: .75rem; right: .75rem; z-index: 60; max-width: none; padding: .55rem .7rem; border: 1px solid var(--studio-border, rgba(255,255,255,.1)); border-radius: .45rem; background: rgba(5,5,6,.9); text-align: left; }
    .profile-studio-actions__publish { min-height: 2.5rem; padding-inline: .8rem; }
  }
</style>
