import { baseSecurityHeaders } from '../_publicPage.js';
import { getSupabaseCredentials, getSupabasePublicHeaders } from '../_supabaseApi.js';

const USERNAME_PATTERN = /^[a-z0-9_]{1,20}$/;
const ENTRY_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...baseSecurityHeaders,
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}

function getDeviceClass(userAgent) {
  const value = String(userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(value) || (value.includes('android') && !value.includes('mobile'))) return 'tablet';
  if (/mobi|iphone|ipod|android|windows phone/.test(value)) return 'mobile';
  return 'desktop';
}

function getCountry(request) {
  const country = String(request.cf?.country || request.headers.get('cf-ipcountry') || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : 'ZZ';
}

function getReferrerHost(request) {
  const raw = request.headers.get('referer') || request.headers.get('referrer') || '';
  if (!raw) return 'direct';
  try {
    const referrer = new URL(raw);
    const requestOrigin = new URL(request.url).origin;
    if (!['http:', 'https:'].includes(referrer.protocol) || referrer.origin === requestOrigin) return 'direct';
    const host = referrer.hostname.toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9][a-z0-9.-]{0,78}[a-z0-9]$/.test(host) ? host : 'direct';
  } catch {
    return 'direct';
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid analytics request.' }, 400);
  }

  const username = String(body?.username || '').trim().toLowerCase();
  const metric = String(body?.metric || '').trim().toLowerCase();
  const entryKey = metric === 'click' ? String(body?.entryKey || '').trim().toLowerCase() : '';
  if (!USERNAME_PATTERN.test(username) || !['view', 'click'].includes(metric)
    || (metric === 'click' && !ENTRY_KEY_PATTERN.test(entryKey))) {
    return jsonResponse({ success: false, error: 'Invalid analytics event.' }, 400);
  }

  const supabase = getSupabaseCredentials(env);
  const supabaseUrl = supabase.url;
  if (!supabaseUrl || !supabase.publishableKey) return jsonResponse({ success: false, error: 'Analytics service unavailable.' }, 503);

  const authorization = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  try {
    const endpoint = new URL('/rest/v1/rpc/record_profile_insight', supabaseUrl);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...getSupabasePublicHeaders(env, { authorization }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_username: username,
        p_metric: metric,
        p_entry_key: entryKey,
        p_device_class: getDeviceClass(request.headers.get('user-agent')),
        p_country_code: getCountry(request),
        p_referrer_host: getReferrerHost(request)
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return jsonResponse({ success: false, error: 'Analytics service unavailable.' }, 502);
    return jsonResponse(payload || { success: true, recorded: false, reason: 'empty_response' });
  } catch {
    return jsonResponse({ success: false, error: 'Analytics service unavailable.' }, 502);
  }
}
