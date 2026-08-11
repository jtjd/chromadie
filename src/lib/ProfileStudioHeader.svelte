<script>
  import { createEventDispatcher } from 'svelte';
  import {
    PROFILE_STUDIO_CUSTOMIZE_TAB_IDS,
    PROFILE_STUDIO_CUSTOMIZE_TABS
  } from './profile-studio/dashboardContract.js';

  export let activeSection = 'customize';
  export let activeCustomizeTab = 'appearance';
  export let activeLabel = 'Customize';
  export let profilePath = '/profile';
  export let isMobileViewport = false;
  export let previewAvailable = false;
  export let previewOpen = false;

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

  function handleViewProfile(event) {
    event.preventDefault();
    dispatch('viewprofile', { event });
  }
</script>

{#if activeSection !== 'customize'}
  <header class="profile-studio-header__toolbar">
    <div>
      <p class="profile-studio-header__breadcrumb">Dashboard <span aria-hidden="true">›</span> {activeLabel}</p>
      <h1>{activeLabel}</h1>
    </div>
    <div class="profile-studio-header__toolbar-actions">
      {#if previewAvailable}
        <button type="button" aria-expanded={previewOpen} on:click={togglePreview}>{previewOpen ? 'Hide preview' : 'Preview'}</button>
      {/if}
      <a href={profilePath} on:click={handleViewProfile}>View profile ↗</a>
    </div>
  </header>
{:else}
  <div class="profile-studio-header__customize-tabs">
    <div class="profile-studio-header__customize-tabs-actions">
      {#if isMobileViewport}
        <button type="button" aria-expanded={previewOpen} on:click={togglePreview}>{previewOpen ? 'Hide preview' : 'Preview'}</button>
      {/if}
    </div>
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
  .profile-studio-header__toolbar { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: .2rem 0 1.45rem; }
  .profile-studio-header__breadcrumb { display: flex; gap: .45rem; margin: 0 0 .55rem; color: var(--studio-faint, #7f849c); font: .7rem/1 var(--studio-mono, var(--site-mono, monospace)); }
  .profile-studio-header__toolbar h1 { margin: 0; color: var(--studio-text, #cdd6f4); font-size: clamp(1.5rem, 2.5vw, 2.25rem); letter-spacing: -.05em; }
  .profile-studio-header__toolbar-actions { display: flex; align-items: center; gap: .55rem; }
  .profile-studio-header__toolbar-actions :is(a, button) { min-height: 2rem; padding: .5rem .7rem; border: 1px solid var(--studio-border-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--studio-muted, #bac2de); font-size: .78rem; text-decoration: none; cursor: pointer; }
  .profile-studio-header__toolbar-actions :is(a, button):hover, .profile-studio-header__toolbar-actions :is(a, button):focus-visible { border-color: var(--studio-focus, #b4befe); color: var(--studio-text, #cdd6f4); }
  .profile-studio-header__customize-tabs { position: relative; display: grid; margin: 0 .75rem .45rem; border: 1px solid var(--studio-border, #313244); border-radius: .5rem; background: var(--studio-panel, #181825); }
  .profile-studio-header__customize-tabs-actions { position: absolute; top: .45rem; right: .6rem; z-index: 1; display: none; gap: .45rem; }
  .profile-studio-header__customize-tabs-actions button { min-height: 1.9rem; padding: .4rem .6rem; border: 1px solid var(--studio-border-strong, #45475a); border-radius: .32rem; background: transparent; color: var(--studio-muted, #bac2de); font-size: .7rem; text-decoration: none; cursor: pointer; }
  .profile-studio-header__customize-tabs-actions button:hover, .profile-studio-header__customize-tabs-actions button:focus-visible { border-color: var(--studio-focus, #b4befe); color: var(--studio-text, #cdd6f4); }
  .profile-studio-header__tablist { display: flex; align-items: stretch; gap: 0; min-height: 3.05rem; padding: 0 .4rem; }
  .profile-studio-header__tablist button { position: relative; display: inline-flex; align-items: center; justify-content: center; min-width: 7rem; min-height: 3.05rem; padding: .55rem .9rem; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--studio-muted, #bac2de); font: 600 .78rem/1 var(--studio-font, var(--site-font, sans-serif)); cursor: pointer; }
  .profile-studio-header__tablist button:hover, .profile-studio-header__tablist button:focus-visible { color: var(--studio-text, #cdd6f4); }
  .profile-studio-header__tablist button.active { border-bottom-color: var(--studio-accent, #89b4fa); color: var(--studio-accent, #89b4fa); }
  .profile-studio-header__tablist button:focus-visible { outline: 2px solid var(--studio-focus, #b4befe); outline-offset: 2px; }
  @media (max-width: 52rem) {
    .profile-studio-header__customize-tabs { margin-inline: 0; }
    .profile-studio-header__customize-tabs-actions { position: static; display: flex; justify-content: flex-end; padding: .45rem .55rem 0; }
    .profile-studio-header__tablist { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 30rem) {
    .profile-studio-header__tablist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-studio-header__tablist button { width: 100%; min-height: 2.8rem; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-studio-header__toolbar-actions :is(a, button) { transition-duration: .001ms; } }
</style>
