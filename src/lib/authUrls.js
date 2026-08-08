import { getBrowserPublicOrigin, isLocalOrigin, normalizeOrigin, LOCAL_DEVELOPMENT_ORIGINS } from './siteOrigin.js';

export function getAppOrigin() {
  const configured = import.meta.env?.VITE_SITE_URL?.trim()
  const currentOrigin = typeof window !== 'undefined' ? window.location?.origin || '' : ''
  const normalizedConfigured = configured ? normalizeOrigin(configured) : null

  if (!currentOrigin && !normalizedConfigured) return LOCAL_DEVELOPMENT_ORIGINS[0]

  if (normalizedConfigured && isLocalOrigin(normalizedConfigured) && currentOrigin && !isLocalOrigin(currentOrigin)) {
    return currentOrigin
  }

  return getBrowserPublicOrigin({ configuredOrigin: configured, currentOrigin });
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

export function getSafeNextUrl(value, fallback = getAppOrigin()) {
  let fallbackUrl
  try {
    fallbackUrl = new URL(fallback, getAppOrigin())
  } catch {
    fallbackUrl = new URL(getAppOrigin())
  }
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallbackUrl.toString()
  }

  try {
    const candidate = new URL(value, fallbackUrl)
    return candidate.origin === fallbackUrl.origin ? candidate.toString() : fallbackUrl.toString()
  } catch {
    return fallbackUrl.toString()
  }
}
