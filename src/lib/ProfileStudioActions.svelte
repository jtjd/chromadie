<script>
  import { createEventDispatcher } from 'svelte';

  export let dirty = false;
  export let saving = false;
  export let status = '';
  export let error = '';

  const dispatch = createEventDispatcher();
</script>

<section class="profile-studio-actions" aria-label="Profile publishing actions">
  <span class:profile-studio-actions__state--dirty={dirty} class="profile-studio-actions__state">
    {#if saving} Saving…{:else if dirty} Draft changes{:else} Published{/if}
  </span>
  <div class="profile-studio-actions__buttons">
    <button type="button" on:click={() => dispatch('reset')} disabled={!dirty || saving}>Reset</button>
    <button type="button" class="profile-studio-actions__publish" on:click={() => dispatch('publish')} disabled={!dirty || saving}>{saving ? 'Publishing…' : 'Publish profile'}</button>
  </div>
  {#if error}<p class="profile-studio-actions__message" role="alert">{error}</p>{:else if status}<p class="profile-studio-actions__message" role="status" aria-live="polite">{status}</p>{/if}
</section>

<style>
  .profile-studio-actions { display: inline-flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: .55rem; min-width: 0; color: var(--studio-muted, #8f9099); }
  .profile-studio-actions__state { display: inline-flex; align-items: center; gap: .35rem; color: var(--studio-muted, #8f9099); font: 500 .68rem/1 'Inter', sans-serif; white-space: nowrap; }
  .profile-studio-actions__state::before { width: .4rem; height: .4rem; flex: 0 0 auto; border-radius: 50%; background: var(--studio-accent, #00ffb3); content: ''; }
  .profile-studio-actions__state--dirty { color: #f5c26f; }
  .profile-studio-actions__state--dirty::before { background: currentColor; }
  .profile-studio-actions__buttons { display: inline-flex; flex: 0 0 auto; gap: .45rem; }
  .profile-studio-actions button { min-height: 2.35rem; padding: .5rem .75rem; border: 1px solid var(--studio-border, rgba(255,255,255,.1)); border-radius: .45rem; background: transparent; color: var(--studio-text, #f8f8f8); font: 500 .72rem/1 'Inter', sans-serif; white-space: nowrap; cursor: pointer; }
  .profile-studio-actions button:hover:not(:disabled), .profile-studio-actions button:focus-visible { border-color: var(--studio-border-hover, rgba(255,255,255,.2)); }
  .profile-studio-actions button:disabled { cursor: default; opacity: .45; }
  .profile-studio-actions button:focus-visible { outline: 2px solid var(--studio-accent, #00ffb3); outline-offset: 2px; }
  .profile-studio-actions__publish { border-color: var(--studio-accent, #00ffb3) !important; background: var(--studio-accent, #00ffb3) !important; color: #050506 !important; font-family: 'Clash Display', sans-serif !important; font-weight: 600 !important; }
  .profile-studio-actions__publish:hover:not(:disabled) { border-color: #f8f8f8 !important; background: #f8f8f8 !important; }
  .profile-studio-actions__publish:disabled { border-color: rgba(255,255,255,.16) !important; background: rgba(255,255,255,.12) !important; color: rgba(255,255,255,.42) !important; }
  .profile-studio-actions__message { flex: 1 0 100%; margin: 0 !important; color: var(--studio-muted, #8f9099); font: 500 .68rem/1.35 'Inter', sans-serif; text-align: right; }
  .profile-studio-actions__message[role="alert"] { color: #ff5578; }
  @media (max-width: 52rem) {
    .profile-studio-actions { justify-content: flex-end; }
    .profile-studio-actions__state { display: none; }
    .profile-studio-actions__buttons button { min-height: 2.5rem; }
    .profile-studio-actions__message { flex-basis: 100%; width: 100%; text-align: right; }
  }
</style>
