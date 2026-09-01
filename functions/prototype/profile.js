import { renderPublicPage } from '../_publicPage.js';

export function onRequestGet({ request, env }) {
  if (env?.PROFILE_PROTOTYPES_ENABLED !== 'true') {
    return new Response('Not found', {
      status: 404,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=UTF-8',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY'
      }
    });
  }

  return renderPublicPage(request, env, {
    title: 'Profile Canvas Prototype | ChromaDie',
    description: 'A noindex Phase 1 profile canvas prototype for ChromaDie.',
    canonicalPath: '/prototype/profile',
    fallback: 'A noindex design prototype for the ChromaDie profile canvas.',
    robots: 'noindex,nofollow'
  });
}
