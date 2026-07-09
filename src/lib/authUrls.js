const LOCAL_ORIGIN = 'http://localhost:5173'

function normalizeOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function getAppOrigin() {
  const configured = import.meta.env.VITE_SITE_URL?.trim()
  const normalizedConfigured = configured ? normalizeOrigin(configured) : null

  if (normalizedConfigured) {
    return normalizedConfigured
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return LOCAL_ORIGIN
}

export function buildAppUrl(pathname = '/', params = {}) {
  const url = new URL(pathname, getAppOrigin())

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

export function getAuthCallbackUrl(next) {
  return buildAppUrl('/auth/callback', next ? { next } : {})
}

export function getResetPasswordUrl(next) {
  return buildAppUrl('/reset-password', next ? { next } : {})
}
