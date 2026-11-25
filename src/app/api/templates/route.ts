import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, parsePagination } from "@/lib/pagination"
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  content: z.string().optional(),
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
  team_id: z.string().uuid().optional(),
  is_favorite: z.boolean().default(false),
  is_system: z.boolean().default(false),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  content: z.string().optional(),
  source_url: z.string().url().optional(),
  placeholder_schema: z.array(z.object({
    name: z.string(),
    type: z.enum(["text", "date", "number", "select"]),
    default_value: z.unknown().optional(),
    required: z.boolean().default(false),
  })).optional(),
  preview_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  is_public: z.boolean().optional(),
  team_id: z.string().uuid().optional().nullable(),
  is_favorite: z.boolean().optional(),
})

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url.searchParams)
  const search = url.searchParams.get("search") || ""
  const category = url.searchParams.get("category") || ""
  const is_favorite = url.searchParams.get("is_favorite")
  const is_system = url.searchParams.get("is_system")

  let query = supabase
    .from("templates")
    .select("*, count(*) over()", { count: "exact" })
    .or(`user_id.eq.${user.id},is_public.eq.true`)

  if (category) {
    query = query.eq("category", category)
  }

  if (is_favorite !== null) {
    query = query.eq("is_favorite", is_favorite === "true")
  }

  if (is_system !== null) {
    query = query.eq("is_system", is_system === "true")
  }

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data: templates, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({
    templates,
    count: count ?? 0,
    page,
    limit,
  })
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, category, content, source_url, placeholder_schema, preview_url, tags, is_public, team_id, is_favorite, is_system } = createTemplateSchema.parse(body)

  // Only system templates can set is_system=true
  if (is_system) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (!profile || profile.role !== "admin") {
      throw createAppError("Only admins can create system templates", 403, "FORBIDDEN")
    }
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: user.id,
      name,
      description,
      category,
      content: content || "",
      source_url,
      placeholder_schema,
      preview_url,
      tags,
      is_public,
      team_id: team_id || null,
      is_favorite: is_favorite || false,
      is_system: is_system || false,
      usage_count: 0,
    })
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ template: data }, { status: 201 })
})

export const PATCH = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { id, ...updates } = z.object({
    id: z.string().uuid(),
    ...updateTemplateSchema.shape,
  }).parse(body)

  if (!id) {
    throw createAppError("Template ID is required", 400, "MISSING_ID")
  }

  // Fetch existing template for versioning
  const { data: existing } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!existing) {
    throw createAppError("Template not found", 404, "TEMPLATE_NOT_FOUND")
  }

  // Create version record before updating
  const { data: versionData } = await supabase
    .from("template_versions")
    .insert({
      template_id: id,
      version: (existing.version_count ?? 0) + 1,
      name: existing.name,
      description: existing.description,
      category: existing.category,
      content: existing.content,
      placeholder_schema: existing.placeholder_schema,
      changed_by: user.id,
      change_summary: "Template updated via API",
    })
    .select()
    .single()

  // Update version_count on template
  await supabase
    .from("templates")
    .update({ version_count: (existing.version_count ?? 0) + 1 })
    .eq("id", id)

  // Apply updates
  const { data, error } = await supabase
    .from("templates")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ template: data, version: versionData })
})
