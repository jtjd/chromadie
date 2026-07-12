import { renderPublicPage } from './_publicPage.js';

export function onRequestGet({ request }) {
  return renderPublicPage(request, {
    title: 'ChromaDie — Daily Color Game',
    description: 'Roll a new color every day, discover its rarity and traits, earn EP, and compete for the highest score.',
    canonicalPath: '/',
    fallback: 'ChromaDie is a daily color game. Roll a new color, discover its rarity and traits, earn EP, and compete for high scores.'
  });
}
