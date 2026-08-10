<script>
  import { onMount } from 'svelte';
  import Surface from './foundation/Surface.svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';
  import {
    addToast,
    equippedItems,
    profile,
    profileEntitlements,
    refreshProfileState,
    session,
    loadShopItems,
    shopItems,
    shopItemsError,
    shopItemsLoading,
    userInventory
  } from './stores';
  import { supabase } from './supabase';
  import { trackProductEvent } from './productAnalytics.js';
  import { NAME_COMPOSABLE_SLOTS, applyNamePreviewLayer } from './name/nameLoadout.js';
  import { SHOP_SLOT_LABELS, createFittingRoom, hasShopEntitlement, isShopCosmetic } from './shopCatalog.js';
  import { hasChromadiePlus } from './premiumEntitlements.js';

  export let accountProfile = null;
  export let profileConfig = null;
  export let entitlements = [];
  export let staff = false;

  let previewLoadout = /** @type {Record<string, string>} */ ({});
  let selectedItem = null;
  let loadingSlot = '';
  let status = '';
  let error = '';
  let syncedLoadoutKey = '';
  let atmosphereStrength = 45;
  let animationsEnabled = true;

  const NAME_DEFAULT_LABELS = Object.freeze({
    name_font: 'Platform default font',
    name_material: 'Plain material',
    name_motion: 'Still motion'
  });
  const COSMETIC_SLOTS = Object.freeze([
    ...NAME_COMPOSABLE_SLOTS,
    'profile_border',
    'avatar_effect',
    'cursor_trail',
    'profile_layout',
    'profile_atmosphere'
  ]);

  $: account = { ...($profile || {}), ...(accountProfile || {}) };
  $: username = account.username || 'Chromanaut';
  $: displayColor = account.mood_color || '#7B5CFF';
  $: plusUnlocked = Boolean(staff || hasChromadiePlus(entitlements));
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
  $: avatarItems = ownedCosmetics.filter(item => item.slot === 'avatar_effect');
  $: cursorItems = ownedCosmetics.filter(item => item.slot === 'cursor_trail');
  $: atmosphereItems = ownedCosmetics.filter(item => item.slot === 'profile_atmosphere');
  $: layoutItems = ownedCosmetics.filter(item => item.slot === 'profile_layout');
  $: hasPendingChanges = COSMETIC_SLOTS.some(slot => (previewLoadout[slot] || '') !== ($equippedItems[slot] || ''));
  $: equippedKey = JSON.stringify($equippedItems || {});
  $: syncEquippedLoadout(equippedKey, $equippedItems);

  onMount(() => {
    void loadShopItems();
  });

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

  function resetNameEffects() {
    previewLoadout = {
      ...previewLoadout,
      ...Object.fromEntries(NAME_COMPOSABLE_SLOTS.map(slot => [slot, $equippedItems?.[slot] || '']))
    };
    selectedItem = null;
    error = '';
    status = 'Name effects reset to the equipped profile.';
  }

  async function applyChanges() {
    if (loadingSlot || !hasPendingChanges) return;
    const changedSlots = COSMETIC_SLOTS.filter(slot => (previewLoadout[slot] || '') !== ($equippedItems[slot] || ''));
    loadingSlot = 'all';
    error = '';
    status = `Applying ${changedSlots.length} appearance ${changedSlots.length === 1 ? 'change' : 'changes'}…`;

    try {
      for (const slot of changedSlots) {
        const item = previewLoadout[slot] ? $shopItems[previewLoadout[slot]] : null;
        const { data, error: rpcError } = item
          ? await supabase.rpc('equip_item', { p_item_key: item.item_key })
          : await supabase.rpc('unequip_item', { p_slot: slot });
        if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'The appearance change could not be saved.');
        if (item) trackProductEvent('shop_equip', { slot, context: 'profile' });
      }

      const userId = $session?.user?.id;
      const refreshedProfile = userId ? await refreshProfileState(userId) : null;
      if (!refreshedProfile) throw new Error('The change saved, but the profile could not be refreshed.');
      previewLoadout = { ...(refreshedProfile.equipped_cosmetics || {}) };
      syncedLoadoutKey = JSON.stringify(previewLoadout);
      status = `${changedSlots.length} appearance ${changedSlots.length === 1 ? 'change' : 'changes'} applied.`;
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
        <h2 id="profile-cosmetics-title">Collection</h2>
        <p>Preview and equip owned expression layers.</p>
      </div>
    </div>

    {#if plusUnlocked}
      <aside class="profile-cosmetics-plus-guide" aria-labelledby="profile-cosmetics-plus-guide-title">
        <div class="profile-cosmetics-plus-guide__intro">
          <span class="profile-cosmetics-plus-guide__eyebrow">Chromadie Plus</span>
          <h3 id="profile-cosmetics-plus-guide-title">Atelier expression is ready</h3>
          <p>The Atelier name treatment and atmosphere are separate layers. Choose your expression below, preview it, then press <strong>Apply changes</strong>.</p>
        </div>
        <nav class="profile-cosmetics-plus-guide__links" aria-label="Atelier expression shortcuts">
          <a href="#cosmetic-name_motion"><strong>Name effect</strong><span>Collection → Name · Motion</span><b aria-hidden="true">↗</b></a>
          <a href="#cosmetic-profile-atmosphere"><strong>Background atmosphere</strong><span>Collection → Atmosphere</span><b aria-hidden="true">↗</b></a>
          <a href="#customize"><strong>Atelier template</strong><span>Customize → Templates</span><b aria-hidden="true">↗</b></a>
        </nav>
      </aside>
    {/if}

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
            <span>Expression</span>
            <strong>Profile effects</strong>
            <p>Preview each layer, then apply the complete expression together.</p>
          </div>

          <div class="profile-cosmetics-section-heading">
            <h3>Name effects</h3>
            <p>These effects are applied to your username.</p>
            <button type="button" on:click={resetNameEffects}>Reset name effects</button>
          </div>

          <div class="profile-cosmetics-name-grid">
            {#each NAME_COMPOSABLE_SLOTS as slot (slot)}
              <div class="profile-cosmetics-slot">
                <div>
                  <label for={`cosmetic-${slot}`}>{SHOP_SLOT_LABELS[slot]}</label>
                  <div class="profile-cosmetics-name-control">
                    <select id={`cosmetic-${slot}`} value={previewLoadout[slot] || ''} disabled={!!loadingSlot} on:change={event => previewSlot(slot, event.currentTarget.value)}>
                      <option value="">{NAME_DEFAULT_LABELS[slot]}</option>
                      {#each ownedCosmetics.filter(item => item.slot === slot) as item (item.item_key)}
                        <option value={item.item_key}>{item.name}</option>
                      {/each}
                    </select>
                    <span aria-hidden="true">{username}</span>
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
              <div class="profile-cosmetics-visual-preview profile-cosmetics-visual-preview--avatar" aria-hidden="true"><span>✦</span></div>
              <div>
                <label for="cosmetic-avatar-effect">Avatar effect</label>
                <select id="cosmetic-avatar-effect" value={previewLoadout['avatar_effect'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('avatar_effect', event.currentTarget.value)}>
                  <option value="">No avatar effect</option>
                  {#each avatarItems as item (item.item_key)}<option value={item.item_key}>{item.name}</option>{/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot">
              <div class="profile-cosmetics-visual-preview profile-cosmetics-visual-preview--border" aria-hidden="true"><span></span><b></b><i></i></div>
              <div>
                <label for="cosmetic-profile-border">Profile border</label>
                <select id="cosmetic-profile-border" value={previewLoadout['profile_border'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('profile_border', event.currentTarget.value)}>
                  <option value="">No border</option>
                  {#each borderItems as item (item.item_key)}
                    <option value={item.item_key}>{item.name}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot">
              <div class="profile-cosmetics-visual-preview profile-cosmetics-visual-preview--cursor" aria-hidden="true"><span>·</span><i>·</i><b>·</b><em>·</em></div>
              <div>
                <label for="cosmetic-cursor-trail">Cursor trail</label>
                <select id="cosmetic-cursor-trail" value={previewLoadout['cursor_trail'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('cursor_trail', event.currentTarget.value)}>
                  <option value="">No cursor trail</option>
                  {#each cursorItems as item (item.item_key)}<option value={item.item_key}>{item.name}</option>{/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot profile-cosmetics-slot--paid-layout">
              <div class="profile-cosmetics-visual-preview profile-cosmetics-visual-preview--layout" aria-hidden="true"><span></span><i></i><b></b></div>
              <div>
                <label for="cosmetic-profile-layout">Paid layout</label>
                <select id="cosmetic-profile-layout" value={previewLoadout['profile_layout'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('profile_layout', event.currentTarget.value)}>
                  <option value="">Use saved free layout</option>
                  {#each layoutItems as item (item.item_key)}<option value={item.item_key}>{item.name}</option>{/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot">
              <div class="profile-cosmetics-visual-preview profile-cosmetics-visual-preview--atmosphere" aria-hidden="true"><span></span><i></i><b></b></div>
              <div>
                <label for="cosmetic-profile-atmosphere">Profile atmosphere</label>
                <select id="cosmetic-profile-atmosphere" value={previewLoadout['profile_atmosphere'] || ''} disabled={!!loadingSlot} on:change={event => previewSlot('profile_atmosphere', event.currentTarget.value)}>
                  <option value="">No atmosphere</option>
                  {#each atmosphereItems as item (item.item_key)}<option value={item.item_key}>{item.name}</option>{/each}
                </select>
              </div>
            </div>

            <div class="profile-cosmetics-slot profile-cosmetics-slot--atmosphere-strength">
              <div class="profile-cosmetics-visual-preview profile-cosmetics-visual-preview--strength" aria-hidden="true"><span style={`--strength:${atmosphereStrength}%`}></span></div>
              <label class="profile-cosmetics-strength-label" for="cosmetic-atmosphere-strength"><span>Atmosphere strength</span><output>{atmosphereStrength}%</output></label>
              <input id="cosmetic-atmosphere-strength" class="profile-cosmetics-strength" type="range" min="0" max="100" bind:value={atmosphereStrength} />
              <label class="profile-cosmetics-animations"><span>Animations</span><span class="profile-cosmetics-animations__state">{animationsEnabled ? 'On' : 'Off'} <input type="checkbox" bind:checked={animationsEnabled} /></span></label>
              <button type="button" class="profile-cosmetics-restart" on:click={() => animationsEnabled = true}>Restart animations</button>
            </div>
          </div>

          <button type="button" class="profile-cosmetics-apply" disabled={!!loadingSlot || !hasPendingChanges} on:click={applyChanges}>{loadingSlot ? 'Applying…' : 'Apply changes'}</button>
        </div>
      </div>

      <p role={error ? 'alert' : 'status'} aria-live="polite" class:error-message={Boolean(error)} class="profile-cosmetics-status">{error || status}</p>
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
  .profile-cosmetics-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .profile-cosmetics-heading h2 { margin: 0; color: var(--cosmetics-text); font: 600 var(--customize-subheading-size, .88rem) / 1.25 var(--cosmetics-body); }
  .profile-cosmetics-heading p { max-width: 42rem; margin: .35rem 0 0; color: var(--cosmetics-muted); font-size: var(--cosmetics-label-size); line-height: 1.45; }
  .profile-cosmetics-plus-guide { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, .9fr); gap: 1rem; margin: 0 0 1rem; padding: .8rem; border: 1px solid color-mix(in srgb, var(--cosmetics-expression) 30%, var(--cosmetics-border)); border-radius: var(--cosmetics-radius); background: color-mix(in srgb, var(--cosmetics-expression) 7%, var(--cosmetics-surface)); font-family: var(--cosmetics-body); }
  .profile-cosmetics-plus-guide__intro { display: grid; align-content: start; gap: .35rem; }
  .profile-cosmetics-plus-guide__eyebrow { color: var(--cosmetics-expression); font: 700 var(--cosmetics-label-size) / 1.2 var(--cosmetics-mono); letter-spacing: .12em; text-transform: uppercase; }
  .profile-cosmetics-plus-guide h3 { margin: 0; color: var(--cosmetics-text); font: 600 var(--customize-subheading-size, .88rem) / 1.25 var(--cosmetics-body); }
  .profile-cosmetics-plus-guide p { max-width: 38rem; margin: 0; color: var(--cosmetics-muted); font-size: var(--cosmetics-label-size); line-height: 1.5; }
  .profile-cosmetics-plus-guide__links { display: grid; gap: .45rem; }
  .profile-cosmetics-plus-guide__links a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .12rem .6rem; align-items: center; padding: .55rem .65rem; border: 1px solid var(--cosmetics-border); border-radius: var(--cosmetics-radius); background: var(--cosmetics-inset); color: var(--cosmetics-text); font-family: var(--cosmetics-body); text-decoration: none; }
  .profile-cosmetics-plus-guide__links a:hover { border-color: var(--cosmetics-neutral); background: color-mix(in srgb, var(--cosmetics-neutral) 9%, var(--cosmetics-inset)); }
  .profile-cosmetics-plus-guide__links a:focus-visible { border-color: var(--cosmetics-focus); outline: 2px solid var(--cosmetics-focus); outline-offset: 2px; }
  .profile-cosmetics-plus-guide__links strong { min-width: 0; font-size: var(--cosmetics-label-size); }
  .profile-cosmetics-plus-guide__links span { min-width: 0; overflow: hidden; color: var(--cosmetics-muted); font-size: var(--cosmetics-label-size); text-overflow: ellipsis; white-space: nowrap; }
  .profile-cosmetics-plus-guide__links b { grid-column: 2; grid-row: 1 / span 2; color: var(--cosmetics-expression); font: 600 var(--cosmetics-label-size)/1 var(--cosmetics-mono); }
  .profile-cosmetics-layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(18rem, .85fr); gap: 1rem; align-items: start; }
  .profile-cosmetics-preview { min-width: 0; }
  .profile-cosmetics-controls { display: grid; gap: .65rem; min-width: 0; padding: .25rem 0; border: 0; border-radius: 0; background: transparent; font-family: var(--cosmetics-body); }
  .profile-cosmetics-controls__heading { display: grid; gap: .3rem; padding-bottom: .15rem; }
  .profile-cosmetics-controls__heading span { color: var(--cosmetics-expression); font: 700 var(--cosmetics-label-size) / 1.2 var(--cosmetics-mono); letter-spacing: .12em; text-transform: uppercase; }
  .profile-cosmetics-controls__heading strong { color: var(--cosmetics-text); font-size: var(--customize-subheading-size, .88rem); line-height: 1.25; }
  .profile-cosmetics-controls__heading p { margin: 0; color: var(--cosmetics-muted); font-size: var(--cosmetics-label-size); line-height: 1.45; }
  .profile-cosmetics-section-heading { position: relative; display: grid; gap: .25rem; padding: .35rem 0 .1rem; border-bottom: 1px solid var(--cosmetics-border); }
  .profile-cosmetics-section-heading h3 { margin: 0; color: var(--cosmetics-text); font-size: .88rem; }
  .profile-cosmetics-section-heading p { margin: 0 0 .3rem; color: var(--cosmetics-muted); font-size: .7rem; }
  .profile-cosmetics-section-heading button { position: absolute; top: .1rem; right: 0; min-height: var(--cosmetics-primary-height); padding: .4rem .65rem; border: 1px solid var(--cosmetics-border-strong); border-radius: var(--cosmetics-radius); background: transparent; color: var(--cosmetics-secondary); font: 600 var(--cosmetics-label-size)/1 var(--cosmetics-body); cursor: pointer; }
  .profile-cosmetics-section-heading button:hover, .profile-cosmetics-section-heading button:focus-visible { border-color: var(--cosmetics-focus); color: var(--cosmetics-text); }
  .profile-cosmetics-section-heading button:focus-visible { outline: 2px solid var(--cosmetics-focus); outline-offset: 2px; }
  .profile-cosmetics-section-heading--visual { margin-top: .3rem; }
  .profile-cosmetics-name-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; padding: .65rem; border: 1px solid var(--cosmetics-border); border-radius: var(--cosmetics-radius); background: var(--cosmetics-inset); }
  .profile-cosmetics-visual-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .55rem; }
  .profile-cosmetics-slot { display: grid; grid-template-columns: minmax(0, 1fr); gap: .35rem .7rem; align-items: end; padding-top: .15rem; border-top: 0; }
  .profile-cosmetics-name-control { position: relative; min-width: 0; }
  .profile-cosmetics-name-control span { position: absolute; right: .65rem; top: 50%; max-width: 42%; overflow: hidden; color: var(--ctp-lavender, #b4befe); font: 700 .82rem/1 var(--cosmetics-body); pointer-events: none; text-overflow: ellipsis; transform: translateY(-50%); white-space: nowrap; }
  .profile-cosmetics-name-control select { padding-right: 5rem; }
  .profile-cosmetics-visual-preview { position: relative; display: grid; min-height: 4.25rem; place-items: center; overflow: hidden; border: 1px solid var(--cosmetics-border); border-radius: var(--cosmetics-radius); background: var(--ctp-mantle, #181825); }
  .profile-cosmetics-visual-preview--border { grid-template-columns: 2.4rem minmax(0, 1fr); gap: .35rem; padding: .45rem; }
  .profile-cosmetics-visual-preview--border span { width: 2rem; height: 2rem; border: 1px solid var(--ctp-lavender, #b4befe); border-radius: 50%; background: var(--ctp-surface1, #45475a); }
  .profile-cosmetics-visual-preview--border b, .profile-cosmetics-visual-preview--border i { display: block; width: 80%; height: .34rem; border-radius: .2rem; background: var(--ctp-text, #cdd6f4); }
  .profile-cosmetics-visual-preview--border i { width: 60%; margin-top: .35rem; opacity: .5; }
  .profile-cosmetics-visual-preview--avatar span { display: grid; width: 2.45rem; height: 2.45rem; place-items: center; border: 1px solid var(--ctp-mauve, #cba6f7); border-radius: 50%; color: var(--ctp-mauve, #cba6f7); box-shadow: 0 0 0 .22rem color-mix(in srgb, var(--ctp-mauve, #cba6f7) 20%, transparent); }
  .profile-cosmetics-visual-preview--cursor { display: flex; gap: .45rem; color: var(--ctp-lavender, #b4befe); font-size: 1.4rem; }
  .profile-cosmetics-visual-preview--cursor i { opacity: .7; }
  .profile-cosmetics-visual-preview--cursor b { opacity: .48; }
  .profile-cosmetics-visual-preview--cursor em { opacity: .25; }
  .profile-cosmetics-visual-preview--layout { align-content: center; gap: .45rem; padding: .6rem; }
  .profile-cosmetics-visual-preview--layout span, .profile-cosmetics-visual-preview--layout i, .profile-cosmetics-visual-preview--layout b { display: block; height: .38rem; border-radius: .2rem; background: var(--ctp-sapphire, #74c7ec); }
  .profile-cosmetics-visual-preview--layout span { width: 75%; }
  .profile-cosmetics-visual-preview--layout i { width: 58%; opacity: .7; }
  .profile-cosmetics-visual-preview--layout b { width: 85%; opacity: .45; }
  .profile-cosmetics-visual-preview--atmosphere { align-content: center; gap: .4rem; padding: .6rem; background: var(--ctp-surface0, #313244); }
  .profile-cosmetics-visual-preview--atmosphere span, .profile-cosmetics-visual-preview--atmosphere i, .profile-cosmetics-visual-preview--atmosphere b { display: block; width: 90%; height: .2rem; border-radius: .15rem; background: var(--ctp-sky, #89dceb); opacity: .75; transform: rotate(-10deg); }
  .profile-cosmetics-visual-preview--atmosphere i { width: 70%; opacity: .45; }
  .profile-cosmetics-visual-preview--atmosphere b { width: 82%; opacity: .3; }
  .profile-cosmetics-visual-preview--strength { display: block; min-height: 2.7rem; padding: .65rem; background: var(--ctp-mantle, #181825); }
  .profile-cosmetics-visual-preview--strength span { display: block; width: var(--strength, 45%); height: .4rem; border-radius: .2rem; background: var(--ctp-green, #a6e3a1); }
  .profile-cosmetics-strength-label, .profile-cosmetics-animations { display: flex; align-items: center; justify-content: space-between; gap: .4rem; color: var(--cosmetics-secondary); font-size: var(--cosmetics-label-size); }
  .profile-cosmetics-slot .profile-cosmetics-strength-label,
  .profile-cosmetics-slot .profile-cosmetics-animations { display: flex; margin-bottom: 0; }
  .profile-cosmetics-strength-label output { color: var(--cosmetics-faint); font-family: var(--cosmetics-mono); }
  .profile-cosmetics-strength { width: 100%; accent-color: var(--ctp-green, #a6e3a1); }
  .profile-cosmetics-animations__state { display: inline-flex; align-items: center; gap: .35rem; color: var(--cosmetics-text); }
  .profile-cosmetics-animations input { accent-color: var(--ctp-green, #a6e3a1); }
  .profile-cosmetics-restart { min-height: 1.8rem; border: 1px solid var(--cosmetics-border-strong); border-radius: var(--cosmetics-radius); background: transparent; color: var(--cosmetics-secondary); font: 600 var(--cosmetics-label-size)/1 var(--cosmetics-body); cursor: pointer; }
  .profile-cosmetics-slot label { display: block; margin-bottom: .3rem; color: var(--cosmetics-secondary); font-weight: 600; font-size: var(--cosmetics-label-size); line-height: 1.3; }
  .profile-cosmetics-slot select { width: 100%; min-height: var(--cosmetics-primary-height); box-sizing: border-box; border: 1px solid var(--cosmetics-border-strong); border-radius: var(--cosmetics-radius); padding: 0 .65rem; background: var(--cosmetics-raised); color: var(--cosmetics-text); font: 500 var(--cosmetics-control-size) / 1 var(--cosmetics-body); }
  .profile-cosmetics-slot select:focus-visible { border-color: var(--cosmetics-focus); outline: 2px solid var(--cosmetics-focus); outline-offset: 1px; }
  .profile-cosmetics-slot select:disabled { cursor: not-allowed; opacity: .58; }
  .profile-cosmetics-apply { grid-column: 1 / -1; justify-self: end; min-height: var(--cosmetics-primary-height); padding: 0 1rem; border: 1px solid var(--cosmetics-save); border-radius: var(--cosmetics-radius); background: var(--cosmetics-save); color: var(--cosmetics-inset); font: 700 var(--cosmetics-label-size) / 1 var(--cosmetics-body); cursor: pointer; }
  .profile-cosmetics-apply:hover:not(:disabled) { background: color-mix(in srgb, var(--cosmetics-save) 82%, var(--cosmetics-text)); }
  .profile-cosmetics-apply:focus-visible { outline: 2px solid var(--cosmetics-focus); outline-offset: 2px; }
  .profile-cosmetics-apply:disabled { opacity: .45; cursor: not-allowed; }
  .profile-cosmetics-status { min-height: 1.25rem; margin: .65rem 0 0; color: var(--cosmetics-muted); font: var(--cosmetics-label-size)/1.45 var(--cosmetics-body); }
  .profile-cosmetics-status.error-message { color: var(--cosmetics-danger); }
  @media (max-width: 900px) { .profile-cosmetics-layout, .profile-cosmetics-plus-guide { grid-template-columns: 1fr; } .profile-cosmetics-name-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .profile-cosmetics-visual-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 42rem) { .profile-cosmetics-name-grid, .profile-cosmetics-visual-grid { grid-template-columns: minmax(0, 1fr); } .profile-cosmetics-section-heading button { position: static; justify-self: start; } }
  @media (prefers-reduced-motion: reduce) { .profile-cosmetics-plus-guide__links a { transition: none; } }
</style>
