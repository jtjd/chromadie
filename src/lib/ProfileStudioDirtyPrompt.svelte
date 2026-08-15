<script>
  import { createEventDispatcher } from 'svelte';

  export let open = false;

  const dispatch = createEventDispatcher();
  let primaryElement = null;
  let dialog = null;

  export function focusPrimary() {
    primaryElement?.focus?.();
  }

  export function getDialog() {
    return dialog;
  }

  function stay() {
    dispatch('stay');
  }

  function discard() {
    dispatch('discard');
  }
</script>

{#if open}
  <div class="profile-studio-dirty-prompt__backdrop" role="presentation">
    <div class="profile-studio-dirty-prompt" bind:this={dialog} role="dialog" aria-modal="true" aria-labelledby="profile-studio-dirty-prompt-title" tabindex="-1">
      <h2 id="profile-studio-dirty-prompt-title">Unsaved changes</h2>
      <p>Stay to keep editing or discard this draft?</p>
      <div>
        <button bind:this={primaryElement} type="button" on:click={stay}>Stay</button>
        <button type="button" class="profile-studio-dirty-prompt__discard" on:click={discard}>Discard</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .profile-studio-dirty-prompt__backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 1rem; background: rgba(0,0,0,.62); }
  .profile-studio-dirty-prompt { width: min(24rem, 100%); padding: 1.1rem; border: 1px solid var(--studio-border-strong, rgba(255,255,255,.14)); border-radius: .55rem; background: var(--studio-panel, #181825); box-shadow: 0 1.5rem 4rem rgba(0,0,0,.4); }
  .profile-studio-dirty-prompt h2 { margin: 0; color: var(--studio-text, #cdd6f4); font-size: 1rem; }
  .profile-studio-dirty-prompt p { margin: .5rem 0 1rem; color: var(--studio-muted, #bac2de); font-size: .75rem; }
  .profile-studio-dirty-prompt > div { display: flex; justify-content: flex-end; gap: .5rem; }
  .profile-studio-dirty-prompt button { min-height: 2rem; padding: .45rem .7rem; border: 1px solid var(--studio-border-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--studio-text, #cdd6f4); font-size: .68rem; cursor: pointer; }
  .profile-studio-dirty-prompt__discard { border-color: var(--studio-danger, #ff718d); color: var(--studio-danger, #ff718d); }
</style>
