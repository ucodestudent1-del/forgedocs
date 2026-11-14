import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limit"
import { getTierLimits } from "@/lib/tierLimits"

export async function GET(req: Request): Promise<NextResponse> {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get user's tier limits
    const limits = await getTierLimits(user.id)

    // Get current usage for each metric
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [documentsUsage, conversionsUsage, storageUsage] = await Promise.all([
      supabase
        .from("usage_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("metric", "documents_created")
        .gte("recorded_at", startOfMonth.toISOString()),
      supabase
        .from("usage_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("metric", "conversions")
        .gte("recorded_at", startOfMonth.toISOString()),
      supabase
        .from("usage_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("metric", "storage_bytes")
        .gte("recorded_at", startOfMonth.toISOString()),
    ])

    // Also get total storage from documents
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("file_size")
      .eq("user_id", user.id)
      .eq("is_archived", false)

    let totalStorageBytes = 0
    if (!docsError && docs) {
      totalStorageBytes = docs.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
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
  } catch (error) {
    console.error("Usage fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 })
  }
}