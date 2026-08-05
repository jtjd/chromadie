<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y.js';

  export let activeSection = 'overview';
  export let sections = [];
  export let username = '';
  export let profilePath = '/profile';
  export let logoutInProgress = false;

  const dispatch = createEventDispatcher();
  let mobileOpen = false;
  let menuTrigger = null;
  let drawer = null;

  $: activeLabel = sections.find(section => section.id === activeSection)?.label || 'Overview';

  function navigate(sectionId) {
    mobileOpen = false;
    dispatch('sectionchange', { sectionId });
  }

  function openMobileMenu(event) {
    menuTrigger = event.currentTarget;
    mobileOpen = true;
    requestAnimationFrame(() => focusFirstElement(drawer));
  }

  function closeMobileMenu() {
    mobileOpen = false;
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

  function dispatchRoute(view) {
    mobileOpen = false;
    dispatch('navigate', { view });
  }

  function dispatchLogout() {
    mobileOpen = false;
    dispatch('logout');
  }

  onMount(() => {
    const previousOverflow = document.body.style.overflow;
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  });

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="profile-dashboard-shell" class:profile-dashboard-shell--drawer-open={mobileOpen}>
  {#if mobileOpen}
    <button class="profile-dashboard-shell__backdrop" type="button" aria-label="Close dashboard navigation" on:click={closeMobileMenu}></button>
  {/if}

  <aside id="profile-dashboard-sidebar" class="profile-dashboard-shell__sidebar" class:is-open={mobileOpen} bind:this={drawer} aria-label="Profile dashboard navigation" aria-hidden={mobileOpen ? undefined : false}>
    <div class="profile-dashboard-shell__brand-block">
      <a class="profile-dashboard-shell__brand" href="/" aria-label="ChromaDie home">chm<span>.lol</span></a>
      <span class="profile-dashboard-shell__brand-caption">Profile dashboard</span>
    </div>

    <div class="profile-dashboard-shell__sidebar-heading">
      <span>Workspace</span>
      <span>{String(Math.max(1, sections.findIndex(section => section.id === activeSection) + 1)).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}</span>
    </div>

    <nav class="profile-dashboard-shell__nav" aria-label="Profile workspace sections">
      {#each sections as section (section.id)}
        <button
          type="button"
          class:active={activeSection === section.id}
          aria-current={activeSection === section.id ? 'page' : undefined}
          on:click={() => navigate(section.id)}
        >
          <span class="profile-dashboard-shell__nav-number">{section.number}</span>
          <span class="profile-dashboard-shell__nav-copy"><strong>{section.label}</strong><small>{section.description}</small></span>
          <span class="profile-dashboard-shell__nav-arrow" aria-hidden="true">→</span>
        </button>
      {/each}
    </nav>

    <div class="profile-dashboard-shell__sidebar-footer">
      <a href={profilePath}>View live profile <span aria-hidden="true">↗</span></a>
      <button type="button" on:click={() => dispatchRoute('leaderboard')}>Explore leaderboard <span aria-hidden="true">→</span></button>
      <div class="profile-dashboard-shell__account">
        <span class="profile-dashboard-shell__account-mark" aria-hidden="true">{(username || 'Y').slice(0, 1).toUpperCase()}</span>
        <span><strong>{username || 'Your profile'}</strong><small>Signed in</small></span>
        <button type="button" aria-label="Sign out" disabled={logoutInProgress} on:click={dispatchLogout}>{logoutInProgress ? '…' : '···'}</button>
      </div>
    </div>
  </aside>

  <div class="profile-dashboard-shell__main">
    <header class="profile-dashboard-shell__topbar">
      <button class="profile-dashboard-shell__menu-trigger" type="button" aria-expanded={mobileOpen} aria-controls="profile-dashboard-sidebar" on:click={openMobileMenu}>
        <span aria-hidden="true">☰</span><span>Menu</span>
      </button>
      <div class="profile-dashboard-shell__breadcrumb" aria-label="Dashboard location">
        <span>Dashboard</span><span aria-hidden="true">›</span><strong>{activeLabel}</strong>
      </div>
      <div class="profile-dashboard-shell__top-actions">
        <a href={profilePath}>Live profile <span aria-hidden="true">↗</span></a>
        <button type="button" disabled={logoutInProgress} on:click={dispatchLogout}>{logoutInProgress ? 'Signing out…' : 'Sign out'}</button>
      </div>
    </header>

    <div class="profile-dashboard-shell__content" id="profile-dashboard-content" role="region" aria-label="Profile dashboard content">
      <slot />
    </div>
  </div>
</div>

<style>
  .profile-dashboard-shell { --dashboard-sidebar-width: 17rem; display: grid; grid-template-columns: var(--dashboard-sidebar-width) minmax(0, 1fr); min-height: 100dvh; color: var(--color-ink); background: var(--color-canvas-deep); }
  .profile-dashboard-shell__sidebar { position: sticky; top: 0; z-index: 30; display: flex; flex-direction: column; height: 100dvh; min-width: 0; padding: 1.35rem 1rem 1rem; border-right: 1px solid var(--color-line-subtle); background: var(--surface-panel); }
  .profile-dashboard-shell__brand-block { display: grid; gap: .25rem; padding: .15rem .4rem 2.1rem; }
  .profile-dashboard-shell__brand { color: var(--color-ink-strong); font: 700 1.25rem/1 var(--font-mono-stack); letter-spacing: -.05em; text-decoration: none; }
  .profile-dashboard-shell__brand span { color: var(--color-accent-bright); }
  .profile-dashboard-shell__brand-caption, .profile-dashboard-shell__sidebar-heading { color: var(--color-ink-faint); font: 600 .62rem/1.2 var(--font-mono-stack); letter-spacing: .1em; text-transform: uppercase; }
  .profile-dashboard-shell__sidebar-heading { display: flex; justify-content: space-between; gap: .5rem; padding: 0 .45rem .7rem; }
  .profile-dashboard-shell__sidebar-heading span:last-child { color: var(--color-ink-muted); }
  .profile-dashboard-shell__nav { display: grid; gap: .18rem; }
  .profile-dashboard-shell__nav button { display: grid; grid-template-columns: 1.6rem minmax(0,1fr) auto; align-items: center; gap: .55rem; min-width: 0; width: 100%; padding: .72rem .55rem; border: 1px solid transparent; border-radius: var(--radius-sm); background: transparent; color: var(--color-ink-muted); text-align: left; cursor: pointer; transition: background-color var(--motion-base) var(--motion-ease-standard), border-color var(--motion-base) var(--motion-ease-standard), color var(--motion-base) var(--motion-ease-standard); }
  .profile-dashboard-shell__nav button:hover, .profile-dashboard-shell__nav button:focus-visible { border-color: var(--color-line-subtle); background: var(--surface-panel-soft); color: var(--color-ink-strong); }
  .profile-dashboard-shell__nav button.active { border-color: color-mix(in srgb, var(--color-accent) 48%, var(--color-line-subtle)); background: color-mix(in srgb, var(--color-accent) 12%, var(--surface-panel-soft)); color: var(--color-ink-strong); }
  .profile-dashboard-shell__nav button:focus-visible, .profile-dashboard-shell__menu-trigger:focus-visible, .profile-dashboard-shell__top-actions :is(a,button):focus-visible, .profile-dashboard-shell__sidebar-footer :is(a,button):focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-dashboard-shell__nav-number { align-self: start; padding-top: .1rem; color: var(--color-ink-faint); font: 600 .62rem/1 var(--font-mono-stack); }
  .profile-dashboard-shell__nav button.active .profile-dashboard-shell__nav-number { color: var(--color-accent-bright); }
  .profile-dashboard-shell__nav-copy { display: grid; gap: .25rem; min-width: 0; }
  .profile-dashboard-shell__nav-copy strong { overflow: hidden; font: 600 .78rem/1.1 var(--font-body-stack); text-overflow: ellipsis; white-space: nowrap; }
  .profile-dashboard-shell__nav-copy small { overflow: hidden; color: var(--color-ink-faint); font-size: .64rem; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
  .profile-dashboard-shell__nav-arrow { color: var(--color-accent-bright); opacity: 0; transform: translateX(-.2rem); transition: opacity var(--motion-fast) var(--motion-ease-standard), transform var(--motion-fast) var(--motion-ease-standard); }
  .profile-dashboard-shell__nav button:hover .profile-dashboard-shell__nav-arrow, .profile-dashboard-shell__nav button.active .profile-dashboard-shell__nav-arrow { opacity: 1; transform: none; }
  .profile-dashboard-shell__sidebar-footer { display: grid; gap: .15rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--color-line-subtle); }
  .profile-dashboard-shell__sidebar-footer > :is(a,button) { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .55rem .35rem; border: 0; background: transparent; color: var(--color-ink-muted); font: 600 .7rem/1.2 var(--font-body-stack); text-align: left; text-decoration: none; cursor: pointer; }
  .profile-dashboard-shell__sidebar-footer > :is(a,button):hover { color: var(--color-ink-strong); }
  .profile-dashboard-shell__sidebar-footer > :is(a,button) span { color: var(--color-accent-bright); }
  .profile-dashboard-shell__account { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: .55rem; margin-top: .7rem; padding: .65rem .55rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-inset); }
  .profile-dashboard-shell__account-mark { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: var(--color-accent); color: var(--color-canvas-deep); font: 700 .75rem/1 var(--font-mono-stack); }
  .profile-dashboard-shell__account > span:nth-child(2) { display: grid; gap: .18rem; min-width: 0; }
  .profile-dashboard-shell__account strong { overflow: hidden; color: var(--color-ink-strong); font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
  .profile-dashboard-shell__account small { color: var(--color-ink-faint); font-size: .6rem; }
  .profile-dashboard-shell__account button { border: 0; background: transparent; color: var(--color-ink-faint); font-size: 1rem; cursor: pointer; }
  .profile-dashboard-shell__main { min-width: 0; }
  .profile-dashboard-shell__topbar { position: sticky; top: 0; z-index: 20; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 1rem; min-height: 4.5rem; padding: .85rem clamp(1rem, 3vw, 2.75rem); border-bottom: 1px solid var(--color-line-subtle); background: color-mix(in srgb, var(--surface-panel) 88%, transparent); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
  .profile-dashboard-shell__menu-trigger { display: none; }
  .profile-dashboard-shell__breadcrumb { display: flex; align-items: center; gap: .55rem; min-width: 0; color: var(--color-ink-faint); font-size: .72rem; }
  .profile-dashboard-shell__breadcrumb strong { overflow: hidden; color: var(--color-ink-strong); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .profile-dashboard-shell__top-actions { display: flex; align-items: center; gap: .75rem; }
  .profile-dashboard-shell__top-actions :is(a,button) { border: 0; background: transparent; color: var(--color-ink-muted); font: 600 .7rem/1 var(--font-body-stack); text-decoration: none; cursor: pointer; }
  .profile-dashboard-shell__top-actions :is(a,button):hover { color: var(--color-ink-strong); }
  .profile-dashboard-shell__top-actions a span { color: var(--color-accent-bright); }
  .profile-dashboard-shell__content { width: min(100%, 112rem); min-height: calc(100dvh - 4.5rem); margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) clamp(1rem, 3vw, 3.5rem) 4rem; }
  .profile-dashboard-shell__backdrop { display: none; }
  @media (max-width: 60rem) { .profile-dashboard-shell { display: block; } .profile-dashboard-shell__sidebar { position: fixed; left: 0; top: 0; width: min(86vw, 19rem); transform: translateX(-104%); transition: transform var(--motion-base) var(--motion-ease-standard); box-shadow: 1.5rem 0 4rem rgba(0,0,0,.35); } .profile-dashboard-shell__sidebar.is-open { transform: translateX(0); } .profile-dashboard-shell__backdrop { position: fixed; inset: 0; z-index: 25; display: block; border: 0; background: rgba(0,0,0,.55); cursor: pointer; } .profile-dashboard-shell__menu-trigger { display: inline-flex; align-items: center; gap: .4rem; border: 0; background: transparent; color: var(--color-ink-muted); font: 600 .7rem/1 var(--font-body-stack); cursor: pointer; } }
  @media (max-width: 34rem) { .profile-dashboard-shell__topbar { grid-template-columns: auto minmax(0,1fr); } .profile-dashboard-shell__top-actions { display: none; } .profile-dashboard-shell__breadcrumb { justify-content: end; } .profile-dashboard-shell__content { padding-inline: .8rem; } }
  @media (prefers-reduced-motion: reduce) { .profile-dashboard-shell__sidebar, .profile-dashboard-shell__nav button, .profile-dashboard-shell__nav-arrow { transition-duration: .001ms; } }
</style>
