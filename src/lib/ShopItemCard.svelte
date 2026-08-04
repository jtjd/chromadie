<script>
  import ShopItemPreview from './ShopItemPreview.svelte';
  import { createEventDispatcher } from 'svelte';

  export let item;
  export let isPreviewing = false;
  export let actuallyEquipped = false;
  export let previewUsername = 'You';
  export let previewColor = '#8B7CF6';

  const dispatch = createEventDispatcher();

  $: slotLabel = {
    name_font: 'Font',
    name_material: 'Material',
    name_motion: 'Motion',
    profile_border: 'Border',
    avatar_effect: 'Avatar',
    profile_atmosphere: 'Atmosphere',
    cursor_trail: 'Cursor',
    profile_layout: 'Layout',
    consumable: 'Utility'
  }[item?.slot] || 'Piece';

</script>

<article class="shop-item rarity-{item.rarity || 'Common'}" class:is-wearing={actuallyEquipped} class:is-previewing={isPreviewing}>
  <button class="item-select-button" type="button" aria-label={`Preview ${item.name} on your profile`} aria-pressed={isPreviewing} on:click={() => dispatch('select', item)}>
    <ShopItemPreview {item} username={previewUsername} displayColor={previewColor} active={isPreviewing} />
    <span class="item-card-heading">
      <span class="item-card-title">
        <span class="item-slot-label">{slotLabel}</span>
        <strong>{item.name}</strong>
      </span>
    </span>
  </button>

  <div class="item-card-meta">
    <div class="item-taxonomy">
      <span class="item-rarity rarity-{(item.rarity || 'Common').toLowerCase()}" aria-label={`Rarity: ${item.rarity || 'Common'}`}>{item.rarity || 'Common'}</span>
      <span class="item-taxonomy-divider" aria-hidden="true">·</span>
      <span class="item-collection">{item.collection || 'Core collection'}</span>
    </div>
    <div class="item-card-action">
      <button type="button" class="item-preview-action" aria-pressed={isPreviewing} on:click={() => dispatch('select', item)}>{isPreviewing ? 'Previewing' : 'Preview'}</button>
    </div>
  </div>
</article>

<style>
  .shop-item { min-width:0; display:flex; flex-direction:column; align-items:stretch; min-height:0; overflow:hidden; text-align:left; transition:transform .2s ease; }
  .shop-item:hover { transform:translateY(-2px); }
  :global(.app-main--site) .shop-item { padding:0; border:1px solid var(--shop-line, rgba(255,255,255,.075)); border-radius:var(--radius-sm, 8px); background:rgba(13,16,24,.72); box-shadow:none; }
  :global(.app-main--site) .shop-item:hover { border-color:color-mix(in srgb,var(--shop-accent) 36%,var(--shop-line)); background:rgba(15,18,27,.84); }
  .shop-item.is-wearing, .shop-item.is-previewing { border-color:color-mix(in srgb,var(--shop-accent) 58%,var(--shop-line)); }
  .shop-item.is-previewing { box-shadow:0 0 0 1px color-mix(in srgb,var(--shop-accent) 22%,transparent), 0 1rem 2.25rem rgba(0,0,0,.22); }
  .item-select-button { display:flex; flex:1 1 auto; flex-direction:column; min-width:0; width:100%; padding:0; border:0; background:transparent; color:inherit; cursor:pointer; text-align:left; }
  .item-select-button:focus-visible { outline:2px solid #cdd2ff; outline-offset:4px; border-radius:4px; }
  .item-card-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; width:auto; margin:.72rem .75rem 0; }
  .item-card-title { display:grid; min-width:0; gap:.15rem; }
  .item-card-title strong { overflow:hidden; color:var(--shop-ink, #f3f2f7); font:680 1.06rem/1.15 var(--shop-display, var(--font-display)); text-overflow:ellipsis; white-space:nowrap; }
  .item-slot-label { color:#8f929d; font:600 .62rem/1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.1em; text-transform:uppercase; }
  .item-select-button:hover .item-card-title strong, .item-select-button:focus-visible .item-card-title strong { color:#d7dbff; }
  .item-card-meta { display:flex; align-items:center; justify-content:space-between; gap:.65rem; width:auto; min-height:2rem; margin:.48rem .75rem .75rem; }
  .item-taxonomy { display:flex; align-items:center; flex-wrap:wrap; gap:.35rem; min-width:0; }
  .item-taxonomy-divider { color:#60636d; font:600 .76rem/1 var(--shop-mono, var(--font-mono-stack)); }
  .item-collection { overflow:hidden; min-width:0; color:#aaaab5; font:600 .74rem/1.1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.015em; text-overflow:ellipsis; white-space:nowrap; }
  .item-select-button :global(.shop-preview-area) { aspect-ratio:1.82 / 1; height:auto; margin-top:0; padding:0; border-radius:9px 9px 0 0; }
  .item-rarity { width:max-content; padding:0; border:0; border-radius:0; background:transparent; font:700 .67rem/1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.06em; text-transform:uppercase; }
  .rarity-common { color:#cdd0d8; }
  .rarity-uncommon { color:#b6e5d2; }
  .rarity-rare { color:#b7d2ff; }
  .rarity-epic { color:#dcc3ff; }
  .rarity-anomaly { color:#ffd09a; }
  .rarity-mythic { color:#ffb3d2; }
  .item-card-action { display:flex; flex:0 0 auto; justify-content:flex-end; min-width:0; }
  .item-preview-action { min-height:1.9rem; min-width:5.8rem; padding:0 .7rem; border:1px solid var(--shop-line-strong, rgba(255,255,255,.15)); border-radius:5px; background:rgba(255,255,255,.018); color:#aeb2bf; cursor:pointer; font:600 .68rem var(--shop-mono, var(--font-mono-stack)); }
  .item-preview-action:hover, .item-preview-action:focus-visible { border-color:color-mix(in srgb,var(--shop-accent) 58%,transparent); background:color-mix(in srgb,var(--shop-accent) 10%,transparent); color:#eeeaff; }
  .item-preview-action[aria-pressed="true"] { border-color:color-mix(in srgb,var(--shop-accent) 62%,transparent); background:color-mix(in srgb,var(--shop-accent) 14%,transparent); color:#e2dcff; }
  @media (max-width: 420px) { .item-card-meta { align-items:flex-start; flex-direction:column; } .item-card-action, .item-preview-action { width:100%; } }
  @media (prefers-reduced-motion: reduce) { .shop-item { transition:none; } .shop-item:hover { transform:none; } }
</style>
