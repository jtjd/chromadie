// The browser uses this snapshot for immediate feedback only. The database
// reservation table and username trigger remain the authoritative boundary.

const HARD_RESERVED_NAMES = Object.freeze([
  'account', 'accounts', 'admin', 'administrator', 'api', 'assets', 'auth',
  'c', 'callback', 'challenge', 'challenges', 'changelog', 'discover', 'docs',
  'documentation', 'edit', 'explore', 'faq', 'featured', 'help', 'home',
  'howtoplay', 'leaderboard', 'legal', 'login', 'logout', 'notifications',
  'oauth', 'og', 'password', 'privacy', 'pricing', 'progression', 'profile', 'profiles', 'prototype',
  'random', 'rankings', 'recent', 'register', 'resetpassword', 'rising',
  'robots', 'roll', 'search', 'settings', 'shop', 'signup', 'sitemap',
  'status', 'store', 'studio', 'support', 'terms', 'trending', 'u', 'verify',
  'verification', 'webhook', 'webhooks',
  'chm', 'chmlol', 'chromadie', 'chromadielol', 'official', 'officialchm',
  'officialchromadie', 'chmofficial', 'chromadieofficial', 'chm_official',
  'chromadie_official', 'team', 'chmteam', 'chromadieteam', 'chm_team',
  'chromadie_team', 'staff', 'chmstaff', 'chromadiestaff', 'chm_staff',
  'chromadie_staff', 'founder', 'founders', 'chmfounder', 'chromadiefounder',
  'chm_founder', 'chromadie_founder', 'owner', 'owners', 'dev', 'developer',
  'developers', 'chmdev', 'chromadiedev', 'chm_dev', 'chromadie_dev',
  'abuse', 'safety', 'security', 'trust', 'trustandsafety', 'moderation',
  'moderator', 'moderators', 'mod', 'mods', 'compliance', 'helpdesk',
  'customersupport', 'customer_support', 'chmsupport', 'chromadiesupport',
  'chm_support', 'chromadie_support', 'system', 'service', 'services', 'bot',
  'bots', 'automation', 'webmaster', 'postmaster', 'hostmaster', 'sysadmin',
  'root', 'database', 'dbadmin', 'mail', 'email', 'noreply', 'no_reply',
  'announcement', 'announcements', 'guest', 'anon', 'anonymous'
]);

const MANUAL_RELEASE_NAMES = Object.freeze([
  'about', 'blog', 'careers', 'jobs', 'contact', 'press', 'media', 'news',
  'updates', 'roadmap', 'community', 'creator', 'creators', 'partner',
  'partners', 'ambassador', 'ambassadors', 'event', 'events', 'contest',
  'contests', 'giveaway', 'giveaways', 'billing', 'payment', 'payments',
  'premium', 'subscription', 'subscriptions', 'discord', 'spotify', 'youtube',
  'twitch', 'twitter', 'instagram', 'tiktok', 'github', 'steam', 'reddit',
  'facebook'
]);

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,20}$/;
export const HARD_RESERVED_USERNAMES = HARD_RESERVED_NAMES;
export const MANUAL_RELEASE_USERNAMES = MANUAL_RELEASE_NAMES;
export const HARD_RESERVED_USERNAME_SET = new Set(HARD_RESERVED_NAMES);
export const MANUAL_RELEASE_USERNAME_SET = new Set(MANUAL_RELEASE_NAMES);

export const USERNAME_POLICY_SNAPSHOT = Object.freeze([
  ...HARD_RESERVED_NAMES.map(username => ({
    username,
    category: getCategory(username),
    releasePolicy: 'never'
  })),
  ...MANUAL_RELEASE_NAMES.map(username => ({
    username,
    category: 'protected',
    releasePolicy: 'manual'
  }))
]);

function getCategory(username) {
  const routeNames = new Set([
    'account', 'accounts', 'api', 'assets', 'auth', 'c', 'callback', 'challenge',
    'challenges', 'changelog', 'discover', 'docs', 'documentation', 'edit',
    'explore', 'faq', 'featured', 'help', 'home', 'howtoplay', 'leaderboard',
    'legal', 'login', 'logout', 'notifications', 'oauth', 'og', 'password', 'privacy', 'pricing',
    'profile', 'profiles', 'progression', 'prototype', 'random', 'rankings', 'recent',
    'register', 'resetpassword', 'rising', 'robots', 'roll', 'search',
    'settings', 'shop', 'signup', 'sitemap', 'status', 'store', 'studio',
    'support', 'terms', 'trending', 'u', 'verify', 'verification', 'webhook',
    'webhooks'
  ]);
  const brandNames = new Set([
    'chm', 'chmlol', 'chromadie', 'chromadielol', 'official', 'officialchm',
    'officialchromadie', 'chmofficial', 'chromadieofficial', 'chm_official',
    'chromadie_official'
  ]);
  const trustNames = new Set([
    'abuse', 'safety', 'security', 'trust', 'trustandsafety', 'moderation',
    'moderator', 'moderators', 'mod', 'mods', 'compliance', 'helpdesk',
    'customersupport', 'customer_support', 'chmsupport', 'chromadiesupport',
    'chm_support', 'chromadie_support'
  ]);
  const systemNames = new Set([
    'system', 'service', 'services', 'bot', 'bots', 'automation', 'webmaster',
    'postmaster', 'hostmaster', 'sysadmin', 'root', 'database', 'dbadmin',
    'mail', 'email', 'noreply', 'no_reply', 'announcement', 'announcements'
  ]);

  if (routeNames.has(username)) return 'route';
  if (brandNames.has(username)) return 'brand';
  if (trustNames.has(username)) return 'trust';
  if (systemNames.has(username)) return 'system';
  if (['team', 'chmteam', 'chromadieteam', 'chm_team', 'chromadie_team',
    'staff', 'chmstaff', 'chromadiestaff', 'chm_staff', 'chromadie_staff',
    'founder', 'founders', 'chmfounder', 'chromadiefounder', 'chm_founder',
    'chromadie_founder', 'owner', 'owners', 'dev', 'developer', 'developers',
    'chmdev', 'chromadiedev', 'chm_dev', 'chromadie_dev'].includes(username)) {
    return 'official';
  }
  return 'protected';
}

export function normalizeUsernameKey(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed.toLowerCase() : '';
}

export function isUsernameShapeValid(value) {
  return USERNAME_PATTERN.test(String(value ?? '').trim());
}

export function getUsernamePolicy(value) {
  const key = normalizeUsernameKey(value);
  return USERNAME_POLICY_SNAPSHOT.find(entry => entry.username === key) || null;
}

export function isProtectedUsername(value) {
  return Boolean(getUsernamePolicy(value));
}
