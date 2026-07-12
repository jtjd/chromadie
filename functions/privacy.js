import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request }) {
  return renderPublicPage(request, {
    title: 'Privacy Policy | ChromaDie',
    description: 'Read the ChromaDie privacy policy and learn how account and gameplay data is handled.',
    canonicalPath: '/privacy',
    fallback: 'Read how ChromaDie handles account information, gameplay data, public profiles, security, retention, and account deletion.'
  });
}
