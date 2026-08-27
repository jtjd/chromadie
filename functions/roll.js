import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'Daily Roll | ChromaDie',
    description: 'Roll one of 16,777,216 colors and reveal its exact RGB and HEX patterns, rarity, and score.',
    canonicalPath: '/',
    fallback: 'The canonical ChromaDie daily color game is available on the homepage.',
    robots: 'noindex,follow',
    cacheControl: 'public, max-age=60, s-maxage=300, stale-while-revalidate=60'
  });
}
