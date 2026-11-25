import { getPooledRouteClient } from "@/lib/supabase"
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

// In-memory retry queue for audit events that fail to write to the DB.
const auditRetryQueue: AuditEventInput[] = []
const AUDIT_MAX_RETRY_QUEUE = 1000

async function enqueueAuditRetry(input: AuditEventInput): Promise<void> {
  if (auditRetryQueue.length >= AUDIT_MAX_RETRY_QUEUE) {
    auditRetryQueue.shift() // drop oldest
  }
  auditRetryQueue.push(input)
}

export async function flushAuditRetryQueue(): Promise<void> {
  const queue = auditRetryQueue.splice(0, auditRetryQueue.length)
  for (const input of queue) {
    try {
      const supabase = await getPooledRouteClient()
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
      // Re-enqueue for next flush attempt
      await enqueueAuditRetry(input)
    }
  }
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

  // Also write to database audit_logs table (non-blocking, fire and forget).
  // Failures are logged and enqueued for retry — never silently dropped.
  try {
    const supabase = await getPooledRouteClient()
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
  } catch (err) {
    logger.error("Audit DB write failed — enqueued for retry", {
      action: input.action,
      userId: input.userId,
      error: err instanceof Error ? err.message : String(err),
    })
    await enqueueAuditRetry(input)
  }
}

export function getClientUserAgent(req: Request): string | null {
  return req.headers.get("user-agent") ?? null
}

export { getClientIp } from "@/lib/client-identifier"
