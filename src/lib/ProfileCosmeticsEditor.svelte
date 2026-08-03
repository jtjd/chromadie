<script>
  import Button from './foundation/Button.svelte';
  import Surface from './foundation/Surface.svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';
  import {
    addToast,
    equippedItems,
    profile,
    profileEntitlements,
    refreshProfileState,
    session,
    shopItems,
    shopItemsError,
    shopItemsLoading,
    userInventory
  } from './stores';
  import { supabase } from './supabase';
  import { trackProductEvent } from './productAnalytics.js';
  import { NAME_COMPOSABLE_SLOTS, applyNamePreviewLayer } from './name/nameLoadout.js';
  import { SHOP_SLOT_LABELS, createFittingRoom, hasShopEntitlement, isShopCosmetic } from './shopCatalog.js';

  export let accountProfile = null;
  export let profileConfig = null;

  let previewLoadout = /** @type {Record<string, string>} */ ({});
  let selectedItem = null;
  let loadingSlot = '';
  let status = '';
  let error = '';
  let syncedLoadoutKey = '';

  const NAME_DEFAULT_LABELS = Object.freeze({
    name_font: 'Platform default font',
    name_material: 'Plain material',
    name_motion: 'Still motion'
  });

  $: account = { ...($profile || {}), ...(accountProfile || {}) };
  $: username = account.username || 'Chromanaut';
  $: displayColor = account.mood_color || '#7B5CFF';
  $: fittingRoom = createFittingRoom({
    userInventory: $userInventory,
    equippedItems: $equippedItems,
    entitlements: $profileEntitlements
  });
  $: ownedCosmetics = Object.values($shopItems)
    .filter(item => isShopCosmetic(item) && hasShopEntitlement(item, fittingRoom))
    .sort((left, right) => (SHOP_SLOT_LABELS[left.slot] || left.slot).localeCompare(SHOP_SLOT_LABELS[right.slot] || right.slot)
      || left.name.localeCompare(right.name));
  $: borderItems = ownedCosmetics.filter(item => item.slot === 'profile_border');
  $: equippedKey = JSON.stringify($equippedItems || {});
  $: syncEquippedLoadout(equippedKey, $equippedItems);

  function syncEquippedLoadout(key, loadout) {
    if (loadingSlot || key === syncedLoadoutKey) return;
    previewLoadout = { ...(loadout || {}) };
    syncedLoadoutKey = key;
  }

  function previewSlot(slot, itemKey) {
    const item = $shopItems[itemKey] || null;
    previewLoadout = NAME_COMPOSABLE_SLOTS.includes(slot)
      ? applyNamePreviewLayer(previewLoadout, slot, item?.item_key || '')
      : { ...previewLoadout, ...(item ? { [slot]: item.item_key } : {}) };
    if (!item && !NAME_COMPOSABLE_SLOTS.includes(slot)) delete previewLoadout[slot];
    selectedItem = item;
    error = '';
    status = 'Preview only. Apply the change when the look feels right.';
    trackProductEvent('shop_try_on', { slot, context: 'profile' });
  }

  async function applySlot(slot) {
    if (loadingSlot) return;
    const item = previewLoadout[slot] ? $shopItems[previewLoadout[slot]] : null;
    loadingSlot = slot;
    error = '';
    status = item ? `Equipping ${item.name}…` : `Clearing ${SHOP_SLOT_LABELS[slot]}…`;

    try {
      const { data, error: rpcError } = item
        ? await supabase.rpc('equip_item', { p_item_key: item.item_key })
        : await supabase.rpc('unequip_item', { p_slot: slot });
      if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'The appearance change could not be saved.');

      const userId = $session?.user?.id;
      const refreshedProfile = userId ? await refreshProfileState(userId) : null;
      if (!refreshedProfile) throw new Error('The change saved, but the profile could not be refreshed.');
      previewLoadout = { ...(refreshedProfile.equipped_cosmetics || {}) };
      syncedLoadoutKey = JSON.stringify(previewLoadout);
      status = item ? `${item.name} is now equipped.` : `${SHOP_SLOT_LABELS[slot]} cleared.`;
      if (item) trackProductEvent('shop_equip', { slot, context: 'profile' });
      addToast(status, 'success');
    } catch (actionError) {
      previewLoadout = { ...$equippedItems };
      error = actionError instanceof Error ? actionError.message : 'The appearance change could not be saved.';
      status = '';
    } finally {
      loadingSlot = '';
    }
  }
</script>

<Surface variant="panel" padding="lg" className="profile-cosmetics-surface">
  <section aria-labelledby="profile-cosmetics-title">
    <div class="profile-cosmetics-heading">
      <div>
        <p class="profile-settings-page__eyebrow">Appearance</p>
        <h2 id="profile-cosmetics-title">Shape your public identity.</h2>
        <p>Preview the three Name layers and Profile Border together, then apply each owned choice through the existing server-authoritative equip flow.</p>
      </div>
      <Button variant="ghost" href="/shop">Browse the shop ↗</Button>
    </div>

    {#if $shopItemsLoading}
      <p role="status">Loading your cosmetic collection…</p>
    {:else if $shopItemsError}
      <p role="alert">{$shopItemsError}</p>
    {:else}
      <div class="profile-cosmetics-layout">
        <div class="profile-cosmetics-preview">
          <ShopStudioPreview
            loadout={previewLoadout}
            {username}
            displayColor={displayColor}
            accountProfile={account}
            profileConfig={profileConfig}
            selectedItem={selectedItem}
          />
        </div>

        <div class="profile-cosmetics-controls">
          <div class="profile-cosmetics-controls__heading">
            <span>Name</span>
            <strong>Three independent layers</strong>
            <p>Defaults are always available. Changing one layer preserves the other two.</p>
          </div>

          {#each NAME_COMPOSABLE_SLOTS as slot (slot)}
            <div class="profile-cosmetics-slot">
              <div>
                <label for={`cosmetic-${slot}`}>{SHOP_SLOT_LABELS[slot]}</label>
                <select id={`cosmetic-${slot}`} value={previewLoadout[slot] || ''} disabled={!!loadingSlot} on:change={event => previewSlot(slot, event.currentTarget.value)}>
                  <option value="">{NAME_DEFAULT_LABELS[slot]}</option>
                  {#each ownedCosmetics.filter(item => item.slot === slot) as item (item.item_key)}
                    <option value={item.item_key}>{item.name}</option>
                  {/each}
                </select>
              </div>
              <button type="button" disabled={!!loadingSlot || (previewLoadout[slot] || '') === ($equippedItems[slot] || '')} on:click={() => applySlot(slot)}>{loadingSlot === slot ? 'Saving…' : 'Apply'}</button>
            </div>
          {/each}

          <div class="profile-cosmetics-controls__heading profile-cosmetics-controls__heading--border">
            <span>Border</span>
            <strong>Profile Border</strong>
            <p>One shared border renderer is used on profiles, discovery, and shop previews.</p>
          </div>
          <div class="profile-cosmetics-slot">
            <div>
              <label for="cosmetic-profile-border">Profile Border</label>
            <select id="cosmetic-profile-border" value={previewLoadout['profile_border'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('profile_border', event.currentTarget.value)}>
                <option value="">No border</option>
                {#each borderItems as item (item.item_key)}
                  <option value={item.item_key}>{item.name}</option>
                {/each}
              </select>
            </div>
            <button type="button" disabled={!!loadingSlot || (previewLoadout['profile_border'] || '') === ($equippedItems['profile_border'] || '')} on:click={() => applySlot('profile_border')}>{loadingSlot === 'profile_border' ? 'Saving…' : 'Apply'}</button>
          </div>
        </div>
      </div>

      <p role={error ? 'alert' : 'status'} aria-live="polite" class:error-message={Boolean(error)} class="profile-cosmetics-status">{error || status}</p>
    {/if}
  </section>
</Surface>

<style>
  :global(.profile-cosmetics-surface) { width: 100%; box-sizing: border-box; }
  .profile-cosmetics-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .profile-cosmetics-heading h2 { margin: 0; color: var(--color-ink-strong); font: 600 var(--type-h2) / 1.05 var(--font-display-stack); }
  .profile-cosmetics-heading p:not(.profile-settings-page__eyebrow) { max-width: 42rem; margin: .75rem 0 0; color: var(--color-ink-muted); line-height: 1.55; }
  .profile-cosmetics-layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(18rem, .85fr); gap: 1rem; align-items: start; }
  .profile-cosmetics-preview { min-width: 0; }
  .profile-cosmetics-controls { display: grid; gap: .75rem; min-width: 0; padding: 1rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel-soft); }
  .profile-cosmetics-controls__heading { display: grid; gap: .35rem; padding-bottom: .25rem; }
  .profile-cosmetics-controls__heading--border { margin-top: .5rem; padding-top: 1rem; border-top: 1px solid var(--color-line-subtle); }
  .profile-cosmetics-controls__heading span { color: var(--color-accent-bright); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: .12em; text-transform: uppercase; }
  .profile-cosmetics-controls__heading strong { color: var(--color-ink-strong); font-size: 1.05rem; }
  .profile-cosmetics-controls__heading p { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.45; }
  .profile-cosmetics-slot { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .55rem .7rem; align-items: end; padding-top: .8rem; border-top: 1px solid var(--color-line-subtle); }
  .profile-cosmetics-slot label { display: block; margin-bottom: .4rem; color: var(--color-ink-strong); font-weight: 650; font-size: var(--type-small); }
  .profile-cosmetics-slot select { width: 100%; min-height: 2.65rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); padding: 0 .7rem; background: var(--surface-inset); color: var(--color-ink-strong); font: 500 var(--type-small) / 1 var(--font-body-stack); }
  .profile-cosmetics-slot button { min-height: 2.65rem; padding: 0 .8rem; border: 0; border-radius: var(--radius-sm); background: var(--color-ink-strong); color: var(--color-canvas-deep); font-weight: 700; cursor: pointer; white-space: nowrap; }
  .profile-cosmetics-slot button:disabled { opacity: .45; cursor: not-allowed; }
  .profile-cosmetics-status { min-height: 1.25rem; margin: 1rem 0 0; color: var(--color-ink-muted); font-size: var(--type-small); }
  .profile-cosmetics-status.error-message { color: var(--color-danger); }
  @media (max-width: 900px) { .profile-cosmetics-layout { grid-template-columns: 1fr; } }
</style>
