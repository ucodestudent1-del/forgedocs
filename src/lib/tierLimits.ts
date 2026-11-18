import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

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

const DEFAULT_LIMITS: TierLimits = {
  documents_per_month: -1,
  conversions_per_month: -1,
  storage_gb: 20,
  max_file_size_mb: 50,
  api_requests_per_minute: 100,
  has_priority_support: true,
  has_audit_logs: false,
  has_advanced_templates: false,
  max_seats: 5,
}

// Hardcoded fallback used only if the DB tier_limits table is unavailable
const TIER_LIMITS: Record<string, TierLimits> = {
  professional: DEFAULT_LIMITS,
  business: {
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
    .select("tier")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const tier = subscription?.tier || "professional"

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
    .single()

  return subscription?.tier || "professional"
}

export async function getTierLimits(userId: string): Promise<TierLimits> {
  const dbLimits = await getTierLimitsFromDB(userId)
  if (dbLimits) return dbLimits

  const tier = await getUserTier(userId)
  return TIER_LIMITS[tier] || TIER_LIMITS.professional
}

export async function checkTierLimit(
  userId: string,
  metric: "documents_created" | "conversions" | "storage_bytes",
  quantity: number = 1
): Promise<{ allowed: boolean; limit: number; current: number; remaining: number }> {
  const supabase = await getRouteClient()
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

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("usage_records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("metric", metric)
    .gte("recorded_at", startOfMonth.toISOString())

  const current = count ?? 0
  const remaining = Math.max(0, limit - current)

  return {
    allowed: current + quantity <= limit,
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
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.professional
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