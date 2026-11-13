import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
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
  const folderId = url.searchParams.get("folder_id") || null
  const search = url.searchParams.get("search") || ""
  const sortBy = url.searchParams.get("sort_by") || "updated_at"
  const sortOrder = url.searchParams.get("sort_order") || "desc"

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .eq("is_archived", false)

  if (folderId) {
    query = query.eq("parent_id", folderId)
  } else {
    query = query.is("parent_id", null)
  }

  if (search) {
    query = query.ilike("title", `%${search}%`)
  }

  const validSortFields = ["name", "file_size", "updated_at", "created_at"]
  const sortField = validSortFields.includes(sortBy) ? sortBy : "updated_at"
  const order = sortOrder === "asc" ? { ascending: true } : { ascending: false }

  const { data, error, count } = await query
    .order(sortField, order)
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    files: data || [],
    count: count ?? 0,
    page,
    limit,
  })
}