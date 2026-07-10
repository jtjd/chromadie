import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}

function getBearerToken(request: Request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function normalizeMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = 'message' in error ? (error as { message?: string }).message : ''
    if (message) return message
    const code = 'code' in error ? (error as { code?: string }).code : ''
    if (code) return code
  }
  return 'Unknown error'
}

function isNotFoundError(error: unknown) {
  const message = normalizeMessage(error).toLowerCase()
  return message.includes('not found') || message.includes('404') || message.includes('user not found')
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  const token = getBearerToken(request)
  if (!token) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ success: false, error: 'Server configuration missing' }, 500)
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401)
  }

  const confirmation = await request.json().catch(() => ({} as Record<string, unknown>))
  const confirmValue = String(confirmation?.confirm || '').trim().toUpperCase()
  if (confirmValue !== 'DELETE') {
    return jsonResponse({ success: false, error: 'Confirmation phrase required' }, 400)
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)
  const userId = userData.user.id

  const { data: cleanupData, error: cleanupError } = await serviceClient.rpc('delete_account_data', {
    p_user_id: userId
  })

  if (cleanupError || !cleanupData?.success) {
    return jsonResponse(
      {
        success: false,
        error: 'Could not delete the account right now. Please try again later.',
        code: 'cleanup_failed'
      },
      500
    )
  }

  const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(userId)
  if (deleteUserError && !isNotFoundError(deleteUserError)) {
    return jsonResponse(
      {
        success: false,
        error: 'Account data was prepared for deletion, but the account could not be fully removed. Please try again.',
        code: 'auth_delete_failed',
        cleanup: cleanupData
      },
      502
    )
  }

  return jsonResponse({
    success: true,
    already_deleted: Boolean(deleteUserError && isNotFoundError(deleteUserError)),
    cleanup: cleanupData
  })
})
