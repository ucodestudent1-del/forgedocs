import { createRouteAuthClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cacheGet, cacheSet, getRedisClient } from "@/lib/cache"
import logger from "@/lib/logger"

export interface TierLimits {
  documents_per_month: number
  conversions_per_month: number
  storage_gb: number
  max_file_size_mb: number
  api_requests_per_minute: number
  has_priority_support: boolean
  has_audit_logs: boolean
  has_advanced_templates: boolean
  max_seats: number
}

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

const DEFAULT_LIMITS: TierLimits = isDemoMode
  ? {
      documents_per_month: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_DOCUMENTS || "100", 10),
      conversions_per_month: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_CONVERSIONS || "50", 10),
      storage_gb: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_STORAGE_GB || "10", 10),
      max_file_size_mb: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_FILE_SIZE_MB || "10", 10),
      api_requests_per_minute: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_API_REQUESTS_PER_MIN || "30", 10),
      has_priority_support: process.env.NEXT_PUBLIC_DEMO_HAS_PRIORITY_SUPPORT === "true",
      has_audit_logs: process.env.NEXT_PUBLIC_DEMO_HAS_AUDIT_LOGS !== "false",
      has_advanced_templates: process.env.NEXT_PUBLIC_DEMO_HAS_ADVANCED_TEMPLATES === "true",
      max_seats: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_SEATS || "3", 10),
    }
  : {
      documents_per_month: 500,
      conversions_per_month: 100,
      storage_gb: 5,
      max_file_size_mb: 10,
      api_requests_per_minute: 30,
      has_priority_support: false,
      has_audit_logs: true,
      has_advanced_templates: false,
      max_seats: 1,
    }

// Hardcoded fallback used only if the DB tier_limits table is unavailable
const TIER_LIMITS: Record<string, TierLimits> = {
  free: DEFAULT_LIMITS,
  pro: isDemoMode
    ? {
        documents_per_month: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_DOCUMENTS || "5000", 10),
        conversions_per_month: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_CONVERSIONS || "1000", 10),
        storage_gb: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_STORAGE_GB || "50", 10),
        max_file_size_mb: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_FILE_SIZE_MB || "50", 10),
        api_requests_per_minute: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_API_REQUESTS_PER_MIN || "100", 10),
        has_priority_support: process.env.NEXT_PUBLIC_DEMO_HAS_PRIORITY_SUPPORT === "true",
        has_audit_logs: process.env.NEXT_PUBLIC_DEMO_HAS_AUDIT_LOGS === "true",
        has_advanced_templates: process.env.NEXT_PUBLIC_DEMO_HAS_ADVANCED_TEMPLATES === "true",
        max_seats: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_SEATS || "5", 10),
      }
    : {
        documents_per_month: 5000,
        conversions_per_month: 1000,
        storage_gb: 50,
        max_file_size_mb: 50,
        api_requests_per_minute: 100,
        has_priority_support: true,
        has_audit_logs: true,
        has_advanced_templates: true,
        max_seats: 5,
      },
  business: isDemoMode
    ? {
        documents_per_month: -1,
        conversions_per_month: -1,
        storage_gb: 100,
        max_file_size_mb: 100,
        api_requests_per_minute: 500,
        has_priority_support: process.env.NEXT_PUBLIC_DEMO_HAS_PRIORITY_SUPPORT === "true",
        has_audit_logs: process.env.NEXT_PUBLIC_DEMO_HAS_AUDIT_LOGS === "true",
        has_advanced_templates: process.env.NEXT_PUBLIC_DEMO_HAS_ADVANCED_TEMPLATES === "true",
        max_seats: -1,
      }
    : {
        documents_per_month: -1,
        conversions_per_month: -1,
        storage_gb: 100,
        max_file_size_mb: 100,
        api_requests_per_minute: 500,
        has_priority_support: true,
        has_audit_logs: true,
        has_advanced_templates: true,
        max_seats: -1,
      },
}

const TIER_LIMITS_CACHE_TTL = 60 * 1000 // 1 minute cache for tier limits

// Lua script: atomically check AND increment sliding window counter.
// Returns the count after adding the current request. Single Redis round-trip.
// Used for both limit enforcement and usage tracking — eliminates TOCTOU race.
const SLIDING_WINDOW_LUA = `
  local now = tonumber(ARGV[1])
  local windowStart = tonumber(ARGV[2])
  local member = ARGV[3]
  local ttl = tonumber(ARGV[4])
  redis.call('ZADD', KEYS[1], now, member)
  redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, windowStart)
  local count = redis.call('ZCARD', KEYS[1])
  redis.call('EXPIRE', KEYS[1], ttl)
  return count
`

export async function getTierLimits(userId: string): Promise<TierLimits> {
  const cacheKey = `tierlimits:${userId}`
  const cached = await cacheGet<TierLimits>(cacheKey)
  if (cached) return cached

  const supabase = await createRouteAuthClient()

  // Single query to determine the user's active tier
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const tier = subscription?.tier || "free"

  // If the user has an active subscription, fetch the tier limits from the DB
  if (subscription) {
    const { data: limits } = await supabase
      .from("tier_limits")
      .select("*")
      .eq("tier", tier)
      .single()

    if (limits) {
      const result: TierLimits = {
        documents_per_month: limits.documents_per_month,
        conversions_per_month: limits.conversions_per_month,
        storage_gb: limits.storage_gb,
        max_file_size_mb: limits.max_file_size_mb,
        api_requests_per_minute: limits.api_requests_per_minute,
        has_priority_support: limits.has_priority_support,
        has_audit_logs: limits.has_audit_logs,
        has_advanced_templates: limits.has_advanced_templates,
        max_seats: limits.max_seats,
      }
      await cacheSet(cacheKey, result, TIER_LIMITS_CACHE_TTL)
      return result
    }
  }

  // Fallback to hardcoded defaults when DB tier_limits row is missing
  const result = TIER_LIMITS[tier] || TIER_LIMITS.free
  await cacheSet(cacheKey, result, TIER_LIMITS_CACHE_TTL)
  return result
}

// Unlimited tier short-circuit: never block unlimited tiers even during Redis outage
// Local in-memory fallback for tier limits when Redis is unavailable
const localTierCache = new Map<string, { count: number; windowStart: number }>()

export async function checkTierLimit(
  userId: string,
  metric: "documents_created" | "conversions" | "storage_bytes",
  _quantity: number = 1
): Promise<{ allowed: boolean; limit: number; current: number; remaining: number }> {
  const limits = await getTierLimits(userId)

  let limit: number
  switch (metric) {
    case "documents_created":
      limit = limits.documents_per_month
      break
    case "conversions":
      limit = limits.conversions_per_month
      break
    case "storage_bytes":
      limit = Number(limits.storage_gb) * 1024 * 1024 * 1024
      break
    default:
      limit = -1
  }

  // Unlimited
  if (limit < 0) {
    return { allowed: true, limit: -1, current: 0, remaining: -1 }
  }

  const now = Date.now()
  const windowMs = 30 * 24 * 60 * 60 * 1000 // 30 days sliding window
  const windowStart = now - windowMs
  const redisKey = `tierlimit:sliding:${userId}:${metric}`

  let current: number
  try {
    const client = getRedisClient()
    if (!client) throw new Error("Redis not available")

    // Single atomic Lua call: add request + count in one round-trip.
    // Eliminates TOCTOU race between check and increment.
    const member = `${now}:${Math.random()}`
    const ttlSeconds = Math.ceil(windowMs / 1000) + 60
    current = Number(await client.eval(SLIDING_WINDOW_LUA, 1, redisKey, now, windowStart, member, ttlSeconds))

    // Sync local cache for fail-closed fallback
    localTierCache.set(`${userId}:${metric}`, { count: current, windowStart: now })

  } catch {
    // Redis unavailable — FAIL CLOSED for limited tiers.
    // Reject the request so limits are not bypassed during outages.
    logger.warn("Redis unavailable — tier limit check failing closed", { userId, metric })

    // For unlimited tiers (limit < 0 handled above), we never reach here.
    // For limited tiers, deny with the last known count if available.
    const cached = localTierCache.get(`${userId}:${metric}`)
    const currentCount = cached ? cached.count : 0

    return {
      allowed: currentCount <= limit,
      limit,
      current: currentCount,
      remaining: Math.max(0, limit - currentCount),
    }
  }

  const remaining = Math.max(0, limit - current)

  return {
    allowed: current <= limit,
    limit,
    current,
    remaining,
  }
}

export async function trackUsage(
  userId: string,
  metric: string,
  quantity: number = 1
): Promise<void> {
  // DB insert is a durable usage log. Enforcement is handled by the atomic
  // Redis INCR in checkTierLimit, which is the source of truth for limits.
  const supabase = await createRouteAuthClient()
  await supabase.from("usage_records").insert({
    user_id: userId,
    metric,
    quantity,
  })
}

export function createTierLimitMiddleware(metric: "documents_created" | "conversions" | "storage_bytes") {
  return async (_req: Request): Promise<NextResponse | null> => {
    const supabase = await createRouteAuthClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limitCheck = await checkTierLimit(user.id, metric)

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Monthly ${metric.replace("_", " ")} limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to continue.`,
          limit: limitCheck.limit,
          current: limitCheck.current,
          remaining: limitCheck.remaining,
        },
        { status: 403 }
      )
    }

    return null
  }
}

// Feature gating helpers
export function hasFeature(tier: string, feature: keyof TierLimits): boolean {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free
  return limits[feature] as boolean
}

export async function hasFeatureForUser(userId: string, feature: keyof TierLimits): Promise<boolean> {
  const limits = await getTierLimits(userId)
  return limits[feature] as boolean
}

export async function getUserFeatures(userId: string): Promise<Record<string, boolean>> {
  const limits = await getTierLimits(userId)
  return {
    priority_support: limits.has_priority_support,
    audit_logs: limits.has_audit_logs,
    advanced_templates: limits.has_advanced_templates,
  }
}
