/*
 * Supabase credential and header compatibility lives here so Pages Functions
 * do not each invent their own key precedence or treat an opaque project key
 * as a user JWT.
 *
 * Modern keys are project API credentials and belong in `apikey`. A bearer
 * Authorization header is added only for an actual user token, or for the
 * legacy JWT-shaped compatibility variables during the transition.
 */

function firstValue(env, keys) {
  for (const key of keys) {
    const value = String(env?.[key] || '').trim();
    if (value) return value;
  }
  return '';
}

function isModernKey(value, kind) {
  return String(value || '').startsWith(`sb_${kind}_`);
}

export function getSupabaseCredentials(env = {}) {
  const publishableKey = firstValue(env, [
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_KEY',
    'SUPABASE_ANON_KEY'
  ]);
  const secretKey = firstValue(env, [
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY'
  ]);

  return {
    url: firstValue(env, ['VITE_SUPABASE_URL', 'SUPABASE_URL']).replace(/\/$/, ''),
    publishableKey,
    secretKey,
    publishableKeyIsLegacy: Boolean(publishableKey) && !isModernKey(publishableKey, 'publishable'),
    secretKeyIsLegacy: Boolean(secretKey) && !isModernKey(secretKey, 'secret')
  };
}

export function createSupabaseHeaders({
  apiKey,
  accessToken = '',
  authorization = '',
  projectKeyIsLegacy = false,
  contentType = false
} = {}) {
  const headers = {};
  const normalizedApiKey = String(apiKey || '').trim();
  if (normalizedApiKey) headers.apikey = normalizedApiKey;
  if (contentType) headers['Content-Type'] = 'application/json';

  if (accessToken) {
    headers.Authorization = `Bearer ${String(accessToken).trim()}`;
  } else if (authorization) {
    headers.Authorization = authorization;
  } else if (projectKeyIsLegacy && normalizedApiKey) {
    // Legacy anon/service_role values are JWTs. Keep the old header during
    // the two-phase deployment, but never synthesize it for sb_* keys.
    headers.Authorization = `Bearer ${normalizedApiKey}`;
  }

  return headers;
}

export function getSupabasePublicHeaders(env, options = {}) {
  const credentials = getSupabaseCredentials(env);
  if (!credentials.publishableKey) return null;
  return createSupabaseHeaders({
    apiKey: credentials.publishableKey,
    projectKeyIsLegacy: credentials.publishableKeyIsLegacy,
    ...options
  });
}

export function getSupabaseSecretHeaders(env, options = {}) {
  const credentials = getSupabaseCredentials(env);
  if (!credentials.secretKey) return null;
  return createSupabaseHeaders({
    apiKey: credentials.secretKey,
    projectKeyIsLegacy: credentials.secretKeyIsLegacy,
    ...options
  });
}
