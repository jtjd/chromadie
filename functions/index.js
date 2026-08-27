import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'ChromaDie — Daily Random Color Game',
    description: 'Roll one of 16,777,216 colors once a day. Discover exact RGB and HEX patterns, see how rare your color is, and compare your score.',
    canonicalPath: '/',
    fallback: 'Roll one of 16,777,216 colors once a day. Chromadie explains the exact RGB and HEX patterns in your result, calculates its rarity and score, and lets you compare it with today’s public rolls.',
    cacheControl: 'public, max-age=60, s-maxage=300, stale-while-revalidate=60'
  });
}
