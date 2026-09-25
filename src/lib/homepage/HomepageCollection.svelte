<script>
  import { getBadgeMeta } from '../badgeData.js';
  import { getRarityPresentation } from '../rarityPresentation.js';
  import { onMount } from 'svelte';
  import { getNameMaterial } from '../name/nameMaterials.js';

  const conditions = ['sum_255', 'sum_69', 'sum_42'].map(id => ({ id, ...getBadgeMeta(id) }));
  const materials = ['glass_emboss', 'neon_tube', 'blueprint_ink'].map(key => {
    const id = `name_material_${key}`;
    return { id, ...getNameMaterial(id) };
  });
  let selectedCondition = 1;
  let selectedMaterial = 0;
  let previewHost;
  let nameRenderer = null;
  let previewFailed = false;
  onMount(() => {
    let disposed = false;
    const load = async () => {
      try {
        const module = await import('../name/NameEffectCanvas.svelte');
        if (!disposed) nameRenderer = module.default;
      } catch {
        if (!disposed) previewFailed = true;
      }
    };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        void load();
      }
    }, { rootMargin: '400px' }) : null;
    if (observer) observer.observe(previewHost);
    else void load();
    return () => { disposed = true; observer?.disconnect(); };
  });
  $: condition = conditions[selectedCondition];
  $: rarity = getRarityPresentation(condition.rarity);
  $: material = materials[selectedMaterial];
</script>

<section class="homepage-section homepage-collection" id="how" data-homepage-reveal aria-labelledby="collection-title">
  <div class="collection-story">
    <div class="collection-story__copy">
      <h2 class="homepage-section-heading" id="collection-title">Every color has<br />more to discover.</h2>
      <p>Look beyond the hex code. Every roll has hidden patterns to find, rare conditions to collect, and something new to add to your profile.</p>
      <a href="/how-to-play">See how discoveries work</a>
    </div>
    <div class="collection-discovery" style={`--discovery-color:${rarity.color}`}>
      <div class="collection-discovery__top">Explore a few discoveries</div>
      <div class="collection-discovery__scene" aria-hidden="true">
        {#key condition.id}
          <img class="collection-discovery__art" src={`/homepage/condition-${condition.id}-flat-v2.webp`} alt="" width="256" height="256" loading="lazy" decoding="async" />
        {/key}
      </div>
      <div class="collection-discovery__detail" aria-live="polite" aria-atomic="true">
        <span class="collection-discovery__rarity">{condition.rarity} condition</span>
        <h3>{condition.name}</h3>
        <p>{condition.desc}</p>
      </div>
      <div class="collection-discovery__choices" role="group" aria-label="Explore example discoveries">
        {#each conditions as item, index (item.id)}
          <button type="button" aria-pressed={selectedCondition === index} on:click={() => selectedCondition = index}>
            <span>{item.name}</span>
          </button>
        {/each}
      </div>
      <p class="collection-discovery__note">Example discoveries. Keep rolling to find your own.</p>
    </div>
  </div>
  <div class="collection-expression">
    <div class="collection-expression__copy">
      <h3>Put your name on it.</h3>
      <p>Choose a finish that feels like you.<br />Try a few of the available name styles.</p>
      <div class="collection-expression__choices" role="group" aria-label="Try a name material">
        {#each materials as item, index (item.id)}
          <button type="button" aria-pressed={selectedMaterial === index} on:click={() => selectedMaterial = index}>
            <span class="collection-expression__swatch" style={`--swatch:${item.colors[0]}`} aria-hidden="true"></span>
            {item.label}
          </button>
        {/each}
      </div>
    </div>
    <figure bind:this={previewHost} class="collection-expression__preview" aria-label="Example name with selected material">
      <div class="collection-expression__name">
        {#key material.id}
          <div class="collection-expression__reveal">
            {#if nameRenderer}
              <svelte:component this={nameRenderer} text="Mira" loadout={{ materialKey: material.id }} todayColor="#FF38BD" context="profile" mode="static" semanticClass="profile-name" />
            {:else}
              <span class="profile-name">Mira</span>
            {/if}
          </div>
        {/key}
      </div>
      <figcaption aria-live="polite">{#if previewFailed}Preview couldn’t load. <button type="button" on:click={() => window.location.reload()}>Reload preview</button>{:else if !nameRenderer}Loading name preview…{:else}{material.label}<span class="collection-expression__separator" aria-hidden="true">·</span>Example name{/if}</figcaption>
    </figure>
  </div>
</section>

<style>
  .collection-story { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(48px, 8vw, 112px); align-items: center; }
  .collection-story__copy { max-width: 440px; }
  .collection-story__copy h2 { margin: 0 0 24px; }
  .collection-story__copy p { color: var(--homepage-secondary-muted); font-size: 1rem; line-height: 1.8; margin: 0; }
  .collection-story__copy a { display: inline-flex; align-items: center; min-height: 44px; margin-top: 24px; font-size: .875rem; text-underline-offset: 6px; text-decoration-color: var(--homepage-muted); }
  .collection-discovery { min-width: 0; padding: 24px 28px; border: 1px solid var(--homepage-border); border-radius: var(--homepage-radius); background: var(--homepage-panel); }
  .collection-discovery__top { color: var(--homepage-muted); font-size: .8125rem; }
  .collection-discovery__scene { display: grid; place-items: center; height: 232px; }
  .collection-discovery__art { width: 208px; height: 208px; object-fit: contain; animation: discovery-arrive 300ms ease-out both; }
  .collection-discovery__detail { text-align: center; min-height: 108px; }
  .collection-discovery__rarity { color: var(--discovery-color); font-size: .8125rem; }
  .collection-discovery__detail h3 { margin: 10px 0; font: 600 1.8rem / 1.15 var(--homepage-display); letter-spacing: -.035em; }
  .collection-discovery__detail p { color: var(--homepage-secondary-muted); font-size: .875rem; margin: 0; line-height: 1.6; }
  .collection-discovery__choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin-top: 24px; border-top: 1px solid var(--homepage-border); }
  button { color: var(--homepage-secondary-muted); cursor: pointer; font: inherit; -webkit-tap-highlight-color: transparent; }
  .collection-discovery__choices button { min-width: 0; min-height: 52px; padding: 12px 4px; border: 0; border-bottom: 2px solid transparent; background: transparent; font-size: .8125rem; line-height: 1.4; transition: border-color 180ms ease, color 180ms ease; }
  .collection-discovery__choices button[aria-pressed='true'] { color: var(--homepage-text); border-bottom-color: var(--homepage-text); }
  button:hover { color: var(--homepage-text); }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--homepage-text); outline-offset: 4px; }
  .collection-discovery__note { margin: 18px 0 0; text-align: center; color: var(--homepage-muted); font-size: .75rem; line-height: 1.6; }
  .collection-expression { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; margin-top: 64px; padding-top: 48px; border-top: 1px solid var(--homepage-border); }
  .collection-expression h3 { margin: 0 0 12px; font: 600 1.75rem / 1.2 var(--homepage-display); letter-spacing: -.03em; }
  .collection-expression__copy p { color: var(--homepage-secondary-muted); font-size: .9375rem; line-height: 1.7; margin: 0; }
  .collection-expression__choices { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
  .collection-expression__choices button { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 9px 12px; border: 1px solid var(--homepage-border); border-radius: 6px; background: transparent; font-size: .8125rem; transition: border-color 180ms ease, color 180ms ease; }
  .collection-expression__choices button[aria-pressed='true'] { border-color: var(--homepage-secondary); color: var(--homepage-text); }
  .collection-expression__swatch { width: 10px; height: 10px; border-radius: 50%; background: var(--swatch); }
  .collection-expression__preview { min-width: 0; margin: 0; text-align: center; }
  .collection-expression__name { display: grid; place-items: center; min-height: 155px; }
  .collection-expression__reveal { animation: signature-arrive 240ms ease-out both; }
  .collection-expression__name :global(.profile-name) { font-size: clamp(4.5rem, 7vw, 6.5rem); line-height: 1.2; }
  figcaption { color: var(--homepage-muted); font-size: .8125rem; margin-top: 8px; }
  .collection-expression__separator { margin-inline: .5em; }
  figcaption button { min-height: 44px; background: transparent; border: 0; text-decoration: underline; }
  @keyframes discovery-arrive { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
  @keyframes signature-arrive { from { opacity: 0; } to { opacity: 1; } }
  @media (max-width: 980px) {
    .collection-story { gap: 40px; grid-template-columns: 1fr 1fr; }
    .collection-discovery { padding: 20px; }
  }
  @media (max-width: 700px) {
    .collection-story { grid-template-columns: 1fr; gap: 32px; }
    .collection-story__copy a { margin-top: 16px; }
    .collection-discovery { padding: 20px 16px; }
    .collection-discovery__scene { height: 212px; }
    .collection-discovery__art { width: 192px; height: 192px; }
    .collection-discovery__detail h3 { font-size: 1.7rem; }
    .collection-discovery__choices button { font-size: .75rem; }
    .collection-expression { grid-template-columns: 1fr; gap: 32px; margin-top: 40px; padding-top: 40px; }
    .collection-expression__choices { gap: 6px; }
    .collection-expression__choices button { padding-inline: 10px; font-size: .75rem; }
    .collection-expression__name { min-height: 150px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .collection-discovery__art, .collection-expression__reveal { animation: none; }
    .collection-discovery__choices button, .collection-expression__choices button { transition: none; }
  }
</style>
