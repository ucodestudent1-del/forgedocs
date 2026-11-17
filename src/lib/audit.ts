import { getRouteClient } from "@/lib/supabase"
import logger, { logAuditEvent as logToWinston } from "@/lib/logger"
import { getClientIp } from "@/lib/client-identifier"

export interface AuditEventInput {
  userId: string
  action: string
  entityType?: string
  entityId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  severity?: "low" | "medium" | "high" | "critical"
  details?: Record<string, unknown>
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  // Always log to Winston for observability
  logToWinston(
    logger,
    input.action,
    input.userId,
    {
      entity_type: input.entityType,
      entity_id: input.entityId,
      old_values: input.oldValues,
      new_values: input.newValues,
      details: input.details,
    },
    input.severity ?? "low"
  )

  // Also write to database audit_logs table (non-blocking, fire and forget)
  try {
    const supabase = await getRouteClient()
    await supabase.from("audit_logs").insert({
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      old_values: input.oldValues ?? {},
      new_values: input.newValues ?? {},
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      severity: input.severity ?? "low",
    })
  } catch {
    // Audit DB write failure must not break the primary request
  }
}

export function getClientUserAgent(req: Request): string | null {
  return req.headers.get("user-agent") ?? null
}

export { getClientIp } from "@/lib/client-identifier"
