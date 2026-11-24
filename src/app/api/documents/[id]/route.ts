import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { cacheDel } from "@/lib/cache"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { fireWebhookEvent, type WebhookEvent } from "@/lib/webhooks"

export const GET = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { data: doc, error } = await supabase
    .from("documents")
    .select("*, templates ( * )")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !doc) {
    throw createAppError("Document not found", 404, "DOCUMENT_NOT_FOUND")
  }

  return NextResponse.json({ document: doc })
})

const updateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  is_pinned: z.boolean().optional(),
  is_archived: z.boolean().optional(),
})

export const PATCH = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { title, description, is_pinned, is_archived } = updateDocSchema.parse(body)
  const { id } = await params

  const { data, error } = await supabase
    .from("documents")
    .update({ title, description, is_pinned, is_archived })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  // Invalidate document list cache
  await cacheDel(`documents:${user.id}:*`)

  return NextResponse.json({ document: data })
})

export const DELETE = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  // Invalidate document list cache
  await cacheDel(`documents:${user.id}:*`)

  // Fire webhook (non-blocking)
  void fireWebhookEvent(user.id, "document.deleted" as WebhookEvent, {
    document_id: id,
    user_id: user.id,
  })

  return NextResponse.json({ success: true })
})
