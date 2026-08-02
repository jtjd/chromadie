<script>
  import HomeReferenceRollGlyph from './HomeReferenceRollGlyph.svelte';

  export let effectCls = '';
  export let effectStyle = '';
  export let orbCls = '';
  export let displayColor = '#7B5CFF';
  export let rarity = 'Epic';
  export let size = 'game';

  $: usesReferenceGlyph = String(orbCls || '').split(/\s+/).some(className => className.startsWith('orb-shape-'));
</script>

<div class="roll-effect-wrapper {effectCls} {size === 'shop' ? 'roll-preview-wrapper' : ''}" style={effectStyle}>
  {#if usesReferenceGlyph}
    <HomeReferenceRollGlyph {displayColor} {rarity} />
  {:else}
    <div class="final-color-display rarity-{rarity} {orbCls}" style="background-color: {displayColor};"></div>
  {/if}
</div>
