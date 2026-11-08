import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, parsePagination } from "@/lib/pagination"
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache"

export async function GET(req: Request) {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = new URL(req.url)
  const { page, limit, offset } = parsePagination(searchParams)
  const archived = searchParams.get("archived") === "true"
  const pinned = searchParams.get("pinned") === "true"
  const search = searchParams.get("search") || ""

  const cacheKey = `documents:${user.id}:${page}:${limit}:${archived}:${pinned}:${search || ""}`
  const cached = await cacheGet<{ documents: any[]; count: number; page: number; limit: number }>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  let query = supabase
    .from("documents")
    .select(`
      *,
      templates ( id, name, category )
    `, { count: "exact" })
    .eq("user_id", user.id)
    .eq("is_archived", archived)

  if (pinned) {
    query = query.eq("is_pinned", true)
  }

  if (search) {
    query = query.ilike("title", `%${search}%`)
  }

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const response = { documents: data, count: count ?? 0, page, limit }
  await cacheSet(cacheKey, response, 300)

  return NextResponse.json(response)
}

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  template_id: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  try {
    const rateLimitError = documentRateLimit(req)
    if (rateLimitError) return rateLimitError

    validateCSRF(req)

    const supabase = getRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, template_id } = createDocSchema.parse(body)

    let content = ""
    let content_type = "text/plain"

    // If template_id provided, fetch template and use its content as starting point
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", template_id)
        .eq("user_id", user.id)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }

      content = template.placeholder_schema
        ? JSON.stringify(template.placeholder_schema, null, 2)
        : ""
      content_type = "application/vnd.forgedocs.document+json"
    }

    const storagePath = `documents/${user.id}/${crypto.randomUUID()}.json`

    const { data: doc, error } = await (supabase as any)
      .from("documents")
      .insert({
        user_id: user.id,
        title,
        description,
        content,
        storage_path: storagePath,
        mime_type: content_type,
        file_size: Buffer.byteLength(content),
        version: 1,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Invalidate document list cache
    await cacheDel(`documents:${user.id}:*`)

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}