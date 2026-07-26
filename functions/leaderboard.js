import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'Discovery | ChromaDie',
    description: 'Explore ChromaDie players, public color stories, exceptional rolls, and daily leaderboard results.',
    canonicalPath: '/leaderboard',
    fallback: 'Explore public ChromaDie profiles, exceptional color rolls, rising players, and leaderboard results.',
    cacheControl: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
  });
}
