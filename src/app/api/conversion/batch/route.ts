import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { checkTierLimit, trackUsage } from "@/lib/tierLimits"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { isPairSupported } from "@/lib/conversion"

// POST /api/conversion/batch - submit multiple conversion jobs at once
const batchSchema = z.object({
  jobs: z.array(
    z.object({
      source_format: z.string().min(1),
      target_format: z.string().min(1),
      source_url: z.string().optional(),
      source_document_id: z.string().uuid().optional(),
      options: z.record(z.string(), z.unknown()).optional().default({}),
    })
  ).min(1).max(50),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { jobs } = batchSchema.parse(body)

  // Validate all pairs and tier limits upfront
  const createdJobs: Array<{ id: string; source_format: string; target_format: string; status: string }> = []

  for (const job of jobs) {
    // Validate pair support
    if (!isPairSupported(job.source_format, job.target_format) && job.source_format !== job.target_format) {
      throw createAppError(
        `Conversion from ${job.source_format} to ${job.target_format} is not supported`,
        400,
        "UNSUPPORTED_CONVERSION"
      )
    }

    // Check tier limit per job
    const limitCheck = await checkTierLimit(user.id, "conversions", 1)
    if (!limitCheck.allowed) {
      throw createAppError(
        `Monthly conversion limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to continue.`,
        403,
        "RATE_LIMIT_EXCEEDED"
      )
    }

    // Verify source document if provided
    let source_document_id = job.source_document_id ?? null
    if (job.source_document_id) {
      const { data: sourceDoc, error: docError } = await supabase
        .from("documents")
        .select("id, storage_path, mime_type")
        .eq("id", job.source_document_id)
        .eq("user_id", user.id)
        .single()

      if (docError || !sourceDoc) {
        throw createAppError("Source document not found", 404, "NOT_FOUND")
      }
      source_document_id = sourceDoc.id
    }

    const { data: jobRow, error } = await supabase
      .from("conversion_jobs")
      .insert({
        user_id: user.id,
        source_document_id,
        source_url: job.source_url || null,
        source_format: job.source_format,
        target_format: job.target_format,
        options: job.options,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      throw createAppError(error.message, 500, "DATABASE_ERROR")
    }

    await trackUsage(user.id, "conversions", 1)
    createdJobs.push({
      id: jobRow.id,
      source_format: jobRow.source_format,
      target_format: jobRow.target_format,
      status: jobRow.status,
    })
  }

  return NextResponse.json({ jobs: createdJobs, count: createdJobs.length }, { status: 201 })
})
