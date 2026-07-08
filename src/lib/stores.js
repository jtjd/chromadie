import { writable } from 'svelte/store'
import { supabase } from './supabase'

// --- Auth & Profile State ---
export const session = writable(null)
export const profile = writable(null)

// --- Shop & Inventory State ---
export const shopItems = writable({})
export const userInventory = writable([])
export const equippedItems = writable({})
export const walletBalance = writable(0)

// --- Progression State ---
export const rerollShards = writable(0)
export const equippedBadges = writable([])

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
}

export async function loadShopItems() {
    const { data, error } = await supabase
    .from('shop_items')
    .select('item_key, name, slot, cost, css_type, css_value, rarity, description')
    .or(`available_from.is.null,available_from.lte.${new Date().toISOString().split('T')[0]}`)
    .or(`available_until.is.null,available_until.gte.${new Date().toISOString().split('T')[0]}`);

    if (data) {
        const cache = {}
        data.forEach(item => { cache[item.item_key] = item })
        shopItems.set(cache)
    }
}

export async function fetchWalletBalance() {
    const { data, error } = await supabase.rpc('get_wallet_balance')
    if (error) {
        console.error("Error fetching wallet balance:", error.message);
    } else if (data !== null) {
        walletBalance.set(data)
    }
}

supabase.auth.onAuthStateChange(async (event, currentSession) => {
    session.set(currentSession)

    if (currentSession) {
        await loadShopItems();

        try {
            const { data: prof, error: profError } = await supabase
            .from('profiles')
            .select('username, current_streak, longest_streak, ep_spent, lifetime_ep, equipped_cosmetics, reroll_shards, equipped_badges, bio, mood_color')
            .eq('id', currentSession.user.id)
            .single()

            if (profError) {
                console.warn("Profile fetch delayed or missing:", profError.message);
            }

            if (prof) {
                profile.set(prof)
                equippedItems.set(prof.equipped_cosmetics || {})
                rerollShards.set(prof.reroll_shards || 0)
                equippedBadges.set(prof.equipped_badges || [])
            }

            await fetchWalletBalance();

            const { data: inv } = await supabase
            .from('inventory')
            .select('item_key')
            .eq('user_id', currentSession.user.id)

            if (inv) userInventory.set(inv.map(i => i.item_key))
        } catch (e) {
            console.error("Critical error during auth state change:", e);
        }
    } else {
        clearUserState()
    }
})
