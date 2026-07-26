const BADGE_ID_PATTERN = /^[a-z0-9_]{1,80}$/;

export function getPercentileTier(percentile, totalRollers) {
  const total = Number(totalRollers) || 0;
  const p = Number(percentile) || 0;
  if (total <= 1) return { text: '🏆 First roll of the day!', color: '#f1c40f', total };

  const rank = 100 - p;
  if (rank <= 1) return { text: '🔥 Top 1% today', color: '#f1c40f', total };
  if (rank <= 5) return { text: '⭐ Top 5% today', color: '#ffeb3b', total };
  if (rank <= 10) return { text: '🚀 Top 10% today', color: '#10b981', total };
  if (rank <= 25) return { text: '👍 Top 25% today', color: '#6ee787', total };
  if (rank <= 50) return { text: '📊 Above average today', color: '#e0e0e0', total };
  if (rank <= 75) return { text: '⚪ Around average today', color: '#8a8a9a', total };
  if (rank <= 90) return { text: '⚠️ Bottom 25% today', color: '#ff9800', total };
  if (rank <= 95) return { text: '🔻 Bottom 10% today', color: '#ef4444', total };
  return { text: '💀 Bottom 5% today', color: '#b91c1c', total };
}

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
