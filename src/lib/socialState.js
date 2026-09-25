import { writable } from 'svelte/store';
import { supabase } from './supabase';
import { addToast } from './uiState.js';
import { createSocialFollowLifecycle } from './socialFollowLifecycle.js';

export const followedUsers = writable([]);
const socialFollowLifecycle = createSocialFollowLifecycle({
  supabaseClient: supabase,
  followedUsers,
  addToast
});

export function clearSocialState() {
  socialFollowLifecycle.clear();
}

export function toggleFollow(targetId) {
  return socialFollowLifecycle.toggle(targetId);
}
