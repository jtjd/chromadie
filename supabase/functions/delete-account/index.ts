import { createClient } from 'npm:@supabase/supabase-js@2.110.1'
import { CHROMADIE_STRIPE_API_VERSION, stripeRequest } from '../_shared/billing-core.js'
import { getSupabaseKeys, supabaseServerClientOptions } from '../_shared/supabase-keys.ts'

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

async function expireOpenPlusCheckouts(service: ReturnType<typeof createClient>, userId: string) {
  const { data: claims, error: claimError } = await service
    .from('billing_checkout_claims')
    .select('state, stripe_checkout_session_id')
    .eq('user_id', userId)
    .in('state', ['creating', 'open', 'complete'])

  if (claimError) {
    return {
      status: 503,
      body: { success: false, error: 'Billing status could not be checked. Try account deletion again later.', code: 'billing_status_unavailable' }
    }
  }

  if ((claims || []).some(claim => claim.state === 'creating')) {
    return {
      status: 409,
      body: { success: false, error: 'A Plus checkout is still being prepared. Wait a moment, then try account deletion again.', code: 'checkout_in_progress' }
    }
  }

  const { data: unfulfilledCompletions, error: completionError } = await service
    .from('billing_checkout_sessions')
    .select('stripe_checkout_session_id')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .is('completed_at', null)

  if (completionError) {
    return {
      status: 503,
      body: { success: false, error: 'Billing status could not be checked. Try account deletion again later.', code: 'billing_status_unavailable' }
    }
  }
  if ((unfulfilledCompletions || []).length > 0) {
    return {
      status: 409,
      body: { success: false, error: 'A completed Plus payment is still being confirmed. Try account deletion again after it settles.', code: 'checkout_processing' }
    }
  }

  const sessionIds = new Set(
    (claims || [])
      .filter(claim => claim.state === 'open')
      .map(claim => claim.stripe_checkout_session_id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  )

  const { data: openSessions, error: sessionError } = await service
    .from('billing_checkout_sessions')
    .select('stripe_checkout_session_id')
    .eq('user_id', userId)
    .eq('status', 'open')

  if (sessionError) {
    return {
      status: 503,
      body: { success: false, error: 'Billing status could not be checked. Try account deletion again later.', code: 'billing_status_unavailable' }
    }
  }

  for (const session of openSessions || []) {
    if (typeof session.stripe_checkout_session_id === 'string') sessionIds.add(session.stripe_checkout_session_id)
  }
  if (sessionIds.size === 0) return null

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || ''
  if (!stripeSecret) {
    return {
      status: 503,
      body: { success: false, error: 'Billing cancellation is not configured. Try account deletion again later.', code: 'billing_service_unavailable' }
    }
  }

  for (const sessionId of sessionIds) {
    if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
      return {
        status: 503,
        body: { success: false, error: 'An open checkout could not be safely verified. Try account deletion again later.', code: 'billing_status_unavailable' }
      }
    }

    const sessionPath = `checkout/sessions/${encodeURIComponent(sessionId)}`
    let stripeSession: Record<string, unknown>
    try {
      stripeSession = await stripeRequest(stripeSecret, `${sessionPath}/expire`, {
        method: 'POST',
        stripeVersion: CHROMADIE_STRIPE_API_VERSION
      })
    } catch {
      // Expiry and payment completion can race at Stripe. A failed expire is
      // safe only after a fresh read proves the session is already expired.
      try {
        stripeSession = await stripeRequest(stripeSecret, sessionPath, {
          stripeVersion: CHROMADIE_STRIPE_API_VERSION
        })
      } catch {
        return {
          status: 503,
          body: { success: false, error: 'The active checkout could not be verified. Try account deletion again later.', code: 'billing_provider_unavailable' }
        }
      }
    }

    if (stripeSession.status !== 'expired' || stripeSession.payment_status !== 'unpaid') {
      if (stripeSession.status === 'complete' || stripeSession.payment_status === 'paid' || stripeSession.payment_status === 'no_payment_required') {
        return {
          status: 409,
          body: { success: false, error: 'A checkout has completed and billing is still being confirmed. Try account deletion again after it settles.', code: 'checkout_processing' }
        }
      }
      return {
        status: 503,
        body: { success: false, error: 'The active checkout could not be safely canceled. Try account deletion again later.', code: 'billing_provider_unavailable' }
      }
    }

    const { error: localSessionError } = await service
      .from('billing_checkout_sessions')
      .update({ status: 'expired', payment_status: 'unpaid', updated_at: new Date().toISOString() })
      .eq('stripe_checkout_session_id', sessionId)
      .eq('user_id', userId)
    if (localSessionError) {
      return {
        status: 503,
        body: { success: false, error: 'Checkout cancellation was confirmed, but billing status could not be saved. Try account deletion again later.', code: 'billing_status_unavailable' }
      }
    }

    const { error: localClaimError } = await service
      .from('billing_checkout_claims')
      .update({ state: 'expired', lease_expires_at: null, stripe_expires_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('stripe_checkout_session_id', sessionId)
      .eq('user_id', userId)
      .eq('state', 'open')
    if (localClaimError) {
      return {
        status: 503,
        body: { success: false, error: 'Checkout cancellation was confirmed, but billing status could not be saved. Try account deletion again later.', code: 'billing_status_unavailable' }
      }
    }
  }

  return null
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

  const { url: supabaseUrl, publishableKey: supabaseAnonKey, secretKey: supabaseServiceRoleKey } = getSupabaseKeys()

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

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, supabaseServerClientOptions(supabaseServiceRoleKey))
  const userId = userData.user.id

  const checkoutDeletionGate = await expireOpenPlusCheckouts(serviceClient, userId)
  if (checkoutDeletionGate) return jsonResponse(checkoutDeletionGate.body, checkoutDeletionGate.status)

  const { data: cleanupData, error: cleanupError } = await serviceClient.rpc('delete_account_data', {
    p_user_id: userId
  })

  if (cleanupError?.code === 'P0001') {
    return jsonResponse(
      {
        success: false,
        error: 'An active Plus checkout was started at the same time as account deletion. Try again after it settles.',
        code: 'checkout_in_progress'
      },
      409
    )
  }

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
