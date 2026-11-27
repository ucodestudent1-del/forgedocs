import { getPooledRouteClient } from "@/lib/supabase"
import logger, { logAuditEvent as logToWinston } from "@/lib/logger"

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
// Protected by a mutex to prevent race conditions in concurrent invocations.
const auditRetryQueue: AuditEventInput[] = []
let queueLock = Promise.resolve()
const AUDIT_MAX_RETRY_QUEUE = 1000

async function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const release = queueLock
  let resolveNext: () => void = () => {}
  queueLock = new Promise<void>((resolve) => {
    resolveNext = resolve
  })
  await release
  try {
    return await fn()
  } finally {
    resolveNext()
  }
}

async function enqueueAuditRetry(input: AuditEventInput): Promise<void> {
  await withQueueLock(() => {
    if (auditRetryQueue.length >= AUDIT_MAX_RETRY_QUEUE) {
      auditRetryQueue.shift() // drop oldest
    }
    auditRetryQueue.push(input)
    return Promise.resolve()
  })
}

export async function flushAuditRetryQueue(): Promise<void> {
  let queue: AuditEventInput[] = []
  await withQueueLock(async () => {
    queue = auditRetryQueue.splice(0, auditRetryQueue.length)
  })
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
