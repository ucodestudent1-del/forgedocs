import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { sanitizeHtml } from "@/lib/sanitize"
import { cacheDel } from "@/lib/cache"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { fireWebhookEvent, type WebhookEvent } from "@/lib/webhooks"
import logger from "@/lib/logger"

export const GET = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { data: doc, error } = await supabase
    .from("documents")
    .select("content, title, version, encryption_key_wrapped, encryption_iv, encryption_algorithm")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !doc) {
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  return NextResponse.json({
    document: {
      ...doc,
      content: sanitizeHtml(doc.content || ""),
      encryption_key_wrapped: doc.encryption_key_wrapped,
      encryption_iv: doc.encryption_iv,
      encryption_algorithm: doc.encryption_algorithm,
    },
  })
})

const updateContentSchema = z.object({
  content: z.string().max(1000000),
  expected_version: z.number().int().nonnegative().optional(),
  encrypted: z.boolean().optional().default(false),
  encryption_key_wrapped: z.string().optional(),
  encryption_iv: z.string().optional(),
  encryption_algorithm: z.string().optional(),
})

export const PUT = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { content, expected_version, encrypted, encryption_key_wrapped, encryption_iv, encryption_algorithm } = updateContentSchema.parse(body)
  const sanitizedContent = sanitizeHtml(content)

  const { id } = await params

  const { data: currentDoc } = await supabase
    .from("documents")
    .select("version, content, encryption_key_wrapped, encryption_iv, encryption_algorithm")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!currentDoc) {
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  // Optimistic locking: reject if expected_version provided and doesn't match
  if (expected_version !== undefined && currentDoc.version !== expected_version) {
    return NextResponse.json(
      { error: "Document has been modified by another user. Please reload and try again." },
      { status: 409 }
    )
  }

  const updateData: Record<string, unknown> = {
    content: sanitizedContent,
    version: currentDoc.version + 1,
  }

  // Preserve or update encryption fields
  if (encrypted) {
    updateData.encryption_key_wrapped = encryption_key_wrapped ?? currentDoc.encryption_key_wrapped
    updateData.encryption_iv = encryption_iv ?? currentDoc.encryption_iv
    updateData.encryption_algorithm = encryption_algorithm ?? currentDoc.encryption_algorithm ?? "AES-256-GCM"
  }

  // Atomic update with optimistic locking — only proceeds if version still matches
  const { data, error } = await supabase
    .from("documents")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("version", currentDoc.version)
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  if (!data) {
    return NextResponse.json(
      { error: "Document has been modified by another user. Please reload and try again." },
      { status: 409 }
    )
  }

  // Insert version record after successful update.
  const { error: versionError } = await supabase.from("document_versions").insert({
    document_id: id,
    version: currentDoc.version,
    content: currentDoc.content,
    created_by: user.id,
  })

  if (versionError) {
    logger.error(`Failed to insert document version for ${id}`, {
      error: versionError.message,
      documentId: id,
      version: currentDoc.version,
    })
  }

  // Invalidate document list cache so clients see updated content
  await cacheDel(`documents:${user.id}:*`)

  // Audit log document update
  await logAuditEvent({
    userId: user.id,
    action: "document.update",
    entityType: "documents",
    entityId: id,
    newValues: { version: currentDoc.version + 1, encrypted },
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  // Fire webhook (non-blocking)
  void fireWebhookEvent(user.id, "document.content.updated" as WebhookEvent, {
    document_id: id,
    user_id: user.id,
    version: currentDoc.version + 1,
  })

  return NextResponse.json({ document: data })
})