/**
 * Save or publish the complete validated Profile Studio draft through the
 * existing server-owned configuration RPCs.
 *
 * @param {any} supabaseClient
 * @param {'publish' | 'reset'} action
 * @param {any} draft
 * @param {string | null} displayName
 * @param {string | null} bio
 * @param {string | null} expectedUpdatedAt
 * @param {string} fallbackMessage
 */
export async function writeProfileStudioConfiguration(supabaseClient, action, draft, displayName, bio, expectedUpdatedAt, fallbackMessage) {
  const publish = action === 'publish';
  const response = await supabaseClient.rpc(publish ? 'publish_profile_studio_v2' : 'save_profile_configuration_v2', {
    p_draft: draft,
    ...(publish && { p_display_name: displayName || null, p_bio: bio ?? null }),
    p_expected_updated_at: expectedUpdatedAt || null
  });
  const failed = response?.error || response?.data?.success === false || response?.data?.code === 'conflict';
  return {
    response,
    error: failed && (response?.error?.message || response?.data?.error || fallbackMessage)
  };
}
