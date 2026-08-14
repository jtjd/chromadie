const DEFAULT_TIMEOUT_MS = 15_000;

function timeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof AbortSignal?.timeout === 'function') return AbortSignal.timeout(timeoutMs);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function cleanupEndpoint(env) {
  const value = String(env?.CLEANUP_ENDPOINT_URL || '').trim();
  if (!/^https:\/\//i.test(value)) throw new Error('CLEANUP_ENDPOINT_URL must be an HTTPS URL.');
  return value;
}

export async function triggerProfileMediaCleanup(env, fetchImpl = fetch) {
  const secret = String(env?.R2_ACCOUNT_CLEANUP_SECRET || '').trim();
  if (!secret) throw new Error('R2_ACCOUNT_CLEANUP_SECRET is not configured.');
  const endpoint = cleanupEndpoint(env);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    signal: timeoutSignal()
  });
  const payload = await response.json().catch(() => null);
  const resultGroups = [
    payload?.results,
    payload?.orphan_results,
    payload?.private_results,
    payload?.deleted_results
  ];
  const allResults = resultGroups.flatMap(results => Array.isArray(results) ? results : []);
  const summary = {
    status: response.status,
    ok: response.ok && payload?.success === true,
    claimed: Number(payload?.claimed || 0),
    orphanAssetsClaimed: Number(payload?.orphan_assets_claimed || 0),
    deletedAssetsClaimed: Number(payload?.deleted_assets_claimed || 0),
    retried: allResults.filter(result => result?.success === false).length
  };
  console.log(JSON.stringify({ event: 'profile-media-cleanup', ...summary }));
  if (!summary.ok) throw new Error(`Profile media cleanup endpoint returned ${response.status}.`);
  return summary;
}

export default {
  async fetch() {
    return new Response('Not Found', { status: 404 });
  },

  async scheduled(controller, env, ctx) {
    const run = triggerProfileMediaCleanup(env).catch(error => {
      console.error(JSON.stringify({
        event: 'profile-media-cleanup-error',
        error: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    });
    if (ctx?.waitUntil) ctx.waitUntil(run);
    else await run;
    // Cloudflare invokes scheduled handlers without a response; the promise
    // above is the durable execution boundary for the cron invocation.
    return undefined;
  }
};
