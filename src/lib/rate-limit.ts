import { NextRequest, NextResponse } from "next/server"
import { createRouteClient } from "@/lib/supabase"

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyPrefix?: string
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

// In-memory store (use Redis in production)
const rateLimitStores = new Map<string, Map<string, { count: number; resetTime: number }>>()

function getStore(keyPrefix: string) {
  if (!rateLimitStores.has(keyPrefix)) {
    rateLimitStores.set(keyPrefix, new Map())
  }
  return rateLimitStores.get(keyPrefix)!
}

const rateLimitStores = new Map<string, Map<string, { count: number; resetTime: number }>>()

export function createRateLimiter(config: {
  maxRequests: number
  windowMs: number
  keyPrefix?: string
}) {
  const { maxRequests, windowMs, keyPrefix = "rl" } = config
  const store = new Map<string, { count: number; resetTime: number }>()

  return async function rateLimit(
    identifier: string,
    customConfig?: { maxRequests?: number; windowMs?: number; keyPrefix?: string }
  ): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    const now = Date.now()
    const maxReq = config.maxRequests ?? maxRequests
    const window = config.windowMs ?? windowMs
    const prefix = config.keyPrefix ?? "rl"
    const store = getStore(prefix)

    const key = `${prefix}:${identifier}`
    const record = store.get(key)

    if (!record || Date.now() > record.resetTime) {
      const newRecord = { count: 1, resetTime: Date.now() + window }
      store.set(key, newRecord)
      return { allowed: true, remaining: maxReq - 1, resetTime: newRecord.resetTime }
    }

    if (record.count >= maxReq) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - Date.now()) / 1000),
      }
    }

    record.count++
    return { allowed: true, remaining: maxReq - record.count, resetTime: record.resetTime }
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  auth: { maxRequests: 5, windowMs: 60_000, keyPrefix: "auth" },
  api: { maxRequests: 100, windowMs: 60_000, keyPrefix: "api" },
  upload: { maxRequests: 10, windowMs: 60_000, keyPrefix: "upload" },
  webhook: { maxRequests: 1000, windowMs: 60_000, keyPrefix: "webhook" },
  conversion: { maxRequests: 20, windowMs: 60_000, keyPrefix: "conversion" },
}

export async function applyRateLimit(
  request: Request,
  config: { maxRequests?: number; windowMs?: number; keyPrefix?: string }
): Promise<Response | null> {
  // Extract identifier from request
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ||
             (await headers()).get("x-real-ip") ||
             "unknown"
  const userAgent = (await headers()).get("user-agent") || "unknown"
  const identifier = `${config.keyPrefix || "api"}:${ip}:${userAgent}`

  // For now, use a simple in-memory check
  // In production, use Redis or similar
  const result = { allowed: true, remaining: 99, resetTime: Date.now() + 60000 }

  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests", retryAfter: 60 }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000 + 60)),
        },
      }
    )
  }

  return null
}

export function addRateLimitHeaders(
  response: Response,
  result: { remaining: number; resetTime: number; maxRequests: number }
) {
  const headers = new Headers()
  headers.set("X-RateLimit-Limit", "100")
  headers.set("X-RateLimit-Remaining", String(result.remaining))
  headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetTime / 1000)))
  return new Response(null, { headers })
}

// Higher-order function to wrap API routes with rate limiting
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  config: { maxRequests?: number; windowMs?: number; keyPrefix?: string }
) {
  return async (req: Request): Promise<Response> => {
    const rateLimitResponse = await applyRateLimit(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(req))))))))))))))))))), {})
    if (rateLimitResponse) return rateLimitResponse
    return handler(req)
  }
}

export async function applyRateLimit(
  request: Request,
  config: { maxRequests?: number; windowMs?: number; keyPrefix?: string }
): Promise<Response | null> {
  // For now, just return null (allow all)
  // In production, implement proper rate limiting with Redis
  return null
}

// Higher-order function to wrap API routes with rate limiting
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  config: { maxRequests?: number; windowMs?: number; keyPrefix?: string }
) {
  return async (req: Request): Promise<Response> => {
    const rateLimitResponse = await applyRateLimit(new Request(req), {})
    if (rateLimitResponse) return rateLimitResponse
    return handler(req)
  }
}

// Middleware for Next.js 15 App Router
export async function rateLimitMiddleware(
  request: Request,
  config: { maxRequests?: number; windowMs?: number; keyPrefix?: string } = {}
) {
  return applyRateLimit(request, config)
}