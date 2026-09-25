import { getCanonicalProfilePath } from './routeContract.js';
import { resolveProfileAlias } from './profileAliases.js';

/**
 * Resolve an explicit profile-alias route and reject stale lookup results.
 * App owns loading presentation and browser history; this module is imported
 * only when a visitor enters an alias route.
 *
 * @param {{supabaseClient?: any, resolveAlias?: (client: any, alias: string) => Promise<any>, getCanonicalPath?: (username: string | null | undefined) => string | null}} options
 */
export function createProfileAliasLifecycle({
  supabaseClient,
  resolveAlias = resolveProfileAlias,
  getCanonicalPath = getCanonicalProfilePath
} = {}) {
  let requestId = 0;

  function invalidate() {
    requestId += 1;
  }

  async function load(alias) {
    const currentRequestId = ++requestId;
    let result;
    try {
      result = await resolveAlias(supabaseClient, alias);
    } catch {
      result = { profile: null, error: 'The profile alias could not be resolved.' };
    }

    if (currentRequestId !== requestId) return { status: 'stale' };

    const canonicalPath = result?.error
      ? null
      : getCanonicalPath(result?.profile?.username);
    return canonicalPath
      ? { status: 'resolved', canonicalPath }
      : { status: 'not-found' };
  }

  return { invalidate, load };
}
