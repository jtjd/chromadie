import { derived, writable } from 'svelte/store'
import { supabase } from './supabase'

// --- Auth & Profile State ---
export const session = writable(null)
export const profile = writable(null)
export const authUser = derived(session, $session => $session?.user ?? null)
export const isGuest = derived(session, $session => !$session)
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
    rerollShards.set(0)
    equippedBadges.set([])
    followedUsers.set([])
}

export function clearLocalAccountCache({ clearShopCache = false } = {}) {
    const keysToRemove = ['chromadie-roll']

    try {
        for (let i = localStorage.length - 1; i >= 0; i -= 1) {
            const key = localStorage.key(i)
            if (key && key.startsWith('chromadie-reroll-lock:')) {
                keysToRemove.push(key)
            }
        }

        if (clearShopCache) {
            keysToRemove.push('shop_cache')
        }

        keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch {
        // Ignore storage failures in hardened/private browsing modes.
    }
}

function getShopCache() {
    try {
        return JSON.parse(localStorage.getItem('shop_cache') || '{}');
    } catch {
        return {};
    }
}

function setShopCache(cache) {
    try {
        localStorage.setItem('shop_cache', JSON.stringify(cache));
    } catch {
        // Ignore storage failures in hardened/private browsing modes.
    }
}

export async function loadShopItems() {
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

        const { data, error: itemsError } = await supabase
            .from('shop_items')
            .select('item_key, name, slot, cost, css_type, css_value, rarity, description, collection, stackable')
            .or(`available_from.is.null,available_from.lte.${new Date().toISOString().split('T')[0]}`)
            .or(`available_until.is.null,available_until.gte.${new Date().toISOString().split('T')[0]}`);

        if (itemsError) throw itemsError

        const cache = {}
        data?.forEach(item => { cache[item.item_key] = item })
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
        const quantity = Math.max(1, Number(row?.quantity) || 1)
        for (let i = 0; i < quantity; i += 1) {
            items.push(row.item_key)
        }
    }
    return items
}

export async function fetchWalletBalance() {
    const { data } = await supabase.rpc('get_wallet_balance')
    if (data !== null) {
        walletBalance.set(data)
    }
}

export async function fetchInventoryState(userId) {
    if (!userId) return []

    const { data } = await supabase
        .from('inventory')
        .select('item_key, quantity')
        .eq('user_id', userId)

    const items = expandInventoryRows(data)
    userInventory.set(items)
    return items
}

export async function refreshProfileState() {
    const { data, error } = await supabase.rpc('get_my_profile')
    if (error || !data || data.success === false) {
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

// Initialize auth state listener
let authEventId = 0
supabase.auth.onAuthStateChange(async (eventName, currentSession) => {
    const nextAuthEventId = ++authEventId
    authEvent.set(eventName)
    authInitialized.set(true)
    session.set(currentSession)
    profileReady.set(false)
    profileLoadFailed.set(false)

    if (currentSession) {
        clearUserState()
        try {
            await loadShopItems();

            if (nextAuthEventId !== authEventId) return;

            const [profileRes, inventoryRes, walletRes] = await Promise.all([
                supabase.rpc('get_my_profile'),
                supabase
                    .from('inventory')
                    .select('item_key, quantity')
                    .eq('user_id', currentSession.user.id),
                supabase.rpc('get_wallet_balance')
            ]);

            const { data: prof, error: profError } = profileRes;
            const { data: inv } = inventoryRes;
            const { data: wallet } = walletRes;

            if (nextAuthEventId !== authEventId) return;

            if (profError || !prof || prof.success === false) {
                profileLoadFailed.set(true)
            } else {
                profile.set(prof)
                equippedItems.set(prof.equipped_cosmetics || {})
                rerollShards.set(prof.reroll_shards || 0)
                equippedBadges.set(prof.equipped_badges || [])
            }

            if (inv) userInventory.set(expandInventoryRows(inv))

                if (wallet !== null) {
                    walletBalance.set(wallet)
                }

                const { data: follows } = await supabase
                .from('user_follows')
                .select('followee_id')
                .eq('follower_id', currentSession.user.id);
                if (nextAuthEventId !== authEventId) return;
                if (follows) followedUsers.set(follows.map(f => f.followee_id));

        } catch (e) {
            if (nextAuthEventId !== authEventId) return;
            console.error("Critical error during auth state change:", e);
        } finally {
            if (nextAuthEventId === authEventId) {
                profileReady.set(true);
            }
        }
    } else {
        clearUserState()
        authEvent.set(eventName)
        profileLoadFailed.set(false)
        profileReady.set(true)
    }
})
