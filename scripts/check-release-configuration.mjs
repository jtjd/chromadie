import { pathToFileURL } from 'node:url';

const CLOUDFLARE_API_DEFAULT = 'https://api.cloudflare.com/client/v4';

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

export function extractPagesEnvironmentValue(project, name) {
  const variables = project?.deployment_configs?.production?.env_vars;
  if (Array.isArray(variables)) {
    const entry = variables.find(item => normalized(item?.key || item?.name) === normalized(name));
    return typeof entry === 'string' ? entry : entry?.value;
  }
  if (variables && typeof variables === 'object') {
    const entryKey = Object.keys(variables).find(key => normalized(key) === normalized(name));
    const entry = entryKey ? variables[entryKey] : undefined;
    return typeof entry === 'string' ? entry : entry?.value;
  }
  return undefined;
}

export function cloudflarePagesProjectUrl({ accountId, projectName, apiBaseUrl = CLOUDFLARE_API_DEFAULT }) {
  const base = String(apiBaseUrl || CLOUDFLARE_API_DEFAULT).trim().replace(/\/+$/, '');
  return `${base}/accounts/${encodeURIComponent(String(accountId).trim())}/pages/projects/${encodeURIComponent(String(projectName).trim())}`;
}

export async function fetchCloudflarePagesProject({
  accountId,
  projectName,
  apiToken,
  apiBaseUrl = CLOUDFLARE_API_DEFAULT,
  fetchImpl = globalThis.fetch
}) {
  if (!String(accountId || '').trim() || !String(projectName || '').trim() || !String(apiToken || '').trim()) {
    throw new Error('Cloudflare release verification requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT, and CLOUDFLARE_API_TOKEN.');
  }
  if (typeof fetchImpl !== 'function') throw new Error('Cloudflare release verification cannot access fetch.');

  const response = await fetchImpl(cloudflarePagesProjectUrl({ accountId, projectName, apiBaseUrl }), {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${String(apiToken).trim()}`
    }
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok || payload?.success !== true || !payload?.result) {
    throw new Error(`Cloudflare Pages production configuration could not be verified (HTTP ${response.status || 0}).`);
  }
  return payload.result;
}

export async function verifyCloudflareProductionRelease({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const project = await fetchCloudflarePagesProject({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    projectName: env.CLOUDFLARE_PAGES_PROJECT,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    apiBaseUrl: env.CLOUDFLARE_API_BASE_URL,
    fetchImpl
  });
  const value = normalized(extractPagesEnvironmentValue(project, 'PREVIEW_PROTECTION'));
  if (value !== 'off') {
    throw new Error('Public release is blocked: Cloudflare Pages production PREVIEW_PROTECTION must be explicitly set to "off".');
  }
  return value;
}

export function verifyLocalReleaseConfiguration(env = process.env) {
  const previewProtection = normalized(env.PREVIEW_PROTECTION);
  if (previewProtection !== 'off') {
    throw new Error('Public release is blocked: PREVIEW_PROTECTION must be explicitly set to "off".');
  }
  return previewProtection;
}

export async function runReleaseConfigurationCheck({ args = process.argv.slice(2), env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (args.includes('--cloudflare')) {
    await verifyCloudflareProductionRelease({ env, fetchImpl });
    console.log('Public release configuration check passed: Cloudflare Pages production PREVIEW_PROTECTION=off.');
    return;
  }
  verifyLocalReleaseConfiguration(env);
  console.log('Public release configuration check passed: PREVIEW_PROTECTION=off.');
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runReleaseConfigurationCheck().catch(error => {
    console.error(error instanceof Error ? error.message : 'Public release configuration check failed.');
    process.exitCode = 1;
  });
}
