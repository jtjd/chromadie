import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
const envName = import.meta.env.DEV ? 'development' : 'production'
const missingVars = []

function createUnavailableQuery(message) {
  const result = Promise.resolve({ data: null, error: new Error(message), count: null, status: 0, statusText: 'Supabase unavailable' })

  const query = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') {
        return result.then.bind(result)
      }
      return () => query
    }
  })

  return query
}

function createUnavailableAuthClient(message) {
  const authError = new Error(message)
  return {
    async getSession() {
      return { data: { session: null }, error: authError }
    },
    onAuthStateChange(callback) {
      queueMicrotask(() => {
        if (typeof callback === 'function') {
          callback('INITIAL_SESSION', null)
        }
      })
      return { data: { subscription: { unsubscribe() {} } } }
    },
    async signOut() {
      return { data: null, error: authError }
    },
    async signUp() {
      return { data: null, error: authError }
    },
    async signInWithPassword() {
      return { data: null, error: authError }
    }
  }
}

function createUnavailableSupabaseClient(message) {
  const auth = createUnavailableAuthClient(message)
  return {
    auth,
    functions: {
      invoke() {
        return Promise.resolve({ data: null, error: new Error(message) })
      }
    },
    from() {
      return createUnavailableQuery(message)
    },
    rpc() {
      return Promise.resolve({ data: null, error: new Error(message) })
    }
  }
}

if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL')
if (!supabaseKey) missingVars.push('VITE_SUPABASE_KEY')

let supabaseError = null
let supabaseClient = null

if (missingVars.length > 0) {
  supabaseError = {
    title: 'Missing Supabase configuration',
    message: 'The app cannot connect to Supabase until the required environment variables are set.',
    details: `Missing: ${missingVars.join(', ')}`
  }
} else {
  try {
    const parsedUrl = new URL(supabaseUrl)
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Supabase URL must use https:')
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    supabaseError = {
      title: 'Invalid Supabase configuration',
      message: 'The app could not initialize the Supabase client.',
      details: error instanceof Error ? error.message : 'Unknown initialization failure'
    }
  }
}

if (supabaseError) {
  if (import.meta.env.DEV) {
    console.error(`[Chromadie] Supabase bootstrap failed in ${envName}:`, supabaseError)
  }
  supabaseClient ??= createUnavailableSupabaseClient(supabaseError.details)
}

export const supabase = supabaseClient
export { supabaseError }
