import { baseSecurityHeaders } from '../_publicPage.js';
import { loadPublicProfile } from '../_profilePage.js';

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function onRequestGet({ request, env }) {
  const username = new URL(request.url).searchParams.get('username') || '';
  const profile = await loadPublicProfile(username, env);

  const safeUsername = escapeXml(profile?.username || username || 'ChromaDie Player');
  const score = profile?.best_roll_score ? Number(profile.best_roll_score).toLocaleString() : '—';
  const rawHex = String(profile?.best_roll_hex || '').replace('#', '');
  const hex = /^[0-9a-fA-F]{6}$/.test(rawHex) ? `#${rawHex}` : '#7c6cf2';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#050505"/>
  <rect x="28" y="28" width="1144" height="574" rx="24" fill="none" stroke="#242631"/>
  <path d="M650 0h550v630H650z" fill="#0d0f18"/>
  <circle cx="930" cy="315" r="168" fill="${hex}" opacity=".18"/>
  <circle cx="930" cy="315" r="124" fill="${hex}" stroke="#e7e8ee" stroke-opacity=".48" stroke-width="3"/>
  <text x="92" y="160" fill="#f1f2f5" font-family="Satoshi,Arial,sans-serif" font-size="38" font-weight="700">ChromaDie</text>
  <text x="92" y="245" fill="#c7c9d1" font-family="Satoshi,Arial,sans-serif" font-size="30">${safeUsername}'s best roll</text>
  <text x="92" y="360" fill="#f1f2f5" font-family="Cabinet Grotesk,Arial,sans-serif" font-size="92" font-weight="700">${escapeXml(score)} EP</text>
  <text x="92" y="425" fill="#9b9eaa" font-family="Satoshi,Arial,sans-serif" font-size="26">${escapeXml(hex.toUpperCase())} · Public player profile</text>
  <text x="92" y="535" fill="#9f8cff" font-family="Satoshi,Arial,sans-serif" font-size="24" font-weight="600">DAILY COLOR GAME</text>
</svg>`;

  return new Response(svg, {
    headers: {
      ...baseSecurityHeaders,
      'Content-Type': 'image/svg+xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900'
    }
  });
}
