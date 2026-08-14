<script>
  import { createEventDispatcher } from 'svelte';
  import {
    PROFILE_STUDIO_CUSTOMIZE_TAB_IDS,
    PROFILE_STUDIO_CUSTOMIZE_TABS
  } from './profile-studio/dashboardContract.js';

  export let activeSection = 'customize';
  export let activeCustomizeTab = 'appearance';
  export let activeLabel = 'Customize';
  export let previewAvailable = false;
  export let previewOpen = false;
  export let dirty = false;
  export let saving = false;

  const dispatch = createEventDispatcher();

  function selectTab(tabId) {
    if (!PROFILE_STUDIO_CUSTOMIZE_TAB_IDS.includes(tabId)) return;
    dispatch('tabchange', { tabId });
  }

  function handleTabKeydown(event) {
    const currentIndex = PROFILE_STUDIO_CUSTOMIZE_TAB_IDS.indexOf(activeCustomizeTab);
    if (currentIndex < 0) return;
    let nextIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % PROFILE_STUDIO_CUSTOMIZE_TAB_IDS.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + PROFILE_STUDIO_CUSTOMIZE_TAB_IDS.length) % PROFILE_STUDIO_CUSTOMIZE_TAB_IDS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = PROFILE_STUDIO_CUSTOMIZE_TAB_IDS.length - 1;
    else return;
    event.preventDefault();
    dispatch('tabchange', { tabId: PROFILE_STUDIO_CUSTOMIZE_TAB_IDS[nextIndex], focus: true });
  }

  function togglePreview() {
    dispatch('previewtoggle');
  }

</script>

{#if activeSection !== 'customize'}
  <header class="profile-studio-header__toolbar">
    <div>
      <h1>{activeLabel}</h1>
      <div class="profile-studio-header__save-state"><i class:dirty={dirty}></i><span>{saving ? 'Saving changes' : dirty ? 'Unpublished changes' : 'All changes saved'}</span></div>
    </div>
    <span class="profile-studio-header__published" class:dirty>{dirty ? 'Draft' : 'Published'}</span>
    <div class="profile-studio-header__toolbar-actions">
      {#if previewAvailable}
        <button type="button" aria-expanded={previewOpen} on:click={togglePreview}>{previewOpen ? 'Hide preview' : 'Preview'}</button>
      {/if}
    </div>
  </header>
{:else}
  <header class="profile-studio-header__editor-header">
    <div>
      <h1>Customize profile</h1>
      <div class="profile-studio-header__save-state"><i class:dirty={dirty}></i><span>{saving ? 'Saving changes' : dirty ? 'Unpublished changes' : 'All changes saved'}</span></div>
    </div>
    <span class="profile-studio-header__published" class:dirty>{dirty ? 'Draft' : 'Published'}</span>
  </header>
  <div class="profile-studio-header__customize-tabs">
    <div class="profile-studio-header__tablist" role="tablist" aria-label="Customize profile">
      {#each PROFILE_STUDIO_CUSTOMIZE_TABS as tab (tab.id)}
        <button
          id={`profile-customize-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={activeCustomizeTab === tab.id}
          aria-controls="profile-customize-tabpanel"
          tabindex={activeCustomizeTab === tab.id ? 0 : -1}
          class:active={activeCustomizeTab === tab.id}
          on:click={() => selectTab(tab.id)}
          on:keydown={handleTabKeydown}
        >
          <span>{tab.label}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .profile-studio-header__toolbar,
  .profile-studio-header__editor-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; min-width: 0; margin-bottom: 1.2rem; }
  .profile-studio-header__toolbar h1,
  .profile-studio-header__editor-header h1 { margin: 0; color: var(--studio-text, #f8f8f8); font: 600 clamp(1.75rem, 3vw, 2.15rem)/1 'Clash Display', var(--font-display-stack, sans-serif); letter-spacing: -.045em; }
  .profile-studio-header__save-state { display: flex; align-items: center; gap: .45rem; margin-top: .55rem; color: var(--studio-muted, #8f9099); font: 500 .68rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .profile-studio-header__save-state i { width: .42rem; height: .42rem; border-radius: 50%; background: var(--studio-accent, #00ffb3); box-shadow: 0 0 8px var(--studio-accent-glow, rgba(0,255,179,.24)); }
  .profile-studio-header__save-state i.dirty { background: #f5c26f; box-shadow: none; }
  .profile-studio-header__published { flex: 0 0 auto; margin-top: .15rem; padding: .38rem .6rem; border: 1px solid color-mix(in srgb, var(--studio-accent, #00ffb3) 58%, transparent); border-radius: 999px; color: var(--studio-accent, #00ffb3); font: 600 .62rem/1 'Clash Display', var(--font-display-stack, sans-serif); }
  .profile-studio-header__published.dirty { border-color: rgba(245,194,111,.58); color: #f5c26f; }
  .profile-studio-header__toolbar-actions { display: flex; align-items: center; justify-content: flex-end; gap: .55rem; min-width: 0; }
  .profile-studio-header__toolbar-actions button { min-height: 2.35rem; padding: .5rem .75rem; border: 1px solid var(--studio-border, rgba(255,255,255,.1)); border-radius: .45rem; background: transparent; color: var(--studio-muted, #8f9099); font: 500 .72rem/1 'Inter', var(--font-body-stack, sans-serif); cursor: pointer; }
  .profile-studio-header__toolbar-actions button:hover, .profile-studio-header__toolbar-actions button:focus-visible { border-color: var(--studio-border-hover, rgba(255,255,255,.2)); color: var(--studio-text, #f8f8f8); }
  .profile-studio-header__customize-tabs { position: relative; display: grid; margin-bottom: 1rem; border-bottom: 1px solid var(--studio-border, rgba(255,255,255,.1)); }
  .profile-studio-header__tablist { display: flex; align-items: stretch; gap: 1.6rem; min-height: 2.8rem; }
  .profile-studio-header__tablist button { position: relative; display: inline-flex; align-items: center; justify-content: center; min-height: 2.8rem; padding: .55rem 0; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--studio-muted, #8f9099); font: 500 .78rem/1 'Inter', var(--font-body-stack, sans-serif); cursor: pointer; }
  .profile-studio-header__tablist button:hover, .profile-studio-header__tablist button:focus-visible { color: var(--studio-text, #f8f8f8); }
  .profile-studio-header__tablist button.active { border-bottom-color: var(--studio-accent, #00ffb3); color: var(--studio-text, #f8f8f8); }
  .profile-studio-header__tablist button:focus-visible { outline: 2px solid var(--studio-accent, #00ffb3); outline-offset: 3px; }
  @media (max-width: 700px) {
    .profile-studio-header__toolbar,
    .profile-studio-header__editor-header { gap: .7rem; margin-bottom: .95rem; }
    .profile-studio-header__toolbar h1,
    .profile-studio-header__editor-header h1 { font-size: 1.65rem; }
    .profile-studio-header__published { padding-inline: .5rem; }
    .profile-studio-header__toolbar-actions { flex-wrap: wrap; justify-content: flex-start; width: 100%; }
    .profile-studio-header__toolbar { flex-wrap: wrap; }
    .profile-studio-header__toolbar-actions button { flex: 1 1 0; text-align: center; }
    .profile-studio-header__toolbar > .profile-studio-header__toolbar-actions { flex-basis: 100%; }
    .profile-studio-header__tablist { gap: 1rem; }
    .profile-studio-header__tablist button { flex: 1 1 0; min-width: 0; }
  }
</style>
