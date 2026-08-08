import { getProfileAliasPath, normalizeProfileAliasSegment } from './routeContract.js';

export const MAX_PROFILE_ALIASES = 3;

function rpcErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function normalizeAliasRecord(value) {
  const alias = normalizeProfileAliasSegment(value?.alias);
  const path = getProfileAliasPath(alias);
  return alias && path
    ? { alias: alias.toLowerCase(), path, createdAt: value?.created_at || null }
    : null;
}

export async function loadMyProfileAliases(supabaseClient) {
  const { data, error } = await supabaseClient.rpc('get_my_profile_aliases');
  if (error) return { aliases: [], error: rpcErrorMessage(error, 'Aliases could not be loaded.') };
  const aliases = Array.isArray(data?.aliases)
    ? data.aliases.map(normalizeAliasRecord).filter(Boolean).slice(0, MAX_PROFILE_ALIASES)
    : [];
  return { aliases, error: '' };
}

export async function createProfileAlias(supabaseClient, alias) {
  const normalized = normalizeProfileAliasSegment(alias);
  if (!normalized) return { success: false, error: 'Use 1–20 letters, numbers, or underscores.' };
  const { data, error } = await supabaseClient.rpc('create_profile_alias', { p_alias: normalized });
  if (error) return { success: false, error: rpcErrorMessage(error, 'That alias could not be created.') };
  return {
    success: data?.success === true,
    alias: normalizeAliasRecord(data)?.alias || normalized.toLowerCase(),
    error: data?.success === true ? '' : data?.error || 'That alias is not available.'
  };
}

export async function deleteProfileAlias(supabaseClient, alias) {
  const normalized = normalizeProfileAliasSegment(alias);
  if (!normalized) return { success: false, error: 'That alias is not valid.' };
  const { data, error } = await supabaseClient.rpc('delete_profile_alias', { p_alias: normalized });
  if (error) return { success: false, error: rpcErrorMessage(error, 'That alias could not be removed.') };
  return { success: data?.success === true, error: data?.success === true ? '' : data?.error || 'That alias was not found.' };
}

export async function resolveProfileAlias(supabaseClient, alias) {
  const normalized = normalizeProfileAliasSegment(alias);
  if (!normalized) return { profile: null, error: '' };
  const { data, error } = await supabaseClient.rpc('get_public_profile_alias', { p_alias: normalized });
  if (error) return { profile: null, error: rpcErrorMessage(error, 'The profile alias could not be resolved.') };
  return { profile: Array.isArray(data) ? data[0] || null : data || null, error: '' };
}
