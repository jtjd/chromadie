<script>
  export let href = null;
  export let variant = 'primary';
  export let size = 'md';
  /** @type {'button' | 'submit' | 'reset'} */
  export let type = 'button';
  export let disabled = false;
  export let busy = false;
  export let ariaLabel = null;
  export let className = '';

  $: buttonClass = [
    'foundation-button',
    `foundation-button--${variant}`,
    `foundation-button--${size}`,
    className
  ].filter(Boolean).join(' ');
</script>

{#if href}
  <a class={buttonClass} href={href} aria-label={ariaLabel || undefined}>
    <span class="foundation-button__label"><slot /></span>
  </a>
{:else}
  <button
    class={buttonClass}
    {type}
    {disabled}
    aria-label={ariaLabel || undefined}
    aria-busy={busy ? 'true' : undefined}
  >
    <span class="foundation-button__label"><slot /></span>
  </button>
{/if}

<style>
  .foundation-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 2.75rem;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    padding: 0 var(--space-5);
    color: var(--color-ink-strong);
    font: 600 var(--type-small) / 1 var(--font-body-stack);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: transform var(--motion-fast) var(--motion-ease-standard),
      border-color var(--motion-base) var(--motion-ease-standard),
      background-color var(--motion-base) var(--motion-ease-standard),
      box-shadow var(--motion-base) var(--motion-ease-standard),
      color var(--motion-base) var(--motion-ease-standard);
  }

  .foundation-button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .foundation-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .foundation-button:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 3px;
  }

  .foundation-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .foundation-button--sm {
    min-height: 2.35rem;
    padding-inline: var(--space-4);
    font-size: var(--type-label);
  }

  .foundation-button--lg {
    min-height: 3.15rem;
    padding-inline: var(--space-6);
    font-size: var(--type-body);
  }

  .foundation-button--primary {
    background: var(--color-ink-strong);
    color: var(--color-canvas-deep);
    box-shadow: 0 0.75rem 1.75rem rgba(0, 0, 0, 0.24);
  }

  .foundation-button--primary:hover:not(:disabled) {
    box-shadow: var(--shadow-accent);
  }

  .foundation-button--secondary {
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent-bright);
  }

  .foundation-button--ghost {
    border-color: var(--color-line-subtle);
    background: var(--surface-panel-soft);
    color: var(--color-ink);
  }

  .foundation-button--ghost:hover:not(:disabled) {
    border-color: var(--color-line-strong);
    background: rgba(255, 255, 255, 0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    .foundation-button { transition-duration: 0.001ms; }
    .foundation-button:hover:not(:disabled),
    .foundation-button:active:not(:disabled) { transform: none; }
  }

  @media (max-width: 36rem) {
    .foundation-button { min-height: 2.85rem; }
  }
</style>
