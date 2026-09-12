<script>
  import IllustratedDecoration from './IllustratedDecoration.svelte';
  import SakuraPetals from './SakuraPetals.svelte';
  export let definition;
  export let animated;
</script>
{#key definition.key}
  {#if definition.key === 'sakura-petals'}
    <SakuraPetals {animated} />
  {:else}
    <IllustratedDecoration artwork={definition.artwork} effectKey={definition.key} {animated} />
  {/if}
{/key}

<style>
  /* Reserve the decorative footprint in each production layout. Both animated
     artwork and petals need this space; the portrait keeps its original size. */
  :global(.profile-reference-card[data-profile-layout-content]:has(.illustrated-decoration, .sakura-petals) .profile-reference-card__avatar-shell) { margin-block:2rem 2.75rem; }
  :global(.profile-reference-card--framed:has(.illustrated-decoration, .sakura-petals)) { overflow:visible; }
  :global(.profile-reference-card--framed:has(.illustrated-decoration, .sakura-petals) .profile-reference-card__identity) { gap:2.75rem; }
  :global(.profile-full-bleed--full-bleed:has(.illustrated-decoration, .sakura-petals) .profile-full-bleed__avatar-shell) { margin-block:2rem clamp(3.5rem, 6vw, 4.5rem); }
  :global(.profile-full-bleed--sleek:has(.illustrated-decoration, .sakura-petals)) { margin-top:2rem; padding-top:7rem; }
  :global(.profile-portfolio:has(.illustrated-decoration, .sakura-petals) .profile-portfolio__identity) { gap:clamp(2rem, 5vw, 3.5rem); }
  :global(.profile-portfolio:has(.illustrated-decoration, .sakura-petals) .profile-portfolio__avatar-shell) { margin:1.5rem 0 2.5rem 1rem; }
</style>
