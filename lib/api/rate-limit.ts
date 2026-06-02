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

const localWindows = new Map<string, { count: number; expiresAt: number }>()
const remoteLimiters = new Map<string, Ratelimit>()

function ruleFor(request: NextRequest): LimitRule | null {
  if (request.method !== 'POST') return null

  if (request.nextUrl.pathname === '/api/contact' || request.nextUrl.pathname === '/api/support/contact') {
    return { prefix: 'contact', requests: 5, window: '10 m', windowMs: 10 * 60_000 }
  }
  if (request.nextUrl.pathname === '/api/auth/login') {
    return { prefix: 'login', requests: 5, window: '15 m', windowMs: 15 * 60_000 }
  }
  if (request.nextUrl.pathname === '/api/auth/password-reset') {
    return { prefix: 'password-reset', requests: 3, window: '1 h', windowMs: 60 * 60_000 }
  }

  return null
}

function clientIp(request: NextRequest) {
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

export async function isRateLimited(request: NextRequest) {
  const rule = ruleFor(request)
  if (!rule) return false

  const identifier = clientIp(request)
  const limiter = remoteLimiter(rule)
  if (!limiter) return !localLimit(rule, identifier)

  try {
    const result = await limiter.limit(identifier)
    return !result.success
  } catch (error) {
    console.error('Rate limit backend failed; using local fallback.', error)
    return !localLimit(rule, identifier)
  }
}
