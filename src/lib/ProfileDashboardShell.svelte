<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y.js';

  export let activeSection = 'overview';
  /** @type {any[]} */
  export let sections = [];

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

<div class="profile-dashboard-shell" class:profile-dashboard-shell--drawer-open={mobileOpen}>
  {#if mobileOpen}
    <button class="profile-dashboard-shell__backdrop" type="button" aria-label="Close dashboard navigation" on:click={closeMobileMenu}></button>
  {/if}

  <aside id="profile-dashboard-sidebar" class="profile-dashboard-shell__sidebar" class:is-open={mobileOpen} bind:this={drawer} aria-label="Profile dashboard navigation" aria-hidden={isMobileViewport && !mobileOpen ? 'true' : undefined} inert={isMobileViewport && !mobileOpen}>
    <div class="profile-dashboard-shell__sidebar-head">
      <span class="profile-dashboard-shell__sidebar-label">Dashboard</span>
      <button class="profile-dashboard-shell__close" type="button" aria-label="Close dashboard navigation" on:click={closeMobileMenu}>×</button>
    </div>

    <nav class="profile-dashboard-shell__nav" aria-label="Profile dashboard sections">
      {#each groupedSections as group (group.key)}
        <div class="profile-dashboard-shell__group">
          {#if group.collapsible}
            <button class="profile-dashboard-shell__group-toggle" type="button" aria-expanded={profileGroupExpanded} on:click={toggleProfileGroup}><span class="profile-dashboard-shell__group-label">{group.label}</span><span aria-hidden="true">{profileGroupExpanded ? '−' : '+'}</span></button>
          {:else if group.label}<span class="profile-dashboard-shell__group-label">{group.label}</span>{/if}
          {#if !group.collapsible || profileGroupExpanded}{#each group.sections as section (section.id)}
            <button
              type="button"
              class:active={activeSection === section.id}
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
</div>

<style>
  .profile-dashboard-shell {
    --dashboard-sidebar-width: 13rem;
    display: grid;
    grid-template-columns: var(--dashboard-sidebar-width) minmax(0, 1fr);
    min-height: calc(100dvh - 4.1rem);
    color: var(--site-ink, var(--color-ink));
    background: var(--site-deep, var(--color-canvas-deep));
  }
  .profile-dashboard-shell__sidebar {
    position: sticky;
    top: 4.1rem;
    z-index: 20;
    display: flex;
    flex-direction: column;
    height: calc(100dvh - 4.1rem);
    min-width: 0;
    padding: 1.1rem .75rem .75rem;
    border-right: 1px solid var(--site-line, var(--color-line-subtle));
    background: color-mix(in srgb, var(--site-deep, #090a0d) 92%, transparent);
  }
  .profile-dashboard-shell__sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: .1rem .45rem 1rem; }
  .profile-dashboard-shell__sidebar-label, .profile-dashboard-shell__group-label { color: var(--site-faint, var(--color-ink-faint)); font: 600 .62rem/1 var(--site-mono, var(--font-mono-stack)); letter-spacing: .12em; text-transform: uppercase; }
  .profile-dashboard-shell__close { display: none; border: 0; background: transparent; color: var(--site-muted, var(--color-ink-muted)); font-size: 1.2rem; cursor: pointer; }
  .profile-dashboard-shell__nav { display: grid; gap: 1rem; }
  .profile-dashboard-shell__group { display: grid; gap: .15rem; }
  .profile-dashboard-shell__group-label { padding: .2rem .55rem .35rem; font-size: .56rem; }
  .profile-dashboard-shell__group-toggle { display: flex; align-items: center; justify-content: space-between; min-height: 1.8rem; padding: .2rem .55rem .35rem; border: 0; background: transparent; color: var(--site-faint, var(--color-ink-faint)); cursor: pointer; }
  .profile-dashboard-shell__group-toggle > span:last-child { color: var(--site-muted, var(--color-ink-muted)); font: .8rem/1 var(--site-mono, var(--font-mono-stack)); }
  .profile-dashboard-shell__nav button { display: flex; align-items: center; gap: .55rem; width: 100%; min-height: 2.15rem; padding: .55rem .55rem; border: 1px solid transparent; border-radius: .42rem; background: transparent; color: var(--site-muted, var(--color-ink-muted)); font: 500 .76rem/1.1 var(--site-font, var(--font-body-stack)); text-align: left; cursor: pointer; transition: background-color .18s ease, border-color .18s ease, color .18s ease; }
  .profile-dashboard-shell__nav button:hover, .profile-dashboard-shell__nav button:focus-visible { border-color: var(--site-line-strong, var(--color-line-strong)); background: var(--site-surface-soft, var(--surface-panel-soft)); color: var(--site-ink, var(--color-ink-strong)); }
  .profile-dashboard-shell__nav button.active { border-color: color-mix(in srgb, var(--site-accent, var(--color-accent)) 46%, var(--site-line)); background: color-mix(in srgb, var(--site-accent, var(--color-accent)) 12%, transparent); color: var(--site-ink, var(--color-ink-strong)); }
  .profile-dashboard-shell__nav button:focus-visible, .profile-dashboard-shell__group-toggle:focus-visible, .profile-dashboard-shell__mobile-bar button:focus-visible { outline: 2px solid var(--site-accent, var(--color-accent-bright)); outline-offset: 3px; }
  .profile-dashboard-shell__nav-icon { display: grid; place-items: center; width: 1rem; color: var(--site-faint, var(--color-ink-faint)); font-family: var(--site-mono, var(--font-mono-stack)); }
  .profile-dashboard-shell__nav button.active .profile-dashboard-shell__nav-icon { color: var(--site-accent, var(--color-accent)); }
  .profile-dashboard-shell__main { min-width: 0; }
  .profile-dashboard-shell__content { width: 100%; min-height: calc(100dvh - 4.1rem); padding: clamp(1rem, 2.4vw, 2.25rem) clamp(.85rem, 2.6vw, 3rem) 4rem; }
  .profile-dashboard-shell__mobile-bar { display: none; }
  .profile-dashboard-shell__backdrop { display: none; }
  @media (max-width: 64rem) {
    .profile-dashboard-shell { display: block; }
    .profile-dashboard-shell__sidebar { position: fixed; inset: 0 auto 0 0; z-index: 60; width: min(84vw, 18rem); height: 100dvh; padding-top: 1rem; transform: translateX(-104%); transition: transform .2s ease; box-shadow: 1rem 0 3rem rgba(0,0,0,.34); }
    .profile-dashboard-shell__sidebar.is-open { transform: translateX(0); }
    .profile-dashboard-shell__sidebar-head { padding-top: .25rem; }
    .profile-dashboard-shell__close { display: block; }
    .profile-dashboard-shell__backdrop { position: fixed; inset: 0; z-index: 55; display: block; border: 0; background: rgba(0,0,0,.58); cursor: pointer; }
    .profile-dashboard-shell__mobile-bar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between; min-height: 2.9rem; padding: .45rem .85rem; border-bottom: 1px solid var(--site-line, var(--color-line-subtle)); background: color-mix(in srgb, var(--site-deep, #090a0d) 90%, transparent); backdrop-filter: blur(14px); }
    .profile-dashboard-shell__mobile-bar button { display: inline-flex; align-items: center; gap: .4rem; border: 0; background: transparent; color: var(--site-muted, var(--color-ink-muted)); font: 600 .72rem/1 var(--site-font, var(--font-body-stack)); cursor: pointer; }
    .profile-dashboard-shell__mobile-bar > span { color: var(--site-ink, var(--color-ink-strong)); font-size: .76rem; }
    .profile-dashboard-shell__content { min-height: calc(100dvh - 7rem); padding-top: 1rem; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-dashboard-shell__sidebar, .profile-dashboard-shell__nav button { transition-duration: .001ms; } }
</style>
