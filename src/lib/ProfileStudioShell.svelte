<script>
  import { createEventDispatcher } from 'svelte';
  import { onDestroy, onMount } from 'svelte';
  import { getProfileStudioNavigation } from './profile-studio/dashboardContract.js';
  import ProfileEnvironmentLayer from './ProfileEnvironmentLayer.svelte';
  import SiteFooter from './SiteFooter.svelte';

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
  export let dirty = false;
  export let showBrand = true;
  /** @type {any} */
  export let previewRenderSnapshot = null;

  const dispatch = createEventDispatcher();
  let moreOpen = false;
  let moreTrigger = null;
  let moreMenu = null;
  let reducedMotionQuery = null;
  let prefersReducedMotion = false;

  $: activeLabel = sections.find(section => section.id === activeSection)?.label || 'Customize';
  $: navigation = getProfileStudioNavigation(sections);
  $: menuSections = [...navigation.primary, ...navigation.more].filter((section, index, list) => list.findIndex(item => item.id === section.id) === index);
  $: moreActive = activeSection !== 'customize';

  function navigate(sectionId) {
    moreOpen = false;
    dispatch('sectionchange', { sectionId });
  }

  function resetChanges() {
    moreOpen = false;
    dispatch('reset');
  }

  function toggleMore() {
    moreOpen = !moreOpen;
    if (moreOpen) requestAnimationFrame(() => moreMenu?.querySelector('[role="menuitem"]')?.focus());
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

  function handleMenuKeydown(event) {
    const items = [...(moreMenu?.querySelectorAll('[role="menuitem"]') || [])];
    const currentIndex = items.indexOf(event.currentTarget);
    if (!items.length) return;
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
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => { prefersReducedMotion = reducedMotionQuery.matches; };
    updateMotionPreference();
    reducedMotionQuery.addEventListener?.('change', updateMotionPreference);
    document.addEventListener('pointerdown', handleDocumentPointerdown);
    return () => {
      reducedMotionQuery?.removeEventListener?.('change', updateMotionPreference);
      document.removeEventListener('pointerdown', handleDocumentPointerdown);
    };
  });

  onDestroy(() => closeMore());
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<div class="profile-studio-shell" class:profile-studio-shell--with-preview={showPreview} class:profile-studio-shell--mobile={mobilePreviewAvailable && mobilePreviewOpen} class:profile-studio-shell--dirty={mobileDirty}>
  <ProfileEnvironmentLayer snapshot={previewRenderSnapshot} mode="studio" reducedMotion={prefersReducedMotion} />

  <header class="profile-studio-shell__header">
    <div class="profile-studio-shell__header-inner">
      {#if showBrand}
        <a class="profile-studio-shell__brand" href="/" aria-label="chm.lol home">
          <img class="profile-studio-shell__brand-logo" src="/brand/am-mark-v1.png" alt="" width="72" height="58" decoding="async" />
        </a>
      {/if}
      <div class="profile-studio-shell__header-actions">
        <a class="profile-studio-shell__view-profile" href={ownerProfilePath}>View profile</a>
        <button
          class="profile-studio-shell__publish"
          type="button"
          disabled={!dirty || mobileSaving}
          aria-busy={mobileSaving ? 'true' : 'false'}
          on:click={() => dispatch('publish')}
        >{mobileSaving ? 'Publishing…' : 'Publish profile'}</button>
        <div class="profile-studio-shell__menu-wrap">
          <button
            bind:this={moreTrigger}
            class:active={moreActive}
            class="profile-studio-shell__menu-trigger"
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-controls="profile-studio-more-menu"
            on:click={toggleMore}
          >More <span aria-hidden="true">{moreOpen ? '−' : '+'}</span></button>
          {#if moreOpen}
            <div bind:this={moreMenu} id="profile-studio-more-menu" class="profile-studio-shell__more-menu" role="menu" aria-label="Profile Studio destinations and actions">
              {#each menuSections as section (section.id)}
                <button type="button" role="menuitem" class:active={activeSection === section.id} data-section={section.id} on:click={() => navigate(section.id)} on:keydown={handleMenuKeydown}>{section.label}</button>
              {/each}
              <span class="profile-studio-shell__menu-divider" role="separator"></span>
              <button type="button" role="menuitem" disabled={!dirty || mobileSaving} on:click={resetChanges} on:keydown={handleMenuKeydown}>Reset changes</button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </header>

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

  {#if mobileDirty}
    <div class="profile-studio-shell__mobile-actions" role="region" aria-label="Unpublished profile changes">
      <span>Unpublished changes</span>
      <button type="button" on:click={() => dispatch('publish')} disabled={mobileSaving}>{mobileSaving ? 'Publishing…' : 'Publish profile'}</button>
    </div>
  {/if}

  <SiteFooter isAuthenticated={true} variant="studio" />
</div>

<style>
  .profile-studio-shell {
    --studio-background: var(--bg, #0e0e10);
    --studio-panel: var(--surface, #161619);
    --studio-panel-card: var(--surface-2, #1e1e22);
    --studio-control: var(--surface-3, #28282c);
    --studio-control-deep: var(--surface, #161619);
    --studio-border: var(--border, rgba(255, 255, 255, .09));
    --studio-border-hover: var(--border, rgba(255, 255, 255, .09));
    --studio-text: var(--text, #f5f5f6);
    --studio-muted: var(--text-muted, #8d8c92);
    --studio-faint: var(--text-faint, #59585e);
    --studio-accent: var(--site-brand-accent, var(--white, #ffffff));
    --studio-accent-soft: var(--site-brand-accent-soft, var(--border-soft, rgba(255, 255, 255, .05)));
    --studio-accent-glow: var(--site-brand-accent-glow, rgba(255, 255, 255, .16));
    --studio-display: 'Manrope Variable', var(--font-display-stack, sans-serif);
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
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
    padding: 0;
    border-bottom: 1px solid var(--studio-border);
    background: var(--bg, #0e0e10);
    backdrop-filter: blur(22px);
  }

  .profile-studio-shell__header-inner {
    display: flex;
    width: min(1480px, calc(100% - 64px));
    height: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
    margin-inline: auto;
  }

  .profile-studio-shell__brand,
  .profile-studio-shell__view-profile { color: var(--studio-text); text-decoration: none; }
  .profile-studio-shell__brand { display: inline-flex; align-items: center; min-width: 0; }
  .profile-studio-shell__brand-logo { display: block; width: 72px; height: auto; object-fit: contain; opacity: .96; filter: drop-shadow(0 0 14px rgba(255, 255, 255, .14)); }
  .profile-studio-shell__header-actions { display: flex; align-items: center; justify-content: flex-end; gap: .85rem; min-width: 0; }
  .profile-studio-shell__view-profile { color: var(--studio-muted); font-size: .8rem; font-weight: 500; white-space: nowrap; }
  .profile-studio-shell__view-profile:hover, .profile-studio-shell__view-profile:focus-visible { color: var(--studio-text); }
  .profile-studio-shell__publish { min-height: 42px; padding: 0 18px; border: 0; border-radius: 9px; background: var(--studio-text); color: #08080a; font: 600 .78rem/1 var(--studio-display); white-space: nowrap; cursor: pointer; }
  .profile-studio-shell__publish:hover:not(:disabled), .profile-studio-shell__publish:focus-visible { border-color: transparent; background: var(--studio-accent); }
  .profile-studio-shell__publish:disabled { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.12); color: rgba(255,255,255,.42); cursor: default; }
  .profile-studio-shell__menu-wrap { position: relative; flex: 0 0 auto; }
  .profile-studio-shell__menu-trigger { min-height: 2.25rem; padding: .45rem .1rem; border: 0; background: transparent; color: var(--studio-muted); font: 500 .78rem/1 'Inter', var(--font-body-stack, sans-serif); cursor: pointer; }
  .profile-studio-shell__menu-trigger:hover, .profile-studio-shell__menu-trigger:focus-visible, .profile-studio-shell__menu-trigger.active { color: var(--studio-text); }
  .profile-studio-shell__menu-trigger span { margin-left: .18rem; color: var(--studio-faint); }
  .profile-studio-shell__more-menu { position: absolute; top: calc(100% + .35rem); right: 0; z-index: 60; display: grid; min-width: 13rem; padding: .35rem; border: 1px solid var(--studio-border); border-radius: .65rem; background: var(--surface-2, #1e1e22); box-shadow: 0 1.4rem 3rem rgba(0, 0, 0, .36); }
  .profile-studio-shell__more-menu button { min-height: 2.3rem; padding: .55rem .65rem; border: 0; border-radius: .35rem; background: transparent; color: var(--studio-muted); font: 500 .76rem/1.2 'Inter', var(--font-body-stack, sans-serif); text-align: left; cursor: pointer; }
  .profile-studio-shell__more-menu button:hover, .profile-studio-shell__more-menu button:focus-visible, .profile-studio-shell__more-menu button.active { background: var(--studio-accent-soft); color: var(--studio-text); }
  .profile-studio-shell__more-menu button:disabled { cursor: default; opacity: .4; }
  .profile-studio-shell__menu-divider { height: 1px; margin: .3rem .4rem; background: var(--studio-border); }

  .profile-studio-shell__mobile-tools { display: none; }
  .profile-studio-shell__workspace { position: relative; z-index: 1; display: grid; flex: 1 0 auto; grid-template-columns: minmax(0, 1fr); align-items: start; gap: clamp(42px, 5vw, 82px); width: min(calc(100% - 48px), 1440px); margin: 0 auto; padding: 2.35rem 0 5.6rem; }
  .profile-studio-shell--with-preview .profile-studio-shell__workspace { grid-template-columns: minmax(540px, 640px) minmax(400px, 1fr); }
  .profile-studio-shell__content { --surface-panel: var(--studio-panel); --surface-panel-strong: var(--studio-panel-card); --surface-panel-soft: var(--studio-control); --surface-inset: var(--studio-control-deep); box-sizing: border-box; width: 100%; min-width: 0; }
  .profile-studio-shell__preview { position: sticky; top: 5.9rem; display: block; min-width: 0; height: calc(100dvh - 7.3rem); min-height: 34rem; overflow: visible; }
  .profile-studio-shell__mobile-actions { display: none; }

  :global(.profile-studio-shell .site-footer--studio) {
    position: relative;
    z-index: 2;
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 1.35rem clamp(1rem, 4vw, 2.4rem) calc(1.6rem + env(safe-area-inset-bottom));
    border-top-color: var(--studio-border);
    background: var(--bg, #0e0e10);
  }

  :global(.profile-studio-shell .site-footer--studio .site-footer__identity) {
    align-items: center;
  }

  :global(.profile-studio-shell .site-footer--studio .site-footer__brand-logo) {
    display: block;
    width: 52px;
    height: auto;
    opacity: .94;
    filter: drop-shadow(0 0 12px rgba(255, 255, 255, .12));
  }

  :global(.profile-studio-shell .site-footer--studio .site-footer__brand) {
    display: inline-flex;
    align-items: center;
    color: var(--studio-text);
    text-decoration: none;
  }

  :global(.profile-studio-shell button:focus-visible),
  :global(.profile-studio-shell a:focus-visible) { outline: 2px solid var(--studio-accent); outline-offset: 3px; }

  @media (max-width: 1100px) {
    .profile-studio-shell__header-inner { width: min(calc(100% - 40px), 980px); }
    .profile-studio-shell__workspace,
    .profile-studio-shell--with-preview .profile-studio-shell__workspace { grid-template-columns: minmax(0, 640px); justify-content: center; width: min(calc(100% - 48px), 640px); }
    .profile-studio-shell__preview { position: relative; top: auto; height: auto; min-height: 0; padding-top: 1.5rem; }
  }

  @media (max-width: 700px) {
    .profile-studio-shell__header { min-height: 4rem; }
    .profile-studio-shell__header-inner { width: calc(100% - 30px); }
    .profile-studio-shell__brand-logo { width: 58px; }
    .profile-studio-shell__view-profile { display: none; }
    .profile-studio-shell__header-actions { gap: .55rem; }
    .profile-studio-shell__publish { min-height: 2.5rem; padding-inline: .8rem; font-size: .7rem; }
    .profile-studio-shell__workspace,
    .profile-studio-shell--with-preview .profile-studio-shell__workspace { grid-template-columns: minmax(0, 1fr); width: calc(100% - 24px); padding-top: 1.5rem; }
    .profile-studio-shell__mobile-tools { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: .75rem; width: calc(100% - 24px); min-height: 2.8rem; margin: 0 auto; border-bottom: 1px solid var(--studio-border); color: var(--studio-text); font: 600 .8rem/1 var(--studio-display); }
    .profile-studio-shell__mobile-tools button { min-height: 2.2rem; padding: .45rem .1rem; border: 0; background: transparent; color: var(--studio-accent); font: 600 .74rem/1 'Inter', var(--font-body-stack, sans-serif); cursor: pointer; }
    .profile-studio-shell__preview { min-height: 20rem; padding-top: .75rem; }
    .profile-studio-shell--dirty .profile-studio-shell__workspace { padding-bottom: 6.1rem; }
    .profile-studio-shell__mobile-actions { position: fixed; inset: auto 0 0; z-index: 70; display: flex; align-items: center; justify-content: space-between; gap: .7rem; min-height: 4.1rem; box-sizing: border-box; padding: .65rem .85rem calc(.65rem + env(safe-area-inset-bottom)); border-top: 1px solid var(--studio-border); background: var(--surface, #161619); box-shadow: 0 -.8rem 2rem rgba(0, 0, 0, .22); }
    .profile-studio-shell__mobile-actions span { color: #f5c26f; font: 600 .74rem/1.2 'Inter', var(--font-body-stack, sans-serif); }
    .profile-studio-shell__mobile-actions button { min-height: 42px; padding: .5rem .75rem; border: 0; border-radius: 9px; background: var(--studio-text); color: #08080a; font: 600 .74rem/1 var(--studio-display); cursor: pointer; }
    .profile-studio-shell__mobile-actions button:disabled { cursor: wait; opacity: .6; }
    .profile-studio-shell__more-menu { position: fixed; top: 4.45rem; right: .75rem; max-width: calc(100vw - 1.5rem); }
    :global(.profile-studio-shell .site-footer--studio) { padding-block: 1.15rem calc(1.35rem + env(safe-area-inset-bottom)); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-studio-shell { scroll-behavior: auto; }
  }
</style>
