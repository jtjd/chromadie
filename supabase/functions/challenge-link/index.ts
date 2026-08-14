import { createClient } from 'npm:@supabase/supabase-js@2.110.1'
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

function normalizeHex(value: unknown) {
  const trimmed = String(value || '').trim().replace(/^#/, '').toUpperCase()
  return /^[0-9A-F]{6}$/.test(trimmed) ? `#${trimmed}` : null
}

function normalizeScore(value: unknown) {
  const normalized = String(value ?? '').trim()
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  const { url: supabaseUrl, publishableKey: supabasePublishableKey, secretKey: supabaseSecretKey } = getSupabaseKeys()

  if (!supabaseUrl || !supabasePublishableKey || !supabaseSecretKey) {
    return jsonResponse({ success: false, error: 'Server configuration missing' }, 500)
  }

  const serviceClient = createClient(supabaseUrl, supabaseSecretKey, supabaseServerClientOptions(supabaseSecretKey))
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const action = String(body.action || 'get').toLowerCase()

  if (action === 'create') {
    const targetScore = normalizeScore(body.score)
    const targetHex = normalizeHex(body.hex)

    if (targetScore === null || !targetHex) {
      return jsonResponse({ success: false, error: 'Invalid challenge data' }, 400)
    }

    const token = getBearerToken(request)
    if (!token) {
      return jsonResponse({ success: false, error: 'Authentication required to create a challenge' }, 401)
    }

    const userClient = createClient(supabaseUrl, supabasePublishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: userData } = await userClient.auth.getUser()
    const senderUserId = userData?.user?.id || null
    if (!senderUserId) {
      return jsonResponse({ success: false, error: 'Not authenticated' }, 401)
    }

    const { data, error } = await serviceClient.rpc('create_challenge', {
      p_sender_user_id: senderUserId,
      p_target_score: targetScore,
      p_target_hex: targetHex
    })

    if (error || !data?.success || !data.challenge) {
      const rpcMessage = typeof data?.error === 'string' ? data.error : ''
      if (rpcMessage.includes('limit reached')) {
        return jsonResponse({ success: false, error: rpcMessage }, 429)
      }

      if (rpcMessage.includes('No authoritative daily roll')) {
        return jsonResponse({ success: false, error: rpcMessage }, 409)
      }

      return jsonResponse({ success: false, error: 'Could not create challenge' }, error ? 500 : 400)
    }

    const challenge = data.challenge
    const fromQuery = challenge.sender_username ? `?from=${encodeURIComponent(challenge.sender_username)}` : ''
    return jsonResponse({
      success: true,
      challenge,
      share_url: `/c/${challenge.id}${fromQuery}`
    })
  }

  if (action === 'get') {
    const id = String(body.id || '').trim()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return jsonResponse({ success: false, error: 'Missing challenge id' }, 400)
    }

    const { data, error } = await serviceClient
      .from('challenges')
      .select('id, sender_username, target_score, target_hex, created_at, expires_at')
      .eq('id', id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !data) {
      return jsonResponse({ success: false, error: 'Challenge not found' }, 404)
    }

    return jsonResponse({ success: true, challenge: data })
  }

  return jsonResponse({ success: false, error: 'Unknown action' }, 400)
})
