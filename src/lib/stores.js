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

// --- UI State ---
export const selectedUserId = writable(null) // For viewing other profiles

// --- Toast Notifications ---
export const toasts = writable([])
export function addToast(message, type = 'error') {
    const id = Math.random().toString(36).substring(7)
    toasts.update(t => [...t, { id, message, type }])
    setTimeout(() => {
        toasts.update(t => t.filter(x => x.id !== id))
    }, 4000)
}

// Helper to clear all user-specific state on logout
export function clearUserState() {
    profile.set(null)
    userInventory.set([])
    equippedItems.set({})
    walletBalance.set(0)
}

// Fetch and cache shop items
export async function loadShopItems() {
    const { data, error } = await supabase
    .from('shop_items')
    .select('item_key, name, slot, cost, css_type, css_value')

    if (data) {
        const cache = {}
        data.forEach(item => { cache[item.item_key] = item })
        shopItems.set(cache)
    }
}

// Fetch wallet balance using the secure RPC
export async function fetchWalletBalance() {
    const { data, error } = await supabase.rpc('get_wallet_balance')
    if (error) {
        console.error("Error fetching wallet balance:", error.message);
    } else if (data !== null) {
        walletBalance.set(data)
    }
}

// Initialize auth state listener
supabase.auth.onAuthStateChange(async (event, currentSession) => {
    session.set(currentSession)

    if (currentSession) {
        await loadShopItems();

        const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('username, current_streak, longest_streak, ep_spent, lifetime_ep, equipped_cosmetics')
        .eq('id', currentSession.user.id)
        .single()

        if (profError) console.error("Error fetching profile:", profError.message);
        if (prof) {
            profile.set(prof)
            equippedItems.set(prof.equipped_cosmetics || {})
        }

        await fetchWalletBalance();

        const { data: inv } = await supabase
        .from('inventory')
        .select('item_key')
        .eq('user_id', currentSession.user.id)

        if (inv) userInventory.set(inv.map(i => i.item_key))
    } else {
        clearUserState()
    }
})
