import { writable } from 'svelte/store';
import { supabase } from './supabase';
import { resolveNameFontKey } from './name/nameFonts.js';
import { resolveNameMaterialKey } from './name/nameMaterials.js';
import { resolveNameMotionKey } from './name/nameMotions.js';
import { isProfileBorderKey } from './profile-border/profileBorders.js';
import { getCursorTrailKey } from './cursor-trail/cursorTrails.js';
import { isAvatarEffectKey } from './avatar-effect/avatarEffects.js';
import { isProfileLayoutKey } from './profile-layout/profileLayouts.js';
import { isAtmosphereKey } from './profile-atmosphere/atmospheres.js';
import { isProfileMotionKey } from './profile-motion/profileMotions.js';

// Catalog projection is independent from account hydration. Keeping it in its
// own store makes a server-contract failure local to cosmetics rather than an
// implicit dependency of auth, profile, and social startup.
export const cosmeticCatalogItems = writable({});
export const cosmeticCatalogLoading = writable(true);
export const cosmeticCatalogError = writable(null);

const SHOP_CACHE_KEY = 'cosmetic_catalog:v6';
const SHOP_CACHE_SHAPE_VERSION = 6;
const SHOP_SLOTS = new Set(['consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion']);
const NAME_RENDERER_SLOTS = new Set(['name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion']);

function normalizeShopItem(item) {
  if (!item || typeof item !== 'object' || !/^[a-z0-9_]{1,80}$/.test(item.item_key || '')) return null;
  if (!SHOP_SLOTS.has(item.slot) || !['text', 'renderer'].includes(item.css_type)) return null;
  if (item.css_type === 'renderer') {
    if (!NAME_RENDERER_SLOTS.has(item.slot)) return null;
    const rendererKey = String(item.css_value || '');
    const resolvedKey = item.slot === 'profile_border'
      ? (isProfileBorderKey(rendererKey) ? rendererKey : '')
      : item.slot === 'name_font'
        ? resolveNameFontKey(rendererKey)
        : item.slot === 'name_material'
          ? resolveNameMaterialKey(rendererKey)
          : item.slot === 'name_motion'
            ? resolveNameMotionKey(rendererKey)
            : item.slot === 'cursor_trail'
              ? getCursorTrailKey(rendererKey)
              : item.slot === 'avatar_effect'
                ? (isAvatarEffectKey(rendererKey) ? rendererKey : '')
                : item.slot === 'profile_layout'
                  ? (isProfileLayoutKey(rendererKey) ? rendererKey : '')
                  : item.slot === 'profile_atmosphere'
                    ? (isAtmosphereKey(rendererKey) ? rendererKey : '')
                    : item.slot === 'profile_motion'
                      ? (isProfileMotionKey(rendererKey) ? rendererKey : '')
                      : '';
    if (resolvedKey !== rendererKey || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rendererKey)) return null;
  } else if (NAME_RENDERER_SLOTS.has(item.slot)) {
    return null;
  }
  const cost = Number(item.cost);
  if (!Number.isSafeInteger(cost) || cost < 0) return null;
  const accessTier = item.access_tier || 'earned';
  if (!['free', 'earned', 'premium'].includes(accessTier)) return null;
  const entitlementKey = item.entitlement_key == null ? null : String(item.entitlement_key);
  if (entitlementKey && !/^[a-z0-9_]{1,80}$/.test(entitlementKey)) return null;
  if (accessTier === 'premium' && !entitlementKey) return null;
  const catalogStatus = item.catalog_status || 'active';
  if (!['active', 'legacy', 'retired'].includes(catalogStatus)) return null;
  return { ...item, cost, access_tier: accessTier, entitlement_key: entitlementKey, catalog_status: catalogStatus };
}

function normalizeShopItems(items) {
  if (!items || typeof items !== 'object' || Array.isArray(items) || Object.keys(items).length === 0) return null;
  const normalized = {};
  for (const [key, value] of Object.entries(items)) {
    const item = normalizeShopItem(value);
    if (!item || item.item_key !== key) return null;
    normalized[key] = item;
  }
  return normalized;
}

function getShopCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHOP_CACHE_KEY) || '{}');
    if (parsed.shapeVersion !== SHOP_CACHE_SHAPE_VERSION) return {};
    const items = normalizeShopItems(parsed.items);
    return items ? { ...parsed, items } : {};
  } catch {
    return {};
  }
}

function setShopCache(cache) {
  try {
    localStorage.setItem(SHOP_CACHE_KEY, JSON.stringify({ ...cache, shapeVersion: SHOP_CACHE_SHAPE_VERSION }));
  } catch {
    // Catalog availability must not depend on browser storage.
  }
}

let catalogLoadPromise = null;

export function loadCosmeticCatalog() {
  if (!catalogLoadPromise) {
    catalogLoadPromise = loadCosmeticCatalogOnce().finally(() => {
      catalogLoadPromise = null;
    });
  }
  return catalogLoadPromise;
}

async function loadCosmeticCatalogOnce() {
  cosmeticCatalogLoading.set(true);
  cosmeticCatalogError.set(null);
  try {
    const { data: meta, error: metaError } = await supabase
      .from('meta')
      .select('value')
      .eq('key', 'shop_version')
      .single();
    if (metaError) throw metaError;

    const latestVersion = meta?.value;
    const cached = getShopCache();
    if (cached.version === latestVersion && cached.items && Date.now() - (cached.savedAt || 0) < 24 * 60 * 60 * 1000) {
      cosmeticCatalogItems.set(cached.items);
      return;
    }

    const { data, error } = await supabase.rpc('get_shop_catalog');
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) throw new Error('The cosmetic catalog is empty.');

    const cache = {};
    for (const rawItem of data) {
      const item = normalizeShopItem(rawItem);
      if (item) cache[item.item_key] = item;
    }
    if (Object.keys(cache).length !== data.length) throw new Error('The cosmetic catalog contained an invalid item.');
    cosmeticCatalogItems.set(cache);
    setShopCache({ version: latestVersion, savedAt: Date.now(), items: cache });
  } catch {
    cosmeticCatalogError.set('The cosmetic catalog could not be loaded. Please refresh and try again.');
  } finally {
    cosmeticCatalogLoading.set(false);
  }
}
