<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y.js';

  export let activeSection = 'overview';
  /** @type {any[]} */
  export let sections = [];
  export let showPreview = false;

  const dispatch = createEventDispatcher();
  let mobileOpen = false;
  let menuTrigger = null;
  let drawer = null;
  let isMobileViewport = false;
  let bodyOverflowBeforeDrawer = '';
  let mediaQuery = null;

  $: activeLabel = sections.find(section => section.id === activeSection)?.label || 'Overview';
  $: groupedSections = sections.reduce((groups, section) => {
    const key = section.groupKey || section.group || 'default';
    let group = groups.find(item => item.key === key);
    if (!group) {
      group = { key, label: section.groupLabel || (key === 'profile' ? 'Profile' : ''), collapsible: key === 'profile', sections: [] };
      groups = [...groups, group];
    }
    group.sections = [...group.sections, section];
    return groups;
  }, []);
  let profileExpanded = true;
  $: profileGroupExpanded = profileExpanded || sections.some(section => section.groupKey === 'profile' && section.id === activeSection);

  function navigate(sectionId) {
    closeMobileMenu();
    dispatch('sectionchange', { sectionId });
  }

  function toggleProfileGroup() {
    profileExpanded = !profileExpanded;
  }

  function openMobileMenu(event) {
    menuTrigger = event.currentTarget;
    if (!mobileOpen) {
      bodyOverflowBeforeDrawer = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    mobileOpen = true;
    requestAnimationFrame(() => focusFirstElement(drawer));
  }

  function closeMobileMenu() {
    if (!mobileOpen) return;
    mobileOpen = false;
    document.body.style.overflow = bodyOverflowBeforeDrawer;
    requestAnimationFrame(() => restoreFocus(menuTrigger));
  }

  function handleKeydown(event) {
    if (!mobileOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileMenu();
      return;
    }
    trapFocus(event, drawer);
  }

  onMount(() => {
    mediaQuery = window.matchMedia('(max-width: 64rem)');
    const updateViewport = () => { isMobileViewport = mediaQuery.matches; if (!isMobileViewport && mobileOpen) closeMobileMenu(); };
    updateViewport();
    mediaQuery.addEventListener?.('change', updateViewport);
    return () => mediaQuery?.removeEventListener?.('change', updateViewport);
  });

  onDestroy(() => {
    if (typeof document !== 'undefined' && mobileOpen) document.body.style.overflow = bodyOverflowBeforeDrawer;
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="profile-dashboard-shell" class:profile-dashboard-shell--drawer-open={mobileOpen} class:profile-dashboard-shell--with-preview={showPreview}>
  {#if mobileOpen}
    <button class="profile-dashboard-shell__backdrop" type="button" aria-label="Close dashboard navigation" on:click={closeMobileMenu}></button>
  {/if}

  <aside id="profile-dashboard-sidebar" class="profile-dashboard-shell__sidebar" class:is-open={mobileOpen} bind:this={drawer} aria-label="Profile dashboard navigation" aria-hidden={isMobileViewport && !mobileOpen ? 'true' : undefined} inert={isMobileViewport && !mobileOpen}>
    <div class="profile-dashboard-shell__sidebar-head">
      <a class="profile-dashboard-shell__brand" href="/" aria-label="chm.lol home">
        <span class="profile-dashboard-shell__brand-mark" aria-hidden="true">✦</span>
        <span><strong>chm.lol</strong><small>Profile studio</small></span>
      </a>
      <button class="profile-dashboard-shell__close" type="button" aria-label="Close dashboard navigation" on:click={closeMobileMenu}>×</button>
    </div>

    <nav class="profile-dashboard-shell__nav" aria-label="Profile dashboard sections">
      {#each groupedSections as group (group.key)}
        <div class="profile-dashboard-shell__group" class:primary={group.key === 'primary'} class:account={group.key === 'account'}>
          {#if group.collapsible}
            <button class="profile-dashboard-shell__group-toggle" type="button" aria-expanded={profileGroupExpanded} on:click={toggleProfileGroup}><span class="profile-dashboard-shell__group-label">{group.label}</span><span aria-hidden="true">{profileGroupExpanded ? '−' : '+'}</span></button>
          {:else if group.label}<span class="profile-dashboard-shell__group-label">{group.label}</span>{/if}
          {#if !group.collapsible || profileGroupExpanded}{#each group.sections as section (section.id)}
            <button
              type="button"
              class:active={activeSection === section.id}
              class:premium={section.id === 'premium'}
              aria-current={activeSection === section.id ? 'page' : undefined}
              on:click={() => navigate(section.id)}
            >
              <span class="profile-dashboard-shell__nav-icon" aria-hidden="true">{section.icon || '·'}</span>
              <span>{section.label}</span>
            </button>
          {/each}{/if}
        </div>
      {/each}
    </nav>
  </aside>

  <div class="profile-dashboard-shell__main">
    <div class="profile-dashboard-shell__mobile-bar">
      <button type="button" aria-expanded={mobileOpen} aria-controls="profile-dashboard-sidebar" on:click={openMobileMenu}>
        <span aria-hidden="true">☰</span> Menu
      </button>
      <span>{activeLabel}</span>
    </div>
    <div class="profile-dashboard-shell__content" id="profile-dashboard-content" role="region" aria-label="Profile dashboard content">
      <slot />
    </div>
  </div>

  {#if showPreview}
    <aside class="profile-dashboard-shell__preview" aria-label="Live profile preview">
      <slot name="preview" />
    </aside>
  {/if}
</div>

<style>
  .profile-dashboard-shell {
    --dashboard-sidebar-width: 18rem;
    --type-body: 1rem;
    --type-small: .9rem;
    --type-label: .78rem;
    display: grid;
    grid-template-columns: var(--dashboard-sidebar-width) minmax(0, 1fr);
    min-height: calc(100dvh - 4.1rem);
    color: var(--site-ink, var(--color-ink));
    background: var(--site-deep, var(--color-canvas-deep));
  }
  .profile-dashboard-shell--with-preview { grid-template-columns: var(--dashboard-sidebar-width) minmax(0, 1fr) minmax(20rem, 23vw); }
  .profile-dashboard-shell__sidebar {
    position: sticky;
    top: 4.1rem;
    z-index: 20;
    display: flex;
    flex-direction: column;
    height: calc(100dvh - 4.1rem);
    min-width: 0;
    padding: 1.25rem 1rem 1rem;
    border-right: 1px solid var(--site-line, var(--color-line-subtle));
    background: color-mix(in srgb, var(--site-deep, #090a0d) 96%, transparent);
  }
  .profile-dashboard-shell__sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: .05rem .55rem 1.35rem; }
  .profile-dashboard-shell__brand { display: inline-flex; align-items: center; gap: .6rem; min-width: 0; color: var(--site-ink, var(--color-ink-strong)); text-decoration: none; }
  .profile-dashboard-shell__brand-mark { display: grid; width: 1.9rem; height: 1.9rem; place-items: center; border: 1px solid color-mix(in srgb, var(--site-accent, var(--color-accent)) 42%, transparent); border-radius: .5rem; background: color-mix(in srgb, var(--site-accent, var(--color-accent)) 12%, transparent); color: var(--site-accent, var(--color-accent)); font-size: .95rem; }
  .profile-dashboard-shell__brand span:last-child { display: grid; gap: .18rem; min-width: 0; }
  .profile-dashboard-shell__brand strong { font: 700 .98rem/1 var(--site-font, var(--font-body-stack)); letter-spacing: -.02em; }
  .profile-dashboard-shell__brand small { color: var(--site-faint, var(--color-ink-faint)); font: .7rem/1 var(--site-mono, var(--font-mono-stack)); letter-spacing: .1em; text-transform: uppercase; }
  .profile-dashboard-shell__group-label { color: var(--site-faint, var(--color-ink-faint)); font: 600 .75rem/1 var(--site-mono, var(--font-mono-stack)); letter-spacing: .12em; text-transform: uppercase; }
  .profile-dashboard-shell__close { display: none; border: 0; background: transparent; color: var(--site-muted, var(--color-ink-muted)); font-size: 1.2rem; cursor: pointer; }
  .profile-dashboard-shell__nav { display: grid; gap: 1.4rem; }
  .profile-dashboard-shell__group { display: grid; gap: .15rem; }
  .profile-dashboard-shell__group.account { padding-top: .75rem; border-top: 1px solid var(--site-line, var(--color-line-subtle)); }
  .profile-dashboard-shell__group-label { padding: .25rem .65rem .45rem; font-size: .75rem; }
  .profile-dashboard-shell__group-toggle { display: flex; align-items: center; justify-content: space-between; min-height: 2rem; padding: .25rem .65rem .45rem; border: 0; background: transparent; color: var(--site-faint, var(--color-ink-faint)); cursor: pointer; }
  .profile-dashboard-shell__group-toggle > span:last-child { color: var(--site-muted, var(--color-ink-muted)); font: .8rem/1 var(--site-mono, var(--font-mono-stack)); }
  .profile-dashboard-shell__nav button { display: flex; align-items: center; gap: .65rem; width: 100%; min-height: 2.65rem; padding: .65rem .7rem; border: 1px solid transparent; border-radius: .5rem; background: transparent; color: var(--site-muted, var(--color-ink-muted)); font: 500 .95rem/1.15 var(--site-font, var(--font-body-stack)); text-align: left; cursor: pointer; transition: background-color .18s ease, border-color .18s ease, color .18s ease; }
  .profile-dashboard-shell__nav button:hover, .profile-dashboard-shell__nav button:focus-visible { border-color: var(--site-line-strong, var(--color-line-strong)); background: var(--site-surface-soft, var(--surface-panel-soft)); color: var(--site-ink, var(--color-ink-strong)); }
  .profile-dashboard-shell__nav button.active { border-color: color-mix(in srgb, var(--site-accent, var(--color-accent)) 46%, var(--site-line)); background: color-mix(in srgb, var(--site-accent, var(--color-accent)) 12%, transparent); color: var(--site-ink, var(--color-ink-strong)); }
  .profile-dashboard-shell__nav button.premium { color: var(--site-accent, var(--color-accent)); }
  .profile-dashboard-shell__nav button.premium.active { border-color: color-mix(in srgb, var(--site-accent, var(--color-accent)) 58%, var(--site-line)); background: color-mix(in srgb, var(--site-accent, var(--color-accent)) 18%, transparent); }
  .profile-dashboard-shell__nav button:focus-visible, .profile-dashboard-shell__group-toggle:focus-visible, .profile-dashboard-shell__mobile-bar button:focus-visible { outline: 2px solid var(--site-accent, var(--color-accent-bright)); outline-offset: 3px; }
  .profile-dashboard-shell__nav-icon { display: grid; place-items: center; width: 1.15rem; color: var(--site-faint, var(--color-ink-faint)); font-family: var(--site-mono, var(--font-mono-stack)); }
  .profile-dashboard-shell__nav button.active .profile-dashboard-shell__nav-icon { color: var(--site-accent, var(--color-accent)); }
  .profile-dashboard-shell__main { min-width: 0; }
  .profile-dashboard-shell__content { width: 100%; min-height: calc(100dvh - 4.1rem); padding: clamp(1rem, 2vw, 2rem) clamp(1rem, 2vw, 2.25rem) 3rem; }
  .profile-dashboard-shell__preview { position: sticky; top: 0; z-index: 10; display: grid; grid-template-rows: auto minmax(0, 1fr); min-width: 0; height: calc(100dvh - 4.75rem); overflow: hidden; border-left: 1px solid var(--site-line, var(--color-line-subtle)); background: color-mix(in srgb, var(--site-deep, #090a0d) 94%, transparent); }
  .profile-dashboard-shell__mobile-bar { display: none; }
  .profile-dashboard-shell__backdrop { display: none; }
  @media (max-width: 90rem) and (min-width: 64.01rem) {
    .profile-dashboard-shell--with-preview { grid-template-columns: var(--dashboard-sidebar-width) minmax(0, 1fr); }
    .profile-dashboard-shell__preview { position: fixed; inset: 4.1rem 0 0 auto; z-index: 45; width: min(24rem, calc(100vw - var(--dashboard-sidebar-width))); height: auto; border-left: 1px solid var(--site-line-strong, var(--color-line-strong)); box-shadow: -1.25rem 0 3rem rgba(0,0,0,.34); }
  }
  @media (max-width: 64rem) {
    .profile-dashboard-shell { display: block; }
    .profile-dashboard-shell__sidebar { position: fixed; inset: 0 auto 0 0; z-index: 60; width: min(88vw, 22rem); height: 100dvh; padding-top: 1rem; transform: translateX(-104%); transition: transform .2s ease; box-shadow: 1rem 0 3rem rgba(0,0,0,.34); }
    .profile-dashboard-shell__sidebar.is-open { transform: translateX(0); }
    .profile-dashboard-shell__sidebar-head { padding-top: .25rem; }
    .profile-dashboard-shell__close { display: block; }
    .profile-dashboard-shell__backdrop { position: fixed; inset: 0; z-index: 55; display: block; border: 0; background: rgba(0,0,0,.58); cursor: pointer; }
    .profile-dashboard-shell__mobile-bar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between; min-height: 2.9rem; padding: .45rem .85rem; border-bottom: 1px solid var(--site-line, var(--color-line-subtle)); background: color-mix(in srgb, var(--site-deep, #090a0d) 90%, transparent); backdrop-filter: blur(14px); }
    .profile-dashboard-shell__mobile-bar button { display: inline-flex; align-items: center; gap: .4rem; border: 0; background: transparent; color: var(--site-muted, var(--color-ink-muted)); font: 600 .8rem/1 var(--site-font, var(--font-body-stack)); cursor: pointer; }
    .profile-dashboard-shell__mobile-bar > span { color: var(--site-ink, var(--color-ink-strong)); font-size: .84rem; }
    .profile-dashboard-shell__content { min-height: calc(100dvh - 7rem); padding-top: 1rem; }
    .profile-dashboard-shell--with-preview .profile-dashboard-shell__preview { position: fixed; inset: auto 0 0; z-index: 45; width: 100%; height: min(70dvh, 36rem); min-height: 20rem; max-height: none; border-top: 1px solid var(--site-line-strong, var(--color-line-strong)); border-left: 0; box-shadow: 0 -1.25rem 3rem rgba(0,0,0,.34); }
  }
  @media (prefers-reduced-motion: reduce) { .profile-dashboard-shell__sidebar, .profile-dashboard-shell__nav button { transition-duration: .001ms; } }
</style>
