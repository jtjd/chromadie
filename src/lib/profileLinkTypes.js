const PROFILE_LINK_ROWS = [
  ['website', 'Website', 'link', false],
  ['youtube', 'YouTube', 'youtube', 'youtube.com', 'youtu.be'],
  ['twitch', 'Twitch', 'twitch', 'twitch.tv'],
  ['github', 'GitHub', 'github', 'github.com'],
  ['discord', 'Discord', 'discord', 'discord.com', 'discord.gg'],
  ['twitter', 'X / Twitter', 'x', 'x.com', 'twitter.com'],
  ['instagram', 'Instagram', 'instagram', 'instagram.com'],
  ['tiktok', 'TikTok', 'tiktok', 'tiktok.com'],
  ['linkedin', 'LinkedIn', 'linkedin', 'linkedin.com'],
  ['bluesky', 'Bluesky', 'bluesky', 'bsky.app'],
  ['mastodon', 'Mastodon', 'mastodon'],
  ['kick', 'Kick', 'kick', 'kick.com'],
  ['patreon', 'Patreon', 'patreon', 'patreon.com'],
  ['spotify', 'Spotify', 'spotify', 'open.spotify.com'],
  ['steam', 'Steam', 'steam', 'steamcommunity.com', 'store.steampowered.com'],
  ['other', 'Other', 'link', false]
];

/**
 * The link service registry is the single source for editor labels, public
 * glyphs, and the bounded URL policy.  Profile configuration still keeps
 * historical HTTPS links readable; the stricter host metadata is used by the
 * editor when a player changes or adds a service link.
 */
export const PROFILE_LINK_DEFINITIONS = Object.freeze(PROFILE_LINK_ROWS.map(([key, label, icon, ...values]) => {
  return {
    key,
    label,
    icon,
    social: key !== 'website' && key !== 'other',
    urlValidation: values.filter(value => typeof value === 'string' && value.length > 0)
  };
}));

export const PROFILE_LINK_TYPES = Object.freeze(PROFILE_LINK_DEFINITIONS.map(definition => definition.key));

const PROFILE_LINK_DEFINITION_MAP = Object.fromEntries(
  PROFILE_LINK_DEFINITIONS.map(definition => [definition.key, definition])
);

export function getProfileLinkDefinition(value) {
  return PROFILE_LINK_DEFINITION_MAP[String(value || '').trim().toLowerCase()] || PROFILE_LINK_DEFINITION_MAP.other;
}

export function isProfileSocialLink(value) {
  return Boolean(getProfileLinkDefinition(value).social);
}

export function isProfileLinkUrlValid(type, value) {
  const candidate = String(value || '').trim();
  if (!candidate || candidate.length > 2048) return false;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const hosts = getProfileLinkDefinition(type).urlValidation;
  if (!hosts.length) return true;
  const hostname = parsed.hostname.toLowerCase();
  return hosts.some(host => hostname === host || hostname.endsWith(`.${host}`));
}
