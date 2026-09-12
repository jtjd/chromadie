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
