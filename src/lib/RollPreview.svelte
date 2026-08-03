<script>
  export let displayColor = '#7B5CFF';
  export let rarity = 'Epic';
  export let size = 'game';
</script>

<div class="roll-preview-frame {size === 'shop' ? 'roll-preview-scale' : ''}">
  <div class="final-color-display rarity-{rarity}" style="background-color: {displayColor};"></div>
</div>
