<script>
  export let rankName = 'Unranked';
</script>

<svg class="progression-rank-badge" viewBox="0 0 96 96" role="img" aria-label={`${rankName} rank badge`} focusable="false">
  <path class="progression-rank-badge__ribbon" d="m28 48-6 38 26-13 26 13-6-38Z" />
  <path class="progression-rank-badge__ribbon-cut" d="m28 48 10 10-5 23-11 5Z" />
  <circle class="progression-rank-badge__outer" cx="48" cy="39" r="29" />
  <circle class="progression-rank-badge__inner" cx="48" cy="39" r="23" />
  <path class="progression-rank-badge__shield" d="M35 25h26v14c0 10-5.5 18-13 22-7.5-4-13-12-13-22Z" />
  <path class="progression-rank-badge__trophy" d="M40 31h16v7c0 5-3 8-8 8s-8-3-8-8Zm-5 1h5v5c0 3-2 5-5 5m26-10h-5v5c0 3 2 5 5 5M48 46v7m-7 5h14" />
</svg>

<style>
  .progression-rank-badge { display:block; width:100%; height:100%; overflow:visible; color:var(--progression-rank-accent,#FFD21C); filter:drop-shadow(0 0 .65rem color-mix(in srgb,var(--progression-rank-accent,#FFD21C) 34%,transparent)); }
  .progression-rank-badge__ribbon { fill:color-mix(in srgb,currentColor 68%,#111115); stroke:currentColor; stroke-linejoin:round; stroke-width:2.2; }
  .progression-rank-badge__ribbon-cut { fill:color-mix(in srgb,currentColor 32%,#111115); opacity:.9; }
  .progression-rank-badge__outer { fill:color-mix(in srgb,currentColor 17%,#111115); stroke:color-mix(in srgb,currentColor 86%,#fff); stroke-width:2.4; }
  .progression-rank-badge__inner { fill:var(--progression-page-panel,#111115); stroke:color-mix(in srgb,currentColor 52%,transparent); stroke-width:1.5; }
  .progression-rank-badge__shield { fill:color-mix(in srgb,currentColor 22%,#111115); stroke:currentColor; stroke-linejoin:round; stroke-width:1.8; }
  .progression-rank-badge__trophy { fill:none; stroke:color-mix(in srgb,currentColor 78%,#fff); stroke-linecap:round; stroke-linejoin:round; stroke-width:2.4; }
</style>
