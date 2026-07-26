import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'How to Play | ChromaDie',
    description: 'Learn how ChromaDie works: roll a color every day, discover rarity and traits, earn EP, and compete on the leaderboard.',
    canonicalPath: '/how-to-play',
    fallback: 'Learn how ChromaDie works: roll once each day, discover color rarity and bonus traits, earn EP, unlock cosmetics, and compare your results.',
    cacheControl: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
  });
}
