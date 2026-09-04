import { writable } from 'svelte/store';
import { supabase } from './supabase';
import { addToast } from './uiState.js';

export const followedUsers = writable([]);

export function clearSocialState() {
  followedUsers.set([]);
}

export async function toggleFollow(targetId) {
  const { data, error } = await supabase.rpc('toggle_follow', { p_target_id: targetId });
  if (error) {
    addToast('Error updating rivals.', 'error');
    return { success: false };
  }
  if (data.success) {
    if (data.action === 'followed') {
      followedUsers.update(current => [...current, targetId]);
      addToast('Added to Rivals!', 'success');
    } else {
      followedUsers.update(current => current.filter(id => id !== targetId));
      addToast('Removed from Rivals.', 'success');
    }
  } else {
    addToast(data.error, 'error');
  }
  return data;
}
