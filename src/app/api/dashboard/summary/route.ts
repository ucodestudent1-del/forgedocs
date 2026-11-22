import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError, ERRORS } from "@/lib/api-error"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getGuestUserId, isGuestMode } from "@/lib/guest-session"
import { checkTierLimit, getTierLimits } from "@/lib/tierLimits"
import { MAX_PAGE_SIZE, parsePagination } from "@/lib/pagination"

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch {
    // Supabase unreachable — degrade gracefully
  }

  let effectiveUser = user
  if (!effectiveUser && isGuestMode()) {
    effectiveUser = { id: await getGuestUserId(), email: null } as { id: string; email: string | null }
  }
  if (!effectiveUser) {
    return NextResponse.json({ error: ERRORS.UNAUTHORIZED.message }, { status: 401 })
  }

  const url = new URL(req.url)
  const { page: docPage, limit: docLimit, offset: docOffset } = parsePagination(url.searchParams)
  const archived = url.searchParams.get("archived") === "true"
  const pinned = url.searchParams.get("pinned") === "true"
  const search = url.searchParams.get("search") || ""

  const cacheKey = `dashboard:summary:${effectiveUser.id}:${docPage}:${docLimit}:${archived}:${pinned}:${search || ""}`
  const cached = await cacheGet(cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "ETag": `"${cacheKey.slice(-8)}"`, "Cache-Control": "private, max-age=60, must-revalidate" },
    })
  }

  // Fetch documents — degrade gracefully if Supabase is unreachable
  let documents: any[] = []
  let docCount = 0
  try {
    let docQuery = supabase
      .from("documents")
      .select(`
        *,
        templates ( id, name, category )
      `, { count: "exact" })
      .eq("user_id", effectiveUser.id)
      .eq("is_archived", archived)

    if (pinned) {
      docQuery = docQuery.eq("is_pinned", true)
    }

    if (search) {
      docQuery = docQuery
        .textSearch("search_vector", search, { type: "plain" })
        .order("rank", { ascending: false }, { referencedTable: "documents" })
    } else {
      docQuery = docQuery.order("updated_at", { ascending: false })
    }

    const { data, error: docError, count } = await docQuery
      .range(docOffset, docOffset + docLimit - 1)

    if (docError) {
      throw createAppError(docError.message, 500, "DATABASE_ERROR")
    }

    documents = data || []
    docCount = count ?? 0
  } catch {
    documents = []
    docCount = 0
  }

  // Fetch recent activity — degrade gracefully if Supabase is unreachable
  let activity: any[] = []
  try {
    const { limit: actLimit, offset: actOffset } = parsePagination(url.searchParams)
    const actLimitVal = Math.min(actLimit || 10, MAX_PAGE_SIZE)

    let activityQuery = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .eq("user_id", effectiveUser.id)
      .order("created_at", { ascending: false })

    const { data: activityData, error: actError } = await activityQuery
      .range(actOffset, actOffset + actLimitVal - 1)

    if (actError) {
      throw createAppError(actError.message, 500, "DATABASE_ERROR")
    }

    activity = activityData || []
  } catch {
    activity = []
  }

  // Fetch tier limits — degrade gracefully if Supabase is unreachable
  let tierLimits: any
  try {
    tierLimits = await getTierLimits(effectiveUser.id)
  } catch {
    tierLimits = {
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
  }

  // Fetch usage stats — degrade gracefully if Supabase is unreachable
  let rateLimit: any
  try {
    rateLimit = await checkTierLimit(effectiveUser.id, "documents_created")
  } catch {
    rateLimit = { limit: 500, remaining: 500, current: 0 }
  }

  // Fetch storage usage — degrade gracefully if Supabase is unreachable
  let totalStorageBytes = 0
  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("file_size")
      .eq("user_id", effectiveUser.id)
      .eq("is_archived", false)

    totalStorageBytes = docs
      ? docs.reduce((sum: number, doc: { file_size?: number }) => sum + (doc.file_size || 0), 0)
      : 0
  } catch {
    totalStorageBytes = 0
  }

  const documentsLimit = tierLimits.documents_per_month
  const storageLimitBytes = tierLimits.storage_gb * 1024 * 1024 * 1024

  const usage = {
    documents: {
      current: docCount,
      limit: documentsLimit < 0 ? -1 : documentsLimit,
    },
    conversions: {
      current: 0,
      limit: -1,
    },
    storage: {
      current: totalStorageBytes,
      limit: storageLimitBytes,
    },
    tier: rateLimit.limit < 0 ? "unlimited" : "free",
  }

  const response = {
    documents,
    activity,
    usage,
    pagination: {
      page: docPage,
      limit: docLimit,
      total: docCount,
      hasMore: (docOffset + docLimit) < docCount,
    },
  }

  await cacheSet(cacheKey, response, 60)

  return NextResponse.json(response, {
    headers: {
      "ETag": `"${cacheKey.slice(-8)}"`,
      "Cache-Control": "private, max-age=60, must-revalidate",
    },
  })
})
