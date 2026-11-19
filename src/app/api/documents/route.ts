import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { randomUUID } from "crypto"
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, parsePagination } from "@/lib/pagination"
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { checkTierLimit, trackUsage } from "@/lib/tierLimits"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import type { Database } from "@/types/database"

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url.searchParams)
  const archived = url.searchParams.get("archived") === "true"
  const pinned = url.searchParams.get("pinned") === "true"
  const search = url.searchParams.get("search") || ""

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
    query = query
      .textSearch("search_vector", search, { type: "plain" })
      .order("rank", { ascending: false }, { referencedTable: "documents" })
  } else {
    query = query.order("updated_at", { ascending: false })
  }

  const { data, error, count } = await query
    .range(offset, offset + limit - 1)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  const response = { documents: data, count: count ?? 0, page, limit }
  await cacheSet(cacheKey, response, 300)

  return NextResponse.json(response)
})

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  template_id: z.string().uuid().optional(),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check document limit
  const limitCheck = await checkTierLimit(user.id, "documents_created")
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Document limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to create more documents.` },
      { status: 403 }
    )
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

  const storagePath = `documents/${user.id}/${randomUUID()}.json`

  const { data: doc, error } = await supabase
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
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  // Track usage
  await trackUsage(user.id, "documents_created", 1)

  // Invalidate document list cache
  await cacheDel(`documents:${user.id}:*`)

  // Audit log document creation
  await logAuditEvent({
    userId: user.id,
    action: "document.create",
    entityType: "documents",
    entityId: doc.id,
    newValues: { title, mime_type: content_type },
    severity: "low",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ document: doc }, { status: 201 })
})