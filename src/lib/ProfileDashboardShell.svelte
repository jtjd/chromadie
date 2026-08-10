<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y.js';
  import ProfileDashboardIcon from './ProfileDashboardIcon.svelte';

  export let activeSection = 'overview';
  /** @type {any[]} */
  export let sections = [];
  export let showPreview = false;
  export let ownerUsername = '';
  export let ownerProfilePath = '/profile';
  export let ownerAvatarSrc = '';

  const dispatch = createEventDispatcher();
  let mobileOpen = false;
  let menuTrigger = null;
  let drawer = null;
  let isMobileViewport = false;
  let bodyOverflowBeforeDrawer = '';
  let mediaQuery = null;
  let colorMode = 'dark';

  const COLOR_MODE_STORAGE_KEY = 'chromadie-profile-studio-color-mode';

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

  function toggleColorMode() {
    colorMode = colorMode === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
    } catch {
      // Private browsing and hardened storage should not block the control.
    }
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
    try {
      const storedMode = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
      if (storedMode === 'light' || storedMode === 'dark') colorMode = storedMode;
    } catch {
      // Use the dark default when storage is unavailable.
    }
    mediaQuery.addEventListener?.('change', updateViewport);
    return () => mediaQuery?.removeEventListener?.('change', updateViewport);
  });

  onDestroy(() => {
    if (typeof document !== 'undefined' && mobileOpen) document.body.style.overflow = bodyOverflowBeforeDrawer;
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="profile-dashboard-shell" class:profile-dashboard-shell--drawer-open={mobileOpen} class:profile-dashboard-shell--with-preview={showPreview} class:profile-dashboard-shell--light={colorMode === 'light'}>
  {#if mobileOpen}
    <button class="profile-dashboard-shell__backdrop" type="button" aria-label="Close dashboard navigation" on:click={closeMobileMenu}></button>
  {/if}

  <aside id="profile-dashboard-sidebar" class="profile-dashboard-shell__sidebar" class:is-open={mobileOpen} bind:this={drawer} aria-label="Profile dashboard navigation" aria-hidden={isMobileViewport && !mobileOpen ? 'true' : undefined} inert={isMobileViewport && !mobileOpen}>
    <div class="profile-dashboard-shell__sidebar-head">
      <a class="profile-dashboard-shell__brand" href="/" aria-label="chm.lol home">
        <span class="profile-dashboard-shell__brand-mark" aria-hidden="true"></span>
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
              data-section={section.id}
              aria-current={activeSection === section.id ? 'page' : undefined}
              on:click={() => navigate(section.id)}
            >
              <span class="profile-dashboard-shell__nav-icon" aria-hidden="true"><ProfileDashboardIcon name={section.id} /></span>
              <span>{section.label}</span>
            </button>
          {/each}{/if}
        </div>
      {/each}
    </nav>

    <div class="profile-dashboard-shell__sidebar-foot">
      {#if ownerUsername}
        <a class="profile-dashboard-shell__owner" href={ownerProfilePath}>
          <span class="profile-dashboard-shell__owner-avatar" aria-hidden="true">
            {#if ownerAvatarSrc}<img src={ownerAvatarSrc} alt="" />{:else}{ownerUsername.slice(0, 1).toUpperCase()}{/if}
          </span>
          <span><strong>{ownerUsername}</strong><small>View profile <span aria-hidden="true">↗</span></small></span>
        </a>
      {/if}

      <button
        class="profile-dashboard-shell__mode-toggle"
        type="button"
        aria-label={colorMode === 'dark' ? 'Use light mode' : 'Use dark mode'}
        aria-pressed={colorMode === 'light'}
        title={colorMode === 'dark' ? 'Use light mode' : 'Use dark mode'}
        on:click={toggleColorMode}
      >
        {#if colorMode === 'dark'}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>
        {:else}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 15.1A8.5 8.5 0 0 1 8.9 3.5 8.5 8.5 0 1 0 20.5 15.1Z"></path></svg>
        {/if}
        <span class="profile-dashboard-shell__mode-copy">
          <strong>{colorMode === 'dark' ? 'Dark mode' : 'Light mode'}</strong>
          <small>{colorMode === 'dark' ? 'Mocha' : 'Latte'}</small>
        </span>
        <span class="profile-dashboard-shell__mode-chevron" aria-hidden="true">›</span>
        <span class="profile-dashboard-shell__sr-only">{colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
      </button>
    </div>
  </aside>

  <div class="profile-dashboard-shell__topbar">
    <slot name="topbar" />
  </div>

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
    --dashboard-sidebar-width: 14rem;
    --studio-canvas: var(--ctp-crust, #11111b);
    --studio-panel: var(--ctp-mantle, #181825);
    --studio-inset: var(--ctp-base, #1e1e2e);
    --studio-font: var(--site-font, var(--font-body-stack, sans-serif));
    --studio-mono: var(--site-mono, var(--font-mono-stack, monospace));
    --studio-text: var(--ctp-text, #cdd6f4);
    --studio-muted: var(--ctp-subtext1, #bac2de);
    --studio-faint: var(--ctp-overlay1, #7f849c);
    --studio-border: var(--ctp-surface0, #313244);
    --studio-border-strong: var(--ctp-surface1, #45475a);
    --studio-focus: var(--ctp-lavender, #b4befe);
    --studio-accent: var(--ctp-blue, #89b4fa);
    --studio-radius: .42rem;
    --type-body: 1rem;
    --type-small: .9rem;
    --type-label: .78rem;
    display: grid;
    grid-template-columns: var(--dashboard-sidebar-width) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 100dvh;
    color: var(--site-ink, var(--color-ink));
    background: var(--studio-canvas);
  }
  .profile-dashboard-shell--light {
    --ctp-crust: #eff1f5;
    --ctp-mantle: #e6e9ef;
    --ctp-base: #dce0e8;
    --ctp-surface0: #ccd0da;
    --ctp-surface1: #bcc0cc;
    --ctp-surface2: #acb0be;
    --ctp-overlay0: #9ca0b0;
    --ctp-overlay1: #8c8fa1;
    --ctp-overlay2: #7c7f93;
    --ctp-subtext0: #6c6f85;
    --ctp-subtext1: #5c5f77;
    --ctp-text: #4c4f69;
    --ctp-pink: #ea76cb;
    --ctp-mauve: #8839ef;
    --ctp-red: #d20f39;
    --ctp-peach: #fe640b;
    --ctp-yellow: #df8e1d;
    --ctp-green: #40a02b;
    --ctp-teal: #179299;
    --ctp-sky: #04a5e5;
    --ctp-sapphire: #209fb5;
    --ctp-blue: #1e66f5;
    --ctp-lavender: #7287fd;
    --studio-canvas: var(--ctp-crust);
    --studio-panel: var(--ctp-mantle);
    --studio-inset: var(--ctp-base);
    --site-canvas: var(--ctp-base);
    --site-deep: var(--ctp-crust);
    --site-raised: var(--ctp-surface0);
    --site-ink: var(--ctp-text);
    --site-muted: var(--ctp-subtext1);
    --site-faint: var(--ctp-overlay1);
    --site-accent: var(--ctp-mauve);
    --site-accent-bright: var(--ctp-lavender);
    --site-line: rgba(76, 79, 105, .2);
    --site-line-strong: rgba(76, 79, 105, .38);
    --site-surface: var(--ctp-surface0);
    --site-surface-soft: var(--ctp-mantle);
    --color-canvas: var(--ctp-base);
    --color-canvas-raised: var(--ctp-surface0);
    --color-canvas-deep: var(--ctp-crust);
    --color-ink-strong: var(--ctp-text);
    --color-ink: var(--ctp-subtext1);
    --color-ink-muted: var(--ctp-subtext0);
    --color-ink-faint: var(--ctp-overlay1);
    --color-line-subtle: var(--site-line);
    --color-line-strong: var(--site-line-strong);
    --color-accent: var(--ctp-mauve);
    --color-accent-bright: var(--ctp-lavender);
    --color-accent-cyan: var(--ctp-teal);
    --color-accent-roll: var(--ctp-green);
    --color-success: var(--ctp-green);
    --color-earned: var(--ctp-peach);
    --color-warning: var(--ctp-yellow);
    --color-danger: var(--ctp-red);
    --surface-panel: var(--ctp-surface0);
    --surface-panel-strong: var(--ctp-surface1);
    --surface-panel-soft: var(--ctp-mantle);
    --surface-inset: var(--ctp-mantle);
    color-scheme: light;
  }
  .profile-dashboard-shell:not(.profile-dashboard-shell--light) { color-scheme: dark; }
  :global(.profile-dashboard-shell--light select) { color-scheme: light; }
  /* Keep the preview at the reference width on wide desktop canvases.  The
   * editor gets enough room for the three-column media row while the preview
   * stays a stable, readable 25rem-ish rail instead of collapsing into a
   * narrow strip. */
  .profile-dashboard-shell--with-preview { grid-template-columns: var(--dashboard-sidebar-width) minmax(0, 1fr) minmax(22rem, 26.5vw); }
  .profile-dashboard-shell__sidebar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    height: 100dvh;
    min-width: 0;
    overflow-y: auto;
    grid-column: 1;
    grid-row: 1 / -1;
    padding: 1.2rem .75rem 2.15rem;
    background: var(--studio-canvas);
  }
  .profile-dashboard-shell__sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: .05rem .45rem 2.5rem; }
  .profile-dashboard-shell__brand { display: inline-flex; align-items: center; gap: .6rem; min-width: 0; color: var(--site-ink, var(--color-ink-strong)); text-decoration: none; }
  .profile-dashboard-shell__brand-mark { width: 1.18rem; height: 1.18rem; margin-inline: .15rem .12rem; border: 2px solid var(--ctp-mauve, var(--site-accent, var(--color-accent))); transform: rotate(45deg); }
  .profile-dashboard-shell__brand span:last-child { display: grid; gap: .18rem; min-width: 0; }
  .profile-dashboard-shell__brand strong { font: 750 1rem/1 var(--site-font, var(--font-body-stack)); letter-spacing: -.02em; }
  .profile-dashboard-shell__brand small { color: var(--ctp-overlay1, var(--site-faint, var(--color-ink-faint))); font: 600 .62rem/1 var(--site-mono, var(--font-mono-stack)); letter-spacing: .14em; text-transform: uppercase; }
  .profile-dashboard-shell__group-label { color: var(--ctp-subtext0, var(--site-faint, var(--color-ink-faint))); font: 600 .66rem/1 var(--site-font, var(--font-body-stack)); letter-spacing: .04em; text-transform: uppercase; }
  .profile-dashboard-shell__close { display: none; border: 0; background: transparent; color: var(--site-muted, var(--color-ink-muted)); font-size: 1.2rem; cursor: pointer; }
  .profile-dashboard-shell__nav { display: grid; gap: .9rem; margin-inline: .2rem; }
  .profile-dashboard-shell__group { display: grid; gap: .25rem; }
  .profile-dashboard-shell__group.account { padding-top: .85rem; border-top: 1px solid var(--ctp-surface0, #313244); }
  .profile-dashboard-shell__group-label { padding: .2rem .55rem .45rem; }
  .profile-dashboard-shell__group-toggle { display: flex; align-items: center; justify-content: space-between; min-height: 2rem; padding: .25rem .65rem .45rem; border: 0; background: transparent; color: var(--site-faint, var(--color-ink-faint)); cursor: pointer; }
  .profile-dashboard-shell__group-toggle > span:last-child { color: var(--site-muted, var(--color-ink-muted)); font: .8rem/1 var(--site-mono, var(--font-mono-stack)); }
  .profile-dashboard-shell__nav button { --nav-accent: var(--site-accent, var(--color-accent)); display: flex; align-items: center; gap: .68rem; width: 100%; min-height: 2.45rem; padding: .45rem .65rem; border: 1px solid transparent; border-radius: .38rem; background: transparent; color: var(--ctp-subtext1, var(--site-muted, var(--color-ink-muted))); font: 550 .83rem/1.15 var(--site-font, var(--font-body-stack)); text-align: left; cursor: pointer; transition: background-color .18s ease, border-color .18s ease, color .18s ease; }
  .profile-dashboard-shell__nav button[data-section="customize"] { --nav-accent: var(--ctp-mauve, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button[data-section="links"] { --nav-accent: var(--ctp-sapphire, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button[data-section="premium"] { --nav-accent: var(--ctp-pink, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button[data-section="overview"] { --nav-accent: var(--ctp-blue, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button[data-section="profile-insights"] { --nav-accent: var(--ctp-teal, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button[data-section="profile-notifications"] { --nav-accent: var(--ctp-yellow, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button[data-section="profile-social"] { --nav-accent: var(--ctp-green, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button[data-section="progression"] { --nav-accent: var(--ctp-peach, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button[data-section="account"] { --nav-accent: var(--ctp-lavender, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__nav button:hover, .profile-dashboard-shell__nav button:focus-visible { border-color: color-mix(in srgb, var(--nav-accent) 35%, var(--ctp-surface0, #313244)); background: color-mix(in srgb, var(--nav-accent) 6%, var(--ctp-base, #1e1e2e)); color: var(--ctp-text, var(--site-ink, var(--color-ink-strong))); }
  .profile-dashboard-shell__nav button.active { min-height: 2.7rem; border-color: color-mix(in srgb, var(--nav-accent) 38%, var(--ctp-surface1, #45475a)); background: color-mix(in srgb, var(--nav-accent) 9%, var(--ctp-base, #1e1e2e)); color: var(--ctp-text, var(--site-ink, var(--color-ink-strong))); }
  .profile-dashboard-shell__nav button.premium { color: var(--nav-accent); }
  .profile-dashboard-shell__nav button:focus-visible, .profile-dashboard-shell__group-toggle:focus-visible, .profile-dashboard-shell__mobile-bar button:focus-visible { outline: 2px solid var(--site-accent, var(--color-accent-bright)); outline-offset: 3px; }
  .profile-dashboard-shell__nav-icon { display: grid; place-items: center; width: 1.15rem; color: color-mix(in srgb, var(--nav-accent) 72%, var(--ctp-subtext1, #bac2de)); }
  .profile-dashboard-shell__nav button.active .profile-dashboard-shell__nav-icon { color: var(--nav-accent, var(--site-accent, var(--color-accent))); }
  .profile-dashboard-shell__sidebar-foot { display: grid; gap: .65rem; margin-top: auto; margin-left: .2rem; margin-right: -.05rem; padding-top: 1.25rem; }
  .profile-dashboard-shell__owner { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: .65rem; min-height: 4rem; box-sizing: border-box; padding: .62rem; border: 1px solid var(--ctp-surface0, #313244); border-radius: .42rem; background: var(--ctp-mantle, #181825); color: var(--ctp-text, #cdd6f4); text-decoration: none; }
  .profile-dashboard-shell__owner:hover, .profile-dashboard-shell__owner:focus-visible { border-color: color-mix(in srgb, var(--ctp-mauve, #cba6f7) 45%, var(--ctp-surface1, #45475a)); }
  .profile-dashboard-shell__owner:focus-visible { outline: 2px solid var(--ctp-lavender, #b4befe); outline-offset: 3px; }
  .profile-dashboard-shell__owner-avatar { display: grid; width: 2.15rem; height: 2.15rem; overflow: hidden; place-items: center; border: 1px solid var(--ctp-surface1, #45475a); border-radius: 50%; background: var(--ctp-base, #1e1e2e); color: var(--ctp-mauve, #cba6f7); font-weight: 700; }
  .profile-dashboard-shell__owner-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .profile-dashboard-shell__owner > span:last-child { display: grid; gap: .2rem; min-width: 0; }
  .profile-dashboard-shell__owner strong { overflow: hidden; font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
  .profile-dashboard-shell__owner small { color: var(--ctp-subtext0, #a6adc8); font-size: .68rem; }
  .profile-dashboard-shell__mode-toggle { display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; align-items: center; gap: .65rem; width: 100%; min-height: 3.9rem; padding: .62rem .7rem; border: 1px solid var(--ctp-surface0, #313244); border-radius: .42rem; background: var(--ctp-mantle, #181825); color: var(--ctp-subtext1, #bac2de); text-align: left; cursor: pointer; transition: border-color .18s ease, background-color .18s ease, color .18s ease; }
  .profile-dashboard-shell__mode-toggle:hover, .profile-dashboard-shell__mode-toggle:focus-visible { border-color: var(--ctp-lavender, #b4befe); background: color-mix(in srgb, var(--ctp-lavender, #b4befe) 10%, var(--ctp-mantle, #181825)); color: var(--ctp-text, #cdd6f4); }
  .profile-dashboard-shell__mode-toggle:focus-visible { outline: 2px solid var(--ctp-lavender, #b4befe); outline-offset: 3px; }
  .profile-dashboard-shell__mode-toggle svg { width: 1.2rem; height: 1.2rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
  .profile-dashboard-shell__mode-copy { display: grid; gap: .2rem; min-width: 0; }
  .profile-dashboard-shell__mode-copy strong { color: var(--ctp-text, #cdd6f4); font-size: .78rem; font-weight: 650; }
  .profile-dashboard-shell__mode-copy small { color: var(--ctp-subtext0, #a6adc8); font-size: .68rem; }
  .profile-dashboard-shell__mode-chevron { color: var(--ctp-subtext0, #a6adc8); font-size: 1.2rem; line-height: 1; }
  .profile-dashboard-shell__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; padding: 0; border: 0; margin: -1px; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  .profile-dashboard-shell__topbar { grid-column: 2 / -1; grid-row: 1; min-width: 0; padding: .9rem .95rem .55rem .55rem; }
  .profile-dashboard-shell__main { grid-column: 2; grid-row: 2; min-width: 0; background: transparent; }
  .profile-dashboard-shell__content { --surface-panel: var(--studio-panel); --surface-panel-strong: var(--ctp-mantle, #181825); --surface-panel-soft: var(--studio-panel); --surface-inset: var(--studio-inset); width: 100%; min-height: calc(100dvh - 5.6rem); padding: .05rem .55rem 1.25rem; }
  .profile-dashboard-shell__preview { grid-column: 3; grid-row: 2; position: sticky; top: .9rem; z-index: 10; display: grid; grid-template-rows: auto minmax(0, 1fr); min-width: 0; height: calc(100dvh - 1.8rem); margin: 0 .95rem .9rem .15rem; overflow: hidden; border: 1px solid var(--ctp-surface0, #313244); border-radius: .55rem; background: var(--ctp-mantle, #181825); }
  .profile-dashboard-shell__mobile-bar { display: none; }
  .profile-dashboard-shell__backdrop { display: none; }
  @media (max-width: 90rem) and (min-width: 64.01rem) {
    .profile-dashboard-shell--with-preview { grid-template-columns: var(--dashboard-sidebar-width) minmax(0, 1fr); }
    .profile-dashboard-shell__preview { position: fixed; inset: .9rem .9rem .9rem auto; z-index: 45; width: min(25rem, calc(100vw - var(--dashboard-sidebar-width) - 1.8rem)); height: auto; margin: 0; border: 1px solid var(--site-line-strong, var(--color-line-strong)); box-shadow: -1.25rem 0 3rem rgba(0,0,0,.34); }
  }
  @media (max-width: 64rem) {
    .profile-dashboard-shell { display: block; }
    .profile-dashboard-shell__sidebar { position: fixed; inset: 0 auto 0 0; z-index: 60; width: min(88vw, 22rem); height: 100dvh; padding-top: 1rem; transform: translateX(-104%); transition: transform .2s ease; box-shadow: 1rem 0 3rem rgba(0,0,0,.34); }
    .profile-dashboard-shell__sidebar.is-open { transform: translateX(0); }
    .profile-dashboard-shell__sidebar-head { padding-top: .25rem; padding-bottom: 1.45rem; }
    .profile-dashboard-shell__close { display: block; }
    .profile-dashboard-shell__backdrop { position: fixed; inset: 0; z-index: 55; display: block; border: 0; background: rgba(0,0,0,.58); cursor: pointer; }
    .profile-dashboard-shell__mobile-bar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between; min-height: 2.9rem; padding: .45rem .85rem; border-bottom: 1px solid var(--ctp-surface0, #313244); background: var(--ctp-crust, #11111b); }
    .profile-dashboard-shell__mobile-bar button { display: inline-flex; align-items: center; gap: .4rem; border: 0; background: transparent; color: var(--site-muted, var(--color-ink-muted)); font: 600 .8rem/1 var(--site-font, var(--font-body-stack)); cursor: pointer; }
    .profile-dashboard-shell__mobile-bar > span { color: var(--site-ink, var(--color-ink-strong)); font-size: .84rem; }
    .profile-dashboard-shell__topbar { padding: .6rem .85rem .2rem; }
    .profile-dashboard-shell__content { min-height: calc(100dvh - 7rem); padding: .4rem .85rem 1.5rem; }
    .profile-dashboard-shell--with-preview .profile-dashboard-shell__preview { position: fixed; inset: auto 0 0; z-index: 45; width: 100%; height: min(70dvh, 36rem); min-height: 20rem; max-height: none; border-top: 1px solid var(--site-line-strong, var(--color-line-strong)); border-left: 0; box-shadow: 0 -1.25rem 3rem rgba(0,0,0,.34); }
  }
  @media (prefers-reduced-motion: reduce) { .profile-dashboard-shell__sidebar, .profile-dashboard-shell__nav button, .profile-dashboard-shell__mode-toggle { transition-duration: .001ms; } }
</style>
