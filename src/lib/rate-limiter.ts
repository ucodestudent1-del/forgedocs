import { NextRequest, NextResponse } from "next/server"
import { cacheIncrement } from "@/lib/cache"

interface RateLimitConfig {
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

export interface RateLimitInfo {
  limited: boolean
  remaining: number
  resetTime: number
  total: number
}

function getClientIdentifier(request: NextRequest): string {
  // Prefer API key ID for per-key rate limiting (most granular)
  const apiKeyId = request.headers.get("x-api-key-id")
  if (apiKeyId) {
    return `apikey:${apiKeyId}`
  }

  // Fall back to authenticated user context (set by middleware for API keys via x-api-user-id)
  const apiUserId = request.headers.get("x-api-user-id")
  if (apiUserId) {
    return `user:${apiUserId}`
  }

  // Fall back to IP for session-based and unauthenticated clients
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")
  return `ip:${forwarded || realIp || "unknown"}`
}

async function checkRateLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitInfo> {
  const now = Date.now()
  const ttlSeconds = Math.ceil(config.windowMs / 1000)
  const redisKey = `ratelimit:${config.keyPrefix}:${identifier}`

  let count: number
  try {
    // Atomic INCR with TTL on first hit = fixed-window rate limiting in Redis.
    // Single shared store across all replicas — no per-replica divergence.
    count = await cacheIncrement(redisKey, ttlSeconds)
  } catch {
    // Redis unavailable — fail closed. Reject all requests when the backing store is down.
    return { limited: true, remaining: 0, resetTime: now + config.windowMs, total: config.maxRequests }
  }

  // cacheIncrement returns 0 only when Redis is unavailable (INCR never returns 0).
  // Fail closed: reject all requests when the backing store is down.
  if (count === 0) {
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
  return async (request: NextRequest): Promise<NextResponse | null> => {
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
    return async (request: NextRequest) => NextResponse.next()
  }

  const limiter = createRateLimiter(config)
  return async (request: NextRequest) => {
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
