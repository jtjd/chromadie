<script>
  import { createEventDispatcher } from 'svelte';

  export let sections = /** @type {any} */ ([]);
  export let activeId = '';
  export let ariaLabel = 'Shop categories';
  export let variant = 'category';

  const dispatch = createEventDispatcher();
</script>

<nav class="shop-category-nav variant-{variant}" aria-label={ariaLabel}>
  {#each sections as section (section.id)}
    <button
      type="button"
      class:active={activeId === section.id}
      aria-current={activeId === section.id ? 'page' : undefined}
      on:click={() => dispatch('select', section.id)}
    >
      <span>{section.label}</span>
      {#if section.count !== undefined || section.description}
        <small>{section.count !== undefined ? `${section.count} ${section.count === 1 ? 'item' : 'items'}` : section.description}</small>
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
    border: 1px solid var(--shop-line);
    background: #0d0f14;
    scrollbar-width: thin;
    scrollbar-color: #4b4f5a transparent;
  }

  .shop-category-nav button {
    position: relative;
    display: grid;
    flex: 0 0 auto;
    gap: 0.25rem;
    min-width: 8.3rem;
    min-height: 3.35rem;
    padding: 0.6rem 0.85rem;
    border: 0;
    border-right: 1px solid var(--shop-line);
    background: #0d0f14;
    color: #92949d;
    cursor: pointer;
    text-align: left;
  }

  .shop-category-nav button:first-child { border-left: 0; }
  .shop-category-nav button:hover,
  .shop-category-nav button:focus-visible { background: #181b22; color: #fff; }
  .shop-category-nav button.active { background:#171a21; color: #f2f0eb; }
  .shop-category-nav button.active::after {
    position: absolute;
    right: .55rem;
    bottom: .45rem;
    left: .55rem;
    height: 1px;
    background: var(--shop-accent);
    content: '';
  }
  .shop-category-nav span { font: 650 0.78rem/1.1 var(--font-display); }
  .shop-category-nav small {
    overflow: hidden;
    color: #777983;
    font: 0.57rem/1.1 var(--font-mono-stack);
    letter-spacing: 0.05em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .shop-category-nav.variant-subtype {
    gap: 1.45rem;
    overflow: visible;
    border: 0;
    border-bottom: 1px solid var(--shop-line);
    background: transparent;
  }

  .shop-category-nav.variant-subtype button {
    min-width: auto;
    min-height: 2.7rem;
    padding: 0 .05rem;
    border: 0;
    background: transparent;
    color: #777983;
  }

  .shop-category-nav.variant-subtype button.active { background: transparent; color: #f2f0eb; }
  .shop-category-nav.variant-subtype button.active::after { right:0; bottom:-1px; left:0; height:2px; }
  .shop-category-nav.variant-subtype span { font: 500 .72rem/1 var(--font-mono-stack); }
  .shop-category-nav.variant-subtype small { display:none; }

  @media (max-width: 520px) {
    .shop-category-nav button { min-width: 6.5rem; min-height: 3.2rem; padding-inline: 0.7rem; }
    .shop-category-nav span { font-size: 0.8rem; }
    .shop-category-nav.variant-subtype { gap: 1.1rem; overflow-x:auto; }
  }
</style>
