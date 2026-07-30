export const DISPLAY_NAME_MAX_LENGTH = 40;
export const BIO_MAX_LENGTH = 160;

function codePoints(value) {
  return Array.from(String(value ?? ''));
}

export function countIdentityCharacters(value) {
  return codePoints(value).length;
}

function hasControlCharacters(value) {
  return codePoints(value).some(character => {
    const codePoint = character.codePointAt(0);
    return codePoint === 0
      || (codePoint >= 0 && codePoint <= 0x1f)
      || (codePoint >= 0x7f && codePoint <= 0x9f);
  });
}

export function normalizeIdentityField(value, { label, maxLength }) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return { value: null, error: '' };

  if (hasControlCharacters(normalized)) {
    return { value: null, error: `${label} cannot contain control characters.` };
  }

  if (countIdentityCharacters(normalized) > maxLength) {
    return { value: null, error: `${label} must be ${maxLength} characters or less.` };
  }

  return { value: normalized, error: '' };
}

export function normalizePublicIdentity({ displayName = '', bio = '' } = {}) {
  const display = normalizeIdentityField(displayName, {
    label: 'Display name',
    maxLength: DISPLAY_NAME_MAX_LENGTH
  });
  const biography = normalizeIdentityField(bio, {
    label: 'Bio',
    maxLength: BIO_MAX_LENGTH
  });

  return {
    displayName: display.value,
    bio: biography.value,
    fieldErrors: {
      displayName: display.error,
      bio: biography.error
    },
    errors: [display.error, biography.error].filter(Boolean),
    valid: !display.error && !biography.error
  };
}

export function identityCharacterCount(value) {
  return countIdentityCharacters(value);
}
