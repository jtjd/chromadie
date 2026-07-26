import { renderPublicPage } from '../_publicPage.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'Profile Canvas Prototype | ChromaDie',
    description: 'A noindex Phase 1 profile canvas prototype for ChromaDie.',
    canonicalPath: '/prototype/profile',
    fallback: 'A noindex design prototype for the ChromaDie profile canvas.',
    robots: 'noindex,nofollow'
  });
}
