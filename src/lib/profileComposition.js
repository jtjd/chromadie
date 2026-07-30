import { getVisibleProfileModules, normalizeProfileConfig } from './profileConfig.js'

export const PROFILE_PRIMARY_REGIONS = Object.freeze([
  'identity',
  'roll',
  'expression',
  'featured'
])

function firstVisible(visibleIds, candidates, excluded = new Set()) {
  return candidates.find(id => visibleIds.has(id) && !excluded.has(id)) || null
}

/**
 * Project the version-1 configuration into the small profile-first surface.
 * Stored module definitions remain intact; this is a presentation projection.
 */
export function getProfileComposition(config, {
  isOwner = false,
  hasLinks = false,
  hasPinnedAchievements = false,
  hasCollection = false,
  hasTimeline = false
} = {}) {
  const normalized = normalizeProfileConfig(config)
  const activeModules = getVisibleProfileModules(normalized, isOwner)
    .filter(module => module.id !== 'boundary' && module.id !== 'explore')
  const visibleIds = new Set(activeModules.map(module => module.id))

  const expressionId = hasLinks && visibleIds.has('links')
    ? 'links'
    : firstVisible(visibleIds, ['signature', 'links', 'stats']) || 'signature'

  const featureCandidates = [
    hasPinnedAchievements || hasCollection ? 'achievements' : null,
    hasTimeline ? 'recent' : null,
    'achievements',
    'recent',
    'signature',
    'stats'
  ].filter(Boolean)

  const reserved = new Set(['roll', expressionId])
  const featuredId = firstVisible(visibleIds, featureCandidates, reserved)
  if (featuredId) reserved.add(featuredId)

  return {
    activeModules,
    expressionId,
    featuredId,
    secondaryModules: activeModules.filter(module => !reserved.has(module.id))
  }
}
