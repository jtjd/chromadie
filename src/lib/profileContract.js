const PROFILE_FIELDS = Object.freeze([
  'id',
  'username',
  'display_name',
  'bio',
  'current_streak',
  'longest_streak',
  'ep_spent',
  'lifetime_ep',
  'total_rolls',
  'is_staff',
  'equipped_cosmetics',
  'reroll_shards',
  'equipped_badges',
  'mood_color',
  'best_roll_score',
  'best_roll_hex',
  'best_roll_rarity'
])

const SCORE_FIELDS = Object.freeze([
  'hex_code',
  'score',
  'rarity',
  'roll_date',
  'badges',
  'condition_ids',
  'contributors',
  'traits',
  'identity'
])

function pickFields(record, fields) {
  if (!record || typeof record !== 'object') return null

  return Object.fromEntries(
    fields
      .filter(field => Object.prototype.hasOwnProperty.call(record, field))
      .map(field => [field, record[field]])
  )
}

export function mapProfileRecord(record) {
  const mapped = pickFields(record, PROFILE_FIELDS)
  return mapped && Object.keys(mapped).length > 0 ? mapped : null
}

export function mapProfileScores(scores) {
  if (!Array.isArray(scores)) return []
  return scores
    .filter(score => score && typeof score === 'object')
    .map(score => pickFields(score, SCORE_FIELDS))
}

export function isOwnProfileTarget({
  isAuthenticated = false,
  sessionUserId = null,
  profileId = null
} = {}) {
  return Boolean(isAuthenticated && sessionUserId && profileId === sessionUserId)
}

export function isOwnProfileLookup({
  isAuthenticated = false,
  sessionUserId = null,
  currentUsername = '',
  profileUsername = null,
  userId = null
} = {}) {
  if (!isAuthenticated || !sessionUserId) return false

  return Boolean(
    (!profileUsername && (!userId || userId === sessionUserId))
    || (profileUsername && currentUsername && profileUsername.toLowerCase() === currentUsername.toLowerCase())
  )
}
