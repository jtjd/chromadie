const LOCAL_ORIGIN = 'http://localhost:5173'

function normalizeOrigin(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : null
  } catch {
    return null
  }
}

function isLocalOrigin(value) {
  return value === LOCAL_ORIGIN || value.startsWith('http://localhost') || value.startsWith('http://127.0.0.1')
}

export function getAppOrigin() {
  const configured = import.meta.env?.VITE_SITE_URL?.trim()
  const normalizedConfigured = configured ? normalizeOrigin(configured) : null

  if (typeof window !== 'undefined' && window.location?.origin) {
    const currentOrigin = window.location.origin
    if (normalizedConfigured && isLocalOrigin(normalizedConfigured) && !isLocalOrigin(currentOrigin)) {
      return currentOrigin
    }
  }

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

export function getSafeNextUrl(value) {
  const fallback = getAppOrigin()
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback
  }

  try {
    const candidate = new URL(value, fallback)
    return candidate.origin === new URL(fallback).origin ? candidate.toString() : fallback
  } catch {
    return fallback
  }
}
