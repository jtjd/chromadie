import { createSupabaseTransport, createUnavailableSupabaseTransport } from './supabaseTransport.js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_KEY
const supabaseKeyIsLegacy = Boolean(supabaseKey) && !String(supabaseKey).startsWith('sb_publishable_')
const envName = import.meta.env?.DEV ? 'development' : 'production'
const missingVars = []

function createUnavailableSupabaseClient(message) {
  return createUnavailableSupabaseTransport(message)
}

if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL')
if (!supabaseKey) missingVars.push('VITE_SUPABASE_PUBLISHABLE_KEY (legacy VITE_SUPABASE_KEY is also accepted during migration)')

let supabaseError = null
/** @type {any} */
let supabaseClient = null

if (missingVars.length > 0) {
  supabaseError = {
    title: 'Missing Supabase configuration',
    message: 'Supabase configuration is missing.',
    details: `Missing: ${missingVars.join(', ')}`
  }
} else {
  try {
    const parsedUrl = new URL(supabaseUrl)
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)
    const localIntegrationTest = import.meta.env?.VITE_LOCAL_INTEGRATION_TEST === 'true'
    if (parsedUrl.protocol !== 'https:' && !((import.meta.env.DEV || localIntegrationTest) && parsedUrl.protocol === 'http:' && isLoopback)) {
      throw new Error('Use HTTPS for Supabase except on the development loopback.')
    }

    const transport = createSupabaseTransport({ supabaseUrl, supabaseKey, projectKeyIsLegacy: supabaseKeyIsLegacy })
    supabaseClient = transport
  } catch (error) {
    supabaseError = {
      title: 'Invalid Supabase configuration',
    message: 'Supabase client initialization failed.',
    details: error instanceof Error ? error.message : 'Unknown error'
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
