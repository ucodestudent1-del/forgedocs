import { NextResponse } from "next/server"
import { cacheIncrement } from "@/lib/cache"

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
    const keysToDelete = Array.from(rateLimitStore.keys()).slice(RATE_LIMIT_STORE_MAX_SIZE)
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

export function rateLimit(config: RateLimitConfig) {
  return async (req: Request): Promise<NextResponse | null> => {
    const now = Date.now()
    const identifier = getClientIdentifier(req)
    const key = rateLimitKey(identifier, config)
    const ttlSeconds = Math.ceil(config.windowMs / 1000)

    // Atomic fixed-window increment in Redis (shared across replicas, race-free).
    // cacheIncrement returns 0 when Redis is unavailable.
    try {
      const count = await cacheIncrement(key, ttlSeconds)
      if (count === 0) {
        // Redis unavailable — fall through to in-memory per-replica fallback below
      } else {
        const limited = count > config.maxRequests
        if (limited) {
          return NextResponse.json(
            { error: "Too many requests", retryAfter: ttlSeconds },
            { status: 429, headers: { "Retry-After": String(ttlSeconds) } }
          )
        }
        return null
      }
    } catch {
      // Fall through to in-memory fallback
    }

    // In-memory fallback (per-replica, NOT shared — weaker under scale).
    // Only used when Redis is unavailable; production must run Redis and treat
    // its unavailability as fail-closed at the ingress layer.
    const inMemoryMaxRequests = Math.ceil(config.maxRequests / 4) // Assume up to 4 replicas
    const entry = rateLimitStore.get(identifier)

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs })
      evictIfOverLimit()
      return null
    }

    entry.count++

    if (entry.count > inMemoryMaxRequests) {
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

// Cleanup old in-memory entries every 1 minute
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000)

// Don't keep the Node process alive (e.g. Jest) after work is done
if (typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref()
}
