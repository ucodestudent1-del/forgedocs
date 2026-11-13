import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limit"
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, parsePagination } from "@/lib/pagination"

export async function GET(req: Request): Promise<NextResponse> {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    activity: data || [],
    count: count ?? 0,
    page,
    limit,
  })
}