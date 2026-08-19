<script>
  export let displayColor = '#28282c';
  export let rarity = 'Rare';
  export let idle = false;
  export let label = 'Rolled color';
</script>

<div
  class:roll-tile--idle={idle}
  class="roll-tile rarity-{rarity}"
  role="img"
  aria-label={idle ? 'Color waiting to be rolled' : `${label} ${displayColor}`}
  style={`--roll-tile-color: ${displayColor};`}
>
  <div class="roll-tile__surface" aria-hidden="true">
    <div class="roll-tile__face"></div>
  </div>
</div>
