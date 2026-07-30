<script>
  import { normalizeHexColor } from './utils.js';

  /** @type {Record<string, any> | null} */
  export let result = null;
  export let quiet = false;
  export let accentColor = '#8B7CF6';

  $: safeHex = normalizeHexColor(result?.hex_code, accentColor);
  $: title = result?.identity || 'The latest color';
  $: rarity = result?.rarity || 'Unranked';
  $: score = Number(result?.score) || 0;
</script>

<div class={'today-color' + (quiet ? ' today-color--quiet' : '')} aria-label={result ? 'Latest canonical color' : 'No color rolled yet'}>
  <div class="today-color__orb" style={'--today-color: ' + safeHex + ';'} aria-hidden="true">
    <span></span>
  </div>
  <div class="today-color__copy">
    <p class="today-color__label">{quiet ? 'Daily color' : 'Today’s color'}</p>
    {#if result}
      <strong>{quiet ? safeHex : title}</strong>
      <p class="today-color__meta">{quiet ? rarity : safeHex + ' · ' + rarity}{#if score} · {score.toLocaleString()} EP{/if}</p>
      {#if !quiet}<p class="today-color__next">Next color arrives tomorrow.</p>{/if}
    {:else}
      <strong>{quiet ? 'No color yet' : 'The story is about to begin'}</strong>
      <p class="today-color__meta">No public roll yet.</p>
      {#if !quiet}<p class="today-color__next">The first color will leave the opening mark.</p>{/if}
    {/if}
  </div>
</div>

<style>
  .today-color { display: grid; grid-template-columns: 4.5rem minmax(0, 1fr); align-items: center; gap: 1rem; min-width: 0; }
  .today-color__orb { position: relative; display: grid; place-items: center; width: 4.5rem; aspect-ratio: 1; border: 1px solid rgba(248, 251, 255, 0.3); border-radius: 50%; background: radial-gradient(circle at 32% 26%, rgba(255,255,255,0.62), var(--today-color) 56%, rgba(0,0,0,0.42) 100%); box-shadow: 0 0 2.8rem color-mix(in srgb, var(--today-color) 62%, transparent), inset 0 0.18rem 0.45rem rgba(255,255,255,0.3); }
  .today-color__orb span { width: 0.62rem; aspect-ratio: 1; border-radius: 50%; background: rgba(255,255,255,0.74); filter: blur(1px); }
  .today-color__copy { min-width: 0; }
  .today-color__label { margin: 0; color: color-mix(in srgb, var(--profile-accent) 48%, white); font: 700 0.68rem / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .today-color__copy strong { display: block; margin-top: 0.4rem; color: rgba(248,250,255,0.98); font: 600 clamp(1.25rem, 3vw, 1.5rem) / 1.08 var(--font-display-stack); letter-spacing: -0.035em; overflow-wrap: anywhere; }
  .today-color__meta { margin: 0.48rem 0 0; color: rgba(220,230,248,0.72); font: 600 0.75rem / 1.35 var(--font-mono-stack); letter-spacing: 0.03em; }
  .today-color__next { margin: 0.5rem 0 0; color: rgba(220,230,248,0.56); font-size: 0.875rem; line-height: 1.4; }
  @media (max-width: 36rem) { .today-color { grid-template-columns: 4.25rem minmax(0, 1fr); gap: 0.85rem; } .today-color__orb { width: 4.25rem; } .today-color__copy strong { font-size: 1.25rem; } }
</style>
