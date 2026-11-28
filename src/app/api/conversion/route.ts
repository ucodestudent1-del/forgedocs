import { createRouteAuthClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { parsePagination } from "@/lib/pagination"
import { ConversionService } from "@/lib/services/conversion-service"
import { conversionJobSchema, type ConversionType } from "@/lib/conversion"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const maxDuration = 300

export const GET = withErrorBoundary(async (req: Request): Promise<NextResponse> => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await createRouteAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const service = new ConversionService(supabase)
  const url = new URL(req.url)
  const { searchParams } = url
  const formats = searchParams.get("formats")
  const type = searchParams.get("type") as ConversionType | null
  const category = searchParams.get("category")

  if (formats === "true") {
    const pairs = service.getAllConversionPairs()
    if (type) {
      return NextResponse.json({
        formats: service.getAllFormats(),
        pairs: pairs.filter((p) => {
          const sf = service.getFormat(p.source)
          const tf = service.getFormat(p.target)
          return sf?.category === type && tf?.category === type
        }),
      })
    }
    return NextResponse.json({ formats: service.getAllFormats(), pairs })
  }

  if (category) {
    const pairs = service.getUnitPairs(category)
    return NextResponse.json({ category, pairs })
  }

  if (searchParams.get("unit-categories") === "true") {
    return NextResponse.json({ categories: service.getUnitCategories() })
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

  const supabase = await createRouteAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const service = new ConversionService(supabase)
  const body = await req.json()
  const parsed = conversionJobSchema.safeParse(body)

  if (!parsed.success) {
    throw createAppError(JSON.stringify(parsed.error.flatten().fieldErrors), 400, "VALIDATION_ERROR")
  }

  const { type, source_format, target_format, source_url, value, options } = parsed.data

  // Handle unit conversion (synchronous, no job needed)
  if (type === "unit") {
    if (!value) {
      throw createAppError("Value is required for unit conversion", 400, "MISSING_VALUE")
    }
    const numValue = parseFloat(value)
    if (isNaN(numValue) || !isFinite(numValue)) {
      throw createAppError("Invalid numeric value", 400, "INVALID_NUMBER")
    }
    // Determine category from format IDs
    const sourceFmtObj = service.getFormat(source_format)
    const category = sourceFmtObj?.category
    if (!category || category !== "unit") {
      throw createAppError("Source format must be a unit type", 400, "INVALID_FORMAT")
    }
    try {
      const result = await service.convertUnit(numValue, category, source_format, target_format)
      return NextResponse.json(result)
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
      const result = await service.convertMetadata(
        source_format as "json" | "xml" | "yaml" | "csv_meta",
        target_format as "json" | "xml" | "yaml" | "csv_meta",
        data,
        options
      )
      return NextResponse.json(result)
    } catch (err) {
      throw createAppError(err instanceof Error ? err.message : "Metadata transformation failed", 400, "CONVERSION_FAILED")
    }
  }

  // Document conversion - create a job
  const job = await service.createDocumentConversionJob({
    type,
    source_format,
    target_format,
    source_url,
    value,
    options,
    source_document_id: body.source_document_id,
  }, user.id)

  return NextResponse.json({ job }, { status: 201 })
})
