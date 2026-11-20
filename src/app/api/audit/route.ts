import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const auditLogSchema = z.object({
  action: z.string().min(1).max(200),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  // old_values/new_values/details accepted but size-capped server-side to prevent log inflation
  old_values: z.record(z.string(), z.any()).optional(),
  new_values: z.record(z.string(), z.any()).optional(),
  details: z.record(z.string(), z.any()).optional(),
  // severity is intentionally NOT accepted from the client — it is set server-side
})

const MAX_DETAIL_BYTES = 4096

function truncateDetails(details: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!details) return details
  const serialized = JSON.stringify(details)
  if (serialized.length <= MAX_DETAIL_BYTES) return details
  // Truncate to prevent log-inflation DoS
  return { _truncated: true, _note: `details exceeded ${MAX_DETAIL_BYTES} bytes` }
}

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await (await import("@/lib/supabase")).getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const parsed = auditLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  // Severity is always server-set ("low") — clients cannot escalate or forge audit severity.
  // entity_id/entity_type are accepted but not cross-validated here; callers must ensure ownership.
  await logAuditEvent({
    userId: user.id,
    action: parsed.data.action,
    entityType: parsed.data.entity_type,
    entityId: parsed.data.entity_id,
    oldValues: truncateDetails(parsed.data.old_values),
    newValues: truncateDetails(parsed.data.new_values),
    severity: "low",
    details: truncateDetails(parsed.data.details),
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ success: true })
})
