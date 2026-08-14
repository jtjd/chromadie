import { GoTrueClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';

const CLIENT_VERSION = '2.110.1';
function createAuthFetch({ supabaseKey, projectKeyIsLegacy, authClientRef, authUrl, globalFetch }) {
  const fetchImplementation = globalFetch || globalThis.fetch.bind(globalThis);

  return async (input, init) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input?.url || input?.toString?.() || '';
    const isAuthRequest = requestUrl.startsWith(authUrl);
    const requestHeaders = new Headers(typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => requestHeaders.set(key, value));

    // GoTrue uses this fetcher for its own initialize/refresh requests. Calling
    // getSession() for those requests waits on the same initialize promise and
    // can deadlock an existing or expired browser session. GoTrue already puts
    // the correct JWT on authenticated auth requests; only attach the current
    // session token to PostgREST and Functions requests.
    if (!requestHeaders.has('Authorization') && !isAuthRequest) {
      const sessionResult = authClientRef.current
        ? await authClientRef.current.getSession()
        : { data: { session: null } };
      const accessToken = sessionResult?.data?.session?.access_token || '';
      if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }

    if (!requestHeaders.has('apikey')) requestHeaders.set('apikey', supabaseKey);
    if (!requestHeaders.has('Authorization') && projectKeyIsLegacy) {
      requestHeaders.set('Authorization', `Bearer ${supabaseKey}`);
    }

    return fetchImplementation(input, { ...init, headers: requestHeaders });
  };
}

function createLazyFunctionsClient({ functionsUrl, headers, fetch, unavailableMessage = '' }) {
  let clientPromise;

  const loadClient = () => {
    if (unavailableMessage) return Promise.reject(new Error(unavailableMessage));
    clientPromise ??= import('@supabase/functions-js').then(({ FunctionsClient }) => (
      new FunctionsClient(functionsUrl, { headers, customFetch: fetch })
    ));
    return clientPromise;
  };

  return {
    invoke(functionName, options) {
      return loadClient().then(client => client.invoke(functionName, options));
    }
  };
}

export function createSupabaseTransport({
  supabaseUrl,
  supabaseKey,
  projectKeyIsLegacy = !String(supabaseKey || '').startsWith('sb_publishable_'),
  globalFetch = null
}) {
  const baseUrl = new URL(supabaseUrl.endsWith('/') ? supabaseUrl : `${supabaseUrl}/`);
  const serviceUrls = {
    auth: new URL('auth/v1', baseUrl).href,
    rest: new URL('rest/v1', baseUrl).href,
    functions: new URL('functions/v1', baseUrl).href
  };
  const globalHeaders = {
    'X-Client-Info': `supabase-js/${CLIENT_VERSION}; runtime=web`
  };
  const authClientRef = { current: null };
  const fetchWithAuth = createAuthFetch({ supabaseKey, projectKeyIsLegacy, authClientRef, authUrl: serviceUrls.auth, globalFetch });
  const storageKey = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`;

  const auth = new GoTrueClient({
    url: serviceUrls.auth,
    headers: {
      apikey: supabaseKey,
      ...(projectKeyIsLegacy ? { Authorization: `Bearer ${supabaseKey}` } : {}),
      ...globalHeaders
    },
    storageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    fetch: fetchWithAuth
  });
  authClientRef.current = auth;

  const rest = new PostgrestClient(serviceUrls.rest, {
    headers: globalHeaders,
    schema: 'public',
    fetch: fetchWithAuth
  });

  return {
    auth,
    functions: createLazyFunctionsClient({
      functionsUrl: serviceUrls.functions,
      headers: globalHeaders,
      fetch: fetchWithAuth
    }),
    from(relation) {
      return rest.from(relation);
    },
    rpc(functionName, args = {}, options = {}) {
      return rest.rpc(functionName, args, options);
    },
    rest,
    serviceUrls,
    globalHeaders,
    fetchWithAuth
  };
}

export function createUnavailableSupabaseTransport(message) {
  const error = new Error(message);
  const result = () => Promise.resolve({ data: null, error });
  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error };
      },
      onAuthStateChange(callback) {
        queueMicrotask(() => {
          if (typeof callback === 'function') callback('INITIAL_SESSION', null);
        });
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signOut: result,
      signUp: result,
      signInWithPassword: result,
      resetPasswordForEmail: result,
      updateUser: result
    },
    functions: {
      invoke: result
    },
    from() {
      const queryResult = Promise.resolve({
        data: null,
        error,
        count: null,
        status: 0,
        statusText: 'Supabase unavailable'
      });
      const query = new Proxy({}, {
        get(_, property) {
          if (property === 'then') return queryResult.then.bind(queryResult);
          return () => query;
        }
      });
      return query;
    },
    rpc: result
  };
}
