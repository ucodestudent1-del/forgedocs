import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { parsePagination } from "@/lib/pagination"
import { checkTierLimit, trackUsage } from "@/lib/tierLimits"
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
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const maxDuration = 300

const VALID_FORMATS = Object.keys(FORMAT_REGISTRY)

export const GET = withErrorBoundary(async (req: Request): Promise<NextResponse> => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
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

  const { data: jobs, error, count } = await supabase
    .from("conversion_jobs")
    .select("*, source_document:documents(title)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({
    jobs: jobs || [],
    count: count ?? 0,
    page,
    limit,
  })
})

export const POST = withErrorBoundary(async (req: Request): Promise<NextResponse> => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const parsed = conversionJobSchema.safeParse(body)

  if (!parsed.success) {
    throw createAppError(JSON.stringify(parsed.error.flatten().fieldErrors), 400, "VALIDATION_ERROR")
  }

  const { type, source_format, target_format, source_url, value, options } = parsed.data

  // Validate formats exist
  const sourceFmt = getFormat(source_format)
  const targetFmt = getFormat(target_format)
  if (!sourceFmt || !targetFmt) {
    throw createAppError("Invalid source or target format", 400, "INVALID_FORMAT")
  }

  // Handle unit conversion (synchronous, no job needed)
  if (type === "unit") {
    if (!value) {
      throw createAppError("Value is required for unit conversion", 400, "MISSING_VALUE")
    }
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      throw createAppError("Invalid numeric value", 400, "INVALID_NUMBER")
    }
    // Determine category from format IDs
    const sourceFmtObj = Object.values(FORMAT_REGISTRY).find((f) => f.id === source_format)
    const category = sourceFmtObj?.category
    if (!category || category !== "unit") {
      throw createAppError("Source format must be a unit type", 400, "INVALID_FORMAT")
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
      throw createAppError(err instanceof Error ? err.message : "Unit conversion failed", 400, "CONVERSION_FAILED")
    }
  }

  // Handle metadata transformation (synchronous)
  if (type === "metadata") {
    if (!value) {
      throw createAppError("Value (metadata JSON) is required for metadata conversion", 400, "MISSING_VALUE")
    }
    let data: Record<string, unknown>
    try {
      data = JSON.parse(value)
    } catch {
      throw createAppError("Invalid JSON metadata", 400, "INVALID_JSON")
    }
    try {
      const validMetaFormats: string[] = ["json", "xml", "yaml", "csv_meta"]
      if (!validMetaFormats.includes(source_format) || !validMetaFormats.includes(target_format)) {
        throw createAppError("Invalid metadata format", 400, "INVALID_FORMAT")
      }
      const output = transformMetadata({
        sourceFormat: source_format as "json" | "xml" | "yaml" | "csv_meta",
        targetFormat: target_format as "json" | "xml" | "yaml" | "csv_meta",
        data,
        options,
      })
      return NextResponse.json({
        type: "metadata",
        source_format,
        target_format,
        output,
        converted_at: new Date().toISOString(),
      })
    } catch (err) {
      throw createAppError(err instanceof Error ? err.message : "Metadata transformation failed", 400, "CONVERSION_FAILED")
    }
  }

  // Document conversion - create a job
  // Validate pair support
  if (!isPairSupported(source_format, target_format) && source_format !== target_format) {
    throw createAppError(`Conversion from ${source_format} to ${target_format} is not supported`, 400, "UNSUPPORTED_CONVERSION")
  }

  // Check tier limits using centralized utility
  const limitCheck = await checkTierLimit(user.id, "conversions", 1)
  if (!limitCheck.allowed) {
    throw createAppError(
      `Monthly conversion limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to continue.`,
      403,
      "RATE_LIMIT_EXCEEDED"
    )
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
      throw createAppError("Source document not found", 404, "NOT_FOUND")
    }
  }

  const { data: job, error } = await supabase
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
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  // Track usage
  await trackUsage(user.id, "conversions", 1)

  return NextResponse.json({ job }, { status: 201 })
})
