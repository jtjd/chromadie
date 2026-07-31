<script>
  import RollPreview from './RollPreview.svelte';
  import { getOrbShape, getRollEffect } from './cosmetics.js';
  import { getBadgeMeta } from './badgeData.js';
  import { normalizeHexColor } from './utils.js';

  /** @type {Record<string, any> | null} */
  export let result = null;
  export let quiet = false;
  export let accentColor = '#8B7CF6';
  export let cosmetics = {};

  $: safeHex = normalizeHexColor(result?.hex_code, accentColor);
  $: title = result?.identity || 'The latest color';
  $: rarity = result?.rarity || 'Unranked';
  $: score = Number(result?.score) || 0;
  $: orbEffect = getOrbShape(cosmetics);
  $: rollEffect = getRollEffect(cosmetics);
  $: conditionSource = Array.isArray(result?.contributors) && result.contributors.length
    ? result.contributors.map((contributor, index) => ({
        id: contributor?.id || `contributor-${index}`,
        label: contributor?.name || getBadgeMeta(contributor?.id).name || contributor?.id || 'Score condition',
        symbol: getBadgeMeta(contributor?.id).symbol || '✦',
        points: Number(contributor?.awardedPoints || contributor?.points) || 0
      }))
    : Array.isArray(result?.traits)
      ? result.traits.slice(0, 8).map((trait, index) => ({
          id: trait?.id || trait?.label || `trait-${index}`,
          label: trait?.label || trait?.name || trait?.id || 'Color trait',
          symbol: '✦',
          points: 0
        }))
      : [];
  $: headlineConditions = conditionSource.slice(0, 3);
</script>

<div class={'today-color' + (quiet ? ' today-color--quiet' : '')} aria-label={result ? 'Latest canonical color' : 'No color rolled yet'}>
  <div class="today-color__preview" aria-hidden="true">
    <RollPreview
      effectCls={rollEffect.cls}
      effectStyle={rollEffect.style}
      orbCls={orbEffect.cls}
      displayColor={safeHex}
      rarity={rarity === 'Unranked' ? 'Common' : rarity}
    />
  </div>
  <div class="today-color__copy">
      <p class="today-color__label">{quiet ? 'Daily color' : 'Today’s color'}</p>
    {#if result}
      <div class="today-color__identity-row">
        <strong>{quiet ? safeHex : title}</strong>
        <span class="today-color__rarity">{rarity}</span>
      </div>
      {#if score}<p class="today-color__score">{score.toLocaleString()} <span>EP</span></p>{/if}
      {#if headlineConditions.length}
        <div class="today-color__condition-list" aria-label="Top scoring conditions">
          {#each headlineConditions as condition (condition.id)}
            <span class="today-color__condition-chip">
              <span aria-hidden="true">{condition.symbol}</span>
              <strong>{condition.label}</strong>
              {#if condition.points}<small>+{condition.points.toLocaleString()}</small>{/if}
            </span>
          {/each}
          {#if conditionSource.length > headlineConditions.length}
            <span class="today-color__condition-chip today-color__condition-more">+{conditionSource.length - headlineConditions.length} more</span>
          {/if}
        </div>
      {/if}
      {#if !quiet}<p class="today-color__next">Next color arrives tomorrow.</p>{/if}
    {:else}
      <strong>{quiet ? 'No color yet' : 'The story is about to begin'}</strong>
      <p class="today-color__meta">No public roll yet.</p>
      {#if !quiet}<p class="today-color__next">The first color will leave the opening mark.</p>{/if}
    {/if}
  </div>
</div>

<style>
  .today-color { display: grid; grid-template-columns: 8rem minmax(0, 1fr); align-items: center; gap: 1.5rem; min-width: 0; }
  .today-color__preview { position: relative; display: grid; place-items: center; width: 8rem; height: 8rem; }
  .today-color__preview :global(.roll-effect-wrapper) { width: 8rem; height: 8rem; }
  .today-color__preview :global(.final-color-display) { width: 8rem; height: 8rem; }
  .today-color__copy { min-width: 0; }
  .today-color__label { margin: 0; color: color-mix(in srgb, var(--profile-accent) 48%, white); font: 700 0.68rem / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .today-color__identity-row { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.45rem; }
  .today-color__copy strong { display: block; color: rgba(248,250,255,0.98); font: 600 clamp(1.65rem, 3vw, 2rem) / 1.08 var(--font-display-stack); letter-spacing: -0.035em; overflow-wrap: anywhere; }
  .today-color__rarity { padding: 0.25rem 0.55rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 55%, transparent); border-radius: var(--radius-pill); color: color-mix(in srgb, var(--profile-accent) 70%, white); font: 700 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .today-color__meta { margin: 0.48rem 0 0; color: rgba(220,230,248,0.72); font: 600 0.75rem / 1.35 var(--font-mono-stack); letter-spacing: 0.03em; }
  .today-color__score { margin: 0.55rem 0 0; color: var(--color-earned); font: 700 clamp(1.7rem, 4vw, 2.25rem) / 1 var(--font-display-stack); letter-spacing: -0.04em; }
  .today-color__score span { color: color-mix(in srgb, var(--color-earned) 62%, var(--color-ink-muted)); font: 600 0.65rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .today-color__condition-list { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
  .today-color__condition-chip { display: inline-flex; align-items: center; gap: 0.38rem; min-width: 0; padding: 0.32rem 0.55rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 22%, var(--color-line-subtle)); border-radius: var(--radius-pill); background: color-mix(in srgb, var(--profile-accent) 8%, transparent); color: var(--color-ink-muted); font-size: var(--type-label); }
  .today-color__condition-chip strong { max-width: 12rem; overflow: hidden; color: var(--color-ink-strong); font-size: var(--type-label); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .today-color__condition-chip small { color: var(--color-earned); font-size: 0.62rem; white-space: nowrap; }
  .today-color__condition-more { border-style: dashed; color: var(--color-ink-faint); }
  .today-color__next { margin: 0.5rem 0 0; color: rgba(220,230,248,0.56); font-size: 0.875rem; line-height: 1.4; }
  @media (max-width: 36rem) { .today-color { grid-template-columns: 5.5rem minmax(0, 1fr); gap: 0.85rem; } .today-color__preview, .today-color__preview :global(.roll-effect-wrapper), .today-color__preview :global(.final-color-display) { width: 5.5rem; height: 5.5rem; } .today-color__copy strong { font-size: 1.35rem; } .today-color__condition-chip strong { max-width: 8rem; } }
</style>
