import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"

const updateEndpointSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

// GET/PATCH/DELETE /api/webhooks/[id]
export const GET = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { data: endpoint, error } = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !endpoint) {
    throw createAppError("Webhook endpoint not found", 404, "WEBHOOK_NOT_FOUND")
  }

  // Don't return the secret in list, but allow fetching it once
  return NextResponse.json({ endpoint })
})

export const PATCH = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params
  const body = await req.json()
  const updates = updateEndpointSchema.parse(body)

  const { data, error } = await supabase
    .from("webhook_endpoints")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error || !data) {
    throw createAppError("Webhook endpoint not found", 404, "WEBHOOK_NOT_FOUND")
  }

  await logAuditEvent({
    userId: user.id,
    action: "webhook.updated",
    entityType: "webhook_endpoints",
    entityId: id,
    newValues: updates,
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ endpoint: data })
})

export const DELETE = withErrorBoundary(async (req, { params }: { params: Promise<{ id: string }> }) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params

  const { error } = await supabase
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  await logAuditEvent({
    userId: user.id,
    action: "webhook.deleted",
    entityType: "webhook_endpoints",
    entityId: id,
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ success: true })
})
