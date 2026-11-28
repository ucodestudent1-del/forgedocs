import { NextRequest, NextResponse } from "next/server"
import { cacheIncrement, getRedisClient } from "@/lib/cache"
import { getClientIdentifier } from "@/lib/client-identifier"
import logger from "@/lib/logger"

const FAIL_OPEN = false

const FAIL_OPEN_ENDPOINTS = new Set([
  "/api/conversion",
  "/api/conversion/",
  "/api/pdf-tools/process",
  "/api/ai/assistant",
  "/api/ai/chat",
  "/api/documents",
  "/api/templates",
  "/api/health",
])

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyPrefix: string
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  "/api/contact": { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: "contact" },
  "/api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 10, keyPrefix: "login" },
  "/api/auth/signup": { windowMs: 60 * 60 * 1000, maxRequests: 5, keyPrefix: "signup" },
  "/api/auth/forgot-password": { windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: "forgot" },
  "/api/auth/reset-password": { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: "reset" },
  "/api/auth/mfa/verify": { windowMs: 5 * 60 * 1000, maxRequests: 10, keyPrefix: "mfa" },
  "/api/conversion": { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: "conversion" },
  "/api/pdf-tools/process": { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "pdf" },
  "/api/ai/assistant": { windowMs: 60 * 1000, maxRequests: 20, keyPrefix: "ai" },
  "/api/ai/chat": { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: "ai-chat" },
  "/api/e-signatures/send": { windowMs: 60 * 1000, maxRequests: 5, keyPrefix: "esign" },
  "/api/documents": { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: "docs" },
  "/api/templates": { windowMs: 60 * 1000, maxRequests: 50, keyPrefix: "templates" },
}

// Per-API-key rate limits (more generous than IP-based limits, but still bounded)
// Derived from RATE_LIMIT_CONFIGS with a multiplier
const API_KEY_LIMIT_MULTIPLIER = 20

// Pre-sorted rate limit patterns (longest first) for longest-prefix matching.
// Built once at module load so lookup avoids re-sorting on every request.
// Lookup remains O(n) worst case but with no per-call sort overhead and early exit.
const SORTED_RATE_LIMIT_PATTERNS: Array<[string, RateLimitConfig]> = Object.entries(
  RATE_LIMIT_CONFIGS,
).sort((a, b) => b[0].length - a[0].length)

export function getAPIKeyRateLimitConfig(path: string): RateLimitConfig | null {
  const base = getRateLimitConfig(path, false)
  if (!base) return null
  return {
    windowMs: base.windowMs,
    maxRequests: base.maxRequests * API_KEY_LIMIT_MULTIPLIER,
    keyPrefix: `apikey:${base.keyPrefix}`,
  }
}

export function getRateLimitConfig(path: string, _isApiKey?: boolean): RateLimitConfig | null {
  // Longest-prefix match: patterns are pre-sorted longest first, so the first match wins.
  for (const [pathPattern, config] of SORTED_RATE_LIMIT_PATTERNS) {
    if (path.startsWith(pathPattern)) {
      return config
    }
  }
  return null
}

export interface RateLimitInfo {
  limited: boolean
  remaining: number
  resetTime: number
  total: number
}

// Sliding window log rate limiting using Redis sorted sets
// Provides accurate limiting without boundary bursts
const SLIDING_WINDOW_LUA = `
  local now = tonumber(ARGV[1])
  local windowStart = now - tonumber(ARGV[2])
  local key = KEYS[1]
  local limit = tonumber(ARGV[3])
  local ttl = tonumber(ARGV[4])
  
  -- Remove expired entries
  redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
  
  -- Count current requests
  local count = redis.call('ZCARD', key)
  
  if count >= limit then
    return {0, count}
  end
  
  -- Add current request with unique member
  local member = now .. ':' .. math.random(1000000)
  redis.call('ZADD', key, now, member)
  redis.call('EXPIRE', key, ttl)
  return {1, count + 1}
`

// In-memory fallback for sliding window (test env)
const slidingWindowMemoryStore = new Map<string, Array<{ timestamp: number; member: string }>>()

function cleanSlidingWindowMemory(key: string, windowStart: number): void {
  const entries = slidingWindowMemoryStore.get(key)
  if (!entries) return
  const valid = entries.filter(e => e.timestamp > windowStart)
  slidingWindowMemoryStore.set(key, valid)
}

export async function checkRateLimit(identifier: string, config: RateLimitConfig, pathname: string = ""): Promise<RateLimitInfo> {
  const now = Date.now()
  const windowMs = config.windowMs
  const ttlSeconds = Math.ceil(windowMs / 1000) + 1
  const redisKey = `ratelimit:sliding:${config.keyPrefix}:${identifier}`
  const windowStart = now - windowMs

  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined

  let allowed: boolean
  let count: number

  if (isTestEnv) {
    // In-memory sliding window for tests
    cleanSlidingWindowMemory(redisKey, windowStart)
    const entries = slidingWindowMemoryStore.get(redisKey) || []
    count = entries.length
    
    if (count >= config.maxRequests) {
      allowed = false
    } else {
      allowed = true
      const member = `${now}:${Math.random()}`
      entries.push({ timestamp: now, member })
      slidingWindowMemoryStore.set(redisKey, entries)
      count++
    }
  } else {
    try {
      const client = getRedisClient()
      if (!client) throw new Error("Redis not available")
      
      const result = await client.eval(
        SLIDING_WINDOW_LUA, 
        1, 
        redisKey, 
        now, 
        windowMs, 
        config.maxRequests, 
        ttlSeconds
      ) as [number, number]
      
      allowed = result[0] === 1
      count = result[1]
    } catch {
      // Redis unavailable — behavior depends on FAIL_OPEN
      const isAuthEndpoint = pathname.includes("/api/auth/")
      const shouldFailOpen =
        FAIL_OPEN_ENDPOINTS.has(pathname) ||
        (!isAuthEndpoint && process.env.RATE_LIMIT_FAIL_OPEN === "true")

      if (shouldFailOpen) {
        logger.warn("Redis unavailable — rate limiter fail-open, allowing request", {
          redisKey,
          identifier,
        })
        return {
          limited: false,
          remaining: config.maxRequests,
          resetTime: now + config.windowMs,
          total: config.maxRequests,
        }
      }
      // Fail closed: reject all requests when the backing store is down.
      logger.warn("Redis unavailable — rate limiter fail-closed, rejecting request", {
        redisKey,
        identifier,
      })
      return { limited: true, remaining: 0, resetTime: now + config.windowMs, total: config.maxRequests }
    }
  }

  const limited = !allowed
  const remaining = Math.max(0, config.maxRequests - count)
  // resetTime is when the current window expires
  const resetTime = now + windowMs

  return { limited, remaining, resetTime, total: config.maxRequests }
}

function rateLimitResponse(limitInfo: RateLimitInfo): NextResponse {
  const response = NextResponse.json(
    { error: "Rate limit exceeded", message: "Too many requests. Please try again later." },
    { status: 429 }
  )
  response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
  response.headers.set("X-RateLimit-Remaining", "0")
  response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
  response.headers.set("Retry-After", Math.ceil((limitInfo.resetTime - Date.now()) / 1000).toString())
  return response
}

function nextResponse(limitInfo: RateLimitInfo): NextResponse {
  const response = NextResponse.next()
  response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
  response.headers.set("X-RateLimit-Remaining", limitInfo.remaining.toString())
  response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
  return response
}

/**
 * Creates a rate limiter middleware for a specific path config.
 * Returns NextResponse | null (null = allowed, NextResponse = rate limited).
 * Used by API route handlers directly.
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (request: Request): Promise<NextResponse | null> => {
    const identifier = getClientIdentifier(request)
    const limitInfo = await checkRateLimit(identifier, config)

    if (limitInfo.limited) {
      return rateLimitResponse(limitInfo)
    }
    return null
  }
}

/**
 * Creates a rate limiter by path pattern (used by middleware).
 * Returns NextResponse (always a response, either next() or 429).
 */
export function createRateLimiterByPath(path: string, isApiKey: boolean = false) {
  const config = isApiKey ? getAPIKeyRateLimitConfig(path) : RATE_LIMIT_CONFIGS[path]
  if (!config) {
    return async (_request: Request) => NextResponse.next()
  }

  const limiter = createRateLimiter(config)
  return async (request: Request) => {
    const result = await limiter(request)
    return result ?? NextResponse.next()
  }
}

export async function rateLimitMiddleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const matchedConfig = getRateLimitConfig(path)
  if (!matchedConfig) {
    return NextResponse.next()
  }

  const identifier = getClientIdentifier(request)
  const limitInfo = await checkRateLimit(identifier, matchedConfig, path)

  if (limitInfo.limited) {
    return rateLimitResponse(limitInfo)
  }

  return nextResponse(limitInfo)
}

/**
 * Preconfigured rate limiters for direct use in API route handlers.
 * Each returns NextResponse | null (null = allowed).
 */
export const authRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: "auth",
})

export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "api",
})

export const documentRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: "documents",
})
