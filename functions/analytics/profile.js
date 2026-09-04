import { baseSecurityHeaders } from '../_publicPage.js';
import { getSupabaseCredentials, getSupabasePublicHeaders, getSupabaseSecretHeaders } from '../_supabaseApi.js';

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

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

/**
 * Produces an opaque, edge-derived daily visitor key. The source IP never
 * leaves this function and only the salted digest reaches Supabase. Deliberately
 * do not include a browser-controlled User-Agent: an attacker could otherwise
 * rotate that value to evade the per-visitor daily suppression.
 */
export async function getProfileInsightVisitorDigest(request, secret, now = new Date()) {
  const ip = String(request?.headers?.get('cf-connecting-ip') || '').trim();
  const salt = String(secret || '').trim();
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toISOString().slice(0, 10);
  if (!ip || !salt || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
  const source = `${salt}\u0000${day}\u0000${ip}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return bytesToHex(new Uint8Array(digest));
}

async function getVerifiedViewerId(request, env, supabase) {
  const authorization = String(request.headers.get('authorization') || request.headers.get('Authorization') || '').trim();
  if (!/^Bearer\s+\S+$/i.test(authorization) || !supabase.url || !supabase.publishableKey) return null;
  try {
    const response = await fetch(new URL('/auth/v1/user', supabase.url), {
      headers: getSupabasePublicHeaders(env, { authorization })
    });
    const payload = await response.json().catch(() => null);
    return response.ok && isUuid(payload?.id) ? payload.id : null;
  } catch {
    return null;
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
  if (!supabaseUrl || !supabase.publishableKey || !supabase.secretKey) {
    return jsonResponse({ success: false, error: 'Analytics service unavailable.' }, 503);
  }

  try {
    const visitorDigest = await getProfileInsightVisitorDigest(
      request,
      env?.PROFILE_ANALYTICS_VISITOR_SALT || supabase.secretKey
    );
    if (!visitorDigest) return jsonResponse({ success: false, error: 'Analytics service unavailable.' }, 503);

    const endpoint = new URL('/rest/v1/rpc/record_profile_insight_from_edge', supabaseUrl);
    const viewerId = await getVerifiedViewerId(request, env, supabase);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...getSupabaseSecretHeaders(env),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_username: username,
        p_metric: metric,
        p_entry_key: entryKey,
        p_device_class: getDeviceClass(request.headers.get('user-agent')),
        p_country_code: getCountry(request),
        p_referrer_host: getReferrerHost(request),
        p_visitor_digest: visitorDigest,
        p_viewer_id: viewerId
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return jsonResponse({ success: false, error: 'Analytics service unavailable.' }, 502);
    return jsonResponse(payload || { success: true, recorded: false, reason: 'empty_response' });
  } catch {
    return jsonResponse({ success: false, error: 'Analytics service unavailable.' }, 502);
  }
}
