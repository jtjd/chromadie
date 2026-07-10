<script>
  export let effectCls = '';
  export let effectStyle = '';
  export let orbCls = '';
  export let displayColor = '#333333';
  export let rarity = 'Common';
  export let size = 'game';
</script>

<div class="roll-effect-wrapper {effectCls} {size === 'shop' ? 'roll-preview-wrapper' : ''}" style={effectStyle}>
  <div class="final-color-display rarity-{rarity} {orbCls}" style="background-color: {displayColor};"></div>
</div>
