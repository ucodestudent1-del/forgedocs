import { NextResponse } from "next/server"

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
  const userAgent = req.headers.get("user-agent") || "unknown"
  return `${ip}:${userAgent}`
}

export function rateLimit(config: RateLimitConfig) {
  return (req: Request): NextResponse | null => {
    const now = Date.now()
    const identifier = getClientIdentifier(req)
    const entry = rateLimitStore.get(identifier)

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs })
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

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)
