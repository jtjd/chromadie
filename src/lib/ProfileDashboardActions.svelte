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
    <div class="profile-dashboard-actions__copy">
      <div class="profile-dashboard-actions__title-row">
        <h2 id="profile-dashboard-actions-title">Customize profile</h2>
        <span class:profile-dashboard-actions__state--dirty={dirty} class="profile-dashboard-actions__state">
          {#if saving} Saving…{:else if dirty} Unpublished changes{:else} Published{/if}
        </span>
        <span class="profile-dashboard-actions__divider" aria-hidden="true"></span>
        <span class="profile-dashboard-actions__saved">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
      </div>
    </div>
  </div>
  <div class="profile-dashboard-actions__buttons">
    <button type="button" on:click={() => dispatch('reset')} disabled={!dirty || saving}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7M4 4v4.7h4.7"></path></svg><span>Reset</span></button>
    <button type="button" class="profile-dashboard-actions__publish" on:click={() => dispatch('publish')} disabled={!dirty || saving}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 14v5h14v-5"></path></svg><span>{saving ? 'Publishing…' : 'Publish profile'}</span></button>
  </div>
  {#if error}<p class="profile-dashboard-actions__message" role="alert">{error}</p>{:else if status}<p class="profile-dashboard-actions__message" role="status" aria-live="polite">{status}</p>{/if}
</section>

<style>
  .profile-dashboard-actions { --dashboard-action-accent: var(--ctp-blue, #89b4fa); --dashboard-action-save: var(--ctp-green, #a6e3a1); --dashboard-action-focus: var(--ctp-lavender, #b4befe); --dashboard-action-surface: var(--ctp-mantle, #181825); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; min-height: 4.05rem; margin-inline: .75rem; padding: .72rem 1.05rem; border: 1px solid var(--ctp-surface0, #313244); border-radius: .52rem; background: var(--dashboard-action-surface); }
  .profile-dashboard-actions__summary { display: flex; align-items: center; gap: .75rem; min-width: 0; }
  .profile-dashboard-actions__copy { min-width: 0; }
  .profile-dashboard-actions__title-row { display: flex; align-items: center; gap: .7rem; flex-wrap: wrap; }
  .profile-dashboard-actions__title-row > .profile-dashboard-actions__state { margin-left: .8rem; }
  .profile-dashboard-actions h2 { margin: 0; color: var(--ctp-text, var(--site-ink, #f2f0eb)); font-size: 1rem; letter-spacing: -.02em; }
  .profile-dashboard-actions__state { display: inline-flex; align-items: center; gap: .35rem; padding: 0; color: var(--ctp-green, #a6e3a1); font: 650 .72rem/1 var(--site-font, sans-serif); white-space: nowrap; }
  .profile-dashboard-actions__state::before { width: .45rem; height: .45rem; flex: 0 0 auto; border-radius: 50%; background: currentColor; content: ''; }
  .profile-dashboard-actions__state--dirty { color: var(--ctp-peach, #fab387); }
  .profile-dashboard-actions__divider { width: 1px; height: 1.1rem; background: var(--ctp-surface0, #313244); }
  .profile-dashboard-actions__saved { color: var(--ctp-subtext0, #a6adc8); font-size: .75rem; }
  .profile-dashboard-actions__buttons { display: flex; flex: 0 0 auto; gap: .45rem; }
  .profile-dashboard-actions button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 2.3rem; padding: .48rem .78rem; border: 1px solid var(--ctp-surface1, #45475a); border-radius: .42rem; background: transparent; color: var(--ctp-text, var(--site-ink, #f2f0eb)); font-size: .76rem; white-space: nowrap; cursor: pointer; }
  .profile-dashboard-actions button svg { width: .92rem; height: .92rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
  .profile-dashboard-actions button:disabled { cursor: default; opacity: 1; }
  .profile-dashboard-actions__publish:disabled { cursor: default; opacity: 1; }
  .profile-dashboard-actions button:focus-visible { outline: 2px solid var(--dashboard-action-focus); outline-offset: 2px; }
  .profile-dashboard-actions__publish { border-color: var(--dashboard-action-save) !important; background: var(--dashboard-action-save) !important; color: var(--site-deep, #090a0d) !important; font-weight: 700; }
  .profile-dashboard-actions__publish:hover:not(:disabled) { border-color: color-mix(in srgb, var(--dashboard-action-save) 82%, var(--site-ink, #f2f0eb)) !important; background: color-mix(in srgb, var(--dashboard-action-save) 82%, var(--site-ink, #f2f0eb)) !important; }
  .profile-dashboard-actions__message { flex: 1 0 100%; margin: 0 !important; color: var(--site-muted, #aaa8b0); }
  .profile-dashboard-actions__message[role="alert"] { color: var(--ctp-red, #f38ba8); }
  @media (max-width: 52rem) {
    .profile-dashboard-actions { align-items: stretch; flex-direction: column; gap: .75rem; margin-inline: 0; padding: .8rem .85rem; }
    .profile-dashboard-actions__summary { align-items: flex-start; width: 100%; }
    .profile-dashboard-actions__title-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: .45rem .6rem; width: 100%; }
    .profile-dashboard-actions__title-row > .profile-dashboard-actions__state { grid-column: 1 / -1; margin-left: 0; }
    .profile-dashboard-actions__divider { display: none; }
    .profile-dashboard-actions__saved { grid-column: 1 / -1; }
    .profile-dashboard-actions__buttons { width: 100%; }
    .profile-dashboard-actions__buttons button { flex: 1 1 0; min-width: 0; }
    .profile-dashboard-actions__message { flex-basis: auto; width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-dashboard-actions { scroll-behavior: auto; } }
</style>
