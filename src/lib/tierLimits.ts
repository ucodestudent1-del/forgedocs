import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cacheIncrement, cacheGet } from "@/lib/cache"

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
      has_audit_logs: process.env.NEXT_PUBLIC_DEMO_HAS_AUDIT_LOGS === "true",
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
      has_audit_logs: false,
      has_advanced_templates: false,
      max_seats: 1,
    }

// Hardcoded fallback used only if the DB tier_limits table is unavailable
const TIER_LIMITS: Record<string, TierLimits> = {
  free: DEFAULT_LIMITS,
  pro: DEFAULT_LIMITS,
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

export async function getTierLimitsFromDB(userId: string): Promise<TierLimits | null> {
  const supabase = await getRouteClient()
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, tier")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!subscription) return null

  const tier = subscription.tier || "free"

  const { data: limits } = await supabase
    .from("tier_limits")
    .select("*")
    .eq("tier", tier)
    .single()

  if (!limits) return null

  return {
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
}

export async function getUserTier(userId: string): Promise<string> {
  const supabase = await getRouteClient()
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return subscription?.tier || "free"
}

export async function getTierLimits(userId: string): Promise<TierLimits> {
  const dbLimits = await getTierLimitsFromDB(userId)
  if (dbLimits) return dbLimits

  const tier = await getUserTier(userId)
  return TIER_LIMITS[tier] || TIER_LIMITS.free
}

export async function checkTierLimit(
  userId: string,
  metric: "documents_created" | "conversions" | "storage_bytes",
  quantity: number = 1
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
      limit = limits.storage_gb * 1024 * 1024 * 1024
      break
    default:
      limit = -1
  }

  // Unlimited
  if (limit < 0) {
    return { allowed: true, limit: -1, current: 0, remaining: -1 }
  }

  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const redisKey = `tierlimit:${userId}:${metric}:${monthKey}`

  // Atomic INCR — single Redis operation, no TOCTOU race
  const ttlSeconds = Math.ceil(
    (new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime()) / 1000
  )
  const current = await cacheIncrement(redisKey, ttlSeconds)

  if (current === 0) {
    // Redis unavailable — fail closed
    return { allowed: false, limit, current: 0, remaining: 0 }
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
  const supabase = await getRouteClient()
  await supabase.from("usage_records").insert({
    user_id: userId,
    metric,
    quantity,
  })
}

export function createTierLimitMiddleware(metric: "documents_created" | "conversions" | "storage_bytes") {
  return async (_req: Request): Promise<NextResponse | null> => {
    const supabase = await getRouteClient()
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
