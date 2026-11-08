"use server"

import { createRouteClient } from "@/lib/supabase"
import { convertDocumentServer, FORMAT_REGISTRY, type ConvertDocumentResult } from "@/lib/conversion"

/**
 * Conversion worker - processes pending conversion jobs
 * This is called via a cron job or webhook from the conversion service
 */
export async function processConversionJob(jobId: string) {
  const supabase = await createRouteClient()

  // Fetch the job
  const { data: job, error: jobError } = await supabase
    .from("conversion_jobs")
    .select("*")
    .eq("id", jobId)
    .single()

  if (jobError || !job) {
    throw new Error(`Conversion job ${jobId} not found`)
  }

  if (job.status !== "pending") {
    throw new Error(`Job ${jobId} is not in pending status`)
  }

  // Mark as processing
  await supabase
    .from("conversion_jobs")
    .update({ status: "processing" })
    .eq("id", jobId)

  try {
    let sourceContent = ""
    let sourceMimeType = "application/octet-stream"
    let sourceFormat = "txt"

    if (job.source_document_id) {
      const { data: doc } = await supabase
        .from("documents")
        .select("content, mime_type")
        .eq("id", job.source_document_id)
        .single()

      if (doc) {
        sourceContent = doc.content || ""
        sourceMimeType = doc.mime_type || "application/octet-stream"
        sourceFormat = Object.values(FORMAT_REGISTRY).find((f) => f.mimeType === sourceMimeType)?.id || "txt"
      }
    }

    // Perform conversion using the conversion engine
    const result = await convertDocumentServer(
      sourceContent,
      sourceMimeType,
      job.target_format,
      job.options || {}
    )

    // Update job with result
    await supabase
      .from("conversion_jobs")
      .update({
        status: "completed",
        output_url: result.outputUrl,
        output_mime_type: result.mimeType,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    return { jobId, status: "completed", outputUrl: result.outputUrl }
  } catch (err) {
    // Mark as failed
    await supabase
      .from("conversion_jobs")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    throw err
  }
}
