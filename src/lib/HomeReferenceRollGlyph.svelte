<script>
  import { normalizeHexColor } from './utils.js';

  export let displayColor = '#A9006D';
  export let rarity = 'Common';

  const instanceId = `home-roll-glyph-${Math.random().toString(36).slice(2)}`;
  const gradientAId = `${instanceId}-facet-a`;
  const gradientBId = `${instanceId}-facet-b`;
  const glowId = `${instanceId}-glow`;

  function hexToRgb(hex) {
    const normalized = normalizeHexColor(hex, '#A9006D').slice(1);
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16)
    };
  }

  function mix(hex, target, amount) {
    const source = hexToRgb(hex);
    const destination = hexToRgb(target);
    const channel = key => Math.round(source[key] + (destination[key] - source[key]) * amount).toString(16).padStart(2, '0');
    return `#${channel('r')}${channel('g')}${channel('b')}`;
  }

  $: color = normalizeHexColor(displayColor, '#A9006D');
  $: facetLight = mix(color, '#FFFFFF', 0.32);
  $: facetBright = mix(color, '#FFFFFF', 0.54);
  $: facetDark = mix(color, '#000000', 0.48);
  $: facetDeep = mix(color, '#000000', 0.68);
</script>

<svg class="home-reference-roll-glyph final-color-display rarity-{rarity}" viewBox="0 0 120 120" role="img" aria-label="Daily color effect">
  <defs>
    <linearGradient id={gradientAId} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color={facetLight} />
      <stop offset="1" stop-color={facetDeep} />
    </linearGradient>
    <linearGradient id={gradientBId} x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={facetBright} />
      <stop offset="1" stop-color={facetDark} />
    </linearGradient>
    <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="7" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <g filter={`url(#${glowId})`}>
    <polygon points="60,10 103,91 60,109 17,91" fill={`url(#${gradientAId})`} />
    <polygon points="60,10 60,109 17,91" fill={facetDeep} opacity="0.88" />
    <polygon points="60,10 103,91 60,72" fill={`url(#${gradientBId})`} />
    <polygon points="17,91 60,72 60,109" fill={facetDark} />
  </g>
</svg>

<style>
  .home-reference-roll-glyph.final-color-display { display: block; width: 100%; height: 100%; overflow: visible; border: 0; border-radius: 0; background: transparent !important; box-shadow: none; filter: saturate(0.95); animation: home-reference-glyph-float 5.2s ease-in-out infinite; transform-origin: 50% 58%; }
  @keyframes home-reference-glyph-float {
    0%, 100% { transform: translateY(0) rotate(-1deg); }
    50% { transform: translateY(-6px) rotate(1deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-reference-roll-glyph { animation: none; transition: none; }
  }
</style>
