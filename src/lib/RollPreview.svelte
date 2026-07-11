<script>
  export let effectCls = '';
  export let effectStyle = '';
  export let orbCls = '';
  export let displayColor = '#7B5CFF';
  export let rarity = 'Epic';
  export let size = 'game';
</script>

<div class="roll-effect-wrapper {effectCls} {size === 'shop' ? 'roll-preview-wrapper' : ''}" style={effectStyle}>
  <div class="final-color-display rarity-{rarity} {orbCls}" style="background-color: {displayColor};"></div>
</div>
