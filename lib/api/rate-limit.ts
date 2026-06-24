import { logger } from '@/lib/monitoring/logger'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { NextRequest } from 'next/server'

type Duration = `${number} ${'s' | 'm' | 'h' | 'd'}`

type LimitRule = {
  prefix: string
  requests: number
  window: Duration
  windowMs: number
}

type RateLimitRequest = Request | NextRequest

type RateLimitOptions = {
  identifier?: string | null
}

const globalForRateLimit = globalThis as typeof globalThis & {
  plotKareLocalRateLimitWindows?: Map<string, { count: number; expiresAt: number }>
}
const localWindows =
  globalForRateLimit.plotKareLocalRateLimitWindows ??
  (globalForRateLimit.plotKareLocalRateLimitWindows = new Map())
const remoteLimiters = new Map<string, Ratelimit>()

function pathnameFor(request: RateLimitRequest) {
  const maybeNext = request as NextRequest
  const pathname = maybeNext.nextUrl?.pathname ?? new URL(request.url).pathname
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

function routeMatches(pathname: string, pattern: RegExp | string) {
  return typeof pattern === 'string' ? pathname === pattern : pattern.test(pathname)
}

function ruleFor(request: RateLimitRequest): LimitRule | null {
  const pathname = pathnameFor(request)

  if (request.method === 'POST' && pathname === '/api/contact') {
    return { prefix: 'contact', requests: 5, window: '10 m', windowMs: 10 * 60_000 }
  }
  if (request.method === 'POST' && pathname === '/api/auth/login') {
    return { prefix: 'login', requests: 5, window: '15 m', windowMs: 15 * 60_000 }
  }
  if (request.method === 'POST' && pathname === '/api/auth/signup') {
    return { prefix: 'signup', requests: 3, window: '1 h', windowMs: 60 * 60_000 }
  }
  if (request.method === 'POST' && pathname === '/api/auth/password-reset') {
    return { prefix: 'password-reset', requests: 3, window: '1 h', windowMs: 60 * 60_000 }
  }

  const uploadRoutes: Array<string | RegExp> = [
    '/api/documents/upload-url',
    '/api/property-documents/upload-url',
    '/api/inspections/photos/upload-url',
    '/api/agent/get-upload-url',
    '/api/agent/confirm-photo-upload',
    /^\/api\/agent\/inspections\/[^/]+\/photo$/,
  ]
  if (request.method === 'POST' && uploadRoutes.some((pattern) => routeMatches(pathname, pattern))) {
    return { prefix: 'upload', requests: 20, window: '1 h', windowMs: 60 * 60_000 }
  }

  const workflowMutationRoutes: Array<string | RegExp> = [
    /^\/api\/agent\/inspections\/[^/]+\/submit$/,
    /^\/api\/agent\/inspections\/[^/]+\/arrival$/,
    /^\/api\/admin\/inspections\/[^/]+\/approve$/,
    /^\/api\/admin\/inspections\/[^/]+\/reject$/,
    /^\/api\/property-documents\/[^/]+\/lifecycle$/,
    '/api/property-documents/finalize',
  ]
  if ((request.method === 'POST' || request.method === 'DELETE') && workflowMutationRoutes.some((pattern) => routeMatches(pathname, pattern))) {
    return { prefix: 'workflow-mutation', requests: 20, window: '1 h', windowMs: 60 * 60_000 }
  }

  if ((request.method === 'GET' || request.method === 'POST') && pathname === '/api/admin/storage-check') {
    return { prefix: 'storage-check', requests: 3, window: '10 m', windowMs: 10 * 60_000 }
  }

  if (request.method === 'GET' && /^\/api\/property-documents\/[^/]+\/access$/.test(pathname)) {
    return { prefix: 'document-access', requests: 60, window: '1 h', windowMs: 60 * 60_000 }
  }

  return null
}

function clientIp(request: RateLimitRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

function localLimit(rule: LimitRule, identifier: string) {
  const key = `${rule.prefix}:${identifier}`
  const now = Date.now()
  const current = localWindows.get(key)
  if (!current || current.expiresAt <= now) {
    localWindows.set(key, { count: 1, expiresAt: now + rule.windowMs })
    return true
  }

  current.count += 1
  localWindows.set(key, current)
  return current.count <= rule.requests
}

function remoteLimiter(rule: LimitRule) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!redisUrl || !redisToken) return null

  const key = `${rule.prefix}:${rule.requests}:${rule.window}`
  const existing = remoteLimiters.get(key)
  if (existing) return existing

  const limiter = new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(rule.requests, rule.window),
    prefix: `plotkare:${rule.prefix}`,
  })
  remoteLimiters.set(key, limiter)
  return limiter
}

export async function isRateLimited(request: RateLimitRequest, options: RateLimitOptions = {}) {
  const rule = ruleFor(request)
  if (!rule) return false

  const identifier = options.identifier || clientIp(request)
  const limiter = remoteLimiter(rule)
  if (!limiter) return !localLimit(rule, identifier)

  try {
    const result = await limiter.limit(identifier)
    return !result.success
  } catch (error) {
    logger.error('Rate limit backend failed; using local fallback.', error)
    return !localLimit(rule, identifier)
  }
}
