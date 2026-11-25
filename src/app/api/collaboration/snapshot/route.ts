import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

// Save Y.js collaborative state snapshot for a document
const snapshotSchema = z.object({
  document_id: z.string().uuid(),
  yjs_state: z.record(z.string(), z.unknown()),
  version_number: z.number().int().nonnegative().optional(),
})

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
  const { document_id, yjs_state, version_number } = snapshotSchema.parse(body)

  // Verify document access
  const { data: doc } = await supabase
    .from("documents")
    .select("id, version")
    .eq("id", document_id)
    .eq("user_id", user.id)
    .single()

  if (!doc) {
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  const version = version_number ?? doc.version

  const { data, error } = await supabase
    .from("document_collab_snapshots")
    .insert({
      document_id,
      yjs_state,
      version_number: version,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ snapshot: data }, { status: 201 })
})

// Get latest Y.js snapshot for a document
export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getPooledRouteClient()
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
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  const { data: snapshot, error } = await supabase
    .from("document_collab_snapshots")
    .select("id, yjs_state, version_number, created_by, created_at")
    .eq("document_id", document_id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ snapshot: snapshot ?? null })
})
