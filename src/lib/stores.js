import { derived, writable, get } from 'svelte/store'
import { supabase } from './supabase'
import { resolveAccountState } from './authState'
import { clearAllViewState } from './viewState.js'
import { resolveNameFontKey } from './name/nameFonts.js'
import { resolveNameMaterialKey } from './name/nameMaterials.js'
import { resolveNameMotionKey } from './name/nameMotions.js'
import { isProfileBorderKey } from './profile-border/profileBorders.js'
import { getCursorTrailKey } from './cursor-trail/cursorTrails.js'
import { isAvatarEffectKey } from './avatar-effect/avatarEffects.js'
import { isPaidProfileLayoutKey } from './profile-layout/profileLayouts.js'

// --- Auth & Profile State ---
export const session = writable(null)
export const profile = writable(null)
export const authUser = derived(session, $session => $session?.user ?? null)
export const isGuest = derived(session, $session => !$session)
export const guestProgressActive = writable(false)
export const authInitialized = writable(false)
export const authEvent = writable('INITIAL_SESSION')
export const profileReady = writable(false)
export const profileLoadFailed = writable(false)
export const profileLoading = derived(
    [authInitialized, session, profileReady, profileLoadFailed],
    ([$authInitialized, $session, $profileReady, $profileLoadFailed]) => Boolean(
        $authInitialized
        && $session
        && !$profileReady
        && !$profileLoadFailed
    )
)
export const profileError = derived(profileLoadFailed, $profileLoadFailed => $profileLoadFailed)
export const accountState = derived(
    [authInitialized, session, profile, profileReady, profileLoadFailed],
    ([$initialized, $session, $profile, $profileReady, $profileLoadFailed]) => resolveAccountState({
        initialized: $initialized,
        session: $session,
        profile: $profile,
        profileReady: $profileReady,
        profileLoadFailed: $profileLoadFailed
    })
)
export const isAuthenticated = derived(
    [session, profile, profileLoadFailed],
    ([$session, $profile, $profileLoadFailed]) => Boolean(
        $session && !$profileLoadFailed && $profile && $profile.id === $session.user.id
    )
)

// --- Shop & Inventory State ---
export const shopItems = writable({})
export const shopItemsLoading = writable(true)
export const shopItemsError = writable(null)
export const userInventory = writable([])
export const equippedItems = writable({})
export const walletBalance = writable(0)
export const profileEntitlements = writable([])

// --- Progression State ---
export const rerollShards = writable(0)
export const equippedBadges = writable([])
export const followedUsers = writable([])

// --- UI State ---
export const selectedUserId = writable(null)
export const toasts = writable([])

export function addToast(message, type = 'error') {
    const id = Math.random().toString(36).substring(7)
    toasts.update(t => [...t, { id, message, type }])
    setTimeout(() => {
        toasts.update(t => t.filter(x => x.id !== id))
    }, 4000)
}

export function clearUserState() {
    profile.set(null)
    userInventory.set([])
    equippedItems.set({})
    walletBalance.set(0)
    profileEntitlements.set([])
    rerollShards.set(0)
    equippedBadges.set([])
    followedUsers.set([])
}

export function clearLocalAccountCache({ clearShopCache = false } = {}) {
    const keysToRemove = ['chromadie-roll']
    guestProgressActive.set(false)

    try {
        for (let i = localStorage.length - 1; i >= 0; i -= 1) {
            const key = localStorage.key(i)
            if (key && key.startsWith('chromadie-reroll-lock:')) {
                keysToRemove.push(key)
            }
        }

        if (clearShopCache) {
            keysToRemove.push('shop_cache', 'shop_cache:v2', 'shop_cache:v3', 'shop_cache:v4')
        }

        keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch {
        // Ignore storage failures in hardened/private browsing modes.
    }

    clearAllViewState()
}

const SHOP_CACHE_KEY = 'shop_cache:v4'
const SHOP_CACHE_SHAPE_VERSION = 4
const SHOP_SLOTS = new Set(['consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout'])
const NAME_RENDERER_SLOTS = new Set(['name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout'])

function normalizeShopItem(item) {
    if (!item || typeof item !== 'object' || !/^[a-z0-9_]{1,80}$/.test(item.item_key || '')) return null
    if (!SHOP_SLOTS.has(item.slot) || !['text', 'renderer'].includes(item.css_type)) return null
    if (item.css_type === 'renderer') {
        if (!NAME_RENDERER_SLOTS.has(item.slot)) return null
        const rendererKey = String(item.css_value || '')
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
                            : isPaidProfileLayoutKey(rendererKey) ? rendererKey : ''
        if (resolvedKey !== rendererKey || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rendererKey)) return null
    } else if (NAME_RENDERER_SLOTS.has(item.slot)) {
        return null
    }
    const cost = Number(item.cost)
    if (!Number.isSafeInteger(cost) || cost < 0) return null
    const accessTier = item.access_tier || 'earned'
    if (!['free', 'earned', 'premium'].includes(accessTier)) return null
    const entitlementKey = item.entitlement_key == null ? null : String(item.entitlement_key)
    if (entitlementKey && !/^[a-z0-9_]{1,80}$/.test(entitlementKey)) return null
    if (accessTier === 'premium' && !entitlementKey) return null
    const catalogStatus = item.catalog_status || 'active'
    if (!['active', 'legacy', 'retired'].includes(catalogStatus)) return null
    return { ...item, cost, access_tier: accessTier, entitlement_key: entitlementKey, catalog_status: catalogStatus }
}

function normalizeShopItems(items) {
    if (!items || typeof items !== 'object' || Array.isArray(items)) return null
    if (Object.keys(items).length === 0) return null
    const normalized = {}
    for (const [key, value] of Object.entries(items)) {
        const item = normalizeShopItem(value)
        if (!item || item.item_key !== key) return null
        normalized[key] = item
    }
    return normalized
}

function getShopCache() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SHOP_CACHE_KEY) || '{}')
        if (parsed.shapeVersion !== SHOP_CACHE_SHAPE_VERSION) return {}
        const items = normalizeShopItems(parsed.items)
        return items ? { ...parsed, items } : {}
    } catch {
        return {};
    }
}

function setShopCache(cache) {
    try {
        localStorage.setItem(SHOP_CACHE_KEY, JSON.stringify({ ...cache, shapeVersion: SHOP_CACHE_SHAPE_VERSION }));
    } catch {
        // Ignore storage failures in hardened/private browsing modes.
    }
}

let shopLoadPromise = null

export function loadShopItems() {
    if (!shopLoadPromise) {
        shopLoadPromise = loadShopItemsOnce().finally(() => {
            shopLoadPromise = null
        })
    }
    return shopLoadPromise
}

async function loadShopItemsOnce() {
    shopItemsLoading.set(true)
    shopItemsError.set(null)

    try {
        const { data: meta, error: metaError } = await supabase
            .from('meta')
            .select('value')
            .eq('key', 'shop_version')
            .single();

        if (metaError) throw metaError

        const latestVersion = meta?.value;
        const cached = getShopCache();
        const cacheAgeMs = Date.now() - (cached.savedAt || 0);
        const cacheIsFresh = cacheAgeMs < 24 * 60 * 60 * 1000;

        if (cached.version === latestVersion && cached.items && cacheIsFresh) {
            shopItems.set(cached.items);
            return;
        }

        let { data, error: itemsError } = await supabase.rpc('get_shop_catalog');

        if (itemsError && ['42883', 'PGRST202'].includes(itemsError.code)) {
            const fallback = await supabase
                .from('shop_items')
                .select('item_key, name, slot, cost, css_type, css_value, rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status')
                .eq('catalog_status', 'active')
                .or(`available_from.is.null,available_from.lte.${new Date().toISOString().split('T')[0]}`)
                .or(`available_until.is.null,available_until.gte.${new Date().toISOString().split('T')[0]}`);
            data = fallback.data;
            itemsError = fallback.error;
        }

        if (itemsError) throw itemsError
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('The shop catalog is empty.')
        }

        const cache = {}
        data?.forEach(rawItem => {
            const item = normalizeShopItem(rawItem)
            if (item) cache[item.item_key] = item
        })
        if (Object.keys(cache).length !== (data || []).length) {
            throw new Error('The shop catalog contained an invalid item.')
        }
        shopItems.set(cache)
        setShopCache({ version: latestVersion, savedAt: Date.now(), items: cache });
    } catch {
        shopItemsError.set('The shop could not be loaded. Please refresh and try again.')
    } finally {
        shopItemsLoading.set(false)
    }
}

function expandInventoryRows(rows) {
    const items = []
    for (const row of rows || []) {
        if (!/^[a-z0-9_]{1,80}$/.test(row?.item_key || '')) continue
        const quantity = Math.min(1000, Math.max(1, Number(row?.quantity) || 1))
        for (let i = 0; i < quantity; i += 1) {
            items.push(row.item_key)
        }
    }
    return items
}

export async function fetchWalletBalance(expectedUserId = null) {
    const { data } = await supabase.rpc('get_wallet_balance')
    if (data !== null && (!expectedUserId || get(session)?.user?.id === expectedUserId)) {
        walletBalance.set(data)
    }
}

function normalizeEntitlementKeys(payload) {
    const values = Array.isArray(payload) ? payload : payload?.entitlements
    if (!Array.isArray(values)) return []
    return [...new Set(values
        .filter(value => typeof value === 'string' && /^[a-z0-9_]{1,80}$/.test(value))
    )].slice(0, 100)
}

export async function fetchProfileEntitlements(expectedUserId = null) {
    const { data, error } = await supabase.rpc('get_my_profile_entitlements')
    const items = error || data?.success === false ? [] : normalizeEntitlementKeys(data)
    if (!expectedUserId || get(session)?.user?.id === expectedUserId) {
        profileEntitlements.set(items)
    }
    return items
}

export async function fetchInventoryState(userId, expectedUserId = userId) {
    if (!userId) return []

    const { data } = await supabase
        .from('inventory')
        .select('item_key, quantity')
        .eq('user_id', userId)

    const items = expandInventoryRows(data)
    if (!expectedUserId || get(session)?.user?.id === expectedUserId) {
        userInventory.set(items)
    }
    return items
}

export async function refreshProfileState(expectedUserId = null) {
    const { data, error } = await supabase.rpc('get_my_profile')
    if (error || !data || data.success === false) {
        return null
    }

    if (expectedUserId && get(session)?.user?.id !== expectedUserId) {
        return null
    }

    profile.set(data)
    equippedItems.set(data.equipped_cosmetics || {})
    rerollShards.set(data.reroll_shards || 0)
    equippedBadges.set(data.equipped_badges || [])
    return data
}

// NEW: Global Toggle Follow function
export async function toggleFollow(targetId) {
    const { data, error } = await supabase.rpc('toggle_follow', { p_target_id: targetId });
    if (error) {
        addToast("Error updating rivals.", "error");
        return { success: false };
    }
    if (data.success) {
        if (data.action === 'followed') {
            followedUsers.update(f => [...f, targetId]);
            addToast("Added to Rivals!", "success");
        } else {
            followedUsers.update(f => f.filter(id => id !== targetId));
            addToast("Removed from Rivals.", "success");
        }
    } else {
        addToast(data.error, "error");
    }
    return data;
}

// Supabase warns against awaiting client work from inside onAuthStateChange.
// Keep the callback synchronous and hydrate account data in a separate task so
// token refresh and sign-out events cannot deadlock behind the auth lock.
let authEventId = 0

async function hydrateAuthenticatedUser(currentSession, expectedEventId) {
    try {
        await loadShopItems()
        if (expectedEventId !== authEventId) return

        const [profileRes, inventoryRes, walletRes, followsRes, entitlementsRes] = await Promise.all([
            supabase.rpc('get_my_profile'),
            supabase
                .from('inventory')
                .select('item_key, quantity')
                .eq('user_id', currentSession.user.id),
            supabase.rpc('get_wallet_balance'),
            supabase
                .from('user_follows')
                .select('followee_id')
                .eq('follower_id', currentSession.user.id),
            supabase.rpc('get_my_profile_entitlements')
        ])

        if (expectedEventId !== authEventId) return

        const { data: prof, error: profError } = profileRes
        if (profError || !prof || prof.success === false) {
            profileLoadFailed.set(true)
            return
        }

        profile.set(prof)
        equippedItems.set(prof.equipped_cosmetics || {})
        rerollShards.set(prof.reroll_shards || 0)
        equippedBadges.set(prof.equipped_badges || [])

        if (!inventoryRes.error) {
            userInventory.set(expandInventoryRows(inventoryRes.data))
        }
        if (!walletRes.error && walletRes.data !== null) {
            walletBalance.set(walletRes.data)
        }
        if (!followsRes.error) {
            followedUsers.set((followsRes.data || []).map(follow => follow.followee_id))
        }
        if (!entitlementsRes.error && entitlementsRes.data?.success !== false) {
            profileEntitlements.set(normalizeEntitlementKeys(entitlementsRes.data))
        }
    } catch (error) {
        if (expectedEventId !== authEventId) return
        profileLoadFailed.set(true)
        console.error('Critical error while hydrating the authenticated account:', error)
    } finally {
        if (expectedEventId === authEventId) {
            profileReady.set(true)
        }
    }
}

supabase.auth.onAuthStateChange((eventName, currentSession) => {
    const nextAuthEventId = ++authEventId
    authEvent.set(eventName)
    authInitialized.set(true)
    session.set(currentSession)
    clearUserState()
    profileLoadFailed.set(false)

    if (!currentSession) {
        profileReady.set(true)
        return
    }

    profileReady.set(false)
    queueMicrotask(() => {
        void hydrateAuthenticatedUser(currentSession, nextAuthEventId)
    })
})
