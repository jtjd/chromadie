import { derived, writable, get } from 'svelte/store'
import { supabase } from './supabase'
import { isSameAuthenticatedAccount, resolveAccountState } from './authState'
import { clearAllViewState } from './viewState.js'

export {
    cosmeticCatalogItems,
    cosmeticCatalogLoading,
    cosmeticCatalogError,
    loadCosmeticCatalog
} from './catalogState.js'
export { selectedUserId, toasts, addToast } from './uiState.js'
export { followedUsers, toggleFollow } from './socialState.js'
import { clearSocialState, followedUsers } from './socialState.js'

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

// --- Account inventory state ---
export const userInventory = writable([])
export const equippedItems = writable({})
export const walletBalance = writable(0)
export const profileEntitlements = writable([])

// --- Progression State ---
export const rerollShards = writable(0)
export const equippedBadges = writable([])

export function clearUserState() {
    profile.set(null)
    userInventory.set([])
    equippedItems.set({})
    walletBalance.set(0)
    profileEntitlements.set([])
    rerollShards.set(0)
    equippedBadges.set([])
    clearSocialState()
}

export function clearLocalAccountCache({ clearCatalogCache = false } = {}) {
    const keysToRemove = ['chromadie-roll']
    guestProgressActive.set(false)

    try {
        for (let i = localStorage.length - 1; i >= 0; i -= 1) {
            const key = localStorage.key(i)
            if (key && key.startsWith('chromadie-reroll-lock:')) {
                keysToRemove.push(key)
            }
        }

        if (clearCatalogCache) {
            keysToRemove.push('cosmetic_catalog:v6', 'shop_cache', 'shop_cache:v2', 'shop_cache:v3', 'shop_cache:v4', 'shop_cache:v5')
        }

        keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch {
        // Ignore storage failures in hardened/private browsing modes.
    }

    clearAllViewState()
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

// Supabase warns against awaiting client work from inside onAuthStateChange.
// Keep the callback synchronous and hydrate account data in a separate task so
// token refresh and sign-out events cannot deadlock behind the auth lock.
let authEventId = 0

async function hydrateAuthenticatedUser(currentSession, expectedEventId) {
    try {
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
    const currentProfile = get(profile)
    const sameAuthenticatedAccount = isSameAuthenticatedAccount(currentSession, currentProfile)
    authEvent.set(eventName)
    authInitialized.set(true)
    session.set(currentSession)
    if (!sameAuthenticatedAccount || !currentSession) {
        clearUserState()
    }
    profileLoadFailed.set(false)

    if (!currentSession) {
        profileReady.set(true)
        return
    }

    // Refreshing a token changes credentials, not profile data. Keep the
    // mounted Studio/public route stable and avoid repeating the account RPC
    // fan-out when the current account is already hydrated.
    if (eventName === 'TOKEN_REFRESHED' && sameAuthenticatedAccount) {
        profileReady.set(true)
        return
    }

    if (!sameAuthenticatedAccount) profileReady.set(false)
    queueMicrotask(() => {
        void hydrateAuthenticatedUser(currentSession, nextAuthEventId)
    })
})
