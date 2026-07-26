import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'Privacy Policy | ChromaDie',
    description: 'Read the ChromaDie privacy policy and learn how account and gameplay data is handled.',
    canonicalPath: '/privacy',
    fallback: 'Read how ChromaDie handles account information, gameplay data, public profiles, security, retention, and account deletion.',
    cacheControl: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
  });
}
