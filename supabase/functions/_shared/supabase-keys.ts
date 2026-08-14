export function getSupabaseKeys() {
  return {
    url: Deno.env.get('SUPABASE_URL') || '',
    publishableKey: Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
      || Deno.env.get('SUPABASE_ANON_KEY')
      || '',
    secretKey: Deno.env.get('SUPABASE_SECRET_KEY')
      || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      || ''
  }
}

export function supabaseServerClientOptions(key: string, options: Record<string, unknown> = {}) {
  if (!String(key || '').startsWith('sb_')) return options
  return {
    ...options,
    global: {
      ...(options.global as Record<string, unknown> || {}),
      headers: {
        ...((options.global as { headers?: Record<string, string> } | undefined)?.headers || {}),
        // supabase-js versions that predate opaque project keys otherwise
        // synthesize `Authorization: Bearer <project key>`. Keep the modern
        // key in `apikey`; user JWTs are supplied explicitly by callers.
        apikey: key,
        Authorization: ''
      }
    }
  }
}
