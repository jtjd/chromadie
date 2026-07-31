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
  $: atmosphereItems = Object.values($shopItems)
    .filter(item => item.slot === 'profile_bg' && item.css_type === 'class' && /^profile-effect-/.test(item.css_value || ''))
    .sort((left, right) => left.name.localeCompare(right.name));
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
        <p style="max-width:42rem;margin:.75rem 0 0;color:var(--color-ink-muted);line-height:1.55">Preview owned pieces on the surface they affect, then apply each change to your public profile. Backgrounds can add animated atmospheres such as rain, snow, fireflies, or scanlines.</p>
      </div>
      <Button variant="ghost" href="/shop">Browse the shop ↗</Button>
    </div>

    {#if $shopItemsLoading}
      <p role="status">Loading your cosmetic collection…</p>
    {:else if $shopItemsError}
      <p role="alert">{$shopItemsError}</p>
    {:else}
      <div class="profile-cosmetics-layout">
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

        <div class="profile-cosmetics-controls">
          <div class="profile-cosmetics-controls__heading">
            <span>Atmosphere</span>
            <strong>Animated backgrounds</strong>
            <p>Choose a profile mood such as rain, snow, fireflies, or scanlines.</p>
          </div>
          {#if atmosphereItems.length}
            <div class="profile-cosmetics-atmosphere">
              <label for="cosmetic-profile-atmosphere">Profile atmosphere</label>
              <select id="cosmetic-profile-atmosphere" value={previewLoadout.profile_bg || ''} disabled={!!loadingSlot} on:change={event => previewSlot('profile_bg', event.currentTarget.value)}>
                <option value="">No atmosphere</option>
                {#each atmosphereItems as item (item.item_key)}
                  <option value={item.item_key} disabled={!ownedCosmetics.some(owned => owned.item_key === item.item_key)}>{item.name}{ownedCosmetics.some(owned => owned.item_key === item.item_key) ? '' : ' · unlock in shop'}</option>
                {/each}
              </select>
              <button type="button" disabled={!!loadingSlot || (previewLoadout.profile_bg || '') === (($equippedItems || {})['profile_bg'] || '')} on:click={() => applySlot('profile_bg')}>{loadingSlot === 'profile_bg' ? 'Saving…' : 'Apply atmosphere'}</button>
            </div>
          {:else}
            <p class="profile-cosmetics-empty">No atmosphere cosmetics are owned yet. Browse the shop to unlock animated backgrounds.</p>
          {/if}

          {#if contextSlots.length}
            <div class="profile-cosmetics-slot-list">
              {#each contextSlots.filter(slot => slot !== 'profile_bg') as slot (slot)}
                <div class="profile-cosmetics-slot">
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
          {/if}
        </div>
      </div>

      <p role={error ? 'alert' : 'status'} aria-live="polite" style={`min-height:1.25rem;margin:1rem 0 0;color:${error ? 'var(--color-danger)' : 'var(--color-ink-muted)'};font-size:var(--type-small)`}>{error || status}</p>
    {/if}
  </section>
</Surface>

<style>
  .profile-cosmetics-layout { display:block; }
  .profile-cosmetics-layout > :global(.decoration-studio) { width:100%; }
  .profile-cosmetics-controls { display:grid; gap:.75rem; min-width:0; margin-top:1.25rem; padding:1rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-panel-soft); }
  .profile-cosmetics-controls__heading span { display:block; color:var(--color-accent-bright); font:700 var(--type-label)/1.2 var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .profile-cosmetics-controls__heading strong { display:block; margin-top:.35rem; color:var(--color-ink-strong); font-size:1.05rem; }
  .profile-cosmetics-controls__heading p { margin:.45rem 0 0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.45; }
  .profile-cosmetics-atmosphere, .profile-cosmetics-slot { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:.55rem .7rem; align-items:end; padding-top:.8rem; border-top:1px solid var(--color-line-subtle); }
  .profile-cosmetics-atmosphere label, .profile-cosmetics-slot label { grid-column:1 / -1; color:var(--color-ink-strong); font-weight:650; font-size:var(--type-small); }
  .profile-cosmetics-atmosphere select, .profile-cosmetics-slot select { width:100%; min-height:2.65rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); padding:0 .7rem; background:var(--surface-inset); color:var(--color-ink-strong); font:500 var(--type-small)/1 var(--font-body-stack); }
  .profile-cosmetics-atmosphere button, .profile-cosmetics-slot button { min-height:2.65rem; padding:0 .8rem; border:0; border-radius:var(--radius-sm); background:var(--color-ink-strong); color:var(--color-canvas-deep); font-weight:700; cursor:pointer; white-space:nowrap; }
  .profile-cosmetics-atmosphere button:disabled, .profile-cosmetics-slot button:disabled { opacity:.45; cursor:not-allowed; }
  .profile-cosmetics-slot-list { display:grid; gap:.75rem; }
  .profile-cosmetics-empty { margin:0; padding:.8rem; border:1px dashed var(--color-line-subtle); border-radius:var(--radius-sm); color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.45; }
</style>
