<script>
  import { createEventDispatcher } from 'svelte';

  export let activeView = 'browse';
  export let activeSection = 'overview';
  export let activeNameLayer = 'all';
  export let ownedSection = 'all';
  export let catalogSections = [];
  export let nameLayers = [];
  export let ownedSections = [];

  const dispatch = createEventDispatcher();

  const views = Object.freeze([
    { id: 'browse', number: '01', label: 'Catalog', description: 'Find new pieces' },
    { id: 'collection', number: '02', label: 'Owned', description: 'Your collection' }
  ]);

  function chooseView(view) {
    dispatch('view', view);
  }

  function chooseSection(section) {
    dispatch('section', section);
  }

  function chooseNameLayer(layer) {
    dispatch('nameLayer', layer);
  }

  function chooseOwnedSection(section) {
    dispatch('ownedSection', section);
  }
</script>

<aside class="shop-rail" aria-label="Shop workspace navigation">
  <div class="shop-rail__heading">
    <span>Customize</span>
    <strong>{activeView === 'browse' ? '01' : '02'} <em>/</em> 02</strong>
  </div>

  <nav class="shop-rail__surface-nav" aria-label="Shop surfaces">
    {#each views as view (view.id)}
      <button
        type="button"
        class:active={activeView === view.id}
        aria-current={activeView === view.id ? 'page' : undefined}
        on:click={() => chooseView(view.id)}
      >
        <span class="shop-rail__number">{view.number}</span>
        <span class="shop-rail__copy"><strong>{view.label}</strong><small>{view.description}</small></span>
        <span class="shop-rail__arrow" aria-hidden="true">→</span>
      </button>
    {/each}
  </nav>

  <div class="shop-rail__divider"></div>

  {#if activeView === 'browse'}
    <div class="shop-rail__section-heading"><span>Catalog</span><strong>{activeSection === 'names' ? 'Name effects' : 'Browse pieces'}</strong></div>
    <nav class="shop-rail__section-nav" aria-label="Catalog categories">
      {#each catalogSections as section, index (section.id)}
        <button
          type="button"
          class:active={activeSection === section.id}
          aria-pressed={activeSection === section.id}
          on:click={() => chooseSection(section.id)}
        >
          <span class="shop-rail__number">{String(index + 1).padStart(2, '0')}</span>
          <span class="shop-rail__copy"><strong>{section.label}</strong><small>{section.description}</small></span>
          {#if Number.isFinite(section.count)}<span class="shop-rail__count">{section.count}</span>{/if}
        </button>
      {/each}
    </nav>

    {#if activeSection === 'names'}
      <div class="shop-rail__section-heading shop-rail__section-heading--nested"><span>Name layers</span><strong>Choose a layer</strong></div>
      <nav class="shop-rail__section-nav" aria-label="Name effect layers">
        {#each nameLayers as layer, index (layer.id)}
          <button
            type="button"
            class:active={activeNameLayer === layer.id}
            aria-pressed={activeNameLayer === layer.id}
            aria-label={`${layer.label}: ${layer.description}`}
            title={layer.description}
            on:click={() => chooseNameLayer(layer.id)}
          >
            <span class="shop-rail__number">{String(index + 1).padStart(2, '0')}</span>
            <span class="shop-rail__copy"><strong>{layer.label}</strong><small>{layer.description}</small></span>
            <span class="shop-rail__count">{layer.count}</span>
          </button>
        {/each}
      </nav>
    {/if}
  {:else}
    <div class="shop-rail__section-heading"><span>Owned</span><strong>Collection</strong></div>
    <nav class="shop-rail__section-nav" aria-label="Owned categories">
      {#each ownedSections as section, index (section.id)}
        <button
          type="button"
          class:active={ownedSection === section.id}
          aria-pressed={ownedSection === section.id}
          on:click={() => chooseOwnedSection(section.id)}
        >
          <span class="shop-rail__number">{String(index + 1).padStart(2, '0')}</span>
          <span class="shop-rail__copy"><strong>{section.label}</strong><small>{section.description}</small></span>
        </button>
      {/each}
    </nav>
  {/if}

  <div class="shop-rail__footer">
    <span class="shop-rail__live-dot" aria-hidden="true"></span>
    <div><strong>Profile is live</strong><small>Every piece can be previewed before purchase.</small></div>
  </div>
</aside>

<style>
  .shop-rail { position:sticky; top:1rem; z-index:2; min-width:0; border:1px solid var(--shop-line); border-radius:var(--radius-md); background:rgba(11,13,18,.7); box-shadow:0 1.5rem 4rem rgba(0,0,0,.16); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
  .shop-rail__heading { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:1rem 1rem .8rem; color:var(--shop-faint); font:700 .68rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-rail__heading strong { color:var(--shop-muted); font-weight:600; }
  .shop-rail__heading em { color:var(--shop-faint); font-style:normal; }
  .shop-rail__surface-nav, .shop-rail__section-nav { display:grid; gap:.2rem; padding:0 .45rem .65rem; }
  .shop-rail button { display:grid; grid-template-columns:1.65rem minmax(0,1fr) auto; align-items:center; gap:.55rem; min-width:0; width:100%; padding:.7rem .6rem; border:1px solid transparent; border-radius:var(--radius-sm); background:transparent; color:var(--shop-muted); text-align:left; cursor:pointer; transition:background-color .2s ease,border-color .2s ease,color .2s ease; }
  .shop-rail button:hover, .shop-rail button:focus-visible { border-color:var(--shop-line); background:rgba(255,255,255,.04); color:var(--shop-ink); }
  .shop-rail button.active { border-color:color-mix(in srgb,var(--shop-accent) 48%,var(--shop-line)); background:color-mix(in srgb,var(--shop-accent) 11%,transparent); color:var(--shop-ink); }
  .shop-rail__number { align-self:start; padding-top:.1rem; color:var(--shop-faint); font:600 .68rem/1 var(--shop-mono); }
  .shop-rail button.active .shop-rail__number { color:var(--shop-accent); }
  .shop-rail__copy { display:grid; gap:.25rem; min-width:0; }
  .shop-rail__copy strong { overflow:hidden; font:600 .78rem/1.1 var(--shop-font); text-overflow:ellipsis; white-space:nowrap; }
  .shop-rail__copy small { overflow:hidden; color:var(--shop-faint); font-size:.7rem; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
  .shop-rail__count { color:var(--shop-faint); font:600 .68rem/1 var(--shop-mono); }
  .shop-rail button.active .shop-rail__count { color:#e1ddff; }
  .shop-rail__arrow { color:var(--shop-faint); font-size:.9rem; opacity:0; transform:translateX(-.2rem); transition:opacity .2s ease,transform .2s ease; }
  .shop-rail button:hover .shop-rail__arrow, .shop-rail button.active .shop-rail__arrow { opacity:1; transform:translateX(0); }
  .shop-rail__divider { height:1px; margin:.1rem .9rem .8rem; background:var(--shop-line); }
  .shop-rail__section-heading { display:grid; gap:.3rem; padding:0 1rem .45rem; }
  .shop-rail__section-heading span { color:var(--shop-faint); font:700 .64rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-rail__section-heading strong { color:var(--shop-ink); font:650 .95rem/1.1 var(--shop-display); }
  .shop-rail__section-heading--nested { margin-top:.35rem; padding-top:.75rem; border-top:1px solid var(--shop-line); }
  .shop-rail__footer { display:flex; align-items:flex-start; gap:.6rem; margin:.35rem .9rem .9rem; padding-top:.8rem; border-top:1px solid var(--shop-line); }
  .shop-rail__live-dot { display:block; flex:0 0 .45rem; width:.45rem; height:.45rem; margin-top:.18rem; border-radius:50%; background:var(--shop-accent); box-shadow:0 0 0 .22rem color-mix(in srgb,var(--shop-accent) 14%,transparent); }
  .shop-rail__footer > div { display:grid; gap:.25rem; }
  .shop-rail__footer strong { color:var(--shop-muted); font-size:.72rem; font-weight:650; }
  .shop-rail__footer small { color:var(--shop-faint); font-size:.66rem; line-height:1.35; }
  @media (max-width: 1200px) { .shop-rail__copy small { display:none; } }
  @media (max-width: 760px) { .shop-rail { position:static; } .shop-rail__surface-nav, .shop-rail__section-nav { grid-template-columns:repeat(2,minmax(0,1fr)); } .shop-rail__footer { display:none; } }
  @media (prefers-reduced-motion: reduce) { .shop-rail button, .shop-rail__arrow { transition:none; } }
</style>
