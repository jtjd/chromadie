<script>
  import DecorationStudio from './DecorationStudio.svelte';
  import Button from './foundation/Button.svelte';
  import Surface from './foundation/Surface.svelte';
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
  import {
    SHOP_SLOT_LABELS,
    createFittingRoom,
    getShopContextForSlot,
    hasShopEntitlement,
    isShopCosmetic
  } from './shopCatalog.js';

  export let accountProfile = null;
  export let profileConfig = null;

  let activeContext = 'profile';
  let previewLoadout = {};
  let selectedItem = null;
  let loadingSlot = '';
  let status = '';
  let error = '';
  let syncedLoadoutKey = '';

  $: account = {
    ...($profile || {}),
    ...(accountProfile || {}),
    equipped_cosmetics: { ...($equippedItems || {}) }
  };
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
  $: contextSlots = [...new Set(ownedCosmetics
    .filter(item => getShopContextForSlot(item.slot) === activeContext)
    .map(item => item.slot))];
  $: equippedKey = JSON.stringify($equippedItems || {});
  $: syncEquippedLoadout(equippedKey, $equippedItems);

  function syncEquippedLoadout(key, loadout) {
    if (loadingSlot || key === syncedLoadoutKey) return;
    previewLoadout = { ...(loadout || {}) };
    syncedLoadoutKey = key;
  }

  function itemsForSlot(slot) {
    return ownedCosmetics.filter(item => item.slot === slot);
  }

  function previewSlot(slot, itemKey) {
    const item = $shopItems[itemKey] || null;
    previewLoadout = { ...previewLoadout };
    if (item) {
      previewLoadout[slot] = item.item_key;
      selectedItem = item;
    } else {
      delete previewLoadout[slot];
      selectedItem = null;
    }
    error = '';
    status = 'Preview only. Apply the change when the look feels right.';
    trackProductEvent('shop_try_on', {
      slot,
      context: activeContext
    });
  }

  async function applySlot(slot) {
    if (loadingSlot) return;
    const itemKey = previewLoadout[slot] || '';
    const item = itemKey ? $shopItems[itemKey] : null;
    loadingSlot = slot;
    error = '';
    status = item ? `Equipping ${item.name}…` : `Clearing ${SHOP_SLOT_LABELS[slot]}…`;

    try {
      const { data, error: rpcError } = item
        ? await supabase.rpc('equip_item', { p_item_key: item.item_key })
        : await supabase.rpc('unequip_item', { p_slot: slot });
      if (rpcError || !data?.success) {
        throw new Error(rpcError?.message || data?.error || 'The appearance change could not be saved.');
      }

      const userId = $session?.user?.id;
      const refreshedProfile = userId ? await refreshProfileState(userId) : null;
      if (!refreshedProfile) {
        throw new Error('The change saved, but the profile could not be refreshed.');
      }
      previewLoadout = { ...(refreshedProfile.equipped_cosmetics || {}) };
      syncedLoadoutKey = JSON.stringify(previewLoadout);
      status = item ? `${item.name} is now equipped.` : `${SHOP_SLOT_LABELS[slot]} cleared.`;
      if (item) {
        trackProductEvent('shop_equip', {
          slot,
          context: activeContext
        });
      }
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

<Surface variant="panel" padding="lg">
  <section aria-labelledby="profile-cosmetics-title">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1rem">
      <div>
        <p class="profile-settings-page__eyebrow">Appearance</p>
        <h2 id="profile-cosmetics-title" style="margin:0;color:var(--color-ink-strong);font:600 var(--type-h2)/1.05 var(--font-display-stack)">Choose your equipped cosmetics.</h2>
        <p style="max-width:42rem;margin:.75rem 0 0;color:var(--color-ink-muted);line-height:1.55">Preview owned pieces on the surface they affect, then apply each change to your public profile.</p>
      </div>
      <Button variant="ghost" href="/shop">Browse the shop ↗</Button>
    </div>

    {#if $shopItemsLoading}
      <p role="status">Loading your cosmetic collection…</p>
    {:else if $shopItemsError}
      <p role="alert">{$shopItemsError}</p>
    {:else}
      <DecorationStudio
        bind:activeContext
        loadout={previewLoadout}
        {username}
        {displayColor}
        {accountProfile}
        {profileConfig}
        {selectedItem}
        title="Preview your public look."
        modeLabel="Owned cosmetics"
        showBaseline={false}
      />

      {#if contextSlots.length}
        <div style="display:grid;gap:.75rem;margin-top:1rem">
          {#each contextSlots as slot (slot)}
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:.75rem;padding:.75rem 0;border-top:1px solid var(--color-line-subtle)">
              <div style="min-width:0">
                <label for={`cosmetic-${slot}`} style="display:block;margin-bottom:.4rem;color:var(--color-ink-strong);font-weight:650">{SHOP_SLOT_LABELS[slot]}</label>
                <select
                  id={`cosmetic-${slot}`}
                  value={previewLoadout[slot] || ''}
                  disabled={!!loadingSlot}
                  on:change={event => previewSlot(slot, event.currentTarget.value)}
                  style="width:100%;min-height:2.75rem;border:1px solid var(--color-line-subtle);border-radius:var(--radius-sm);padding:0 .75rem;background:var(--surface-inset);color:var(--color-ink-strong);font:500 var(--type-small)/1 var(--font-body-stack)"
                >
                  <option value="">No cosmetic</option>
                  {#each itemsForSlot(slot) as item (item.item_key)}
                    <option value={item.item_key}>{item.name}</option>
                  {/each}
                </select>
              </div>
              <button
                type="button"
                disabled={!!loadingSlot || (previewLoadout[slot] || '') === ($equippedItems[slot] || '')}
                on:click={() => applySlot(slot)}
                style="min-height:2.75rem;padding:0 1rem;border:1px solid transparent;border-radius:var(--radius-sm);background:var(--color-ink-strong);color:var(--color-canvas-deep);cursor:pointer;font-weight:700"
              >{loadingSlot === slot ? 'Saving…' : 'Apply'}</button>
            </div>
          {/each}
        </div>
      {:else}
        <p style="margin:0;padding:1rem;border:1px dashed var(--color-line-subtle);border-radius:var(--radius-sm);color:var(--color-ink-muted)">No owned cosmetics affect this surface yet. Your default presentation remains active.</p>
      {/if}

      <p role={error ? 'alert' : 'status'} aria-live="polite" style={`min-height:1.25rem;margin:1rem 0 0;color:${error ? 'var(--color-danger)' : 'var(--color-ink-muted)'};font-size:var(--type-small)`}>{error || status}</p>
    {/if}
  </section>
</Surface>
