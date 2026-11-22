import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError, ERRORS } from "@/lib/api-error"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getGuestUserId, isGuestMode } from "@/lib/guest-session"
import { checkTierLimit } from "@/lib/tierLimits"
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, parsePagination } from "@/lib/pagination"

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  let effectiveUser = user
  if (!effectiveUser && isGuestMode()) {
    effectiveUser = { id: getGuestUserId(), email: null } as any
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

  // Fetch documents
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

  const { data: documents, error: docError, count: docCount } = await docQuery
    .range(docOffset, docOffset + docLimit - 1)

  if (docError) {
    throw createAppError(docError.message, 500, "DATABASE_ERROR")
  }

  // Fetch recent activity
  const { page: actPage, limit: actLimit, offset: actOffset } = parsePagination(url.searchParams)
  const actLimitVal = Math.min(actLimit || 10, MAX_PAGE_SIZE)

  let activityQuery = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .eq("user_id", effectiveUser.id)
    .order("created_at", { ascending: false })

  const { data: activity, error: actError } = await activityQuery
    .range(actOffset, actOffset + actLimitVal - 1)

  if (actError) {
    throw createAppError(actError.message, 500, "DATABASE_ERROR")
  }

  // Fetch usage stats
  const limits = await checkTierLimit(effectiveUser.id, "documents_created")

  const { data: docs } = await supabase
    .from("documents")
    .select("file_size")
    .eq("user_id", effectiveUser.id)
    .eq("is_archived", false)

  let totalStorageBytes = 0
  if (docs) {
    totalStorageBytes = docs.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
  }

  const usage = {
    documents: {
      current: docCount ?? 0,
      limit: limits.limit < 0 ? -1 : limits.limit,
    },
    conversions: {
      current: 0,
      limit: -1,
    },
    storage: {
      current: totalStorageBytes,
      limit: limits.limit < 0 ? -1 : limits.storage_gb * 1024 * 1024 * 1024,
    },
    tier: limits.limit < 0 ? "unlimited" : "free",
  }

  const response = {
    documents: documents || [],
    activity: activity || [],
    usage,
    pagination: {
      page: docPage,
      limit: docLimit,
      total: docCount ?? 0,
      hasMore: (docOffset + docLimit) < (docCount ?? 0),
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
