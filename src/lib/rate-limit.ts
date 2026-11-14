import { NextResponse } from "next/server"
import { cacheGet, cacheSet } from "@/lib/cache"

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

// In-memory fallback store (used when Redis is unavailable)
export const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_STORE_MAX_SIZE = 10000

function evictIfOverLimit() {
  if (rateLimitStore.size > RATE_LIMIT_STORE_MAX_SIZE) {
    const keysToDelete = Array.from(rateLimitStore.keys()).slice(0, rateLimitStore.size - RATE_LIMIT_STORE_MAX_SIZE)
    for (const key of keysToDelete) {
      rateLimitStore.delete(key)
    }
  }
}

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
  const userAgent = req.headers.get("user-agent") || "unknown"
  return `${ip}:${userAgent}`
}

function rateLimitKey(identifier: string, config: RateLimitConfig): string {
  return `ratelimit:${config.windowMs}:${config.maxRequests}:${identifier}`
}

async function getRedisRateLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitEntry | null> {
  try {
    const value = await cacheGet<RateLimitEntry>(rateLimitKey(identifier, config))
    return value
  } catch {
    return null
  }
}

async function setRedisRateLimit(identifier: string, config: RateLimitConfig, entry: RateLimitEntry): Promise<void> {
  try {
    const ttlSeconds = Math.ceil(config.windowMs / 1000)
    await cacheSet(rateLimitKey(identifier, config), entry, ttlSeconds)
  } catch {
    // Cache failure is non-fatal; fall back to in-memory
  }
}

export function rateLimit(config: RateLimitConfig) {
  return async (req: Request): Promise<NextResponse | null> => {
    const now = Date.now()
    const identifier = getClientIdentifier(req)

    // Try Redis first (shared across replicas)
    const redisEntry = await getRedisRateLimit(identifier, config)

    if (redisEntry) {
      if (now > redisEntry.resetTime) {
        // Window expired, reset
        await setRedisRateLimit(identifier, config, { count: 1, resetTime: now + config.windowMs })
        return null
      }

      redisEntry.count++
      await setRedisRateLimit(identifier, config, redisEntry)

      if (redisEntry.count > config.maxRequests) {
        return NextResponse.json(
          { error: "Too many requests", retryAfter: Math.ceil((redisEntry.resetTime - now) / 1000) },
          { status: 429, headers: { "Retry-After": Math.ceil((redisEntry.resetTime - now) / 1000).toString() } }
        )
      }

      return null
    }

    // Fall back to in-memory store
    const entry = rateLimitStore.get(identifier)

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs })
      evictIfOverLimit()
      return null
    }

    entry.count++

    if (entry.count > config.maxRequests) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: Math.ceil((entry.resetTime - now) / 1000) },
        { status: 429, headers: { "Retry-After": Math.ceil((entry.resetTime - now) / 1000).toString() } }
      )
    }

    return null
  }
}

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute
})

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
})

export const documentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
})

// Cleanup old in-memory entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)
