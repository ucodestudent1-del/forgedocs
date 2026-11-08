import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, parsePagination } from "@/lib/pagination"
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache"

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  source_url: z.string().url().optional(),
  placeholder_schema: z.array(z.object({
    name: z.string(),
    type: z.enum(["text", "date", "number", "select"]),
    default_value: z.unknown().optional(),
    required: z.boolean().default(false),
  })).default([]),
  preview_url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  is_public: z.boolean().default(false),
})

export async function GET(req: Request): Promise<NextResponse> {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = new URL(req.url)
  const { page, limit, offset } = parsePagination(searchParams)
  const search = searchParams.get("search") || ""
  const category = searchParams.get("category") || ""

  let query = supabase
    .from("templates")
    .select("*, count(*) over()", { count: "exact" })
    .or(`user_id.eq.${user.id},is_public.eq.true`)

  if (category) {
    query = query.eq("category", category)
  }

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data: templates, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    templates,
    count: count ?? 0,
    page,
    limit,
  })
}

export async function POST(req: Request): Promise<NextResponse> {
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
    const { name, description, category, source_url, placeholder_schema, preview_url, tags, is_public } = createTemplateSchema.parse(body)

    const { data, error } = await (supabase as any)
      .from("templates")
      .insert({
        user_id: user.id,
        name,
        description,
        category,
        source_url,
        placeholder_schema,
        preview_url,
        tags,
        is_public,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}