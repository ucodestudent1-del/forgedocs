import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyPrefix: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const now = Date.now()
  const redisKey = `ratelimit:${config.keyPrefix}:${key}`

  try {
    // Use Supabase as a simple rate limit store
    // In production, use Redis for better performance
    const { data, error } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("key", redisKey)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Rate limit check error:", error)
      return { limited: false, remaining: config.maxRequests, resetTime: now + config.windowMs, total: config.maxRequests }
    }

    if (!data) {
      // First request
      await supabase.from("rate_limits").insert({
        key: redisKey,
        count: 1,
        window_start: new Date(now).toISOString(),
        expires_at: new Date(now + config.windowMs).toISOString(),
      })
      return { limited: false, remaining: config.maxRequests - 1, resetTime: now + config.windowMs, total: config.maxRequests }
    }

    const requestTime = new Date(data.window_start).getTime()
    if (now - requestTime > config.windowMs) {
      // Window expired, reset
      await supabase.from("rate_limits").update({
        count: 1,
        window_start: new Date(now).toISOString(),
        expires_at: new Date(now + config.windowMs).toISOString(),
      }).eq("key", redisKey)
      return { limited: false, remaining: config.maxRequests - 1, resetTime: now + config.windowMs, total: config.maxRequests }
    }

    if (data.count >= config.maxRequests) {
      return { 
        limited: true, 
        remaining: 0, 
        resetTime: new Date(data.expires_at).getTime(),
        total: config.maxRequests 
      }
    }

    // Increment counter
    await supabase.from("rate_limits").update({ count: data.count + 1 }).eq("key", redisKey)
    return { limited: false, remaining: config.maxRequests - data.count - 1, resetTime: new Date(data.expires_at).getTime(), total: config.maxRequests }
  } catch (error) {
    console.error("Rate limit error:", error)
    // Fail closed - reject request if rate limiter is unavailable
    return { limited: true, remaining: 0, resetTime: now + config.windowMs, total: config.maxRequests }
  }
}

export function createRateLimiter(path: string) {
  const config = RATE_LIMIT_CONFIGS[path]
  if (!config) {
    return async (request: NextRequest) => NextResponse.next()
  }

  return async (request: NextRequest) => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "unknown"
    const key = `${ip}:${path}`

    const limitInfo = await checkRateLimit(key, config)

    const response = limitInfo.limited 
      ? NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      : NextResponse.next()

    response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
    response.headers.set("X-RateLimit-Remaining", limitInfo.remaining.toString())
    response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())

    return response
  }
}

export async function rateLimitMiddleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Find matching rate limit config
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

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
             request.headers.get("x-real-ip") || 
             "unknown"
  const key = `${ip}:${matchedPath}`

  const limitInfo = await checkRateLimit(key, matchedConfig)

  if (limitInfo.limited) {
    const response = NextResponse.json(
      { 
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later."
      }, 
      { status: 429 }
    )
    response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
    response.headers.set("X-RateLimit-Remaining", "0")
    response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
    response.headers.set("Retry-After", Math.ceil((limitInfo.resetTime - Date.now()) / 1000).toString())
    return response
  }

  const response = NextResponse.next()
  response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
  response.headers.set("X-RateLimit-Remaining", limitInfo.remaining.toString())
  response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
  return response
}

export function createRateLimitTable() {
  // Run this once to create the rate_limits table
  return `
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);
    
    -- Cleanup function
    CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
    RETURNS void AS $$
    BEGIN
      DELETE FROM rate_limits WHERE expires_at < NOW();
    END;
    $$ LANGUAGE plpgsql;
    
    -- Schedule cleanup (run via pg_cron or external scheduler)
    -- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'SELECT cleanup_expired_rate_limits();');
  `
}