import { createLazyStorageClient, createUnavailableStorageClient } from './supabaseStorage.js';
import { createSupabaseTransport, createUnavailableSupabaseTransport } from './supabaseTransport.js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_KEY
const supabaseKeyIsLegacy = Boolean(supabaseKey) && !String(supabaseKey).startsWith('sb_publishable_')
const envName = import.meta.env?.DEV ? 'development' : 'production'
const missingVars = []

function createUnavailableSupabaseClient(message) {
  return {
    ...createUnavailableSupabaseTransport(message),
    storage: createUnavailableStorageClient(message)
  }
}

if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL')
if (!supabaseKey) missingVars.push('VITE_SUPABASE_PUBLISHABLE_KEY (legacy VITE_SUPABASE_KEY is also accepted during migration)')

let supabaseError = null
/** @type {any} */
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
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)
    const localIntegrationTest = import.meta.env?.VITE_LOCAL_INTEGRATION_TEST === 'true'
    if (parsedUrl.protocol !== 'https:' && !((import.meta.env.DEV || localIntegrationTest) && parsedUrl.protocol === 'http:' && isLoopback)) {
      throw new Error('Supabase URL must use https (except loopback URLs in development)')
    }

    const transport = createSupabaseTransport({ supabaseUrl, supabaseKey, projectKeyIsLegacy: supabaseKeyIsLegacy })
    supabaseClient = {
      ...transport,
      storage: createLazyStorageClient({
        storageUrl: transport.serviceUrls.storage,
        headers: transport.globalHeaders,
        fetch: transport.fetchWithAuth
      })
    }
  } catch (error) {
    supabaseError = {
      title: 'Invalid Supabase configuration',
      message: 'The app could not initialize the Supabase client.',
      details: error instanceof Error ? error.message : 'Unknown initialization failure'
    }
  }
}

if (supabaseError) {
  if (import.meta.env?.DEV) {
    console.error(`[Chromadie] Supabase bootstrap failed in ${envName}:`, supabaseError)
  }
  supabaseClient ??= createUnavailableSupabaseClient(supabaseError.details)
}

export const supabase = supabaseClient
export { supabaseError }
