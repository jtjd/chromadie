<script>
  export let as = 'section';
  export let variant = 'panel';
  export let padding = 'md';
  export let className = '';
  export let labelledBy = null;
  export let dataProfileRegion = null;

  $: surfaceClass = [
    'foundation-surface',
    `foundation-surface--${variant}`,
    `foundation-surface--${padding}`,
    className
  ].filter(Boolean).join(' ');
</script>

<svelte:element this={as} class={surfaceClass} aria-labelledby={labelledBy || undefined} data-profile-region={dataProfileRegion || undefined}>
  <slot />
</svelte:element>

<style>
  .foundation-surface {
    position: relative;
    isolation: isolate;
    min-width: 0;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-lg);
    background: var(--surface-panel);
    box-shadow: var(--shadow-panel);
    backdrop-filter: blur(var(--blur-panel));
    -webkit-backdrop-filter: blur(var(--blur-panel));
    transition: border-color var(--motion-base) var(--motion-ease-standard),
      background-color var(--motion-base) var(--motion-ease-standard),
      transform var(--motion-base) var(--motion-ease-standard);
  }

  .foundation-surface:hover {
    border-color: var(--color-line-strong);
  }

  .foundation-surface--md { padding: var(--space-6); }
  .foundation-surface--lg { padding: clamp(var(--space-6), 4vw, var(--space-12)); }
  .foundation-surface--sm { padding: var(--space-4); }
  .foundation-surface--none { padding: 0; }

  .foundation-surface--hero {
    overflow: hidden;
    background: var(--surface-panel-strong);
    box-shadow: var(--shadow-float);
  }

  .foundation-surface--quiet {
    background: var(--surface-panel-soft);
    box-shadow: none;
  }

  .foundation-surface--inset {
    background: var(--surface-inset);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  @media (prefers-reduced-motion: reduce) {
    .foundation-surface { transition-duration: 0.001ms; }
  }
</style>
