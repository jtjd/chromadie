/**
 * Apply cosmetic slots sequentially while always reconciling the visible
 * loadout from the server after a partial or failed mutation.
 */
/** @param {string} itemKey */
function defaultGetItem(itemKey) {
  void itemKey;
  return null;
}

/** @param {any} item */
function defaultHasEntitlement(item) {
  void item;
  return true;
}

export async function applyCosmeticChanges({
  changedSlots = [],
  previewLoadout = {},
  equippedItems = {},
  getItem = defaultGetItem,
  hasEntitlement = defaultHasEntitlement,
  rpc,
  refresh
}) {
  const appliedSlots = [];
  const knownLoadout = { ...(equippedItems || {}) };
  const refreshAuthoritative = async fallback => {
    try {
      const refreshed = await refresh?.();
      if (refreshed?.equipped_cosmetics && typeof refreshed.equipped_cosmetics === 'object') {
        return { ok: true, loadout: { ...refreshed.equipped_cosmetics } };
      }
    } catch {
      // Keep the last known server snapshot when the reconciliation read fails.
    }
    return { ok: false, loadout: { ...(fallback || {}) } };
  };

  let mutationError = null;
  try {
    for (const slot of changedSlots) {
      const item = previewLoadout[slot] ? getItem(previewLoadout[slot]) : null;
      if (item && !hasEntitlement(item)) {
        throw new Error(`${item.name} is not unlocked for this profile yet.`);
      }
      const response = await rpc(
        item ? 'equip_item' : 'unequip_item',
        item ? { p_item_key: item.item_key } : { p_slot: slot }
      );
      if (response?.error || !response?.data?.success) {
        throw new Error(response?.error?.message || response?.data?.error || 'The appearance change could not be saved.');
      }
      appliedSlots.push(slot);
      if (item) knownLoadout[slot] = item.item_key;
      else delete knownLoadout[slot];
    }
  } catch (error) {
    mutationError = error;
  }

  const reconciliation = await refreshAuthoritative(knownLoadout);
  if (mutationError) {
    return {
      success: false,
      loadout: reconciliation.loadout,
      appliedSlots,
      error: mutationError?.message || 'The appearance change could not be saved.'
    };
  }
  if (!reconciliation.ok) {
    return {
      success: false,
      loadout: reconciliation.loadout,
      appliedSlots,
      error: 'The change saved, but the profile could not be refreshed.'
    };
  }
  return { success: true, loadout: reconciliation.loadout, appliedSlots };
}
