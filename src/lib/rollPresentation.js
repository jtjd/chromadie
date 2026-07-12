const BADGE_ID_PATTERN = /^[a-z0-9_]{1,80}$/;

export function getAuthoritativeBadgeIds(data) {
  const supplied = Array.isArray(data?.badges)
    ? data.badges
    : Array.isArray(data?.condition_ids)
      ? data.condition_ids
      : [];
  const contributorIds = Array.isArray(data?.contributors)
    ? data.contributors.map(contributor => contributor?.id)
    : [];

  return [...new Set((supplied.length ? supplied : contributorIds)
    .filter(id => typeof id === 'string' && BADGE_ID_PATTERN.test(id))
    .slice(0, 80))];
}
