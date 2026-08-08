const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOTIFICATION_TYPES = new Set(['favorite', 'reaction', 'guestbook', 'reply', 'guestbook_like', 'reward']);
const PAYLOAD_KEYS = new Set(['bodyPreview', 'name', 'description', 'rewardName', 'rewardKind', 'milestoneId', 'achievementId', 'icon', 'reaction']);

export const PROFILE_NOTIFICATION_TYPES = Object.freeze([
  'favorite',
  'reaction',
  'guestbook',
  'reply',
  'guestbook_like',
  'reward'
]);

export function createEmptyProfileNotifications() {
  return { success: true, unreadCount: 0, notifications: [] };
}

function safeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 1000) : 1;
}

function safeText(value, maximum = 120) {
  if (typeof value !== 'string') return '';
  return [...value]
    .filter(character => {
      const code = character.codePointAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, maximum);
}

function safePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const payload = {};
  for (const [key, rawValue] of Object.entries(value).slice(0, 8)) {
    const safeKey = safeText(key, 32);
    if (!safeKey || !PAYLOAD_KEYS.has(safeKey)) continue;
    if (typeof rawValue === 'string') payload[safeKey] = safeText(rawValue, 160);
    else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) payload[safeKey] = Math.floor(rawValue);
    else if (typeof rawValue === 'boolean') payload[safeKey] = rawValue;
  }
  return payload;
}

function normalizeNotification(value) {
  if (!value || typeof value !== 'object') return null;
  const id = safeText(value.id, 64);
  const type = safeText(value.type, 32).toLowerCase();
  if (!UUID_PATTERN.test(id) || !NOTIFICATION_TYPES.has(type)) return null;
  const entryKey = safeText(value.entryKey, 64);
  const replyKey = safeText(value.replyKey, 64);
  return {
    id,
    type,
    actor: safeText(value.actor, 20),
    eventCount: safeCount(value.eventCount),
    payload: safePayload(value.payload),
    entryKey: UUID_PATTERN.test(entryKey) ? entryKey : '',
    replyKey: UUID_PATTERN.test(replyKey) ? replyKey : '',
    readAt: typeof value.readAt === 'string' ? value.readAt : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null
  };
}

export function normalizeProfileNotifications(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    success: source.success !== false,
    unreadCount: Math.min(Math.max(Number(source.unreadCount) || 0, 0), 1000),
    notifications: (Array.isArray(source.notifications) ? source.notifications : [])
      .map(normalizeNotification)
      .filter(Boolean)
      .slice(0, 50)
  };
}

export function getProfileNotificationLabel(notification) {
  const actor = notification?.actor ? `@${notification.actor}` : 'Someone';
  const count = notification?.eventCount > 1 ? ` (${notification.eventCount})` : '';
  switch (notification?.type) {
    case 'favorite': return `${actor} saved your profile${count}`;
    case 'reaction': return `${actor} sent a positive reaction${count}`;
    case 'guestbook': return `${actor} signed your guestbook${count}`;
    case 'reply': return `${actor} replied in your guestbook${count}`;
    case 'guestbook_like': return `${actor} liked a guestbook note${count}`;
    case 'reward': return `A new earned reward is ready to revisit${count}`;
    default: return 'New profile activity';
  }
}

export function getProfileNotificationDetail(notification) {
  const payload = notification?.payload || {};
  return safeText(payload.name || payload.bodyPreview || payload.description || '', 160);
}
