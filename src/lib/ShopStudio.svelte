<script>
  import ShopStudioPreview from './ShopStudioPreview.svelte';
  import { SHOP_NAME_SLOTS, SHOP_SLOT_LABELS, hasShopEntitlement, isShopCosmetic } from './shopCatalog.js';
  import { applyNamePreviewLayer } from './name/nameLoadout.js';

  export let items = [];
  /** @type {any} */
  export let fittingRoom = {};
  /** @type {any} */
  export let equippedItems = {};
  /** @type {any} */
  export let profile = null;
  /** @type {any} */
  export let profileConfig = null;
  /** @type {any} */
  export let currentRoll = null;

  let draftLoadout = {};
  let syncedEquippedKey = '';
  const NAME_DEFAULT_LABELS = Object.freeze({
    name_font: 'Platform default font',
    name_material: 'Plain material',
    name_motion: 'Still motion'
  });
  const nameLayerSlots = SHOP_NAME_SLOTS;
  const SLOT_ORDER = Object.freeze(['profile_border']);

  $: equippedKey = JSON.stringify(equippedItems || {});
  $: syncEquippedLoadout(equippedKey);
  $: ownedItems = items.filter(item => {
    if (!isShopCosmetic(item)) return false;
    const ownedCount = fittingRoom.inventoryCounts?.[item.item_key] || 0;
    return ownedCount > 0 || equippedItems[item.slot] === item.item_key || (item.access_tier === 'premium' && hasShopEntitlement(item, fittingRoom));
  });
  $: slots = Object.keys(SHOP_SLOT_LABELS)
    .filter(slot => slot === 'profile_border' && (ownedItems.some(item => item.slot === slot) || equippedItems[slot]))
    .sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
  $: username = profile?.display_name || profile?.username || 'Your profile';
  $: displayColor = currentRoll?.hex_code || profile?.mood_color || '#8B7CF6';
  $: displayRarity = currentRoll?.rarity || 'Current roll';
  $: changed = JSON.stringify(draftLoadout) !== JSON.stringify(equippedItems || {});

  function itemsForSlot(slot) {
    return ownedItems.filter(item => item.slot === slot).sort((a, b) => a.name.localeCompare(b.name));
  }

  function syncEquippedLoadout(nextKey) {
    if (nextKey === syncedEquippedKey) return;
    draftLoadout = { ...(equippedItems || {}) };
    syncedEquippedKey = nextKey;
  }

  function updateSlot(slot, value) {
    draftLoadout = (SHOP_NAME_SLOTS.includes(slot))
      ? applyNamePreviewLayer(draftLoadout, slot, value)
      : { ...draftLoadout, ...(value ? { [slot]: value } : {}) };
    if (!value && !SHOP_NAME_SLOTS.includes(slot)) delete draftLoadout[slot];
  }

  function resetStudio() {
    draftLoadout = { ...(equippedItems || {}) };
  }
</script>

<section class="shop-studio" id="studio" aria-labelledby="shop-studio-title">
  <div class="shop-surface-heading">
    <div>
      <span class="shop-eyebrow">Temporary fitting room</span>
      <h2 id="shop-studio-title">Make a look, then take it to your profile.</h2>
      <p>Try combinations against your current profile. Nothing here saves or changes your equipped items.</p>
    </div>
    <a class="shop-button shop-button--outline" href="/profile/settings">Open profile customization ↗</a>
  </div>

  <div class="shop-studio-layout">
    <aside class="shop-studio-slots">
      <div class="shop-panel-heading"><span>Equipped slots</span><strong>{changed ? 'Unsaved preview' : 'Current look'}</strong></div>
      <div class="shop-studio-name">
        <div class="shop-studio-name-heading"><span>Name composition</span><strong>Three independent layers</strong><small>Defaults are always available and never create inventory rows.</small></div>
        {#each nameLayerSlots as slot (slot)}
          <label class="shop-slot-control">
            <span>{SHOP_SLOT_LABELS[slot]}</span>
            <select value={draftLoadout[slot] || ''} on:change={event => updateSlot(slot, event.currentTarget.value)}>
              <option value="">{NAME_DEFAULT_LABELS[slot]}</option>
              {#each itemsForSlot(slot) as item (item.item_key)}
                <option value={item.item_key}>{item.name}</option>
              {/each}
            </select>
            <small>{itemsForSlot(slot).length ? `${itemsForSlot(slot).length} owned option${itemsForSlot(slot).length === 1 ? '' : 's'}` : 'Unlock options in the shop'}</small>
          </label>
        {/each}
      </div>
      {#if slots.length}
        {#each slots as slot (slot)}
          <label class="shop-slot-control">
            <span>{SHOP_SLOT_LABELS[slot] || slot}</span>
            <select value={draftLoadout[slot] || ''} on:change={event => updateSlot(slot, event.currentTarget.value)}>
              <option value="">No cosmetic</option>
              {#each itemsForSlot(slot) as item (item.item_key)}
                <option value={item.item_key}>{item.name}</option>
              {/each}
            </select>
            <small>Profile surface</small>
          </label>
        {/each}
      {:else}
        <p class="shop-studio-empty">Owned cosmetics will appear here as you collect them.</p>
      {/if}
      <div class="shop-studio-actions">
        <button type="button" class="shop-button shop-button--outline" disabled={!changed} on:click={resetStudio}>Reset preview</button>
        <a class="shop-button shop-button--light" href="/profile/settings">Equip in profile</a>
      </div>
    </aside>

    <div class="shop-studio-preview">
      <ShopStudioPreview
        loadout={draftLoadout}
        username={username}
        displayColor={displayColor}
        accountProfile={profile}
        profileConfig={profileConfig}
      />
      <p class="shop-studio-note" role="status" aria-live="polite">{changed ? 'Preview only — use profile customization to make an actual change.' : 'Showing your equipped look.'}</p>
    </div>

    <aside class="shop-studio-summary">
      <div class="shop-panel-heading"><span>Preview details</span><strong>{changed ? 'Temporary changes' : 'Equipped state'}</strong></div>
      <div class="shop-studio-roll-summary">
        <span class="shop-eyebrow">Current roll</span>
        <div class="shop-studio-roll-swatch" style={`--shop-roll-color:${displayColor}`} aria-label={`Current color ${displayColor}`}></div>
        <strong>{displayColor}</strong>
        <span>{displayRarity}{currentRoll?.score ? ` · ${Number(currentRoll.score).toLocaleString()} EP` : ''}</span>
      </div>
      <div class="shop-studio-account-summary">
        <span class="shop-eyebrow">Profile</span>
        <strong>{username}</strong>
        <span>{Object.keys(draftLoadout).length} equipped slot{Object.keys(draftLoadout).length === 1 ? '' : 's'} in this preview</span>
      </div>
    </aside>
  </div>
</section>

<style>
  .shop-studio { display:grid; gap:1.35rem; }
  .shop-surface-heading { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; padding-bottom:1.2rem; border-bottom:1px solid var(--shop-line); }
  .shop-surface-heading h2 { max-width:52rem; margin:.45rem 0 .6rem; font:650 clamp(2rem,3.5vw,3.4rem)/.95 var(--font-display); letter-spacing:-.05em; }
  .shop-surface-heading p { max-width:42rem; margin:0; color:#aaa8b0; font-size:.9rem; line-height:1.5; }
  .shop-eyebrow { color:#858690; font:500 .7rem/1.3 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .shop-button { display:inline-flex; align-items:center; justify-content:center; min-height:2.7rem; padding:0 .9rem; border-radius:5px; font-weight:650; text-decoration:none; cursor:pointer; }
  .shop-button--outline { border:1px solid #4a4d57; background:#121419; color:#d3d0d8; }
  .shop-button--light { border:1px solid #efede7; background:#efede7; color:#101116; }
  .shop-studio-layout { display:grid; grid-template-columns:minmax(14rem,15rem) minmax(0,1.35fr) minmax(14rem,17rem); gap:.8rem; }
  .shop-studio-slots { border:1px solid var(--shop-line); background:#0a0c10; }
  .shop-panel-heading { display:grid; gap:.35rem; padding:1rem; border-bottom:1px solid var(--shop-line); background:#111319; }
  .shop-panel-heading span { color:#858690; font:.65rem var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .shop-panel-heading strong { color:#f2f0eb; font-size:.95rem; }
  .shop-studio-name { border-bottom:1px solid var(--shop-line); }
  .shop-studio-name-heading { display:grid; gap:.3rem; padding:1rem; background:#0f1116; }
  .shop-studio-name-heading span { color:#cdd2ff; font:.65rem var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .shop-studio-name-heading strong { color:#f2f0eb; font-size:.9rem; }
  .shop-studio-name-heading small { color:#858690; font-size:.68rem; line-height:1.4; }
  .shop-slot-control { display:grid; gap:.35rem; padding:.8rem 1rem; border-bottom:1px solid #252830; }
  .shop-slot-control > span { color:#f2f0eb; font-size:.82rem; font-weight:650; }
  .shop-slot-control select { min-height:2.45rem; padding:0 .55rem; border:1px solid #41444e; border-radius:5px; background:#121419; color:#d9d7d2; font-size:.78rem; }
  .shop-slot-control small { color:#858690; font:.64rem var(--font-mono-stack); }
  .shop-studio-empty { margin:1rem; color:#aaa8b0; font-size:.82rem; line-height:1.5; }
  .shop-studio-actions { display:grid; grid-template-columns:1fr; gap:.5rem; padding:1rem; }
  .shop-studio-actions .shop-button { width:100%; }
  .shop-studio-actions .shop-button:disabled { cursor:not-allowed; opacity:.45; }
  .shop-studio-preview { min-width:0; }
  .shop-studio-preview :global(.studio-preview) { min-height:100%; border-radius:6px; padding:1rem; background:#0a0c10; box-shadow:none; }
  .shop-studio-preview :global(.studio-stage) { min-height:30rem; border-radius:5px; background:#07080b; }
  .shop-studio-note { margin:.65rem 0 0; color:#aaa8b0; font-size:.8rem; line-height:1.45; }
  .shop-studio-summary { border:1px solid var(--shop-line); background:#0a0c10; }
  .shop-studio-roll-summary, .shop-studio-account-summary { display:grid; gap:.45rem; padding:1rem; border-bottom:1px solid #252830; }
  .shop-studio-roll-swatch { width:100%; height:7.4rem; margin:.35rem 0 .25rem; border:1px solid rgba(255,255,255,.18); border-radius:5px; background:var(--shop-roll-color); }
  .shop-studio-roll-summary strong { color:#f2f0eb; font:650 .95rem var(--font-mono-stack); }
  .shop-studio-roll-summary > span:last-child, .shop-studio-account-summary > span:last-child { color:#858690; font-size:.75rem; line-height:1.45; }
  .shop-studio-account-summary strong { color:#f2f0eb; font-size:1.3rem; letter-spacing:-.03em; }
  @media (max-width: 1050px) { .shop-studio-layout { grid-template-columns:minmax(13rem,15rem) minmax(0,1fr); } .shop-studio-summary { grid-column:1 / -1; display:grid; grid-template-columns:1fr 1fr; } .shop-studio-summary .shop-panel-heading { grid-column:1 / -1; } }
  @media (max-width: 760px) { .shop-surface-heading { align-items:flex-start; flex-direction:column; } .shop-studio-layout { grid-template-columns:1fr; } .shop-studio-summary { display:block; } .shop-studio-preview :global(.studio-stage) { min-height:24rem; } }
</style>
