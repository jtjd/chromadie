/**
 * The profile card is always page one. The optional game progress page is
 * owner-selected and independent of which visual card layout is in use.
 */
export function getProfilePages({ hasProgressPage = false } = {}) {
  const pages = [{ key: 'hero', label: 'Profile' }];
  if (hasProgressPage) pages.push({ key: 'progress', label: 'Progress' });
  return pages;
}
