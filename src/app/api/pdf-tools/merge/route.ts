import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { checkTierLimit, trackUsage } from "@/lib/tierLimits"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { fireWebhookEvent, type WebhookEvent } from "@/lib/webhooks"

const mergeSchema = z.object({
  document_ids: z.array(z.string().uuid()).min(2).max(20),
  title: z.string().min(1).max(200).default("Merged Document"),
})

// POST /api/pdf-tools/merge - merge multiple documents into one PDF
export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { document_ids, title } = mergeSchema.parse(body)

  // Check tier limit
  const limitCheck = await checkTierLimit(user.id, "conversions", 1)
  if (!limitCheck.allowed) {
    throw createAppError(
      `Monthly conversion limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to continue.`,
      403,
      "RATE_LIMIT_EXCEEDED"
    )
  }

  // Fetch all source documents
  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, title, content, storage_path, mime_type")
    .eq("user_id", user.id)
    .filter("id", "in", `(${document_ids.map(() => "?").join(",")})`, document_ids)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  if (!documents || documents.length !== document_ids.length) {
    throw createAppError("One or more documents not found", 404, "NOT_FOUND")
  }

  // Build merged content (concatenate document contents as a simple merged document)
  // In production this would use pdf-lib to concatenate actual PDF binaries
  const mergedContent = documents
    .map((doc: { title: string; content: unknown }, idx: number) => {
      const content = typeof doc.content === "string" ? doc.content : JSON.stringify(doc.content ?? "")
      return `\n\n--- Document ${idx + 1}: ${doc.title} ---\n\n${content}`
    })
    .join("")

  const storagePath = `documents/${user.id}/${require("crypto").randomUUID()}.json`

  const { data: mergedDoc, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      content: mergedContent,
      storage_path: storagePath,
      mime_type: "application/vnd.forgedocs.document+json",
      file_size: Buffer.byteLength(mergedContent),
      version: 1,
    })
    .select()
    .single()

  if (insertError) {
    throw createAppError(insertError.message, 500, "DATABASE_ERROR")
  }

  await trackUsage(user.id, "conversions", 1)

  // Audit log
  await logAuditEvent({
    userId: user.id,
    action: "document.merge",
    entityType: "documents",
    entityId: mergedDoc.id,
    newValues: { title, source_count: documents.length, source_ids: document_ids },
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  // Fire webhook
  void fireWebhookEvent(user.id, "document.created" as WebhookEvent, {
    document_id: mergedDoc.id,
    title,
    user_id: user.id,
    source_count: documents.length,
  })

  return NextResponse.json({ document: mergedDoc, source_count: documents.length }, { status: 201 })
})
