<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Surface from './foundation/Surface.svelte';
  import ShopItemPreview from './ShopItemPreview.svelte';
  import { PROFILE_RENDER_CONTEXTS } from './profile-studio/previewContexts.js';
  import {
    addToast,
    equippedItems,
    profile,
    profileEntitlements,
    refreshProfileState,
    session,
    userInventory,
    loadCosmeticCatalog,
    cosmeticCatalogItems,
    cosmeticCatalogError,
    cosmeticCatalogLoading,
  } from './stores';
  import { supabase } from './supabase';
  import { trackProductEvent } from './productAnalytics.js';
  import { NAME_COMPOSABLE_SLOTS, applyNamePreviewLayer, getNamePreviewLoadoutForSlot } from './name/nameLoadout.js';
  import { isCustomNameFontKey } from './name/nameFonts.js';
  import { createFittingRoom, getShopAccessLabel, hasShopEntitlement, SHOP_SLOT_LABELS, isShopCosmetic } from './shopCatalog.js';
  import { getProfileMediaUrl } from './profileMedia.js';

  export let accountProfile = null;
  /** @type {any} */
  export let profileConfig = null;
  export let compact = false;
  export let presentation = 'default';
  /** A non-null value is the staged Studio loadout; null follows equipped items. */
  export let stagedLoadout = null;

  const dispatch = createEventDispatcher();
  let previewLoadout = /** @type {Record<string, string>} */ ({});
  let loadingSlot = '';
  let error = '';
  let syncedLoadoutKey = '';

  const NAME_DEFAULT_LABELS = Object.freeze({
    name_font: 'Platform default font',
    name_material: 'Plain material',
    name_motion: 'Still motion'
  });
  // The fitting-room row is intentionally terse.  The surrounding heading
  // already establishes that these controls apply to the username, so the
  // reference layout uses the slot names on their own.
  const NAME_SLOT_LABELS = Object.freeze({
    name_font: 'Font',
    name_material: 'Material',
    name_motion: 'Motion'
  });
  const STUDIO_EFFECT_DEFINITIONS = Object.freeze([
    { slot: 'name_font', label: 'Font', description: 'Name effect layer', emptyLabel: NAME_DEFAULT_LABELS.name_font },
    { slot: 'name_material', label: 'Material', description: 'Name effect layer', emptyLabel: NAME_DEFAULT_LABELS.name_material },
    { slot: 'name_motion', label: 'Motion', description: 'Name effect layer', emptyLabel: NAME_DEFAULT_LABELS.name_motion },
    { slot: 'avatar_effect', label: 'Avatar effect', description: 'Visual effect around the avatar', emptyLabel: 'No avatar effect' },
    { slot: 'profile_border', label: 'Profile border', description: 'Boundary cosmetic', emptyLabel: 'No border' },
    { slot: 'cursor_trail', label: 'Cursor trail', description: 'Profile-scoped pointer trail', emptyLabel: 'No cursor trail' },
    { slot: 'profile_atmosphere', label: 'Profile atmosphere', description: 'Page-wide authored effect', emptyLabel: 'No atmosphere' },
    { slot: 'profile_motion', label: 'Profile motion', description: 'Card movement effect', emptyLabel: 'No motion' }
  ]);
  const COSMETIC_SLOTS = Object.freeze([
    ...NAME_COMPOSABLE_SLOTS,
    'profile_border',
    'avatar_effect',
    'cursor_trail',
    'profile_atmosphere',
    'profile_motion'
  ]);

  $: account = { ...($profile || {}), ...(accountProfile || {}) };
  $: username = account.username || 'Chromanaut';
  $: displayColor = account.mood_color || '#7B5CFF';
  $: avatarSrc = getProfileMediaUrl(
    (profileConfig && (
      profileConfig.draft?.media_references?.avatar
      || profileConfig.published?.media_references?.avatar
      || profileConfig.draft?.avatar_path
      || profileConfig.published?.avatar_path
    )) || ''
  );
  // Keep the full active catalog visible so a locked expression can be
  // discovered, but let the server-owned inventory/entitlement state decide
  // which rows can be previewed and applied.
  $: availableCosmetics = Object.values($cosmeticCatalogItems)
    .filter(item => isShopCosmetic(item) && item.catalog_status === 'active')
    .sort((left, right) => (SHOP_SLOT_LABELS[left.slot] || left.slot).localeCompare(SHOP_SLOT_LABELS[right.slot] || right.slot)
      || left.name.localeCompare(right.name));
  $: borderItems = availableCosmetics.filter(item => item.slot === 'profile_border');
  $: avatarItems = availableCosmetics.filter(item => item.slot === 'avatar_effect');
  $: cursorItems = availableCosmetics.filter(item => item.slot === 'cursor_trail');
  $: atmosphereItems = availableCosmetics.filter(item => item.slot === 'profile_atmosphere');
  $: profileMotionItems = availableCosmetics.filter(item => item.slot === 'profile_motion');
  $: previewItems = Object.fromEntries(COSMETIC_SLOTS.map(slot => [slot, $cosmeticCatalogItems[previewLoadout[slot]] || null]));
  $: namePreviewLayerValues = {
    name_font: previewItems.name_font?.css_value || '',
    name_material: previewItems.name_material?.css_value || '',
    name_motion: previewItems.name_motion?.css_value || ''
  };
  $: profileAppearance = profileConfig?.draft?.appearance
    || profileConfig?.published?.appearance
    || profileConfig?.appearance
    || {};
  $: profileWideNameFontEnabled = profileAppearance.useNameFontAcrossProfile === true;
  $: hasCustomNameFontSelection = isCustomNameFontKey(previewLoadout.name_font);
  $: fittingRoom = createFittingRoom({
    userInventory: $userInventory,
    equippedItems: $equippedItems,
    entitlements: $profileEntitlements
  });
  $: hasPendingChanges = COSMETIC_SLOTS.some(slot => (previewLoadout[slot] || '') !== ($equippedItems[slot] || ''));
  $: equippedKey = JSON.stringify($equippedItems || {});
  $: previewSourceKey = stagedLoadout === null
    ? `equipped:${equippedKey}`
    : `staged:${JSON.stringify(stagedLoadout || {})}`;
  $: previewSourceLoadout = stagedLoadout === null ? $equippedItems : stagedLoadout;
  $: syncPreviewLoadout(previewSourceKey, previewSourceLoadout);

  onMount(() => {
    void loadCosmeticCatalog();
  });

  function syncPreviewLoadout(key, loadout) {
    if (key === syncedLoadoutKey) return;
    previewLoadout = { ...(loadout || {}) };
    syncedLoadoutKey = key;
  }

  function previewSlot(slot, itemKey) {
    const item = $cosmeticCatalogItems[itemKey] || null;
    if (item && !hasShopEntitlement(item, fittingRoom)) {
      error = `${item.name} is not unlocked for this profile yet.`;
      return;
    }
    previewLoadout = NAME_COMPOSABLE_SLOTS.includes(slot)
      ? applyNamePreviewLayer(previewLoadout, slot, item?.item_key || '')
      : { ...previewLoadout, ...(item ? { [slot]: item.item_key } : {}) };
    if (!item && !NAME_COMPOSABLE_SLOTS.includes(slot)) delete previewLoadout[slot];
    error = '';
    dispatch('cosmeticpreview', { loadout: { ...previewLoadout } });
    if (slot === 'name_font' && !isCustomNameFontKey(item?.item_key || itemKey)) updateProfileWideNameFont(false);
    trackProductEvent('cosmetic_preview', { slot, context: 'profile' });
  }

  function updateProfileWideNameFont(enabled) {
    const nextEnabled = Boolean(enabled) && hasCustomNameFontSelection;
    if (nextEnabled === profileWideNameFontEnabled) return;
    dispatch('studiopatch', {
      scope: 'appearance',
      detail: { appearance: { useNameFontAcrossProfile: nextEnabled } }
    });
    dispatch('dirty', { dirty: true });
  }

  function resetNameEffects() {
    previewLoadout = {
      ...previewLoadout,
      ...Object.fromEntries(NAME_COMPOSABLE_SLOTS.map(slot => [slot, $equippedItems?.[slot] || '']))
    };
    error = '';
    dispatch('cosmeticpreview', { loadout: { ...previewLoadout } });
    if (!isCustomNameFontKey(previewLoadout.name_font)) updateProfileWideNameFont(false);
  }

  function itemsForSlot(slot) {
    if (NAME_COMPOSABLE_SLOTS.includes(slot)) return availableCosmetics.filter(item => item.slot === slot);
    return {
      avatar_effect: avatarItems,
      profile_border: borderItems,
      cursor_trail: cursorItems,
      profile_atmosphere: atmosphereItems,
      profile_motion: profileMotionItems
    }[slot] || [];
  }

  function itemOptionLabel(item) {
    return hasShopEntitlement(item, fittingRoom)
      ? item.name
      : `${item.name} · ${getShopAccessLabel(item)}`;
  }

  async function applyChanges() {
    if (loadingSlot || !hasPendingChanges) return;
    const changedSlots = COSMETIC_SLOTS.filter(slot => (previewLoadout[slot] || '') !== ($equippedItems[slot] || ''));
    loadingSlot = 'all';
    error = '';

    try {
      for (const slot of changedSlots) {
        const item = previewLoadout[slot] ? $cosmeticCatalogItems[previewLoadout[slot]] : null;
        if (item && !hasShopEntitlement(item, fittingRoom)) {
          throw new Error(`${item.name} is not unlocked for this profile yet.`);
        }
        const { data, error: rpcError } = item
          ? await supabase.rpc('equip_item', { p_item_key: item.item_key })
          : await supabase.rpc('unequip_item', { p_slot: slot });
        if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'The appearance change could not be saved.');
        if (item) trackProductEvent('cosmetic_equip', { slot, context: 'profile' });
      }

      const userId = $session?.user?.id;
      const refreshedProfile = userId ? await refreshProfileState(userId) : null;
      if (!refreshedProfile) throw new Error('The change saved, but the profile could not be refreshed.');
      previewLoadout = { ...(refreshedProfile.equipped_cosmetics || {}) };
      syncedLoadoutKey = '';
      dispatch('cosmeticpreview', { loadout: { ...previewLoadout } });
      addToast(`${changedSlots.length} appearance ${changedSlots.length === 1 ? 'change' : 'changes'} applied.`, 'success');
    } catch (actionError) {
      previewLoadout = { ...$equippedItems };
      syncedLoadoutKey = '';
      dispatch('cosmeticpreview', { loadout: { ...previewLoadout } });
      error = actionError instanceof Error ? actionError.message : 'The appearance change could not be saved.';
    } finally {
      loadingSlot = '';
    }
  }
</script>

<Surface
  variant="panel"
  padding="lg"
  className={`${compact ? 'profile-cosmetics-surface profile-cosmetics-surface--compact' : 'profile-cosmetics-surface'}${presentation === 'studio' ? ' profile-cosmetics-surface--studio' : ''}`}
>
  <section aria-labelledby="profile-cosmetics-title">
    <div class="profile-cosmetics-heading">
      <div>
        <h2 id="profile-cosmetics-title">Profile expression</h2>
        <p>Preview and equip every profile expression layer.</p>
      </div>
    </div>

    {#if $cosmeticCatalogLoading}
      <p role="status">Loading your cosmetic collection…</p>
    {:else if $cosmeticCatalogError}
      <p role="alert">{$cosmeticCatalogError}</p>
    {:else}
      {#if presentation === 'studio'}
        <div class="profile-cosmetics-studio-heading">
          <div>
            <h2>Profile effects</h2>
            <p>These are the current cosmetic slots. Changes apply to the live preview immediately.</p>
          </div>
          <button type="button" on:click={resetNameEffects}>Reset name effects</button>
        </div>
        <div class="profile-cosmetics-studio-grid" data-presentation="reference-effect-grid">
          {#each STUDIO_EFFECT_DEFINITIONS as definition (definition.slot)}
            <div class="profile-cosmetics-studio-card" data-cosmetic-slot={definition.slot}>
              <div>
                <strong>{definition.label}</strong>
                <small>{definition.description}</small>
                {#if definition.slot === 'name_font'}
                  <label class="profile-cosmetics-studio-font-scope">
                    <input
                      type="checkbox"
                      checked={profileWideNameFontEnabled && hasCustomNameFontSelection}
                      disabled={!!loadingSlot || !hasCustomNameFontSelection}
                      on:change={event => updateProfileWideNameFont(event.currentTarget.checked)}
                    />
                    <span>Apply across profile</span>
                  </label>
                  <small class="profile-cosmetics-studio-font-note">Includes bio and profile content.</small>
                {/if}
              </div>
              <select
                id={`cosmetic-studio-${definition.slot}`}
                value={previewLoadout[definition.slot] || ''}
                disabled={!!loadingSlot}
                on:change={event => previewSlot(definition.slot, event.currentTarget.value)}
              >
                <option value="">{definition.emptyLabel}</option>
                {#each itemsForSlot(definition.slot) as item (item.item_key)}
                  <option value={item.item_key} disabled={!hasShopEntitlement(item, fittingRoom) && previewLoadout[definition.slot] !== item.item_key}>{itemOptionLabel(item)}</option>
                {/each}
              </select>
            </div>
          {/each}
          <button type="button" class="profile-cosmetics-apply" disabled={!!loadingSlot || !hasPendingChanges} on:click={applyChanges}>{loadingSlot ? 'Updating…' : 'Update equipped effects'}</button>
        </div>
      {:else}
      <div class="profile-cosmetics-layout">
        <div class="profile-cosmetics-controls">
          <div class="profile-cosmetics-controls__heading">
            <span>Expression</span>
            <strong>Profile effects</strong>
            <p>Preview each layer, then apply the complete expression together.</p>
          </div>

          <div class="profile-cosmetics-section-heading">
            <h3>{presentation === 'studio' ? 'Profile effects' : 'Name effects'}</h3>
            <p>{presentation === 'studio' ? 'These are the current cosmetic slots. Choose an effect, preview it, then update the equipped expression.' : 'These effects are applied to your username.'}</p>
            <button type="button" on:click={resetNameEffects}>Reset name effects</button>
          </div>

          <div class="profile-cosmetics-name-grid">
            {#each NAME_COMPOSABLE_SLOTS as slot (slot)}
              <div class="profile-cosmetics-slot">
                <div>
                  <label for={`cosmetic-${slot}`}>{NAME_SLOT_LABELS[slot]}</label>
                  <div class="profile-cosmetics-name-control">
                      <select id={`cosmetic-${slot}`} value={previewLoadout[slot] || ''} disabled={!!loadingSlot} on:change={event => previewSlot(slot, event.currentTarget.value)}>
                        <option value="">{NAME_DEFAULT_LABELS[slot]}</option>
                        {#each availableCosmetics.filter(item => item.slot === slot) as item (item.item_key)}
                        <option value={item.item_key} disabled={!hasShopEntitlement(item, fittingRoom) && previewLoadout[slot] !== item.item_key}>{itemOptionLabel(item)}</option>
                        {/each}
                    </select>
                    <div class="profile-cosmetics-name-preview" aria-label={`${NAME_SLOT_LABELS[slot]} preview`}>
                      <ShopItemPreview item={previewItems[slot]} nameLoadout={getNamePreviewLoadoutForSlot(previewLoadout, slot, previewItems[slot]?.css_value || '', namePreviewLayerValues)} {username} {displayColor} {avatarSrc} active={true} renderContext={PROFILE_RENDER_CONTEXTS.NAME_CONTROL} />
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <div class="profile-cosmetics-section-heading profile-cosmetics-section-heading--visual">
            <h3>Visual effects</h3>
            <p>Customize the visuals around your profile.</p>
          </div>

          <div class="profile-cosmetics-visual-grid">
            <div class="profile-cosmetics-slot">
              <div class="profile-cosmetics-visual-preview" aria-label="Avatar effect preview">
                {#if previewItems.avatar_effect}<ShopItemPreview item={previewItems.avatar_effect} {username} {displayColor} {avatarSrc} active={true} renderContext={PROFILE_RENDER_CONTEXTS.EFFECT_CARD} />{:else}<span class="profile-cosmetics-empty-preview">No effect</span>{/if}
              </div>
              <div>
                <label for="cosmetic-avatar-effect">Avatar effect</label>
                <select id="cosmetic-avatar-effect" value={previewLoadout['avatar_effect'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('avatar_effect', event.currentTarget.value)}>
                  <option value="">No avatar effect</option>
                  {#each avatarItems as item (item.item_key)}<option value={item.item_key} disabled={!hasShopEntitlement(item, fittingRoom) && previewLoadout.avatar_effect !== item.item_key}>{itemOptionLabel(item)}</option>{/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot">
              <div class="profile-cosmetics-visual-preview" aria-label="Profile border preview">
                {#if previewItems.profile_border}<ShopItemPreview item={previewItems.profile_border} {username} {displayColor} {avatarSrc} active={true} renderContext={PROFILE_RENDER_CONTEXTS.EFFECT_CARD} />{:else}<span class="profile-cosmetics-empty-preview">No border</span>{/if}
              </div>
              <div>
                <label for="cosmetic-profile-border">Profile border</label>
                <select id="cosmetic-profile-border" value={previewLoadout['profile_border'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('profile_border', event.currentTarget.value)}>
                  <option value="">No border</option>
                  {#each borderItems as item (item.item_key)}
                    <option value={item.item_key} disabled={!hasShopEntitlement(item, fittingRoom) && previewLoadout.profile_border !== item.item_key}>{itemOptionLabel(item)}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot">
              <div class="profile-cosmetics-visual-preview" aria-label="Cursor trail preview">
                {#if previewItems.cursor_trail}<ShopItemPreview item={previewItems.cursor_trail} {username} {displayColor} {avatarSrc} active={true} renderContext={PROFILE_RENDER_CONTEXTS.EFFECT_CARD} />{:else}<span class="profile-cosmetics-empty-preview">No trail</span>{/if}
              </div>
              <div>
                <label for="cosmetic-cursor-trail">Cursor trail</label>
                <select id="cosmetic-cursor-trail" value={previewLoadout['cursor_trail'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('cursor_trail', event.currentTarget.value)}>
                  <option value="">No cursor trail</option>
                  {#each cursorItems as item (item.item_key)}<option value={item.item_key} disabled={!hasShopEntitlement(item, fittingRoom) && previewLoadout.cursor_trail !== item.item_key}>{itemOptionLabel(item)}</option>{/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot">
              <div class="profile-cosmetics-visual-preview" aria-label="Profile atmosphere preview">
                {#if previewItems.profile_atmosphere}<ShopItemPreview item={previewItems.profile_atmosphere} {username} {displayColor} {avatarSrc} active={true} renderContext={PROFILE_RENDER_CONTEXTS.EFFECT_CARD} />{:else}<span class="profile-cosmetics-empty-preview">No atmosphere</span>{/if}
              </div>
              <div>
                <label for="cosmetic-profile-atmosphere">Profile atmosphere</label>
                <select id="cosmetic-profile-atmosphere" value={previewLoadout['profile_atmosphere'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('profile_atmosphere', event.currentTarget.value)}>
                  <option value="">No atmosphere</option>
                  {#each atmosphereItems as item (item.item_key)}<option value={item.item_key} disabled={!hasShopEntitlement(item, fittingRoom) && previewLoadout.profile_atmosphere !== item.item_key}>{itemOptionLabel(item)}</option>{/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot">
              <div class="profile-cosmetics-visual-preview" aria-label="Profile motion preview">
                {#if previewItems.profile_motion}<ShopItemPreview item={previewItems.profile_motion} {username} {displayColor} {avatarSrc} active={true} renderContext={PROFILE_RENDER_CONTEXTS.EFFECT_CARD} />{:else}<span class="profile-cosmetics-empty-preview">No motion</span>{/if}
              </div>
              <div>
                <label for="cosmetic-profile-motion">Profile motion</label>
                <select id="cosmetic-profile-motion" value={previewLoadout.profile_motion || ''} disabled={!!loadingSlot} on:change={event => previewSlot('profile_motion', event.currentTarget.value)}>
                  <option value="">No motion</option>
                  {#each profileMotionItems as item (item.item_key)}<option value={item.item_key} disabled={!hasShopEntitlement(item, fittingRoom) && previewLoadout.profile_motion !== item.item_key}>{itemOptionLabel(item)}</option>{/each}
                </select>
              </div>
            </div>

          </div>

          <button type="button" class="profile-cosmetics-apply" disabled={!!loadingSlot || !hasPendingChanges} on:click={applyChanges}>{loadingSlot ? 'Updating…' : 'Update equipped effects'}</button>
        </div>
      </div>
      {/if}

      {#if error}
        <p role="alert" aria-live="polite" class="profile-cosmetics-status error-message">{error}</p>
      {/if}
    {/if}
  </section>
</Surface>

<style>
  :global(.profile-cosmetics-surface) {
    --cosmetics-surface: var(--customize-surface, #1e1e2e);
    --cosmetics-raised: var(--customize-section-input, var(--customize-surface-raised, #313244));
    --cosmetics-inset: var(--customize-surface-inset, #181825);
    --cosmetics-text: var(--customize-text-primary, #cdd6f4);
    --cosmetics-secondary: var(--customize-text-secondary, #bac2de);
    --cosmetics-muted: var(--customize-text-muted, #a6adc8);
    --cosmetics-faint: var(--customize-text-faint, #7f849c);
    --cosmetics-border: var(--customize-border, rgba(166, 173, 200, .24));
    --cosmetics-border-strong: var(--customize-border-strong, rgba(166, 173, 200, .48));
    --cosmetics-focus: var(--customize-focus, #b4befe);
    --cosmetics-neutral: var(--customize-accent-secondary, #89dceb);
    --cosmetics-save: var(--customize-accent-save, #a6e3a1);
    --cosmetics-danger: var(--customize-accent-danger, #f38ba8);
    --cosmetics-expression: var(--customize-accent-premium, #cba6f7);
    --cosmetics-body: var(--customize-font-body, var(--font-body-stack, var(--site-font, sans-serif)));
    --cosmetics-mono: var(--customize-font-mono, var(--font-mono-stack, var(--site-mono, monospace)));
    --cosmetics-label-size: var(--customize-label-size, .76rem);
    --cosmetics-control-size: var(--customize-control-size, .82rem);
    --cosmetics-primary-height: var(--customize-primary-height, 2.35rem);
    --cosmetics-radius: var(--customize-radius, .35rem);
    width: 100%;
    box-sizing: border-box;
  }
  :global(.profile-cosmetics-surface.profile-cosmetics-surface--compact) { container: profile-cosmetics / inline-size; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-heading { display: none; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-controls { grid-template-columns: minmax(0, 1fr); gap: .8rem; padding: .1rem 0 0; border: 0; background: transparent; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-controls__heading { display: none; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-slot { padding: .75rem; border: 1px solid var(--cosmetics-border); border-radius: var(--cosmetics-radius); background: transparent; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-name-grid .profile-cosmetics-slot { padding: .35rem .55rem; border: 0; background: transparent; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-name-grid { padding: .35rem 0; border: 0; background: transparent; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-visual-grid .profile-cosmetics-slot { position: relative; align-content: start; gap: .6rem; background: transparent; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-visual-grid .profile-cosmetics-slot::before { content: ''; position: absolute; top: .55rem; left: .55rem; z-index: 1; width: .4rem; height: .4rem; border-radius: 50%; background: var(--cosmetics-save); }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-visual-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .75rem; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-slot select { min-height: 2.5rem; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-name-grid .profile-cosmetics-slot label { margin-bottom: .3rem; font-size: .72rem; line-height: 1.15; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-name-grid .profile-cosmetics-name-preview { height: 2rem; overflow: visible; }
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-section-heading,
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-name-grid,
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-visual-grid,
  :global(.profile-cosmetics-surface--compact) .profile-cosmetics-apply { grid-column: 1 / -1; }
  .profile-cosmetics-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .profile-cosmetics-heading h2 { margin: 0; color: var(--cosmetics-text); font: 600 var(--customize-subheading-size, .88rem) / 1.25 var(--cosmetics-body); }
  .profile-cosmetics-heading p { max-width: 42rem; margin: .35rem 0 0; color: var(--cosmetics-muted); font-size: var(--cosmetics-label-size); line-height: 1.45; }
  .profile-cosmetics-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; align-items: start; }
  .profile-cosmetics-studio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: stretch; }
  .profile-cosmetics-studio-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 140px;
    gap: 10px;
    align-items: center;
    min-width: 0;
    padding: 11px;
    border: 1px solid var(--cosmetics-border);
    border-radius: 9px;
    background: var(--cosmetics-inset);
  }
  .profile-cosmetics-studio-card strong { display: block; color: var(--cosmetics-text); font: 600 .72rem/1.2 var(--cosmetics-body); }
  .profile-cosmetics-studio-card small { display: block; margin-top: 3px; color: var(--cosmetics-faint); font: 400 .6rem/1.35 var(--cosmetics-body); }
  .profile-cosmetics-studio-font-scope { display: flex; align-items: center; gap: .35rem; margin-top: .55rem; color: var(--cosmetics-secondary); font: 600 .62rem/1.2 var(--cosmetics-body); cursor: pointer; }
  .profile-cosmetics-studio-font-scope input { flex: 0 0 auto; accent-color: var(--cosmetics-neutral); }
  .profile-cosmetics-studio-font-note { margin-top: .25rem !important; color: var(--cosmetics-faint); font-size: .56rem !important; }
  .profile-cosmetics-studio-card select { min-width: 0; width: 100%; min-height: 34px; border: 1px solid var(--cosmetics-border); border-radius: 6px; background: var(--cosmetics-inset); color: var(--cosmetics-secondary); padding: 0 8px; font: 500 .66rem/1 var(--cosmetics-body); }
  .profile-cosmetics-studio-grid .profile-cosmetics-apply { grid-column: 1 / -1; justify-self: end; margin-top: 2px; }
  .profile-cosmetics-controls { display: grid; gap: .65rem; min-width: 0; padding: .25rem 0; border: 0; border-radius: 0; background: transparent; font-family: var(--cosmetics-body); }
  .profile-cosmetics-controls__heading { display: grid; gap: .3rem; padding-bottom: .15rem; }
  .profile-cosmetics-controls__heading span { color: var(--cosmetics-expression); font: 700 var(--cosmetics-label-size) / 1.2 var(--cosmetics-mono); letter-spacing: .12em; text-transform: uppercase; }
  .profile-cosmetics-controls__heading strong { color: var(--cosmetics-text); font-size: var(--customize-subheading-size, .88rem); line-height: 1.25; }
  .profile-cosmetics-controls__heading p { margin: 0; color: var(--cosmetics-muted); font-size: var(--cosmetics-label-size); line-height: 1.45; }
  .profile-cosmetics-section-heading { position: relative; display: grid; gap: .1rem; padding: .2rem 0 .08rem; border-bottom: 1px solid var(--cosmetics-border); }
  .profile-cosmetics-section-heading h3 { margin: 0; color: var(--cosmetics-text); font-size: .84rem; line-height: 1.2; }
  .profile-cosmetics-section-heading p { margin: .1rem 0 .25rem; color: var(--cosmetics-muted); font-size: .68rem; line-height: 1.35; }
  .profile-cosmetics-section-heading button { position: absolute; top: -.1rem; right: 0; min-height: 2.5rem; padding: .55rem .7rem; border: 1px solid var(--cosmetics-border-strong); border-radius: var(--cosmetics-radius); background: transparent; color: var(--cosmetics-secondary); font: 600 .7rem/1 var(--cosmetics-body); cursor: pointer; }
  .profile-cosmetics-section-heading button:hover, .profile-cosmetics-section-heading button:focus-visible { border-color: var(--cosmetics-focus); color: var(--cosmetics-text); }
  .profile-cosmetics-section-heading button:focus-visible { outline: 2px solid var(--cosmetics-focus); outline-offset: 2px; }
  .profile-cosmetics-section-heading--visual { margin-top: .3rem; }
  .profile-cosmetics-name-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; padding: .55rem .6rem; border: 1px solid var(--cosmetics-border); border-radius: var(--cosmetics-radius); background: transparent; }
  .profile-cosmetics-visual-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .55rem; }
  .profile-cosmetics-slot { display: grid; grid-template-columns: minmax(0, 1fr); gap: .35rem .7rem; align-items: end; padding-top: .15rem; border-top: 0; }
  .profile-cosmetics-name-control { position: relative; min-width: 0; }
  .profile-cosmetics-name-preview { position: absolute; right: .7rem; top: 50%; display: flex; width: min(42%, 8.5rem); height: 2rem; align-items: center; justify-content: flex-end; overflow: visible; pointer-events: none; transform: translateY(-50%); }
  .profile-cosmetics-name-preview :global(.shop-preview-area[data-render-context="name-control"]) { display: flex; width: 100%; height: 100%; min-height: 0; align-items: center; justify-content: flex-end; overflow: visible; }
  .profile-cosmetics-name-preview :global(.shop-preview-text) { display: flex; width: 100%; height: 100%; align-items: center; justify-content: flex-end; padding: 0; }
  .profile-cosmetics-name-preview :global(.name-effect-canvas) { display: flex; width: 100%; height: 100%; min-height: 0; align-items: center; justify-content: flex-end; overflow: visible; text-align: right; }
  .profile-cosmetics-name-control select { padding-right: 6.5rem; }
  .profile-cosmetics-name-grid .profile-cosmetics-slot select { height: 2.5rem; min-height: 2.5rem; padding: .35rem 6.5rem .35rem .7rem; font-size: .82rem; line-height: 1; }
  .profile-cosmetics-name-grid .profile-cosmetics-slot + .profile-cosmetics-slot { margin-left: .5rem; padding-left: .75rem; border-left: 1px solid var(--cosmetics-border); }
  .profile-cosmetics-visual-preview { position: relative; display: grid; width: 100%; height: 5.5rem; min-height: 5.5rem; place-items: stretch; overflow: hidden; border: 1px solid var(--cosmetics-border); border-radius: var(--cosmetics-radius); background: transparent; }
  .profile-cosmetics-visual-preview :global(.shop-preview-area[data-render-context="effect-card"]) { width: 100%; height: 100%; min-height: 0; }
  .profile-cosmetics-visual-preview :global(.shop-avatar-preview) { width: 4.8rem; height: 4.8rem; }
  .profile-cosmetics-visual-preview :global(.shop-avatar-preview .avatar-effect) { width: 4rem; height: 4rem; }
  .profile-cosmetics-visual-preview :global(.shop-cursor-preview) { width: 92%; height: 100%; min-height: 0; }
  .profile-cosmetics-visual-preview :global(.shop-atmosphere-preview) { min-height: 0; }
  .profile-cosmetics-empty-preview { display: grid; width: 100%; height: 100%; min-height: 0; place-items: center; color: var(--cosmetics-faint); font: 600 .7rem/1 var(--cosmetics-body); }
  .profile-cosmetics-slot label { display: block; margin-bottom: .3rem; color: var(--cosmetics-secondary); font-weight: 600; font-size: var(--cosmetics-label-size); line-height: 1.3; }
  .profile-cosmetics-slot select { width: 100%; min-height: max(var(--cosmetics-primary-height), 2.5rem); box-sizing: border-box; border: 1px solid var(--cosmetics-border-strong); border-radius: var(--cosmetics-radius); padding: 0 .65rem; background: var(--cosmetics-raised); color: var(--cosmetics-text); font: 500 var(--cosmetics-control-size) / 1 var(--cosmetics-body); }
  .profile-cosmetics-slot select:focus-visible { border-color: var(--cosmetics-focus); outline: 2px solid var(--cosmetics-focus); outline-offset: 1px; }
  .profile-cosmetics-slot select:disabled { cursor: not-allowed; opacity: .58; }
  .profile-cosmetics-apply { grid-column: 1 / -1; justify-self: end; min-height: max(var(--cosmetics-primary-height), 2.75rem); padding: 0 1rem; border: 1px solid var(--cosmetics-save); border-radius: var(--cosmetics-radius); background: var(--cosmetics-save); color: var(--cosmetics-inset); font: 700 var(--cosmetics-label-size) / 1 var(--cosmetics-body); cursor: pointer; }
  .profile-cosmetics-apply:hover:not(:disabled) { background: color-mix(in srgb, var(--cosmetics-save) 82%, var(--cosmetics-text)); }
  .profile-cosmetics-apply:focus-visible { outline: 2px solid var(--cosmetics-focus); outline-offset: 2px; }
  .profile-cosmetics-apply:disabled { opacity: .45; cursor: not-allowed; }
  .profile-cosmetics-status { min-height: 1.25rem; margin: .65rem 0 0; color: var(--cosmetics-muted); font: var(--cosmetics-label-size)/1.45 var(--cosmetics-body); }
  .profile-cosmetics-status.error-message { color: var(--cosmetics-danger); }
  @media (max-width: 900px) { .profile-cosmetics-layout { grid-template-columns: 1fr; } .profile-cosmetics-name-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .profile-cosmetics-visual-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 700px) { .profile-cosmetics-studio-grid { grid-template-columns: 1fr; } .profile-cosmetics-studio-card { grid-template-columns: minmax(0, 1fr) 140px; } .profile-cosmetics-studio-grid .profile-cosmetics-apply { width: 100%; } }

  @container profile-cosmetics (max-width: 42rem) {
    .profile-cosmetics-name-grid { grid-template-columns: minmax(0, 1fr); }
    :global(.profile-cosmetics-surface--compact) .profile-cosmetics-visual-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    :global(.profile-cosmetics-surface--compact) .profile-cosmetics-name-grid .profile-cosmetics-slot + .profile-cosmetics-slot { margin-top: .55rem; margin-left: 0; padding-top: .55rem; padding-left: 0; border-top: 1px solid var(--cosmetics-border); border-left: 0; }
    .profile-cosmetics-name-control { display: grid; grid-template-columns: minmax(0, 1fr) minmax(7rem, 9rem); align-items: center; gap: .55rem; }
    .profile-cosmetics-name-grid .profile-cosmetics-slot select { padding-right: .7rem !important; }
    .profile-cosmetics-name-preview { position: static; width: 100%; height: 2.5rem; transform: none; justify-content: flex-start; }
    .profile-cosmetics-name-preview :global(.shop-preview-area[data-render-context="name-control"]),
    .profile-cosmetics-name-preview :global(.shop-preview-text),
    .profile-cosmetics-name-preview :global(.name-effect-canvas) { justify-content: flex-start; text-align: left; }
    :global(.profile-cosmetics-surface--compact) .profile-cosmetics-section-heading button { position: static; justify-self: start; min-height: 2.5rem; }
    .profile-cosmetics-apply { width: 100%; min-height: 2.75rem; }
  }

  @container profile-cosmetics (max-width: 26rem) {
    :global(.profile-cosmetics-surface--compact) .profile-cosmetics-visual-grid { grid-template-columns: minmax(0, 1fr); }
    :global(.profile-cosmetics-surface--compact) .profile-cosmetics-visual-grid .profile-cosmetics-slot { grid-template-columns: 5rem minmax(0, 1fr); align-items: center; gap: .35rem .7rem; padding: .55rem; }
    :global(.profile-cosmetics-surface--compact) .profile-cosmetics-visual-grid .profile-cosmetics-visual-preview { grid-row: 1 / span 2; width: 5rem; height: 4.5rem; min-height: 4.5rem; }
    .profile-cosmetics-name-control { grid-template-columns: minmax(0, 1fr); }
  }
</style>
