import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"

// Presence heartbeat: upsert user's presence on a document
const presenceSchema = z.object({
  document_id: z.string().uuid(),
  user_name: z.string().optional(),
  user_avatar_url: z.string().url().optional(),
  cursor_position: z.record(z.string(), z.unknown()).optional().default({}),
  selection: z.record(z.string(), z.unknown()).optional().default({}),
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
  const { document_id, user_name, user_avatar_url, cursor_position, selection } = presenceSchema.parse(body)

  // Verify document access
  const { data: doc } = await supabase
    .from("documents")
    .select("id, user_id")
    .eq("id", document_id)
    .eq("user_id", user.id)
    .single()

  if (!doc) {
    // Also check document_shares for read access
    const { data: share } = await supabase
      .from("document_shares")
      .select("document_id")
      .eq("document_id", document_id)
      .eq("shared_with", user.id)
      .single()
    if (!share) {
      throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
    }
  }

  // Upsert presence
  const { data, error } = await supabase
    .from("document_presence")
    .upsert({
      document_id,
      user_id: user.id,
      user_name: user_name ?? null,
      user_avatar_url: user_avatar_url ?? null,
      cursor_position,
      selection,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: ["document_id", "user_id"] })
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  // Audit log presence heartbeat (best-effort, low severity)
  await logAuditEvent({
    userId: user.id,
    action: "document.presence",
    entityType: "documents",
    entityId: document_id,
    newValues: { user_name },
    severity: "low",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ presence: data })
})

// List current presence on a document
export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const url = new URL(req.url)
  const document_id = url.searchParams.get("document_id")

  if (!document_id) {
    throw createAppError("document_id is required", 400, "MISSING_DOCUMENT_ID")
  }

  // Verify document access
  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("id", document_id)
    .eq("user_id", user.id)
    .single()

  if (!doc) {
    const { data: share } = await supabase
      .from("document_shares")
      .select("document_id")
      .eq("document_id", document_id)
      .eq("shared_with", user.id)
      .single()
    if (!share) {
      throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
    }
  }

  // Clean up stale presence (older than 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  await supabase
    .from("document_presence")
    .delete()
    .eq("document_id", document_id)
    .lt("last_seen_at", fiveMinutesAgo)

  const { data: presence, error } = await supabase
    .from("document_presence")
    .select("id, user_id, user_name, user_avatar_url, cursor_position, selection, last_seen_at")
    .eq("document_id", document_id)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ presence: presence ?? [] })
})
