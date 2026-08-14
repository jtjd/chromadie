import { normalizeProfileAliasSegment } from '../src/lib/routeContract.js';
import { getSupabaseCredentials, getSupabasePublicHeaders } from './_supabaseApi.js';

export async function loadPublicProfileAlias(alias, env) {
  const normalizedAlias = normalizeProfileAliasSegment(alias);
  const supabase = getSupabaseCredentials(env);
  const supabaseUrl = supabase.url;
  if (!normalizedAlias || !supabaseUrl || !supabase.publishableKey) return null;

  try {
    const endpoint = new URL('/rest/v1/rpc/get_public_profile_alias', supabaseUrl);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...getSupabasePublicHeaders(env),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_alias: normalizedAlias })
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return Array.isArray(payload) ? payload[0] || null : payload;
  } catch {
    return null;
  }
}
