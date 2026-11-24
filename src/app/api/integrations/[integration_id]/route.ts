import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { decryptToken, encryptToken } from "@/lib/integrations"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"

const updateIntegrationSchema = z.object({
  scopes: z.array(z.string()).optional(),
})

// GET/PATCH/DELETE /api/integrations/[integration_id]
export const GET = withErrorBoundary(async (req, { params }: { params: Promise<{ integration_id: string }> }) => {
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { integration_id } = await params

  const { data: integration, error } = await supabase
    .from("user_integrations")
    .select("id, integration_id, scopes, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("integration_id", integration_id)
    .single()

  if (error || !integration) {
    throw createAppError("Integration not connected", 404, "INTEGRATION_NOT_CONNECTED")
  }

  return NextResponse.json({ integration })
})

export const PATCH = withErrorBoundary(async (req, { params }: { params: Promise<{ integration_id: string }> }) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { integration_id } = await params
  const body = await req.json()
  const { scopes } = updateIntegrationSchema.parse(body)

  const { data, error } = await supabase
    .from("user_integrations")
    .update({ scopes, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("integration_id", integration_id)
    .select()
    .single()

  if (error || !data) {
    throw createAppError("Integration not connected", 404, "INTEGRATION_NOT_CONNECTED")
  }

  await logAuditEvent({
    userId: user.id,
    action: "integration.updated",
    entityType: "user_integrations",
    entityId: data.id,
    newValues: { scopes },
    severity: "low",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ integration: data })
})

export const DELETE = withErrorBoundary(async (req, { params }: { params: Promise<{ integration_id: string }> }) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { integration_id } = await params

  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("integration_id", integration_id)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  await logAuditEvent({
    userId: user.id,
    action: "integration.disconnected",
    entityType: "user_integrations",
    entityId: integration_id,
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ success: true })
})
