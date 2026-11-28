import { createHmac, timingSafeEqual, randomUUID } from "crypto"
import { createRouteAuthClient } from "@/lib/supabase"
import { Queue, Worker } from "bullmq"
import logger from "@/lib/logger"
import { z } from "zod"
import { decryptDocument } from "@/lib/encryption"

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
}

const webhookDeliverySchema = z.object({
  endpoint_id: z.string(),
  event: z.string(),
  payload: z.unknown(),
  response_status: z.number().nullable(),
  response_body: z.string().nullable(),
})

export interface WebhookDeliveryResult {
  success: boolean
  status: number | null
  body: string | null
}

/**
 * Sign a payload with HMAC-SHA256 using the endpoint secret.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

/**
 * Verify a webhook signature.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = signWebhookPayload(payload, secret)
  if (expected.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

/**
 * Deliver a webhook to an endpoint with retry logic.
 * Uses BullMQ if available, otherwise direct fetch.
 * Overall deadline prevents stuck deliveries from hanging indefinitely.
 */
export async function deliverWebhook(
  endpointId: string,
  url: string,
  secret: string,
  event: string,
  payload: unknown,
  attempt: number = 1,
  deadlineMs: number = 30000,
  startTime: number = Date.now(),
  idempotencyKey?: string
): Promise<WebhookDeliveryResult> {
  // Validate URL - must use HTTPS
  const parsedUrl = new URL(url)
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Webhook URLs must use HTTPS")
  }

  // Hostname allowlist check - reject private/internal IP ranges to prevent SSRF
  const hostname = parsedUrl.hostname
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Webhook URLs must not point to private or internal addresses")
  }

  const body = JSON.stringify(payload)
  const signature = signWebhookPayload(body, secret)
  const effectiveIdempotencyKey = idempotencyKey ?? `wh:${endpointId}:${event}:${startTime}:${attempt}`

  // Enforce overall deadline across all retry attempts
  if (Date.now() - startTime > deadlineMs) {
    return { success: false, status: null, body: "Overall delivery deadline exceeded" }
  }

  let status: number | null = null
  let responseBody: string | null = null

  // Iterative retry - no recursion to prevent stack overflow
  while (attempt <= 3) {
    if (Date.now() - startTime > deadlineMs) {
      return { success: false, status: null, body: "Overall delivery deadline exceeded" }
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ForgeDocs-Signature": signature,
          "X-ForgeDocs-Event": event,
          "X-ForgeDocs-Idempotency-Key": effectiveIdempotencyKey,
        },
        body,
        signal: AbortSignal.timeout(10000),
      })

      status = res.status
      responseBody = await res.text().catch(() => null)

      // Record delivery
      await recordDelivery(endpointId, event, payload, status, responseBody)

      if (status >= 200 && status < 300) {
        return { success: true, status, body: responseBody }
      }
    } catch (err) {
      await recordDelivery(endpointId, event, payload, null, err instanceof Error ? err.message : String(err))
    }

    // Exponential backoff with jitter
    if (attempt < 3) {
      const backoffMs = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 30000)
      await new Promise(r => setTimeout(r, backoffMs))
      attempt++
    } else {
      break
    }
  }

  return { success: false, status, body: responseBody ?? "Max retries exceeded" }
}

/**
 * Record a webhook delivery attempt.
 */
async function recordDelivery(
  endpointId: string,
  event: string,
  payload: unknown,
  status: number | null,
  body: string | null
): Promise<void> {
  try {
    const supabase = await createRouteAuthClient()
    const validated = webhookDeliverySchema.parse({
      endpoint_id: endpointId,
      event,
      payload,
      response_status: status,
      response_body: body,
    })
    await supabase.from("webhook_deliveries").insert(validated)
  } catch {
    // best-effort
  }
}

/**
 * Get the list of supported webhook events.
 */
export const SUPPORTED_WEBHOOK_EVENTS = [
  "document.created",
  "document.updated",
  "document.deleted",
  "document.content.updated",
  "template.created",
  "template.updated",
  "conversion.completed",
  "conversion.failed",
  "signature.requested",
  "signature.completed",
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
] as const

export type WebhookEvent = typeof SUPPORTED_WEBHOOK_EVENTS[number]

const webhookQueue = new Queue("webhook-delivery", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 50, age: 60 * 60 * 1000 }, // 1hr TTL
    removeOnFail: { count: 200, age: 24 * 60 * 60 * 1000 }, // 24hr TTL
  },
})

// Process webhook deliveries with bounded concurrency (10 concurrent)
const webhookWorker = new Worker("webhook-delivery", async (job) => {
  const { endpointId, url, secret, event, payload, idempotencyKey } = job.data as {
    endpointId: string
    url: string
    secret: string
    event: string
    payload: unknown
    idempotencyKey?: string
  }
  return deliverWebhook(endpointId, url, secret, event, payload, 1, 30000, Date.now(), idempotencyKey)
}, {
  connection: redisConnection,
  concurrency: 10,
})

// Event handlers for webhook worker
webhookWorker.on("completed", (job) => {
  if (job) {
    logger.info("Webhook delivery completed", { jobId: job.id, endpointId: job.data.endpointId })
  }
})

webhookWorker.on("failed", async (job, err) => {
  if (job) {
    logger.error("Webhook delivery failed", { 
      jobId: job.id, 
      endpointId: job.data.endpointId, 
      error: err instanceof Error ? err.message : String(err),
      attemptsMade: job.attemptsMade,
    })

    // Alert on repeated failures for same endpoint
    const failureKey = `webhook_failures:${job.data.endpointId}`
    const { cacheIncrement } = await import("@/lib/cache")
    try {
      const failures = await cacheIncrement(failureKey, 3600) // 1hr window
      if (failures >= 10 && process.env.ALERT_WEBHOOK_URL) {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: "critical",
            message: "Webhook endpoint failing repeatedly",
            endpointId: job.data.endpointId,
            url: job.data.url,
            failures,
            lastError: err instanceof Error ? err.message : String(err),
          }),
        })
      }
    } catch {}
  }
})

webhookWorker.on("stalled", (job) => {
  if (job) {
    logger.warn("Webhook delivery stalled", { jobId: job.id, endpointId: job.data.endpointId })
  }
})

webhookWorker.on("error", (err) => {
  logger.error("Webhook worker error", { error: err instanceof Error ? err.message : String(err) })
})

/**
 * Fire a webhook event to all matching active endpoints for a user.
 * Uses BullMQ for bounded concurrency delivery instead of fire-and-forget.
 */
export async function fireWebhookEvent(
  userId: string,
  event: WebhookEvent,
  payload: unknown
): Promise<void> {
  try {
    const supabase = await createRouteAuthClient()
    const { data: endpoints } = await supabase
      .from("webhook_endpoints")
      .select("id, url, secret, events")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (!endpoints || endpoints.length === 0) return

    const matching = endpoints.filter((ep: { events: string[] | null }) => {
      const events = ep.events
      return !events || events.length === 0 || events.includes(event) || events.includes("*")
    })

    const startTime = Date.now()
    // Batch add deliveries with bounded concurrency via BullMQ
    const jobs = matching.map((ep: { id: string; url: string; secret: string; events: string[] | null }) => {
      // Decrypt webhook secret at rest (with plaintext fallback for backward compatibility)
      let secret = ep.secret
      try {
        secret = decryptDocument(ep.secret)
      } catch {
        // Not encrypted — use as-is
      }
      // Unique idempotency key per delivery attempt to prevent duplicate processing
      const idempotencyKey = `wh:${ep.id}:${event}:${startTime}:${randomUUID()}`
      return ({
        name: "deliver",
        data: {
          endpointId: ep.id,
          url: ep.url,
          secret,
          event,
          payload,
          idempotencyKey,
        },
        opts: { removeOnComplete: 50, removeOnFail: 20 },
      })
    })

    await webhookQueue.addBulk(jobs).catch((err) => {
      logger.error("fireWebhookEvent: failed to queue deliveries", {
        userId,
        event,
        count: jobs.length,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  } catch {
    // best-effort
  }
}

// Periodic webhook queue cleanup - clean completed/failed jobs based on TTL
setInterval(async () => {
  try {
    await webhookQueue.clean(0, 1000, "completed")
    await webhookQueue.clean(0, 1000, "failed")
  } catch (err) {
    logger.warn("Webhook queue cleanup failed", { err })
  }
}, 60 * 60 * 1000) // Hourly

// Queue depth monitoring for backpressure alerts
setInterval(async () => {
  try {
    const counts = await webhookQueue.getJobCounts()
    if (counts.waiting > 10000) {
      logger.warn("Webhook queue backlog high", { waiting: counts.waiting, active: counts.active })
      if (process.env.ALERT_WEBHOOK_URL) {
        try {
          await fetch(process.env.ALERT_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              level: "warning",
              message: "Webhook queue backlog high",
              waiting: counts.waiting,
              active: counts.active,
            }),
          })
        } catch {}
      }
    }
  } catch (err) {
    logger.warn("Webhook queue monitoring failed", { err })
  }
}, 60 * 1000) // Every minute
