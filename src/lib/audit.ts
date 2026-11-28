import { createRouteAuthClient } from "@/lib/supabase"
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
// Uses circular buffer for O(1) push/pop operations.
const auditRetryQueue: AuditEventInput[] = []
let queueHead = 0
let queueLock = Promise.resolve()
const AUDIT_MAX_RETRY_QUEUE = 1000
const QUEUE_COMPACT_THRESHOLD = 100

async function withQueueLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const currentLock = queueLock
  let releaseLock: () => void
  queueLock = new Promise<void>((resolve) => {
    releaseLock = resolve
  })

  await currentLock
  try {
    const result = await fn()
    return result as T
  } finally {
    releaseLock!()
  }
}

function compactQueue(): void {
  if (queueHead > QUEUE_COMPACT_THRESHOLD) {
    auditRetryQueue.splice(0, queueHead)
    queueHead = 0
  }
}

async function enqueueAuditRetry(input: AuditEventInput): Promise<void> {
  await withQueueLock(() => {
    const queueLength = auditRetryQueue.length - queueHead
    if (queueLength >= AUDIT_MAX_RETRY_QUEUE) {
      queueHead++ // Drop oldest (O(1))
      compactQueue()
    }
    auditRetryQueue.push(input)
  })
}

export async function flushAuditRetryQueue(): Promise<void> {
  let queue: AuditEventInput[] = []
  await withQueueLock(async () => {
    queue = auditRetryQueue.splice(queueHead, auditRetryQueue.length - queueHead)
    queueHead = 0
  })
  for (const input of queue) {
    try {
      const supabase = await createRouteAuthClient()
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
    const supabase = await createRouteAuthClient()
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
