<script>
  import { normalizeHexColor } from './utils.js';

  export let items = [];
  export let samples = [];
  export let accentColor = '#8B7CF6';
  export let totalCount = 66;
  export let unlocked = false;
  export let rollsRequired = 10;
  export let totalRolls = 0;

  $: featured = Array.isArray(items) ? items[0] || null : null;
  $: safeSamples = (Array.isArray(samples) ? samples : [])
    .map(sample => normalizeHexColor(sample?.hex_code, accentColor))
    .filter(Boolean)
    .slice(0, 8);
  $: collectedCount = Array.isArray(items) ? items.length : 0;
  $: hasSamples = safeSamples.length > 0;
</script>

<section class="featured-collection" aria-labelledby="featured-collection-title" aria-label={'Color archive; ' + totalRolls + ' of ' + rollsRequired + ' daily colors recorded'}>
  <div class="featured-collection__heading">
    <div>
      <p class="featured-collection__label">Collection</p>
      <h2 id="featured-collection-title">Color archive</h2>
    </div>
    <strong>{collectedCount}/{totalCount}</strong>
  </div>

  {#if unlocked && featured}
    <div class="featured-collection__detail">
      <span class="featured-collection__icon" aria-hidden="true">{featured.icon}</span>
      <div>
        <strong>{featured.name}</strong>
        <p>{featured.rarity} · {featured.count} {featured.count === 1 ? 'discovery' : 'discoveries'}</p>
      </div>
    </div>
  {:else if !hasSamples}
    <p class="featured-collection__empty">A small archive, gathering quietly.</p>
  {/if}

  <div class="featured-collection__samples" aria-label="Collected color samples">
    {#if safeSamples.length}
      {#each safeSamples as color, index (color + index)}
        <span style={'--sample-color: ' + color + ';'} title={color}></span>
      {/each}
    {:else}
      {#each [0, 1, 2, 3, 4, 5] as index (index)}
        <span class="featured-collection__sample--empty" style={'--sample-color: ' + accentColor + '; opacity: ' + Math.max(0.12, 0.24 - index * 0.02) + ';'}></span>
      {/each}
    {/if}
  </div>
</section>

<style>
  .featured-collection { min-width: 0; }
  .featured-collection__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .featured-collection__label { margin: 0; color: color-mix(in srgb, var(--profile-accent) 48%, white); font: 700 0.68rem / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .featured-collection h2 { margin: 0.38rem 0 0; color: rgba(241,246,255,0.92); font: 600 1rem / 1.15 var(--font-display-stack); letter-spacing: -0.02em; }
  .featured-collection__heading > strong { color: rgba(230,238,252,0.72); font: 600 0.75rem / 1 var(--font-mono-stack); white-space: nowrap; }
  .featured-collection__detail { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: 0.7rem; margin-top: 0.85rem; }
  .featured-collection__icon { display: grid; place-items: center; width: 1.9rem; aspect-ratio: 1; border: 1px solid color-mix(in srgb, var(--profile-accent) 28%, transparent); border-radius: 0.65rem; background: color-mix(in srgb, var(--profile-accent) 11%, transparent); color: color-mix(in srgb, var(--profile-accent) 82%, white); }
  .featured-collection__detail strong { color: rgba(241,246,255,0.9); font-size: 0.85rem; }
  .featured-collection__detail p, .featured-collection__empty { margin: 0.22rem 0 0; color: rgba(220,230,248,0.62); font-size: 0.875rem; line-height: 1.45; }
  .featured-collection__empty { margin-top: 0.82rem; }
  .featured-collection__samples { display: flex; gap: 0.4rem; margin-top: 0.95rem; }
  .featured-collection__samples span { display: block; flex: 1 1 0; min-width: 1.1rem; height: 0.42rem; border-radius: 999px; background: var(--sample-color); box-shadow: 0 0 0.85rem color-mix(in srgb, var(--sample-color) 38%, transparent); }
  .featured-collection__samples .featured-collection__sample--empty { box-shadow: none; }
</style>
