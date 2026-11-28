import { getPooledRouteClient } from "@/lib/supabase"
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
import { requireAccountMembership } from "@/lib/account-authz"

interface DocumentRow {
  id: string
  user_id: string
  account_id: string | null
  title: string
  content: string
  format: string
  file_size: number | null
  file_path: string | null
  version: number
  status: string
  is_template: boolean
  template_id: string | null
  tags: string[] | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  encryption_key_wrapped: string | null
  encryption_iv: string | null
  encryption_algorithm: string | null
}

export const GET = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { data: doc, error } = await supabase
    .from("documents")
    .select("content, title, version, encryption_key_wrapped, encryption_iv, encryption_algorithm, user_id, account_id")
    .eq("id", id)
    .single()

  if (error || !doc) {
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  if (doc.user_id !== user.id && doc.account_id) {
    await requireAccountMembership(user.id, doc.account_id, "member")
  } else if (doc.user_id !== user.id) {
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

  const supabase = await getPooledRouteClient()
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
    .select("version, content, encryption_key_wrapped, encryption_iv, encryption_algorithm, user_id, account_id")
    .eq("id", id)
    .single()

  if (!currentDoc) {
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  if (currentDoc.user_id !== user.id && currentDoc.account_id) {
    await requireAccountMembership(user.id, currentDoc.account_id, "member")
  } else if (currentDoc.user_id !== user.id) {
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  // Use transactional function for atomic document update + version insert
  const rpcResult = await (supabase as any).rpc("update_document_with_version", {
    p_document_id: id,
    p_user_id: user.id,
    p_content: sanitizedContent,
    p_expected_version: expected_version ?? null,
    p_encrypted: encrypted,
    p_encryption_key_wrapped: encryption_key_wrapped ?? null,
    p_encryption_iv: encryption_iv ?? null,
    p_encryption_algorithm: encryption_algorithm ?? null,
  })

  const { data: updatedDoc, error: fnError } = rpcResult as { data: DocumentRow[] | null; error: { code: string; message: string } | null }

  if (fnError) {
    if (fnError.code === "P0001" && fnError.message === "DOCUMENT_NOT_FOUND") {
      throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
    }
    if (fnError.message === "Document has been modified by another user. Please reload and try again.") {
      return NextResponse.json(
        { error: "Document has been modified by another user. Please reload and try again." },
        { status: 409 }
      )
    }
    throw createAppError(fnError.message, 500, "DATABASE_ERROR")
  }

  if (!updatedDoc || updatedDoc.length === 0 || updatedDoc[0] === null) {
    return NextResponse.json(
      { error: "Document has been modified by another user. Please reload and try again." },
      { status: 409 }
    )
  }

  const data = updatedDoc[0]

  // Invalidate document list cache so clients see updated content
  await cacheDel(`documents:${user.id}:*`)

  // Audit log document update
  await logAuditEvent({
    userId: user.id,
    action: "document.update",
    entityType: "documents",
    entityId: id,
    newValues: { version: data.version, encrypted },
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  // Fire webhook (non-blocking)
  void fireWebhookEvent(user.id, "document.content.updated" as WebhookEvent, {
    document_id: id,
    user_id: user.id,
    version: data.version,
  })

  return NextResponse.json({ document: data })
})