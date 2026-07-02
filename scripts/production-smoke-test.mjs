#!/usr/bin/env node

const DEFAULT_PRODUCTION_URL = 'https://plotkare.in'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

const args = process.argv.slice(2)
const allowLocal = args.includes('--allow-local')
const baseArg = args.find((arg) => !arg.startsWith('--'))
const baseUrl = normalizeBaseUrl(baseArg || process.env.SMOKE_BASE_URL || DEFAULT_PRODUCTION_URL)
const results = []

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value)
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    fail('config', `Invalid base URL: ${value}`)
    process.exit(1)
  }
}

function isLocalUrl(value) {
  return LOCAL_HOSTS.has(new URL(value).hostname)
}

function pass(name, detail) {
  results.push({ status: 'PASS', name, detail })
}

function warn(name, detail) {
  results.push({ status: 'WARN', name, detail })
}

function fail(name, detail) {
  results.push({ status: 'FAIL', name, detail })
}

function fullUrl(path) {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

async function timedFetch(path, init = {}) {
  const started = performance.now()
  const response = await fetch(fullUrl(path), {
    redirect: init.redirect || 'manual',
    ...init,
    headers: {
      'user-agent': 'PlotKare-production-smoke-test/1.0',
      ...(init.headers || {}),
    },
  })
  const elapsedMs = Math.round(performance.now() - started)
  return { response, elapsedMs }
}

async function checkHealth() {
  try {
    const { response, elapsedMs } = await timedFetch('/api/health', { redirect: 'follow' })
    const body = await response.json().catch(() => null)
    if (response.status !== 200) return fail('health', `/api/health returned ${response.status}`)
    if (body?.status !== 'ok' || body?.version !== '1.0.0' || !body?.timestamp) {
      return fail('health', `/api/health returned unexpected body: ${JSON.stringify(body)}`)
    }
    if (elapsedMs > 500) warn('health latency', `/api/health took ${elapsedMs}ms; target is under 500ms`)
    pass('health', `/api/health ok in ${elapsedMs}ms`)
  } catch (error) {
    fail('health', error.message)
  }
}

async function checkAuthProviders() {
  try {
    const { response } = await timedFetch('/api/auth/providers', { redirect: 'follow' })
    const body = await response.json().catch(() => null)
    if (response.status !== 200) return fail('auth providers', `/api/auth/providers returned ${response.status}`)
    if (typeof body?.email !== 'boolean' || typeof body?.google !== 'boolean') {
      return fail('auth providers', `Unexpected provider body: ${JSON.stringify(body)}`)
    }
    if (!body.email) warn('auth providers', 'Email provider reports disabled')
    pass('auth providers', `email=${body.email}, google=${body.google}`)
  } catch (error) {
    fail('auth providers', error.message)
  }
}

async function checkSecurityHeaders() {
  try {
    const { response } = await timedFetch('/')
    if (response.status !== 200) return fail('security headers', `Homepage returned ${response.status}`)

    const expected = {
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      'x-frame-options': 'SAMEORIGIN',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(self), geolocation=(self), microphone=()',
      'x-xss-protection': '1; mode=block',
    }

    for (const [header, expectedValue] of Object.entries(expected)) {
      const actual = response.headers.get(header)
      if (!actual) fail(`header:${header}`, 'Missing')
      else if (actual !== expectedValue) fail(`header:${header}`, `Expected "${expectedValue}", got "${actual}"`)
      else pass(`header:${header}`, actual)
    }

    const csp = response.headers.get('content-security-policy') || ''
    if (!csp.includes('connect-src') || !csp.includes('https://*.supabase.co') || !csp.includes('wss://*.supabase.co')) {
      fail('header:content-security-policy', 'CSP connect-src does not include Supabase HTTP and realtime domains')
    } else {
      pass('header:content-security-policy', 'Supabase connect-src present')
    }
  } catch (error) {
    fail('security headers', error.message)
  }
}

async function checkPublicRoutes() {
  const routes = ['/', '/login/', '/signup/', '/forgot-password/', '/auth/update-password/', '/listings/', '/visakhapatnam/', '/robots.txt', '/sitemap.xml']
  for (const route of routes) {
    try {
      const { response, elapsedMs } = await timedFetch(route)
      if (response.status >= 200 && response.status < 400) pass(`route:${route}`, `${response.status} in ${elapsedMs}ms`)
      else fail(`route:${route}`, `returned ${response.status}`)
    } catch (error) {
      fail(`route:${route}`, error.message)
    }
  }
}

async function checkProtectedRoutes() {
  const protectedRoutes = ['/admin/dashboard/', '/owner/', '/agent/']
  for (const route of protectedRoutes) {
    try {
      const { response } = await timedFetch(route)
      const location = response.headers.get('location') || ''
      if ([301, 302, 303, 307, 308].includes(response.status) && /login|auth\/login/i.test(location)) {
        pass(`protected:${route}`, `redirects to ${location}`)
      } else {
        fail(`protected:${route}`, `expected login redirect, got ${response.status}${location ? ` -> ${location}` : ''}`)
      }
    } catch (error) {
      fail(`protected:${route}`, error.message)
    }
  }
}

async function checkCanonicalSignals() {
  const production = !isLocalUrl(baseUrl)
  const expectedOrigin = new URL(baseUrl).origin

  try {
    const { response } = await timedFetch('/')
    const html = await response.text()
    const hasCanonical = html.includes(`rel="canonical"`) && html.includes(expectedOrigin)
    if (production && !hasCanonical) fail('canonical', `Homepage canonical does not include ${expectedOrigin}`)
    else if (!production) warn('canonical', 'Skipped strict canonical check for local URL')
    else pass('canonical', `Homepage canonical includes ${expectedOrigin}`)
  } catch (error) {
    fail('canonical', error.message)
  }

  try {
    const { response } = await timedFetch('/sitemap.xml')
    const text = await response.text()
    if (production && !text.includes(expectedOrigin)) fail('sitemap', `Sitemap does not include ${expectedOrigin}`)
    else if (!production) warn('sitemap', 'Skipped strict sitemap domain check for local URL')
    else pass('sitemap', `Sitemap includes ${expectedOrigin}`)
  } catch (error) {
    fail('sitemap', error.message)
  }
}

function printResults() {
  console.log(`\nPlotKare smoke test target: ${baseUrl}\n`)
  for (const result of results) {
    const marker = result.status.padEnd(4)
    console.log(`${marker} ${result.name} - ${result.detail}`)
  }
  const failed = results.filter((result) => result.status === 'FAIL').length
  const warned = results.filter((result) => result.status === 'WARN').length
  console.log(`\nSummary: ${failed} failed, ${warned} warnings, ${results.length} checks total.`)
  return failed
}

if (isLocalUrl(baseUrl) && !allowLocal) {
  fail('config', 'Local smoke target requires --allow-local')
  printResults()
  process.exit(1)
}

await checkHealth()
await checkAuthProviders()
await checkSecurityHeaders()
await checkPublicRoutes()
await checkProtectedRoutes()
await checkCanonicalSignals()

process.exit(printResults() > 0 ? 1 : 0)
