import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { SUPPORTED_WEBHOOK_EVENTS } from "@/lib/webhooks"

const endpointSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

// GET /api/webhooks - list user's webhook endpoints
export const GET = withErrorBoundary(async (req) => {
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { data: endpoints, error } = await supabase
    .from("webhook_endpoints")
    .select("id, url, events, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({
    endpoints: endpoints ?? [],
    supported_events: SUPPORTED_WEBHOOK_EVENTS,
  })
})

// POST /api/webhooks - create a webhook endpoint
export const POST = withErrorBoundary(async (req) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { url, events, is_active } = endpointSchema.parse(body)

  // Generate a signing secret
  const secret = require("crypto").randomBytes(32).toString("hex")

  const { data, error } = await supabase
    .from("webhook_endpoints")
    .insert({
      user_id: user.id,
      url,
      secret,
      events: events ?? [],
      is_active: is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  await logAuditEvent({
    userId: user.id,
    action: "webhook.created",
    entityType: "webhook_endpoints",
    entityId: data.id,
    newValues: { url, events },
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ endpoint: data, secret }, { status: 201 })
})
