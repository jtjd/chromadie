<script>
  import NameEffectCanvas from './NameEffectCanvas.svelte';
  import { NAME_FONTS } from './nameFonts.js';
  import { NAME_MATERIALS } from './nameMaterials.js';
  import { NAME_MOTIONS } from './nameMotions.js';

  /**
   * Internal D1 review surface. It is intentionally not imported by a
   * production route. Cards use static signatures by default so opening the
   * gallery cannot create dozens of independent animation loops.
   */
  export let text = 'Chromadie';
  export let todayColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'static-signature';
  export let compact = false;

  let activeLayer = 'fonts';
  let selectedFont = 'soft-grotesk';
  let selectedMaterial = 'plain';
  let selectedMotion = 'none';

  const layerLabels = Object.freeze({ fonts: 'Fonts', materials: 'Materials', motions: 'Motion' });
  const descriptions = Object.freeze({
    fonts: 'The structural voice of the username.',
    materials: 'Surface, edge, light, print, and daily-color behavior.',
    motions: 'Bounded movement driven by the shared animation clock.'
  });

  const fonts = Object.values(NAME_FONTS);
  const materials = Object.values(NAME_MATERIALS).filter(definition => definition.composable);
  const motions = Object.values(NAME_MOTIONS).filter(definition => definition.key === 'none' || definition.composable);
  $: activeDefinitions = activeLayer === 'fonts' ? fonts : activeLayer === 'materials' ? materials : motions;
  $: cardMode = mode === 'animated' ? 'static-signature' : mode;

  function labelFor(definition) {
    if (definition.label) return definition.label;
    return definition.key
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function metadataFor(definition) {
    const catalogDefinition = /** @type {{ collection?: string, rarity?: string }} */ (definition);
    return {
      collection: catalogDefinition.collection || 'Baseline',
      rarity: catalogDefinition.rarity || 'Free'
    };
  }

  function selected(definition) {
    if (activeLayer === 'fonts') return selectedFont === definition.key;
    if (activeLayer === 'materials') return selectedMaterial === definition.key;
    return selectedMotion === definition.key;
  }

  function select(definition) {
    if (activeLayer === 'fonts') selectedFont = definition.key;
    else if (activeLayer === 'materials') selectedMaterial = definition.key;
    else selectedMotion = definition.key;
  }

  function isolatedLoadout(definition) {
    if (activeLayer === 'fonts') return { fontKey: definition.key, materialKey: 'plain', motionKey: 'none' };
    if (activeLayer === 'materials') return { fontKey: 'soft-grotesk', materialKey: definition.key, motionKey: 'none' };
    return { fontKey: 'soft-grotesk', materialKey: 'plain', motionKey: definition.key };
  }
</script>

<section class="name-catalog-harness" aria-label="Internal composable Name catalog review">
  <header class="name-catalog-harness__header">
    <div>
      <span>Internal QA · Phase D1</span>
      <h1>Composable Name catalog</h1>
      <p>{descriptions[activeLayer]}</p>
    </div>
    <div class="name-catalog-harness__counts" aria-label="Registry counts">
      <span>{fonts.length} fonts</span>
      <span>{materials.length} materials</span>
      <span>{motions.length} motions</span>
    </div>
  </header>

  <nav class="name-catalog-harness__tabs" aria-label="Name catalog layers">
    {#each Object.entries(layerLabels) as [key, label] (key)}
      <button type="button" class:active={activeLayer === key} aria-current={activeLayer === key ? 'page' : undefined} on:click={() => activeLayer = key}>{label}</button>
    {/each}
  </nav>

  <div class="name-catalog-harness__workspace">
    <div class="name-catalog-harness__grid">
      {#each activeDefinitions as definition (definition.key)}
        <button type="button" class="name-catalog-harness__card" class:active={selected(definition)} on:click={() => select(definition)} aria-label={`Preview ${labelFor(definition)}`}>
          <div class="name-catalog-harness__card-head">
            <strong>{labelFor(definition)}</strong>
            <span>{definition.key}</span>
          </div>
          <div class="name-catalog-harness__preview">
            <NameEffectCanvas
              {text}
              {...isolatedLoadout(definition)}
              {todayColor}
              {recentColors}
              context="card"
              compact={true}
              mode={cardMode}
              semanticClass="profile-name"
            />
          </div>
          <div class="name-catalog-harness__meta">
            <span>{metadataFor(definition).collection}</span>
            <span>{metadataFor(definition).rarity}</span>
          </div>
        </button>
      {/each}
    </div>

    <aside class="name-catalog-harness__combined" aria-label="Combined composable preview">
      <div class="name-catalog-harness__combined-head">
        <div>
          <span>Combined loadout</span>
          <strong>{text}</strong>
        </div>
        <span>{mode}</span>
      </div>
      <div class="name-catalog-harness__large-preview">
        <NameEffectCanvas
          {text}
          fontKey={selectedFont}
          materialKey={selectedMaterial}
          motionKey={selectedMotion}
          {todayColor}
          {recentColors}
          context={compact ? 'card' : 'profile'}
          {compact}
          {mode}
          semanticTag="h2"
          semanticClass="profile-name"
        />
      </div>
      <dl>
        <div><dt>Font</dt><dd>{labelFor(NAME_FONTS[selectedFont])}</dd></div>
        <div><dt>Material</dt><dd>{labelFor(NAME_MATERIALS[selectedMaterial])}</dd></div>
        <div><dt>Motion</dt><dd>{labelFor(NAME_MOTIONS[selectedMotion])}</dd></div>
        <div><dt>Today</dt><dd>{todayColor}</dd></div>
        <div><dt>History</dt><dd>{recentColors.length || 0} colors</dd></div>
      </dl>
    </aside>
  </div>
</section>

<style>
  .name-catalog-harness { display:grid; gap:1rem; padding:1.25rem; color:#eef2ff; background:#0c1018; }
  .name-catalog-harness__header { display:flex; align-items:end; justify-content:space-between; gap:1rem; }
  .name-catalog-harness__header span, .name-catalog-harness__combined-head > div > span { color:#8ddcff; font:700 .62rem/1 var(--font-mono-stack); letter-spacing:.08em; text-transform:uppercase; }
  .name-catalog-harness h1 { margin:.4rem 0 0; font:700 1.6rem/1 var(--font-display-stack); }
  .name-catalog-harness__header p { margin:.55rem 0 0; color:#9aa6bc; font-size:.78rem; }
  .name-catalog-harness__counts { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:.4rem; }
  .name-catalog-harness__counts span { padding:.5rem .6rem; border:1px solid rgba(141,220,255,.18); border-radius:.3rem; color:#cdd2ff; font:600 .62rem var(--font-mono-stack); }
  .name-catalog-harness__tabs { display:flex; gap:.35rem; overflow-x:auto; border-bottom:1px solid rgba(255,255,255,.1); }
  .name-catalog-harness__tabs button { min-height:2.5rem; padding:0 .85rem; border:1px solid transparent; border-bottom:0; border-radius:.3rem .3rem 0 0; background:transparent; color:#8c96a9; cursor:pointer; }
  .name-catalog-harness__tabs button.active { border-color:rgba(141,220,255,.24); background:#171d28; color:#fff; }
  .name-catalog-harness__workspace { display:grid; grid-template-columns:minmax(0,1fr) minmax(17rem,25rem); gap:1rem; align-items:start; }
  .name-catalog-harness__grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(12rem,1fr)); gap:.65rem; min-width:0; }
  .name-catalog-harness__card { display:grid; gap:.55rem; min-width:0; padding:.75rem; border:1px solid rgba(141,220,255,.14); border-radius:.45rem; background:rgba(255,255,255,.035); color:inherit; text-align:left; cursor:pointer; }
  .name-catalog-harness__card:hover, .name-catalog-harness__card:focus-visible, .name-catalog-harness__card.active { border-color:#8ddcff; }
  .name-catalog-harness__card-head, .name-catalog-harness__meta { display:flex; align-items:baseline; justify-content:space-between; gap:.5rem; min-width:0; }
  .name-catalog-harness__card-head strong { overflow:hidden; color:#fff; font-size:.8rem; text-overflow:ellipsis; white-space:nowrap; }
  .name-catalog-harness__card-head span, .name-catalog-harness__meta { color:#77849d; font:600 .55rem var(--font-mono-stack); }
  .name-catalog-harness__preview { display:flex; align-items:center; justify-content:center; min-height:4.5rem; overflow:hidden; border:1px solid rgba(255,255,255,.08); border-radius:.3rem; background:#090b0f; }
  .name-catalog-harness__preview :global(.name-effect-canvas) { width:100%; text-align:center; }
  .name-catalog-harness__preview :global(.name-effect-canvas__semantic) { font-size:1rem; }
  .name-catalog-harness__combined { position:sticky; top:1rem; display:grid; gap:1rem; min-width:0; padding:1rem; border:1px solid rgba(141,220,255,.2); border-radius:.5rem; background:#0b0e15; }
  .name-catalog-harness__combined-head { display:flex; justify-content:space-between; gap:.75rem; }
  .name-catalog-harness__combined-head strong { display:block; margin-top:.4rem; color:#fff; font-size:1rem; }
  .name-catalog-harness__combined-head > span { color:#cdd2ff; font:600 .6rem var(--font-mono-stack); text-transform:uppercase; }
  .name-catalog-harness__large-preview { display:flex; align-items:center; justify-content:center; min-height:7rem; overflow:hidden; border:1px solid rgba(255,255,255,.08); background:#090b0f; }
  .name-catalog-harness__large-preview :global(.name-effect-canvas) { width:100%; text-align:center; }
  .name-catalog-harness__large-preview :global(.name-effect-canvas__semantic) { font-size:clamp(1.4rem,4vw,2.5rem); }
  .name-catalog-harness dl { display:grid; gap:.5rem; margin:0; }
  .name-catalog-harness dl div { display:flex; justify-content:space-between; gap:.75rem; padding-top:.5rem; border-top:1px solid rgba(255,255,255,.08); }
  .name-catalog-harness dt, .name-catalog-harness dd { margin:0; font:600 .62rem var(--font-mono-stack); }
  .name-catalog-harness dt { color:#77849d; text-transform:uppercase; }
  .name-catalog-harness dd { color:#dce6ff; text-align:right; }
  @media (max-width: 60rem) { .name-catalog-harness__workspace { grid-template-columns:1fr; } .name-catalog-harness__combined { position:relative; top:auto; order:-1; } }
  @media (max-width: 42rem) { .name-catalog-harness__header { align-items:flex-start; flex-direction:column; } .name-catalog-harness__counts { justify-content:flex-start; } }
</style>
