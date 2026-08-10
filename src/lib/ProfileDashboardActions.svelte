<script>
  import { createEventDispatcher } from 'svelte';

  export let dirty = false;
  export let saving = false;
  export let status = '';
  export let error = '';

  const dispatch = createEventDispatcher();
</script>

<section class="profile-dashboard-actions" aria-labelledby="profile-dashboard-actions-title">
  <div class="profile-dashboard-actions__summary">
    <span class="profile-dashboard-actions__status-icon" class:is-dirty={dirty} aria-hidden="true">{dirty ? '!' : '✓'}</span>
    <div class="profile-dashboard-actions__copy">
      <div class="profile-dashboard-actions__title-row">
        <h2 id="profile-dashboard-actions-title">Profile changes</h2>
        <span class:profile-dashboard-actions__state--dirty={dirty} class="profile-dashboard-actions__state">
          {#if saving} Saving…{:else if dirty} Unpublished changes{:else} Published{/if}
        </span>
      </div>
      <p>{dirty ? 'Your changes are staged in this dashboard.' : 'Your profile is up to date.'}</p>
    </div>
  </div>
  <div class="profile-dashboard-actions__buttons">
    <button type="button" on:click={() => dispatch('reset')} disabled={!dirty || saving}>Reset</button>
    <button type="button" class="profile-dashboard-actions__publish" on:click={() => dispatch('publish')} disabled={!dirty || saving}>{saving ? 'Publishing…' : 'Publish profile'}</button>
  </div>
  {#if error}<p class="profile-dashboard-actions__message" role="alert">{error}</p>{:else if status}<p class="profile-dashboard-actions__message" role="status" aria-live="polite">{status}</p>{/if}
</section>

<style>
  .profile-dashboard-actions { --dashboard-action-accent: var(--ctp-blue, #89b4fa); --dashboard-action-save: var(--ctp-green, #a6e3a1); --dashboard-action-focus: var(--ctp-lavender, #b4befe); --dashboard-action-surface: var(--ctp-base, #1e1e2e); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: .65rem; padding: .78rem 1rem; border: 1px solid color-mix(in srgb, var(--ctp-surface1, #45475a) 76%, transparent); border-radius: .5rem; background: linear-gradient(120deg, color-mix(in srgb, var(--ctp-surface0, #313244) 30%, var(--ctp-base, #1e1e2e)), var(--dashboard-action-surface) 62%, color-mix(in srgb, var(--ctp-blue, #89b4fa) 4%, var(--ctp-base, #1e1e2e))); box-shadow: 0 .55rem 1.6rem color-mix(in srgb, var(--ctp-crust, #11111b) 48%, transparent); }
  .profile-dashboard-actions__summary { display: flex; align-items: center; gap: .8rem; min-width: 0; }
  .profile-dashboard-actions__status-icon { display: grid; width: 1.9rem; height: 1.9rem; flex: 0 0 auto; place-items: center; border: 2px solid var(--dashboard-action-accent); border-radius: 50%; color: var(--dashboard-action-accent); font: 700 .78rem/1 var(--site-font, sans-serif); box-shadow: 0 0 1.1rem color-mix(in srgb, var(--dashboard-action-accent) 18%, transparent); }
  .profile-dashboard-actions__status-icon.is-dirty { border-color: var(--ctp-peach, #fab387); color: var(--ctp-peach, #fab387); }
  .profile-dashboard-actions__copy { min-width: 0; }
  .profile-dashboard-actions__title-row { display: flex; align-items: center; gap: .65rem; }
  .profile-dashboard-actions h2 { margin: 0; color: var(--ctp-text, var(--site-ink, #f2f0eb)); font-size: .84rem; letter-spacing: -.01em; }
  .profile-dashboard-actions p { margin: .25rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .73rem; line-height: 1.4; }
  .profile-dashboard-actions__state { padding: .2rem .38rem; border-radius: .25rem; background: color-mix(in srgb, var(--ctp-green, #a6e3a1) 14%, var(--ctp-base, #1e1e2e)); color: var(--ctp-green, #a6e3a1); font: 650 .63rem/1 var(--site-font, sans-serif); white-space: nowrap; }
  .profile-dashboard-actions__state--dirty { background: color-mix(in srgb, var(--ctp-peach, #fab387) 14%, var(--ctp-base, #1e1e2e)); color: var(--ctp-peach, #fab387); }
  .profile-dashboard-actions__buttons { display: flex; flex: 0 0 auto; gap: .45rem; }
  .profile-dashboard-actions button { min-height: 2.25rem; padding: .48rem .8rem; border: 1px solid var(--ctp-surface1, #45475a); border-radius: .4rem; background: var(--ctp-mantle, #181825); color: var(--ctp-text, var(--site-ink, #f2f0eb)); font-size: .74rem; cursor: pointer; }
  .profile-dashboard-actions button:disabled { cursor: not-allowed; opacity: .42; }
  .profile-dashboard-actions button:focus-visible { outline: 2px solid var(--dashboard-action-focus); outline-offset: 2px; }
  .profile-dashboard-actions__publish { border-color: var(--dashboard-action-save) !important; background: var(--dashboard-action-save) !important; color: var(--site-deep, #090a0d) !important; font-weight: 700; }
  .profile-dashboard-actions__publish:hover:not(:disabled) { border-color: color-mix(in srgb, var(--dashboard-action-save) 82%, var(--site-ink, #f2f0eb)) !important; background: color-mix(in srgb, var(--dashboard-action-save) 82%, var(--site-ink, #f2f0eb)) !important; }
  .profile-dashboard-actions__message { flex: 1 0 100%; margin: 0 !important; color: var(--site-muted, #aaa8b0); }
  .profile-dashboard-actions__message[role="alert"] { color: var(--ctp-red, #f38ba8); }
  @media (max-width: 38rem) {
    .profile-dashboard-actions { align-items: stretch; flex-direction: column; }
    .profile-dashboard-actions__summary { align-items: flex-start; }
    .profile-dashboard-actions__buttons button { flex: 1; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-dashboard-actions { scroll-behavior: auto; } }
</style>
