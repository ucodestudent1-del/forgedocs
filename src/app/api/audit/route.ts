import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { z } from "zod"

const auditLogSchema = z.object({
  action: z.string().min(1).max(200),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  old_values: z.record(z.string(), z.any()).optional(),
  new_values: z.record(z.string(), z.any()).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  details: z.record(z.string(), z.any()).optional(),
})

export async function POST(req: Request): Promise<NextResponse> {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  try {
    await validateCSRF(req)
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }

  const supabase = await (await import("@/lib/supabase")).getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = auditLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  await logAuditEvent({
    userId: user.id,
    action: parsed.data.action,
    entityType: parsed.data.entity_type,
    entityId: parsed.data.entity_id,
    oldValues: parsed.data.old_values,
    newValues: parsed.data.new_values,
    severity: parsed.data.severity ?? "low",
    details: parsed.data.details,
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  return NextResponse.json({ success: true })
}
