import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limiter"
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, parsePagination } from "@/lib/pagination"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async (req: Request): Promise<NextResponse> => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url.searchParams)
  const action = url.searchParams.get("action") || ""
  const entityType = url.searchParams.get("entity_type") || ""

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (action) {
    query = query.eq("action", action)
  }

  if (entityType) {
    query = query.eq("entity_type", entityType)
  }

  const { data, error, count } = await query
    .range(offset, offset + limit - 1)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({
    activity: data || [],
    count: count ?? 0,
    page,
    limit,
  })
})
