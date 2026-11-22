import { NextRequest, NextResponse } from "next/server"
import { cacheIncrement } from "@/lib/cache"
import { getClientIdentifier } from "@/lib/client-identifier"
import logger from "@/lib/logger"

const FAIL_OPEN = process.env.RATE_LIMIT_FAIL_OPEN === "true"

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
export const API_KEY_RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  "/api/contact": { windowMs: 15 * 60 * 1000, maxRequests: 100, keyPrefix: "apikey:contact" },
  "/api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 200, keyPrefix: "apikey:login" },
  "/api/auth/signup": { windowMs: 60 * 60 * 1000, maxRequests: 50, keyPrefix: "apikey:signup" },
  "/api/auth/forgot-password": { windowMs: 60 * 60 * 1000, maxRequests: 50, keyPrefix: "apikey:forgot" },
  "/api/auth/reset-password": { windowMs: 15 * 60 * 1000, maxRequests: 100, keyPrefix: "apikey:reset" },
  "/api/auth/mfa/verify": { windowMs: 5 * 60 * 1000, maxRequests: 200, keyPrefix: "apikey:mfa" },
  "/api/conversion": { windowMs: 60 * 1000, maxRequests: 600, keyPrefix: "apikey:conversion" },
  "/api/pdf-tools/process": { windowMs: 60 * 1000, maxRequests: 200, keyPrefix: "apikey:pdf" },
  "/api/ai/assistant": { windowMs: 60 * 1000, maxRequests: 400, keyPrefix: "apikey:ai" },
  "/api/ai/chat": { windowMs: 60 * 1000, maxRequests: 600, keyPrefix: "apikey:ai-chat" },
  "/api/e-signatures/send": { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: "apikey:esign" },
  "/api/documents": { windowMs: 60 * 1000, maxRequests: 2000, keyPrefix: "apikey:docs" },
  "/api/templates": { windowMs: 60 * 1000, maxRequests: 1000, keyPrefix: "apikey:templates" },
}

export function getRateLimitConfig(path: string, isApiKey: boolean): RateLimitConfig | null {
  const configs = isApiKey ? API_KEY_RATE_LIMIT_CONFIGS : RATE_LIMIT_CONFIGS
  let matchedConfig: RateLimitConfig | null = null
  let matchedPathLen = 0

  for (const [pathPattern, config] of Object.entries(configs)) {
    if (path.startsWith(pathPattern)) {
      if (pathPattern.length > matchedPathLen) {
        matchedConfig = config
        matchedPathLen = pathPattern.length
      }
    }
  }

  return matchedConfig
}

export interface RateLimitInfo {
  limited: boolean
  remaining: number
  resetTime: number
  total: number
}

export async function checkRateLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitInfo> {
  const now = Date.now()
  const ttlSeconds = Math.ceil(config.windowMs / 1000)
  const redisKey = `ratelimit:${config.keyPrefix}:${identifier}`

  let count: number
  try {
    // Atomic INCR with TTL on first hit = fixed-window rate limiting in Redis.
    // Single shared store across all replicas — no per-replica divergence.
    count = await cacheIncrement(redisKey, ttlSeconds)
  } catch {
    // Redis unavailable — behavior depends on RATE_LIMIT_FAIL_OPEN
    if (FAIL_OPEN) {
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

  // cacheIncrement returns 0 only when Redis is unavailable (INCR never returns 0).
  if (count === 0) {
    if (FAIL_OPEN) {
      logger.warn("Redis returned empty count — rate limiter fail-open, allowing request", {
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
    logger.warn("Redis returned empty count — rate limiter fail-closed, rejecting request", {
      redisKey,
      identifier,
    })
    return { limited: true, remaining: 0, resetTime: now + config.windowMs, total: config.maxRequests }
  }

  const limited = count > config.maxRequests
  const remaining = Math.max(0, config.maxRequests - count)
  const resetTime = now + config.windowMs

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
export function createRateLimiterByPath(path: string) {
  const config = RATE_LIMIT_CONFIGS[path]
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

  let matchedConfig: RateLimitConfig | null = null
  let matchedPath = ""

  for (const [pathPattern, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
    if (path.startsWith(pathPattern)) {
      if (pathPattern.length > matchedPath.length) {
        matchedConfig = config
        matchedPath = pathPattern
      }
    }
  }

  if (!matchedConfig) {
    return NextResponse.next()
  }

  const identifier = getClientIdentifier(request)
  const limitInfo = await checkRateLimit(identifier, matchedConfig)

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
