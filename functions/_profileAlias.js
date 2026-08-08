import { normalizeProfileAliasSegment } from '../src/lib/routeContract.js';

export async function loadPublicProfileAlias(alias, env) {
  const normalizedAlias = normalizeProfileAliasSegment(alias);
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_KEY || env.SUPABASE_ANON_KEY;
  if (!normalizedAlias || !supabaseUrl || !supabaseKey) return null;

  try {
    const endpoint = new URL('/rest/v1/rpc/get_public_profile_alias', supabaseUrl);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
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
