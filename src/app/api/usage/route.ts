import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limiter"
import { getTierLimits } from "@/lib/tierLimits"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { getGuestUserId, isGuestMode } from "@/lib/guest-session"

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  let effectiveUser = user
  if (!effectiveUser && isGuestMode()) {
    effectiveUser = { id: getGuestUserId(), email: null } as any
  }
  if (!effectiveUser) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  // Get user's tier limits
  const limits = await getTierLimits(effectiveUser.id)

  // Get current usage for each metric
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [documentsUsage, conversionsUsage] = await Promise.all([
    supabase
      .from("usage_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", effectiveUser.id)
      .eq("metric", "documents_created")
      .gte("recorded_at", startOfMonth.toISOString()),
    supabase
      .from("usage_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", effectiveUser.id)
      .eq("metric", "conversions")
      .gte("recorded_at", startOfMonth.toISOString()),
  ])

  // Also get total storage from documents
  const { data: docs, error: docsError } = await supabase
    .from("documents")
    .select("file_size")
    .eq("user_id", effectiveUser.id)
    .eq("is_archived", false)

  let totalStorageBytes = 0
  if (!docsError && docs) {
    totalStorageBytes = docs.reduce((sum: number, doc: { file_size?: number }) => sum + (doc.file_size || 0), 0)
  }

  // Total storage = existing documents only
  const currentStorage = totalStorageBytes

  const storageLimitBytes = limits.storage_gb * 1024 * 1024 * 1024

  const usage = {
    documents: {
      current: documentsUsage.count ?? 0,
      limit: limits.documents_per_month,
    },
    conversions: {
      current: conversionsUsage.count ?? 0,
      limit: limits.conversions_per_month,
    },
    storage: {
      current: currentStorage,
      limit: storageLimitBytes,
    },
    tier: limits,
  }

  return NextResponse.json({ usage })
})
