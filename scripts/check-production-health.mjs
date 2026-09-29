import { pathToFileURL } from 'node:url';

const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/reset-password',
  '/how-to-play',
  '/leaderboard',
  '/pricing',
  '/privacy',
  '/terms',
  '/progression'
]

const mediaAssets = [
  '/homepage/homepage-hero-atmosphere-anime-v1.webp',
  '/homepage/homepage-hero-atmosphere-anime-mobile-v1.webp'
]

export async function checkProductionHealth({
  fetchImpl = fetch,
  siteOrigin = process.env.CHROMADIE_HEALTH_SITE_ORIGIN || 'https://chm.lol',
  supabaseAuthHealthUrl = process.env.CHROMADIE_SUPABASE_AUTH_HEALTH_URL || 'https://auuoibdmjylrnekqquku.supabase.co/auth/v1/health',
  timeoutMs = 12_000
} = {}) {
  const failures = []
  const request = (url, method = 'GET') => fetchImpl(url, {
    method,
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs)
  })

  for (const path of publicRoutes) {
    try {
      const response = await request(new URL(path, siteOrigin))
      const contentType = response.headers.get('content-type') || ''
      if (response.status !== 200 || !contentType.toLowerCase().startsWith('text/html')) {
        failures.push(`${path}: expected 200 HTML, received ${response.status} ${contentType || '(no content type)'}`)
        continue
      }
      if (path === '/') {
        const html = await response.text()
        if (!html.includes('Daily Random Color Game')) failures.push('/: homepage title marker was missing')
      }
    } catch (error) {
      failures.push(`${path}: ${error instanceof Error ? error.message : 'request failed'}`)
    }
  }

  for (const path of mediaAssets) {
    try {
      const response = await request(new URL(path, siteOrigin), 'HEAD')
      const contentType = response.headers.get('content-type') || ''
      if (response.status !== 200 || !contentType.toLowerCase().startsWith('image/webp')) {
        failures.push(`${path}: expected 200 WebP, received ${response.status} ${contentType || '(no content type)'}`)
      }
    } catch (error) {
      failures.push(`${path}: ${error instanceof Error ? error.message : 'request failed'}`)
    }
  }

  try {
    const response = await request(supabaseAuthHealthUrl)
    const body = await response.text()
    // The unauthenticated health route is expected to reject a request with no
    // API key. That response proves the Auth edge is reachable without storing
    // or sending the project's public key from a monitoring job.
    if (response.status !== 401 || !body.includes('No API key')) {
      failures.push(`Supabase Auth: expected the unauthenticated 401 health response, received ${response.status}`)
    }
  } catch (error) {
    failures.push(`Supabase Auth: ${error instanceof Error ? error.message : 'request failed'}`)
  }

  return { failures }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { failures } = await checkProductionHealth()
  if (failures.length > 0) {
    console.error('Production health check failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
  } else {
    console.log(`Production health check passed: ${publicRoutes.length} public routes, ${mediaAssets.length} WebP assets, and Supabase Auth reachability.`)
  }
}
