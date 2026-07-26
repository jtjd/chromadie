import { getAuthoritativeBadgeIds } from './rollPresentation.js'

export function getRollAccountMode(sessionValue) {
  return sessionValue?.user?.id ? 'authenticated' : 'guest'
}

export function isRollReady(authInitialized) {
  return Boolean(authInitialized)
}

export function canInitiateRoll({
  authInitialized = false,
  loading = false,
  rerollRequestInFlight = false,
  isReroll = false,
  userId = null,
  rerollShards = 0,
  rerollLocked = false
} = {}) {
  if (!authInitialized) return false
  if (!isReroll) return true

  return Boolean(
    !loading
    && !rerollRequestInFlight
    && userId
    && Number(rerollShards) > 0
    && !rerollLocked
  )
}

export function normalizeCanonicalRoll(data) {
  return {
    hex: typeof data?.hex === 'string' ? data.hex : (typeof data?.hex_code === 'string' ? data.hex_code : ''),
    score: data?.score ?? 0,
    rarity: typeof data?.rarity === 'string' ? data.rarity : '',
    badges: getAuthoritativeBadgeIds(data),
    traits: Array.isArray(data?.traits) ? data.traits.slice(0, 12) : [],
    contributors: Array.isArray(data?.contributors) ? data.contributors.slice(0, 64) : [],
    identity: typeof data?.identity === 'string' ? data.identity.slice(0, 120) : ''
  }
}

export function createCanonicalRollData(data, date, badges = null) {
  const canonical = normalizeCanonicalRoll(data)
  return {
    date,
    hex: canonical.hex,
    score: canonical.score,
    rarity: canonical.rarity,
    badges: badges || canonical.badges,
    traits: canonical.traits,
    contributors: canonical.contributors,
    identity: canonical.identity
  }
}
