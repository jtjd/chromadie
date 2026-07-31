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

  let detailsOpen = true;

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
  {#if result}
    <div class="today-color__result-head">
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
        <div class="today-color__identity-row">
          <strong>{safeHex}</strong>
          <span class="today-color__rarity">{rarity}</span>
        </div>
        {#if score}<p class="today-color__score">{score.toLocaleString()} <span>EP</span></p>{/if}
      </div>
    </div>

    {#if headlineConditions.length}
      <div class="today-color__condition-rail" aria-label="Top scoring conditions">
        <div class="today-color__condition-list">
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
      </div>
    {/if}

    <details class="today-color__details" bind:open={detailsOpen}>
      <summary>{detailsOpen ? 'Collapse score breakdown' : 'View score breakdown'}</summary>
      <div class="today-color__details-body">
        <div class="today-color__story">
          <div>
            <p class="today-color__label">Color story</p>
            <h3>{title}</h3>
            <p>This color is part of the public story of this profile.</p>
          </div>
        </div>
        {#if conditionSource.length}
          <div class="today-color__conditions" aria-label="Recorded score conditions">
            <div class="today-color__section-heading">
              <div>
                <p class="today-color__label">Condition and reward record</p>
                <h3>What the color revealed</h3>
              </div>
              <span>{conditionSource.length} recorded</span>
            </div>
            <div class="today-color__condition-records">
              {#each conditionSource as condition (condition.id)}
                <div class="today-color__condition-record">
                  <span aria-hidden="true">{condition.symbol}</span>
                  <strong>{condition.label}</strong>
                  {#if condition.points}<small>+{condition.points.toLocaleString()} reported score</small>{/if}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="today-color__empty">No named conditions were returned for this color.</div>
        {/if}
      </div>
    </details>
  {:else}
    <div class="today-color__empty-state">
      <div class="today-color__preview" aria-hidden="true">
        <RollPreview effectCls={rollEffect.cls} effectStyle={rollEffect.style} orbCls={orbEffect.cls} displayColor={safeHex} rarity="Common" />
      </div>
      <div class="today-color__copy">
        <p class="today-color__label">{quiet ? 'Daily color' : 'Today’s color'}</p>
        <strong>{quiet ? 'No color yet' : 'The story is about to begin'}</strong>
        <p class="today-color__meta">No public roll yet.</p>
        {#if !quiet}<p class="today-color__next">The first color will leave the opening mark.</p>{/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .today-color { display: grid; gap: 1rem; min-width: 0; }
  .today-color__result-head { display: grid; grid-template-columns: minmax(7rem, 9rem) 1fr; align-items: center; gap: var(--space-5); }
  .today-color__preview { position: relative; display: grid; place-items: center; width: 8rem; height: 8rem; }
  .today-color__preview :global(.roll-effect-wrapper) { width: 8rem; height: 8rem; }
  .today-color__preview :global(.final-color-display) { width: 8rem; height: 8rem; }
  .today-color__copy { min-width: 0; }
  .today-color__label { margin: 0; color: color-mix(in srgb, var(--profile-accent) 48%, white); font: 700 0.68rem / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .today-color__identity-row { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.45rem; }
  .today-color__copy strong { display: block; color: rgba(248,250,255,0.98); font: 600 clamp(1.9rem, 3vw, 2.45rem) / 1.08 var(--font-display-stack); letter-spacing: -0.035em; overflow-wrap: anywhere; }
  .today-color__rarity { padding: 0.25rem 0.55rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 55%, transparent); border-radius: var(--radius-pill); color: color-mix(in srgb, var(--profile-accent) 70%, white); font: 700 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .today-color__meta { margin: 0.48rem 0 0; color: rgba(220,230,248,0.72); font: 600 0.75rem / 1.35 var(--font-mono-stack); letter-spacing: 0.03em; }
  .today-color__score { margin: 0.55rem 0 0; color: rgba(248,250,255,0.96); font: 700 clamp(2rem, 4vw, 3.5rem) / 1 var(--font-display-stack); letter-spacing: -0.04em; }
  .today-color__score span { color: rgba(220,230,248,0.58); font: 600 0.65rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .today-color__condition-rail { display: grid; gap: 0.65rem; padding: 0; }
  .today-color__condition-list { display: flex; flex-wrap: wrap; gap: 0.45rem; }
  .today-color__condition-chip { display: inline-flex; align-items: center; gap: 0.38rem; min-width: 0; padding: 0.32rem 0.55rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 22%, var(--color-line-subtle)); border-radius: var(--radius-pill); background: color-mix(in srgb, var(--profile-accent) 8%, transparent); color: var(--color-ink-muted); font-size: var(--type-label); }
  .today-color__condition-chip strong { max-width: 12rem; overflow: hidden; color: var(--color-ink-strong); font-size: var(--type-label); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .today-color__condition-chip small { color: color-mix(in srgb, var(--profile-accent) 72%, white); font-size: 0.62rem; white-space: nowrap; }
  .today-color__condition-more { border-style: dashed; color: var(--color-ink-faint); }
  .today-color__details { display: grid; gap: var(--space-4); margin-top: var(--space-2); padding-top: 0.7rem; border-top: 1px solid var(--color-line-subtle); }
  .today-color__details summary { color: color-mix(in srgb, var(--profile-accent) 48%, white); cursor: pointer; font: 700 0.68rem / 1.2 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .today-color__details summary:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 4px; border-radius: var(--radius-sm); }
  .today-color__details-body { display: grid; gap: var(--space-5); padding-top: var(--space-2); }
  .today-color__story, .today-color__conditions { padding: var(--space-5); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-inset); }
  .today-color__story h3, .today-color__section-heading h3 { margin: 0.35rem 0 0; color: var(--color-ink-strong); font: 600 1.2rem / 1.05 var(--font-display-stack); letter-spacing: -0.035em; }
  .today-color__story p:not(.today-color__label) { margin: 0.55rem 0 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.5; }
  .today-color__section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
  .today-color__section-heading > span { color: var(--color-ink-muted); font: var(--type-label) / 1 var(--font-mono-stack); }
  .today-color__condition-records { display: grid; gap: var(--space-2); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-line-subtle); }
  .today-color__condition-record { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: var(--surface-panel-soft); color: var(--color-ink-muted); font-size: var(--type-label); }
  .today-color__condition-record strong { color: var(--color-ink); font-size: var(--type-small); }
  .today-color__condition-record small { color: var(--color-earned); font: var(--type-label) / 1.2 var(--font-mono-stack); }
  .today-color__empty, .today-color__empty-state { color: var(--color-ink-muted); font-size: var(--type-small); }
  .today-color__empty { padding: var(--space-4); border: 1px dashed var(--color-line-subtle); border-radius: var(--radius-sm); }
  .today-color__empty-state { display: grid; grid-template-columns: 8rem minmax(0, 1fr); align-items: center; gap: 1.5rem; }
  .today-color__next { margin: 0.5rem 0 0; color: rgba(220,230,248,0.56); font-size: 0.875rem; line-height: 1.4; }
  @media (max-width: 36rem) { .today-color__result-head { grid-template-columns: 5.5rem minmax(0, 1fr); gap: 0.85rem; } .today-color__preview, .today-color__preview :global(.roll-effect-wrapper), .today-color__preview :global(.final-color-display) { width: 5.5rem; height: 5.5rem; } .today-color__copy strong { font-size: 1.35rem; } .today-color__condition-chip strong { max-width: 8rem; } .today-color__empty-state { grid-template-columns: 5.5rem minmax(0, 1fr); gap: 0.85rem; } .today-color__condition-record { grid-template-columns: auto 1fr; } .today-color__condition-record small { grid-column: 2; } }
</style>
