<script>
  import { createEventDispatcher } from 'svelte';

  export let sections = /** @type {any} */ ([]);
  export let activeId = '';
  export let ariaLabel = 'Shop categories';

  const dispatch = createEventDispatcher();
</script>

<nav class="shop-category-nav" aria-label={ariaLabel}>
  {#each sections as section (section.id)}
    <button
      type="button"
      class:active={activeId === section.id}
      aria-current={activeId === section.id ? 'page' : undefined}
      on:click={() => dispatch('select', section.id)}
    >
      <span>{section.label}</span>
      {#if section.description}
        <small>{section.description}</small>
      {/if}
    </button>
  {/each}
</nav>

<style>
  .shop-category-nav {
    display: flex;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    border-bottom: 1px solid var(--shop-line);
    scrollbar-width: thin;
    scrollbar-color: #4b4f5a transparent;
  }

  .shop-category-nav button {
    position: relative;
    display: grid;
    flex: 0 0 auto;
    gap: 0.25rem;
    min-width: 7.2rem;
    min-height: 3.5rem;
    padding: 0.65rem 0.85rem;
    border: 0;
    border-right: 1px solid var(--shop-line);
    background: #111319;
    color: #92949d;
    cursor: pointer;
    text-align: left;
  }

  .shop-category-nav button:first-child { border-left: 1px solid var(--shop-line); }
  .shop-category-nav button:hover,
  .shop-category-nav button:focus-visible { background: #181b22; color: #fff; }
  .shop-category-nav button.active { color: var(--shop-accent); }
  .shop-category-nav button.active::after {
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 2px;
    background: var(--shop-accent);
    content: '';
  }
  .shop-category-nav span { font: 650 0.85rem/1.1 var(--font-display); }
  .shop-category-nav small {
    overflow: hidden;
    color: #777983;
    font: 0.61rem/1.1 var(--font-mono-stack);
    letter-spacing: 0.05em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    .shop-category-nav button { min-width: 6.5rem; min-height: 3.2rem; padding-inline: 0.7rem; }
    .shop-category-nav span { font-size: 0.8rem; }
  }
</style>
