import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { getFormat } from "@/lib/conversion"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params
  const url = new URL(req.url)
  const download = url.searchParams.get("download") === "true"

  const { data: job, error } = await supabase
    .from("conversion_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !job) {
    throw createAppError("Job not found", 404, "JOB_NOT_FOUND")
  }

    // Handle file download for completed conversion jobs
    if (download) {
      const format = getFormat(job.target_format)
      const mimeType = format?.mimeType || "application/octet-stream"
      const extension = format?.extension || ".bin"

      if (job.status !== "completed" || !job.output_url) {
        throw createAppError("Conversion output not available", 404, "OUTPUT_NOT_AVAILABLE")
      }

      // Extract storage path from signed URL or use output_url path
      const storagePath = `converted/${user.id}/${job.id}${extension}`

      const { data: fileData, error: downloadError } = await supabase
        .storage.from("converted")
        .download(storagePath)

      if (downloadError || !fileData) {
        throw createAppError("Converted file not found in storage", 404, "FILE_NOT_FOUND")
      }

      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      return new Response(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="converted-${job.id}${extension}"`,
          "Content-Length": buffer.length.toString(),
        },
      }) as unknown as NextResponse
    }

  return NextResponse.json({ job })
})

export const DELETE = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { error } = await supabase
    .from("conversion_jobs")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", ["pending", "processing"])

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ success: true })
})