<script>
  import RollPreview from './RollPreview.svelte';
  import HomeReferenceRollGlyph from './HomeReferenceRollGlyph.svelte';

  export let displayColor = '#7B5CFF';
  export let rarity = 'Common';
  export let effectCls = '';
  export let effectStyle = '';
  export let orbCls = '';
  export let size = '3.5rem';
  export let scale = 0.34;
  export let staticEffect = false;
  export let referenceShape = false;

  $: previewStyle = `--compact-roll-size: ${size}; --compact-roll-scale: ${scale};`;
</script>

<div class:compact-roll-preview--static={staticEffect} class="compact-roll-preview" style={previewStyle} aria-hidden="true">
  {#if referenceShape}
    <div class="roll-effect-wrapper {effectCls}" style={effectStyle}>
      <HomeReferenceRollGlyph {displayColor} {rarity} />
    </div>
  {:else}
    <RollPreview
      {effectCls}
      {effectStyle}
      {orbCls}
      {displayColor}
      {rarity}
      size="game"
    />
  {/if}
</div>

<style>
  .compact-roll-preview {
    position: relative;
    display: grid;
    place-items: center;
    flex: 0 0 var(--compact-roll-size);
    width: var(--compact-roll-size);
    height: var(--compact-roll-size);
    overflow: visible;
  }

  .compact-roll-preview :global(.roll-effect-wrapper) {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 140px;
    height: 140px;
    transform: translate(-50%, -50%) scale(var(--compact-roll-scale));
    transform-origin: center;
  }

  .compact-roll-preview--static :global(*) {
    animation: none !important;
    transition: none !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .compact-roll-preview :global(*) {
      animation: none !important;
      transition-duration: 0.001ms !important;
    }
  }
</style>
