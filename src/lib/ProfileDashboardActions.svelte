<script>
  import { createEventDispatcher } from 'svelte';

  export let dirty = false;
  export let saving = false;
  export let status = '';
  export let error = '';

  const dispatch = createEventDispatcher();
</script>

<section class="profile-dashboard-actions" aria-labelledby="profile-dashboard-actions-title">
  <div class="profile-dashboard-actions__copy">
    <div class="profile-dashboard-actions__title-row">
      <h2 id="profile-dashboard-actions-title">Profile changes</h2>
      <span class:profile-dashboard-actions__state--dirty={dirty} class="profile-dashboard-actions__state">
        {#if saving} Saving…{:else if dirty} Unpublished changes{:else} Published{/if}
      </span>
    </div>
    <p>{dirty ? 'Your changes are staged in this dashboard.' : 'Your profile is up to date.'}</p>
  </div>
  <div class="profile-dashboard-actions__buttons">
    <button type="button" on:click={() => dispatch('reset')} disabled={!dirty || saving}>Reset</button>
    <button type="button" class="profile-dashboard-actions__publish" on:click={() => dispatch('publish')} disabled={!dirty || saving}>{saving ? 'Publishing…' : 'Publish profile'}</button>
  </div>
  {#if error}<p class="profile-dashboard-actions__message" role="alert">{error}</p>{:else if status}<p class="profile-dashboard-actions__message" role="status" aria-live="polite">{status}</p>{/if}
</section>

<style>
  .profile-dashboard-actions { --dashboard-action-accent: var(--ctp-teal, #94e2d5); --dashboard-action-surface: var(--ctp-mantle, #181825); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; padding: .75rem .85rem; border: 1px solid color-mix(in srgb, var(--dashboard-action-accent) 30%, var(--site-line-strong, rgba(255,255,255,.14))); border-radius: .55rem; background: var(--dashboard-action-surface); }
  .profile-dashboard-actions__copy { min-width: 0; }
  .profile-dashboard-actions__title-row { display: flex; align-items: center; gap: .65rem; }
  .profile-dashboard-actions h2 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .84rem; letter-spacing: -.01em; }
  .profile-dashboard-actions p { margin: .25rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .73rem; line-height: 1.4; }
  .profile-dashboard-actions__state { color: var(--dashboard-action-accent); font: .66rem/1 var(--site-mono, monospace); white-space: nowrap; }
  .profile-dashboard-actions__state--dirty { color: var(--ctp-peach, #fab387); }
  .profile-dashboard-actions__buttons { display: flex; flex: 0 0 auto; gap: .45rem; }
  .profile-dashboard-actions button { min-height: 2.1rem; padding: .45rem .7rem; border: 1px solid color-mix(in srgb, var(--ctp-surface2, #585b70) 62%, var(--dashboard-action-surface)); border-radius: .35rem; background: color-mix(in srgb, var(--ctp-surface0, #313244) 62%, var(--dashboard-action-surface)); color: var(--ctp-text, var(--site-ink, #f2f0eb)); font-size: .74rem; cursor: pointer; }
  .profile-dashboard-actions button:disabled { cursor: not-allowed; opacity: .42; }
  .profile-dashboard-actions button:focus-visible { outline: 2px solid var(--site-accent, #cdd2ff); outline-offset: 2px; }
  .profile-dashboard-actions__publish { border-color: var(--site-accent, #cdd2ff) !important; background: var(--site-accent, #cdd2ff) !important; color: var(--site-deep, #090a0d) !important; font-weight: 700; }
  .profile-dashboard-actions__message { flex: 1 0 100%; margin: 0 !important; color: var(--site-muted, #aaa8b0); }
  .profile-dashboard-actions__message[role="alert"] { color: var(--ctp-red, #f38ba8); }
  @media (max-width: 38rem) {
    .profile-dashboard-actions { align-items: stretch; flex-direction: column; }
    .profile-dashboard-actions__buttons button { flex: 1; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-dashboard-actions { scroll-behavior: auto; } }
</style>
