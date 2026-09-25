import { renderPublicPage } from './_publicPage.js';
import {
  HOW_TO_PLAY_CANONICAL_PATH,
  HOW_TO_PLAY_META_DESCRIPTION,
  HOW_TO_PLAY_NO_SCRIPT_SUMMARY
} from '../src/lib/howToPlayContent.js';

export function onRequestGet({ request, env }) {
  return renderPublicPage(request, env, {
    title: 'How to Play | ChromaDie',
    description: HOW_TO_PLAY_META_DESCRIPTION,
    canonicalPath: HOW_TO_PLAY_CANONICAL_PATH,
    fallback: HOW_TO_PLAY_NO_SCRIPT_SUMMARY,
    cacheControl: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
  });
}
