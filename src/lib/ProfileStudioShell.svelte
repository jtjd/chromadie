<script>
  import { onDestroy, onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import {
    getProfileStudioNavigation
  } from './profile-studio/dashboardContract.js';

  export let activeSection = 'overview';
  /** @type {any[]} */
  export let sections = [];
  export let showPreview = false;
  export let ownerProfilePath = '/profile';
  export let mobileTitle = '';
  export let mobilePreviewAvailable = false;
  export let mobilePreviewOpen = false;
  export let mobileDirty = false;
  export let mobileSaving = false;

  const dispatch = createEventDispatcher();
  let moreOpen = false;
  let moreTrigger = null;
  let moreMenu = null;
  let mediaQuery = null;
  let isMobileViewport = false;

  $: activeLabel = sections.find(section => section.id === activeSection)?.label || 'Customize';
  $: navigation = getProfileStudioNavigation(sections);
  $: primarySections = navigation.primary;
  $: moreSections = navigation.more;
  $: moreActive = moreSections.some(section => section.id === activeSection);

  function navigate(sectionId) {
    moreOpen = false;
    dispatch('sectionchange', { sectionId });
  }

  function toggleMore() {
    moreOpen = !moreOpen;
    if (moreOpen) {
      requestAnimationFrame(() => moreMenu?.querySelector('[role="menuitem"]')?.focus());
    }
  }

  function closeMore({ restore = false } = {}) {
    if (!moreOpen) return;
    moreOpen = false;
    if (restore) requestAnimationFrame(() => moreTrigger?.focus());
  }

  function handleWindowKeydown(event) {
    if (event.key === 'Escape' && moreOpen) {
      event.preventDefault();
      closeMore({ restore: true });
    }
  }

  function handleDocumentPointerdown(event) {
    if (!moreOpen) return;
    if (moreMenu?.contains(event.target) || moreTrigger?.contains(event.target)) return;
    closeMore();
  }

  function handleMoreKeydown(event) {
    const items = [...(moreMenu?.querySelectorAll('[role="menuitem"]') || [])];
    const currentIndex = items.indexOf(event.currentTarget);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMore({ restore: true });
    }
  }

  onMount(() => {
    mediaQuery = window.matchMedia('(max-width: 64rem)');
    const updateViewport = () => { isMobileViewport = mediaQuery.matches; };
    updateViewport();
    mediaQuery.addEventListener?.('change', updateViewport);
    document.addEventListener('pointerdown', handleDocumentPointerdown);
    return () => {
      mediaQuery?.removeEventListener?.('change', updateViewport);
      document.removeEventListener('pointerdown', handleDocumentPointerdown);
    };
  });

  onDestroy(() => closeMore());
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<div class="profile-studio-shell" class:profile-studio-shell--with-preview={showPreview} class:profile-studio-shell--mobile={isMobileViewport} class:profile-studio-shell--dirty={isMobileViewport && mobileDirty}>
  <header class="profile-studio-shell__header">
    <a class="profile-studio-shell__brand" href="/" aria-label="chm.lol home">
      <span class="profile-studio-shell__brand-mark" aria-hidden="true"></span>
      <span class="profile-studio-shell__brand-name">chm.lol</span>
    </a>
    <div class="profile-studio-shell__header-actions">
      <a class="profile-studio-shell__view-profile" href={ownerProfilePath}>View profile</a>
      <slot name="topbar" />
    </div>
  </header>

  <nav class="profile-studio-shell__destination-nav" aria-label="Profile Studio destinations">
    <div class="profile-studio-shell__primary-nav">
      {#each primarySections as section (section.id)}
        <button
          type="button"
          class:active={activeSection === section.id}
          data-section={section.id}
          aria-current={activeSection === section.id ? 'page' : undefined}
          on:click={() => navigate(section.id)}
        >{section.label}</button>
      {/each}
    </div>
    {#if moreSections.length}
      <div class="profile-studio-shell__more-nav">
        <button
          bind:this={moreTrigger}
          type="button"
          class:active={moreActive}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          aria-controls="profile-studio-more-menu"
          on:click={toggleMore}
        >More <span aria-hidden="true">{moreOpen ? '−' : '+'}</span></button>
        {#if moreOpen}
          <div bind:this={moreMenu} id="profile-studio-more-menu" class="profile-studio-shell__more-menu" role="menu" aria-label="More Profile Studio destinations">
            {#each moreSections as section (section.id)}
              <button
                type="button"
                role="menuitem"
                class:active={activeSection === section.id}
                data-section={section.id}
                on:click={() => navigate(section.id)}
                on:keydown={handleMoreKeydown}
              >{section.label}</button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </nav>

  <div class="profile-studio-shell__mobile-tools">
    <span>{mobileTitle || activeLabel}</span>
    {#if mobilePreviewAvailable}
      <button type="button" aria-controls="profile-studio-preview" aria-expanded={mobilePreviewOpen} on:click={() => dispatch('previewtoggle')}>
        {mobilePreviewOpen ? 'Close preview' : 'Preview'}
      </button>
    {/if}
  </div>

  <div class="profile-studio-shell__workspace">
    <main class="profile-studio-shell__content" id="profile-studio-content" role="region" aria-label="Profile Studio content">
      <slot />
    </main>

    {#if showPreview}
      <aside id="profile-studio-preview" class="profile-studio-shell__preview" aria-label="Live profile preview">
        <slot name="preview" />
      </aside>
    {/if}
  </div>

  {#if isMobileViewport && mobileDirty}
    <div class="profile-studio-shell__mobile-actions" role="region" aria-label="Unpublished profile changes">
      <span>Unpublished changes</span>
      <button type="button" on:click={() => dispatch('publish')} disabled={mobileSaving}>{mobileSaving ? 'Publishing…' : 'Publish profile'}</button>
    </div>
  {/if}
</div>

<style>
  .profile-studio-shell {
    --studio-background: #050506;
    --studio-panel: rgba(12, 12, 15, .78);
    --studio-panel-card: rgba(10, 10, 12, .58);
    --studio-control: rgba(255, 255, 255, .035);
    --studio-control-deep: rgba(0, 0, 0, .22);
    --studio-border: rgba(255, 255, 255, .10);
    --studio-border-hover: rgba(255, 255, 255, .20);
    --studio-text: #f8f8f8;
    --studio-muted: #8f9099;
    --studio-faint: #686971;
    --studio-accent: #00ffb3;
    --studio-accent-soft: rgba(0, 255, 179, .08);
    --studio-accent-glow: rgba(0, 255, 179, .24);
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-width: 320px;
    min-height: 100dvh;
    overflow-x: clip;
    color: var(--studio-text);
    background: var(--studio-background);
    font-family: 'Inter', var(--font-body-stack, sans-serif);
    color-scheme: dark;
  }

  .profile-studio-shell__header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 4rem;
    padding: 0 2rem;
    border-bottom: 1px solid var(--studio-border);
    background: rgba(5, 5, 6, .84);
    backdrop-filter: blur(22px);
  }

  .profile-studio-shell__brand,
  .profile-studio-shell__view-profile { color: var(--studio-text); text-decoration: none; }
  .profile-studio-shell__brand { display: inline-flex; align-items: center; gap: .65rem; min-width: 0; }
  .profile-studio-shell__brand-mark { position: relative; width: 1.45rem; height: 1.45rem; border: 2px solid color-mix(in srgb, var(--studio-accent) 36%, transparent); border-radius: 50%; box-shadow: 0 0 15px var(--studio-accent-glow); }
  .profile-studio-shell__brand-mark::after { position: absolute; inset: .36rem; border-radius: 50%; background: var(--studio-accent); content: ''; }
  .profile-studio-shell__brand-name { font: 600 1.25rem/1 'Clash Display', var(--font-display-stack, sans-serif); letter-spacing: -.025em; }
  .profile-studio-shell__header-actions { display: flex; align-items: center; justify-content: flex-end; gap: .8rem; min-width: 0; }
  .profile-studio-shell__view-profile { color: var(--studio-muted); font-size: .8rem; font-weight: 500; white-space: nowrap; }
  .profile-studio-shell__view-profile:hover, .profile-studio-shell__view-profile:focus-visible { color: var(--studio-text); }

  .profile-studio-shell__destination-nav { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: min(calc(100% - 48px), 1440px); min-height: 3rem; margin: 0 auto; border-bottom: 1px solid var(--studio-border); }
  .profile-studio-shell__primary-nav { display: flex; align-items: stretch; gap: 1.55rem; min-width: 0; overflow-x: auto; scrollbar-width: none; }
  .profile-studio-shell__primary-nav::-webkit-scrollbar { display: none; }
  .profile-studio-shell__primary-nav button,
  .profile-studio-shell__more-nav > button { position: relative; min-height: 3rem; padding: .65rem 0; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--studio-muted); font: 500 .78rem/1 'Inter', var(--font-body-stack, sans-serif); white-space: nowrap; cursor: pointer; }
  .profile-studio-shell__primary-nav button:hover,
  .profile-studio-shell__more-nav > button:hover,
  .profile-studio-shell__primary-nav button:focus-visible,
  .profile-studio-shell__more-nav > button:focus-visible { color: var(--studio-text); }
  .profile-studio-shell__primary-nav button.active,
  .profile-studio-shell__more-nav > button.active { border-bottom-color: var(--studio-accent); color: var(--studio-text); }
  .profile-studio-shell__more-nav { position: relative; flex: 0 0 auto; }
  .profile-studio-shell__more-nav > button { display: inline-flex; align-items: center; gap: .35rem; }
  .profile-studio-shell__more-nav > button span { color: var(--studio-faint); font-size: .85rem; }
  .profile-studio-shell__more-menu { position: absolute; top: calc(100% + .35rem); right: 0; z-index: 60; display: grid; min-width: 12rem; padding: .35rem; border: 1px solid var(--studio-border); border-radius: .65rem; background: rgba(12, 12, 15, .96); box-shadow: 0 1.4rem 3rem rgba(0, 0, 0, .36); }
  .profile-studio-shell__more-menu button { min-height: 2.3rem; padding: .55rem .65rem; border: 0; border-radius: .35rem; background: transparent; color: var(--studio-muted); font: 500 .76rem/1.2 'Inter', var(--font-body-stack, sans-serif); text-align: left; cursor: pointer; }
  .profile-studio-shell__more-menu button:hover, .profile-studio-shell__more-menu button:focus-visible, .profile-studio-shell__more-menu button.active { background: var(--studio-accent-soft); color: var(--studio-text); }

  .profile-studio-shell__mobile-tools { display: none; }
  .profile-studio-shell__workspace { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: clamp(2.6rem, 5vw, 5.1rem); width: min(calc(100% - 48px), 1440px); margin: 0 auto; padding: 2.35rem 0 5.6rem; }
  .profile-studio-shell--with-preview .profile-studio-shell__workspace { grid-template-columns: minmax(540px, 640px) minmax(400px, 1fr); }
  .profile-studio-shell__content { --surface-panel: var(--studio-panel); --surface-panel-strong: var(--studio-panel-card); --surface-panel-soft: var(--studio-control); --surface-inset: var(--studio-control-deep); box-sizing: border-box; width: 100%; min-width: 0; }
  .profile-studio-shell__preview { position: sticky; top: 5.9rem; display: grid; min-width: 0; height: calc(100dvh - 7.3rem); min-height: 34rem; overflow: hidden; border: 1px solid var(--studio-border); border-radius: .95rem; background: var(--studio-panel); box-shadow: 0 1.6rem 4.4rem rgba(0, 0, 0, .24); }
  .profile-studio-shell__mobile-actions { display: none; }

  :global(.profile-studio-shell button:focus-visible),
  :global(.profile-studio-shell a:focus-visible) { outline: 2px solid var(--studio-accent); outline-offset: 3px; }

  @media (max-width: 1100px) {
    .profile-studio-shell__workspace,
    .profile-studio-shell--with-preview .profile-studio-shell__workspace { grid-template-columns: minmax(0, 760px); justify-content: center; }
    .profile-studio-shell__preview { position: relative; top: auto; height: auto; min-height: 0; }
  }

  @media (max-width: 700px) {
    .profile-studio-shell__header { min-height: 4rem; padding: 0 .75rem; }
    .profile-studio-shell__brand-name { font-size: 1.15rem; }
    .profile-studio-shell__view-profile { display: none; }
    .profile-studio-shell__header-actions { gap: .4rem; }
    .profile-studio-shell__destination-nav { width: calc(100% - 24px); min-height: 2.85rem; gap: .7rem; }
    .profile-studio-shell__primary-nav { gap: 1.15rem; }
    .profile-studio-shell__primary-nav button,
    .profile-studio-shell__more-nav > button { min-height: 2.85rem; font-size: .73rem; }
    .profile-studio-shell__more-menu { position: fixed; top: 7.1rem; right: .75rem; max-width: calc(100vw - 1.5rem); }
    .profile-studio-shell__mobile-tools { display: flex; align-items: center; justify-content: space-between; gap: .75rem; width: calc(100% - 24px); min-height: 2.8rem; margin: 0 auto; border-bottom: 1px solid var(--studio-border); color: var(--studio-text); font: 600 .8rem/1 'Clash Display', var(--font-display-stack, sans-serif); }
    .profile-studio-shell__mobile-tools button { min-height: 2.2rem; padding: .45rem .1rem; border: 0; background: transparent; color: var(--studio-accent); font: 600 .74rem/1 'Inter', var(--font-body-stack, sans-serif); cursor: pointer; }
    .profile-studio-shell__workspace,
    .profile-studio-shell--with-preview .profile-studio-shell__workspace { grid-template-columns: minmax(0, 1fr); width: calc(100% - 24px); padding-top: 1.5rem; }
    .profile-studio-shell__preview { min-height: 20rem; border-radius: .75rem; }
    .profile-studio-shell--dirty .profile-studio-shell__workspace { padding-bottom: 6.1rem; }
    .profile-studio-shell__mobile-actions { position: fixed; inset: auto 0 0; z-index: 70; display: flex; align-items: center; justify-content: space-between; gap: .7rem; min-height: 4.1rem; box-sizing: border-box; padding: .65rem .85rem calc(.65rem + env(safe-area-inset-bottom)); border-top: 1px solid var(--studio-border); background: rgba(5, 5, 6, .94); box-shadow: 0 -.8rem 2rem rgba(0, 0, 0, .22); }
    .profile-studio-shell__mobile-actions span { color: #f5c26f; font: 600 .74rem/1.2 'Inter', var(--font-body-stack, sans-serif); }
    .profile-studio-shell__mobile-actions button { min-height: 2.65rem; padding: .5rem .75rem; border: 1px solid var(--studio-accent); border-radius: .45rem; background: var(--studio-accent); color: #050506; font: 700 .74rem/1 'Clash Display', var(--font-display-stack, sans-serif); cursor: pointer; }
    .profile-studio-shell__mobile-actions button:disabled { cursor: wait; opacity: .6; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-studio-shell__more-menu { scroll-behavior: auto; }
  }
</style>
