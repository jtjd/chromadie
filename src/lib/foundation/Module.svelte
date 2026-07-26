<script>
  export let title = '';
  export let eyebrow = '';
  export let description = '';
  export let size = 'wide';
  export let tone = 'default';
  export let moduleId = null;
  export let className = '';

  $: moduleClass = [
    'foundation-module',
    `foundation-module--${size}`,
    `foundation-module--${tone}`,
    className
  ].filter(Boolean).join(' ');
  $: headingId = moduleId ? `${moduleId}-title` : null;
</script>

<section class={moduleClass} id={moduleId || undefined} aria-labelledby={headingId || undefined}>
  {#if title || eyebrow || description}
    <header class="foundation-module__header">
      <div>
        {#if eyebrow}<p class="foundation-module__eyebrow">{eyebrow}</p>{/if}
        {#if title}<h2 id={headingId || undefined}>{title}</h2>{/if}
        {#if description}<p class="foundation-module__description">{description}</p>{/if}
      </div>
      <slot name="header" />
    </header>
  {/if}
  <div class="foundation-module__body"><slot /></div>
</section>

<style>
  .foundation-module {
    min-width: 0;
    padding: clamp(var(--space-5), 3vw, var(--space-8));
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-lg);
    background: var(--surface-panel);
    box-shadow: var(--shadow-panel);
  }

  .foundation-module--wide { grid-column: span 8; }
  .foundation-module--medium { grid-column: span 6; }
  .foundation-module--narrow { grid-column: span 4; }

  .foundation-module--accent {
    border-color: color-mix(in srgb, var(--profile-accent, var(--color-accent)) 35%, var(--color-line-subtle));
    background: linear-gradient(145deg, color-mix(in srgb, var(--profile-accent, var(--color-accent)) 13%, var(--surface-panel)), var(--surface-panel));
  }

  .foundation-module--quiet {
    background: var(--surface-panel-soft);
    box-shadow: none;
  }

  .foundation-module__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .foundation-module__eyebrow {
    margin: 0 0 var(--space-2);
    color: var(--profile-accent, var(--color-accent-bright));
    font: 700 var(--type-label) / 1.2 var(--font-mono-stack);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .foundation-module h2 {
    margin: 0;
    color: var(--color-ink-strong);
    font: 600 var(--type-h2) / var(--type-line-tight) var(--font-display-stack);
    letter-spacing: -0.035em;
  }

  .foundation-module__description {
    max-width: 36rem;
    margin: var(--space-3) 0 0;
    color: var(--color-ink-muted);
    font-size: var(--type-small);
    line-height: var(--type-line-body);
  }

  .foundation-module__body { min-width: 0; }

  @media (max-width: 64rem) {
    .foundation-module--wide,
    .foundation-module--medium { grid-column: span 12; }
    .foundation-module--narrow { grid-column: span 6; }
  }

  @media (max-width: 48rem) {
    .foundation-module--wide,
    .foundation-module--medium,
    .foundation-module--narrow { grid-column: 1 / -1; }
  }
</style>
