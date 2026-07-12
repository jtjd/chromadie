import { baseSecurityHeaders } from '../_publicPage.js';
import { loadAuthoritativeChallenge } from '../_challenge.js';

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  const challenge = await loadAuthoritativeChallenge(params.get('id'), env);
  const score = challenge ? Number(challenge.target_score).toLocaleString() : 'Unavailable';
  const sender = escapeXml(challenge?.sender_username || 'ChromaDie');
  const rawHex = String(challenge?.target_hex || '').replace('#', '');
  const hex = /^[0-9a-fA-F]{6}$/.test(rawHex) ? `#${rawHex}` : '#7c6cf2';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#050505"/><rect x="28" y="28" width="1144" height="574" rx="24" fill="none" stroke="#242631"/>
  <circle cx="930" cy="315" r="172" fill="${hex}" opacity=".18"/><circle cx="930" cy="315" r="126" fill="${hex}" stroke="#e7e8ee" stroke-opacity=".5" stroke-width="3"/>
  <text x="92" y="160" fill="#f1f2f5" font-family="Inter,Arial,sans-serif" font-size="38" font-weight="700">ChromaDie</text>
  <text x="92" y="248" fill="#c7c9d1" font-family="Inter,Arial,sans-serif" font-size="30">${challenge ? `${sender} challenged you` : 'Challenge unavailable'}</text>
  <text x="92" y="365" fill="#f1f2f5" font-family="Space Grotesk,Arial,sans-serif" font-size="92" font-weight="700">${escapeXml(score)} EP</text>
  <text x="92" y="430" fill="#9b9eaa" font-family="Inter,Arial,sans-serif" font-size="26">Beat this score · ${escapeXml(hex.toUpperCase())}</text>
  <text x="92" y="535" fill="#7c6cf2" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="600">DAILY COLOR GAME</text>
</svg>`;
  return new Response(svg, { headers: { ...baseSecurityHeaders, 'Content-Type': 'image/svg+xml; charset=UTF-8', 'Cache-Control': 'public, max-age=300, s-maxage=900' } });
}
