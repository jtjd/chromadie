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

function normalizeUsername(value: unknown) {
  const trimmed = String(value || '').trim()
  return /^[A-Za-z0-9_]{3,20}$/.test(trimmed) ? trimmed : null
}

function normalizeHex(value: unknown) {
  const trimmed = String(value || '').trim().replace(/^#/, '').toUpperCase()
  return /^[0-9A-F]{6}$/.test(trimmed) ? `#${trimmed}` : null
}

function normalizeScore(value: unknown) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ success: false, error: 'Server configuration missing' }, 500)
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const action = String(body.action || 'get').toLowerCase()

  if (action === 'create') {
    const targetScore = normalizeScore(body.score)
    const targetHex = normalizeHex(body.hex)

    if (targetScore === null || !targetHex) {
      return jsonResponse({ success: false, error: 'Invalid challenge data' }, 400)
    }

    let senderUserId: string | null = null
    let senderUsername: string | null = normalizeUsername(body.sender_username)
    const token = getBearerToken(request)

    if (token) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      })

      const { data: userData } = await userClient.auth.getUser()
      if (userData?.user?.id) {
        senderUserId = userData.user.id

        const { data: profileData } = await serviceClient
          .from('profiles')
          .select('username')
          .eq('id', senderUserId)
          .maybeSingle()

        senderUsername = normalizeUsername(profileData?.username) || senderUsername
      }
    }

    const { data, error } = await serviceClient
      .from('challenges')
      .insert({
        sender_user_id: senderUserId,
        sender_username: senderUsername,
        target_score: targetScore,
        target_hex: targetHex
      })
      .select('id, sender_username, target_score, target_hex, created_at, expires_at')
      .single()

    if (error || !data) {
      return jsonResponse({ success: false, error: error?.message || 'Could not create challenge' }, 500)
    }

    const fromQuery = data.sender_username ? `?from=${encodeURIComponent(data.sender_username)}` : ''
    return jsonResponse({
      success: true,
      challenge: data,
      share_url: `/c/${data.id}${fromQuery}`
    })
  }

  if (action === 'get') {
    const id = String(body.id || '').trim()
    if (!id) {
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
