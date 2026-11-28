import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { checkTierLimit, trackUsage, getTierLimits } from '@/lib/tierLimits'
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
  type ConversionType,
} from '@/lib/conversion'
import { createAppError } from '@/lib/api-error'

// Type that includes both real Supabase client and mock - use a more permissive type
type SupabaseLike = SupabaseClient<Database> | Record<string, any>

export interface CreateJobInput {
  type: ConversionType
  source_format: string
  target_format: string
  source_url?: string
  value?: string
  options?: Record<string, unknown>
  source_document_id?: string
}

export interface ConversionJob {
  id: string
  user_id: string
  source_document_id: string | null
  source_url: string | null
  source_format: string
  target_format: string
  options: Record<string, unknown>
  status: string
  created_at: string
}

export interface UnitConversionResult {
  type: 'unit'
  source_format: string
  target_format: string
  value: number
  result: number
  converted_at: string
}

export interface MetadataConversionResult {
  type: 'metadata'
  source_format: string
  target_format: string
  output: string
  converted_at: string
}

export type ConversionResult = ConversionJob | UnitConversionResult | MetadataConversionResult

export class ConversionService {
  constructor(
    private supabase: SupabaseLike
  ) {}

  async createDocumentConversionJob(input: CreateJobInput, userId: string): Promise<ConversionJob> {
    // Validate formats exist
    const sourceFmt = getFormat(input.source_format)
    const targetFmt = getFormat(input.target_format)
    if (!sourceFmt || !targetFmt) {
      throw createAppError("Invalid source or target format", 400, "INVALID_FORMAT")
    }

    // Validate pair support
    if (!isPairSupported(input.source_format, input.target_format) && input.source_format !== input.target_format) {
      throw createAppError(
        `Conversion from ${input.source_format} to ${input.target_format} is not supported`,
        400,
        "UNSUPPORTED_CONVERSION"
      )
    }

    // Check tier limits
    const limitCheck = await checkTierLimit(userId, "conversions", 1)
    if (!limitCheck.allowed) {
      throw createAppError(
        `Monthly conversion limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to continue.`,
        403,
        "RATE_LIMIT_EXCEEDED"
      )
    }

    // SSRF protection: validate source_url is a safe storage path
    if (input.source_url) {
      // Reject any URL scheme, absolute paths, traversal, or UNC paths
      if (
        input.source_url.includes("://") ||
        input.source_url.startsWith("/") ||
        input.source_url.includes("..") ||
        input.source_url.startsWith("\\\\") ||
        input.source_url.startsWith("data:") ||
        input.source_url.startsWith("//")
      ) {
        throw createAppError("Invalid source_url path", 400, "INVALID_SOURCE_URL")
      }

      // Reject URL-encoded traversal attempts
      const decoded = decodeURIComponent(input.source_url)
      if (decoded.includes("..") || decoded.includes("://") || decoded.startsWith("/")) {
        throw createAppError("Invalid source_url path", 400, "INVALID_SOURCE_URL")
      }

      const pathParts = input.source_url.split("/")
      if (pathParts.length < 2) {
        throw createAppError("source_url must be a relative storage path", 400, "INVALID_SOURCE_URL")
      }

      if (!input.source_url.startsWith(`${userId}/`)) {
        throw createAppError("Source file does not belong to the authenticated user", 403, "FORBIDDEN")
      }

      // Reject any segment that could be a traversal or hidden path component
      for (const part of pathParts) {
        if (part === ".." || part === "." || part === "") {
          throw createAppError("Invalid source_url path segment", 400, "INVALID_SOURCE_URL")
        }
      }
    }

    // Verify source document if provided
    if (input.source_document_id) {
      const { data: sourceDoc, error: docError } = await this.supabase
        .from("documents")
        .select("id, storage_path, mime_type")
        .eq("id", input.source_document_id)
        .eq("user_id", userId)
        .single()

      if (docError || !sourceDoc) {
        throw createAppError("Source document not found", 404, "NOT_FOUND")
      }
    }

    const { data: job, error } = await this.supabase
      .from("conversion_jobs")
      .insert({
        user_id: userId,
        source_document_id: input.source_document_id || null,
        source_url: input.source_url || null,
        source_format: input.source_format,
        target_format: input.target_format,
        options: input.options || {},
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      throw createAppError(error.message, 500, "DATABASE_ERROR")
    }

    // Track usage
    await trackUsage(userId, "conversions", 1)

    return job as ConversionJob
  }

  async convertUnit(value: number, category: string, fromUnit: string, toUnit: string): Promise<UnitConversionResult> {
    const result = convertUnit(value, category, fromUnit, toUnit)
    return {
      type: "unit",
      source_format: fromUnit,
      target_format: toUnit,
      value,
      result,
      converted_at: new Date().toISOString(),
    }
  }

  async convertMetadata(
    sourceFormat: "json" | "xml" | "yaml" | "csv_meta",
    targetFormat: "json" | "xml" | "yaml" | "csv_meta",
    data: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<MetadataConversionResult> {
    const validMetaFormats: string[] = ["json", "xml", "yaml", "csv_meta"]
    if (!validMetaFormats.includes(sourceFormat) || !validMetaFormats.includes(targetFormat)) {
      throw createAppError("Invalid metadata format", 400, "INVALID_FORMAT")
    }

    const output = await transformMetadata({
      sourceFormat,
      targetFormat,
      data,
      options,
    })

    return {
      type: "metadata",
      source_format: sourceFormat,
      target_format: targetFormat,
      output,
      converted_at: new Date().toISOString(),
    }
  }

  getAllFormats() {
    return Object.values(FORMAT_REGISTRY)
  }

  getAllConversionPairs() {
    return getAllConversionPairs()
  }

  getSupportedTargets(sourceFormat: string) {
    return getSupportedTargets(sourceFormat)
  }

  getUnitCategories() {
    return getUnitCategories()
  }

  getUnitPairs(category: string) {
    return getUnitPairs(category)
  }

  getFormat(formatId: string) {
    return getFormat(formatId)
  }
}