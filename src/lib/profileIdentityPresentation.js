export const PROFILE_IDENTITY_PRESENTATION_VERSION = 1;
export const PROFILE_IDENTITY_DESCRIPTION_MODES = Object.freeze(['plain', 'typewriter']);
export const PROFILE_IDENTITY_ENTRY_ANIMATIONS = Object.freeze(['none', 'fade', 'rise', 'focus', 'pop', 'unfold']);
export const PROFILE_IDENTITY_ENTRY_ANIMATION_LABELS = Object.freeze({
  none: 'None',
  fade: 'Soft Fade',
  rise: 'Lift',
  focus: 'Lens Focus',
  pop: 'Bounce In',
  unfold: 'Fold In'
});
export const PROFILE_IDENTITY_LIMITS = Object.freeze({ location: 60, timezone: 40 });

const TIMEZONE_PATTERN = /^[A-Za-z0-9_+./:-]{1,40}$/;

function safeText(value, maximum) {
  const text = [...String(value ?? '')].filter(character => {
    const code = character.codePointAt(0);
    return code >= 32 && (code < 127 || code > 159);
  }).join('').trim();
  return text.slice(0, maximum);
}

export function createDefaultProfileIdentityPresentation() {
  return {
    version: PROFILE_IDENTITY_PRESENTATION_VERSION,
    location: '',
    timezone: '',
    showJoinDate: false,
    showAvatar: true,
    descriptionMode: 'plain',
    entryAnimation: 'none'
  };
}

export function normalizeProfileIdentityPresentation(value) {
  const fallback = createDefaultProfileIdentityPresentation();
  const input = value && typeof value === 'object' ? value : {};
  const timezone = safeText(input.timezone, PROFILE_IDENTITY_LIMITS.timezone);
  return {
    version: PROFILE_IDENTITY_PRESENTATION_VERSION,
    location: safeText(input.location, PROFILE_IDENTITY_LIMITS.location),
    timezone: timezone && TIMEZONE_PATTERN.test(timezone) ? timezone : '',
    showJoinDate: input.showJoinDate === true || input.show_join_date === true,
    showAvatar: input.showAvatar !== false && input.avatar_visible !== false,
    descriptionMode: PROFILE_IDENTITY_DESCRIPTION_MODES.includes(input.descriptionMode) ? input.descriptionMode : fallback.descriptionMode,
    entryAnimation: PROFILE_IDENTITY_ENTRY_ANIMATIONS.includes(input.entryAnimation) ? input.entryAnimation : fallback.entryAnimation
  };
}

export function profileIdentityMetadata(value) {
  const normalized = normalizeProfileIdentityPresentation(value);
  return {
    ...normalized,
    hasLocation: Boolean(normalized.location),
    hasTimezone: Boolean(normalized.timezone)
  };
}
