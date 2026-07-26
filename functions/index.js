import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'ChromaDie — Daily Color Game',
    description: 'Roll a new color every day, discover its rarity and traits, earn EP, and compete for the highest score.',
    canonicalPath: '/',
    fallback: 'ChromaDie is a daily color game. Roll a new color, discover its rarity and traits, earn EP, and compete for high scores.',
    cacheControl: 'public, max-age=60, s-maxage=300, stale-while-revalidate=60'
  });
}
