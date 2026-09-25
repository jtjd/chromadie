/** Present an unlock before acknowledging it, while preventing stale accounts from continuing. */
/** @param {{unlock: any, present?: (unlock: any) => Promise<any>, acknowledge?: (unlock: any) => Promise<any>, isCurrent?: () => boolean}} options */
export async function acknowledgeProgressionUnlock({
  unlock,
  present = async () => [],
  acknowledge,
  isCurrent = () => true
}) {
  try {
    await present(unlock);
    if (!isCurrent()) return { success: false, stale: true, transitionedIds: [] };
    const response = await acknowledge(unlock);
    if (!isCurrent()) return { success: false, stale: true, transitionedIds: [] };
    const { data, error } = response || {};
    if (error || data?.success === false) {
      return { success: false, stale: false, transitionedIds: [], error };
    }
    const ids = Array.isArray(data?.milestone_ids)
      ? data.milestone_ids.filter(id => typeof id === 'string')
      : [];
    const count = Math.max(0, Number(data?.acknowledged) || 0);
    const transitionedIds = ids.length ? ids : count ? [unlock?.id].filter(Boolean) : [];
    return { success: true, stale: false, transitionedIds };
  } catch (error) {
    if (!isCurrent()) return { success: false, stale: true, transitionedIds: [] };
    return { success: false, stale: false, transitionedIds: [], error };
  }
}
