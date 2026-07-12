import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'Leaderboard | ChromaDie',
    description: 'Compare ChromaDie players, scores, and daily color-roll results on the leaderboard.',
    canonicalPath: '/leaderboard',
    fallback: 'Compare daily color-roll scores, track the leading players, and see how your ChromaDie results stack up.'
  });
}
