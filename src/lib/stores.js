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

export async function loadShopItems() {
    const { data: meta } = await supabase
    .from('meta')
    .select('value')
    .eq('key', 'shop_version')
    .single();

    const latestVersion = meta?.value;

    const cached = JSON.parse(localStorage.getItem('shop_cache') || '{}');
    if (cached.version === latestVersion && cached.items) {
        shopItems.set(cached.items);
        return;
    }

    const { data, error } = await supabase
    .from('shop_items')
    .select('item_key, name, slot, cost, css_type, css_value, rarity, description, collection')
    .or(`available_from.is.null,available_from.lte.${new Date().toISOString().split('T')[0]}`)
    .or(`available_until.is.null,available_until.gte.${new Date().toISOString().split('T')[0]}`);

    if (data) {
        const cache = {}
        data.forEach(item => { cache[item.item_key] = item })
        shopItems.set(cache)
        localStorage.setItem('shop_cache', JSON.stringify({ version: latestVersion, items: cache }));
    }
}

export async function fetchWalletBalance() {
    const { data } = await supabase.rpc('get_wallet_balance')
    if (data !== null) {
        walletBalance.set(data)
    }
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
supabase.auth.onAuthStateChange(async (event, currentSession) => {
    session.set(currentSession)

    if (currentSession) {
        await loadShopItems();

        try {
            const [profileRes, inventoryRes, walletRes] = await Promise.all([
                supabase
                .from('profiles')
                .select('username, current_streak, longest_streak, ep_spent, lifetime_ep, equipped_cosmetics, reroll_shards, equipped_badges, bio, mood_color, is_admin')
                .eq('id', currentSession.user.id)
                .single(),
                                                                            supabase
                                                                            .from('inventory')
                                                                            .select('item_key')
                                                                            .eq('user_id', currentSession.user.id),
                                                                            supabase.rpc('get_wallet_balance')
            ]);

            const { data: prof, error: profError } = profileRes;
            const { data: inv } = inventoryRes;
            const { data: wallet } = walletRes;

            if (profError) {
                console.warn("Profile fetch delayed or missing:", profError.message);
            }

            if (prof) {
                profile.set(prof)
                equippedItems.set(prof.equipped_cosmetics || {})
                rerollShards.set(prof.reroll_shards || 0)
                equippedBadges.set(prof.equipped_badges || [])
            }

            if (inv) userInventory.set(inv.map(i => i.item_key))

                if (wallet !== null) {
                    walletBalance.set(wallet)
                }

                const { data: follows } = await supabase
                .from('user_follows')
                .select('followee_id')
                .eq('follower_id', currentSession.user.id);
            if (follows) followedUsers.set(follows.map(f => f.followee_id));

        } catch (e) {
            console.error("Critical error during auth state change:", e);
        }
    } else {
        clearUserState()
    }
})
