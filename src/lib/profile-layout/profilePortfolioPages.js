/**
 * The portfolio layout is a sequence of full viewport pages. Keep the page
 * list derived from the same bounded render-model flags that decide which
 * modules are visible so the navigation never points at an empty section.
 */
export function getProfilePortfolioPages({
  hasProfileContent = false,
  hasProfileMusic = false,
  widgetCount = 0,
  hasProfileStory = false
} = {}) {
  const pages = [{ key: 'hero', label: 'Profile' }];
  if (hasProfileContent) pages.push({ key: 'content', label: 'About' });
  if (hasProfileMusic || Number(widgetCount) > 0) pages.push({ key: 'media', label: 'Media' });
  if (hasProfileStory) pages.push({ key: 'story', label: 'Story' });
  return pages;
}
