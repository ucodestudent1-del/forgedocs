import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { parsePagination } from "@/lib/pagination"
import {
  conversionJobSchema,
  FORMAT_REGISTRY,
  getAllConversionPairs,
  getFormat,
  getSupportedTargets,
  getUnitCategories,
  getUnitPairs,
  convertUnit,
  isPairSupported,
  transformMetadata,
  convertDocumentServer,
  type ConversionType,
} from "@/lib/conversion"

const VALID_FORMATS = Object.keys(FORMAT_REGISTRY)

export async function GET(req: Request): Promise<NextResponse> {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const { searchParams } = url
  const formats = searchParams.get("formats")
  const type = searchParams.get("type") as ConversionType | null
  const category = searchParams.get("category")

  if (formats === "true") {
    const pairs = getAllConversionPairs()
    if (type) {
      return NextResponse.json({
        formats: Object.values(FORMAT_REGISTRY),
        pairs: pairs.filter((p) => {
          const sf = getFormat(p.source)
          const tf = getFormat(p.target)
          return sf?.category === type && tf?.category === type
        }),
      })
    }
    return NextResponse.json({ formats: Object.values(FORMAT_REGISTRY), pairs })
  }

  if (category) {
    const pairs = getUnitPairs(category)
    return NextResponse.json({ category, pairs })
  }

  if (searchParams.get("unit-categories") === "true") {
    return NextResponse.json({ categories: getUnitCategories() })
  }

  const { page, limit, offset } = parsePagination(searchParams)

  const { data: jobs, error, count } = await (supabase as any)
    .from("conversion_jobs")
    .select("*, source_document:documents(title)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    jobs: jobs || [],
    count: count ?? 0,
    page,
    limit,
  })
}

export async function POST(req: Request): Promise<NextResponse> {
  const rateLimitError = documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  try {
    await validateCSRF(req)
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = conversionJobSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { type, source_format, target_format, source_url, value, options } = parsed.data

  // Validate formats exist
  const sourceFmt = getFormat(source_format)
  const targetFmt = getFormat(target_format)
  if (!sourceFmt || !targetFmt) {
    return NextResponse.json({ error: "Invalid source or target format" }, { status: 400 })
  }

  // Handle unit conversion (synchronous, no job needed)
  if (type === "unit") {
    if (!value) {
      return NextResponse.json({ error: "Value is required for unit conversion" }, { status: 400 })
    }
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      return NextResponse.json({ error: "Invalid numeric value" }, { status: 400 })
    }
    // Determine category from format IDs
    const sourceFmtObj = Object.values(FORMAT_REGISTRY).find((f) => f.id === source_format)
    const category = sourceFmtObj?.category
    if (!category || category !== "unit") {
      return NextResponse.json({ error: "Source format must be a unit type" }, { status: 400 })
    }
    try {
      const result = convertUnit(numValue, source_format, source_format, target_format)
      return NextResponse.json({
        type: "unit",
        source_format,
        target_format,
        value: numValue,
        result,
        converted_at: new Date().toISOString(),
      })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Unit conversion failed" }, { status: 400 })
    }
  }

  // Handle metadata transformation (synchronous)
  if (type === "metadata") {
    if (!value) {
      return NextResponse.json({ error: "Value (metadata JSON) is required for metadata conversion" }, { status: 400 })
    }
    let data: Record<string, unknown>
    try {
      data = JSON.parse(value)
    } catch {
      return NextResponse.json({ error: "Invalid JSON metadata" }, { status: 400 })
    }
    try {
      const output = transformMetadata({ sourceFormat: source_format as any, targetFormat: target_format as any, data, options })
      return NextResponse.json({
        type: "metadata",
        source_format,
        target_format,
        output,
        converted_at: new Date().toISOString(),
      })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Metadata transformation failed" }, { status: 400 })
    }
  }

  // Document conversion - create a job
  // Validate pair support
  if (!isPairSupported(source_format, target_format) && source_format !== target_format) {
    return NextResponse.json({ error: `Conversion from ${source_format} to ${target_format} is not supported` }, { status: 400 })
  }

  // Check tier limits
  const { data: subscription } = await (supabase as any)
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  const tier = subscription?.tier || "free"
  const tierLimits = {
    free: { daily_conversions: 5 },
    pro: { daily_conversions: 100 },
    business: { daily_conversions: 1000 },
    enterprise: { daily_conversions: -1 },
  }

  const limit = tierLimits[tier as keyof typeof tierLimits]?.daily_conversions || 5
  if (limit >= 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await (supabase as any)
      .from("conversion_jobs")
      .select("*", { head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())

    if (count >= limit) {
      return NextResponse.json(
        { error: `Daily conversion limit (${limit}) reached for ${tier} tier` },
        { status: 403 }
      )
    }
  }

  // Verify source document if provided
  let source_document_id = body.source_document_id
  if (source_document_id) {
    const { data: sourceDoc, error: docError } = await supabase
      .from("documents")
      .select("id, storage_path, mime_type")
      .eq("id", source_document_id)
      .eq("user_id", user.id)
      .single()

    if (docError || !sourceDoc) {
      return NextResponse.json({ error: "Source document not found" }, { status: 404 })
    }
  }

  const { data: job, error } = await (supabase as any)
    .from("conversion_jobs")
    .insert({
      user_id: user.id,
      source_document_id,
      source_url: source_url || null,
      source_format,
      target_format,
      options: options || {},
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Track usage
  await (supabase as any).from("usage_records").insert({
    user_id: user.id,
    metric: "conversions",
    quantity: 1,
  })

  return NextResponse.json({ job }, { status: 201 })
}
