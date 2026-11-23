import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { randomUUID } from "crypto"
import { cacheDel } from "@/lib/cache"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { checkTierLimit, trackUsage } from "@/lib/tierLimits"

const SUPABASE_TIMEOUT_MS = 10000

const duplicateDocSchema = z.object({
  new_title: z.string().min(1).max(200).optional(),
})

export const POST = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params
  const body = await req.json()
  const { new_title } = duplicateDocSchema.parse(body)

  // Fetch the source document
  const { data: sourceDoc, error: fetchError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !sourceDoc) {
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  // Check document limit
  const limitCheck = await checkTierLimit(user.id, "documents_created")
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Document limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to create more documents.` },
      { status: 403 }
    )
  }

  // Generate new storage path
  const newStoragePath = `documents/${user.id}/${randomUUID()}.json`

  // Create the duplicated document
  const { data: newDoc, error: createError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      template_id: null,
      parent_id: sourceDoc.parent_id,
      title: new_title || `Copy of ${sourceDoc.title}`,
      description: sourceDoc.description,
      content: sourceDoc.content,
      storage_path: newStoragePath,
      mime_type: sourceDoc.mime_type,
      file_size: sourceDoc.file_size,
      page_count: sourceDoc.page_count,
      is_archived: false,
      is_pinned: false,
      version: 1,
    })
    .select()
    .single()

  if (createError) {
    throw createAppError(createError.message, 500, "DATABASE_ERROR")
  }

  // Track usage
  try {
    await trackUsage(user.id, "documents_created", 1)
  } catch {
    // Non-blocking
  }

  // Invalidate document list cache
  await cacheDel(`documents:${user.id}:*`)

  // Audit log
  await logAuditEvent({
    userId: user.id,
    action: "document.duplicate",
    entityType: "documents",
    entityId: newDoc.id,
    newValues: { title: newDoc.title, sourceDocumentId: id },
    severity: "low",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ document: newDoc }, { status: 201 })
})
