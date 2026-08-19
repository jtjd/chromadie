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
  export let status = '';
  export let error = '';

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
      {#if error}<p class="profile-studio-header__message profile-studio-header__message--error" role="alert">{error}</p>{:else if status}<p class="profile-studio-header__message" role="status" aria-live="polite">{status}</p>{/if}
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
      {#if error}<p class="profile-studio-header__message profile-studio-header__message--error" role="alert">{error}</p>{:else if status}<p class="profile-studio-header__message" role="status" aria-live="polite">{status}</p>{/if}
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
  .profile-studio-header__editor-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.25rem; min-width: 0; margin-bottom: 1.2rem; }
  .profile-studio-header__toolbar h1,
  .profile-studio-header__editor-header h1 { margin: 0; color: var(--studio-atmosphere-ink, #ffffff); font: 600 2rem/1 'Manrope Variable', sans-serif !important; letter-spacing: -.035em; mix-blend-mode: difference; }
  .profile-studio-header__save-state { display: flex; align-items: center; gap: .45rem; margin-top: .45rem; color: var(--studio-atmosphere-muted, #f4f4f4); font: 500 .72rem/1 'Inter', var(--font-body-stack, sans-serif); mix-blend-mode: difference; }
  .profile-studio-header__save-state i { width: .42rem; height: .42rem; border-radius: 50%; background: var(--studio-atmosphere-ink, #ffffff); box-shadow: 0 0 8px var(--studio-accent-glow, rgba(255,255,255,.16)); }
  .profile-studio-header__save-state i.dirty { background: #f5c26f; box-shadow: none; }
  .profile-studio-header__message { max-width: 25rem; margin: .55rem 0 0; color: var(--studio-atmosphere-muted, #f4f4f4); font: 400 .68rem/1.35 'Inter', sans-serif; mix-blend-mode: difference; }
  .profile-studio-header__message--error { color: #ff5578; mix-blend-mode: normal; }
  .profile-studio-header__published { flex: 0 0 auto; margin-top: .05rem; padding: .38rem .6rem; border: 1px solid var(--studio-atmosphere-line, rgba(255,255,255,.72)); border-radius: 999px; color: var(--studio-atmosphere-ink, #ffffff); font: 600 .62rem/1 'Inter', var(--font-body-stack, sans-serif); mix-blend-mode: difference; }
  .profile-studio-header__published.dirty { border-color: rgba(245,194,111,.8); color: #f5c26f; mix-blend-mode: normal; }
  .profile-studio-header__toolbar-actions { display: flex; align-items: center; justify-content: flex-end; gap: .55rem; min-width: 0; }
  .profile-studio-header__toolbar-actions button { min-height: 2.25rem; padding: .45rem .1rem; border: 0; background: transparent; color: var(--studio-atmosphere-muted, #f4f4f4); font: 500 .72rem/1 'Inter', var(--font-body-stack, sans-serif); cursor: pointer; mix-blend-mode: difference; }
  .profile-studio-header__toolbar-actions button:hover, .profile-studio-header__toolbar-actions button:focus-visible { color: var(--studio-atmosphere-ink, #ffffff); }
  .profile-studio-header__customize-tabs { position: relative; display: grid; margin-bottom: 1rem; border-bottom: 1px solid var(--studio-atmosphere-line, rgba(255,255,255,.72)); mix-blend-mode: difference; }
  .profile-studio-header__tablist { display: flex; align-items: stretch; gap: 1.6rem; min-height: 2.8rem; }
  .profile-studio-header__tablist button { position: relative; display: inline-flex; align-items: center; justify-content: center; min-height: 2.8rem; padding: .55rem 0; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--studio-atmosphere-muted, #f4f4f4); font: 500 .82rem/1 'Inter', var(--font-body-stack, sans-serif); cursor: pointer; }
  .profile-studio-header__tablist button:hover, .profile-studio-header__tablist button:focus-visible { color: var(--studio-atmosphere-ink, #ffffff); }
  .profile-studio-header__tablist button.active { border-bottom-color: var(--studio-atmosphere-ink, #ffffff); color: var(--studio-atmosphere-ink, #ffffff); }
  .profile-studio-header__tablist button:focus-visible { outline: 2px solid var(--studio-accent, var(--white, #ffffff)); outline-offset: 3px; }
  @media (max-width: 700px) {
    .profile-studio-header__toolbar,
    .profile-studio-header__editor-header { gap: .7rem; margin-bottom: .95rem; }
    .profile-studio-header__toolbar h1,
    .profile-studio-header__editor-header h1 { font-size: 1.7rem; }
    .profile-studio-header__published { padding-inline: .5rem; }
    .profile-studio-header__toolbar-actions { flex-wrap: wrap; justify-content: flex-start; width: 100%; }
    .profile-studio-header__toolbar { flex-wrap: wrap; }
    .profile-studio-header__toolbar-actions button { flex: 1 1 0; text-align: left; }
    .profile-studio-header__toolbar > .profile-studio-header__toolbar-actions { flex-basis: 100%; }
    .profile-studio-header__tablist { gap: 1rem; }
    .profile-studio-header__tablist button { flex: 1 1 0; min-width: 0; }
  }
</style>
