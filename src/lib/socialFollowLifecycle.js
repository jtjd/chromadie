/**
 * @param {{ supabaseClient: { rpc: (name: string, args: Record<string, any>) => Promise<any> }, followedUsers: { set: (value: string[]) => void, update: (project: (current: string[]) => string[]) => void }, addToast: (message: string, type: string) => void }} options
 */
export function createSocialFollowLifecycle({ supabaseClient, followedUsers, addToast }) {
  let generation = 0;

  function clear() {
    generation += 1;
    followedUsers.set([]);
  }

  async function toggle(targetId) {
    const requestGeneration = generation;
    let response;
    try {
      response = await supabaseClient.rpc('toggle_follow', { p_target_id: targetId });
    } catch {
      if (requestGeneration !== generation) return { success: false, stale: true };
      addToast('Error updating rivals.', 'error');
      return { success: false };
    }

    if (requestGeneration !== generation) return { success: false, stale: true };

    const { data, error } = response || {};
    if (error) {
      addToast('Error updating rivals.', 'error');
      return { success: false };
    }
    if (data?.success) {
      if (data.action === 'followed') {
        followedUsers.update(current => [...current, targetId]);
        addToast('Added to Rivals!', 'success');
      } else {
        followedUsers.update(current => current.filter(id => id !== targetId));
        addToast('Removed from Rivals.', 'success');
      }
    } else if (data) {
      addToast(data.error, 'error');
    }
    return data;
  }

  return { clear, toggle };
}
