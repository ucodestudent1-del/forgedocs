import { createHmac, timingSafeEqual } from "crypto"
import { getPooledRouteClient } from "@/lib/supabase"
import { Queue, Worker } from "bullmq"

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
 */
export async function deliverWebhook(
  endpointId: string,
  url: string,
  secret: string,
  event: string,
  payload: unknown,
  attempt: number = 1
): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify(payload)
  const signature = signWebhookPayload(body, secret)
  const idempotencyKey = `wh:${endpointId}:${event}:${Date.now()}`

  let status: number | null = null
  let responseBody: string | null = null

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ForgeDocs-Signature": signature,
        "X-ForgeDocs-Event": event,
        "X-ForgeDocs-Idempotency-Key": idempotencyKey,
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

    // Non-2xx — retry with backoff
    if (attempt < 3) {
      const backoffMs = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, backoffMs))
      return deliverWebhook(endpointId, url, secret, event, payload, attempt + 1)
    }

    return { success: false, status, body: responseBody }
  } catch (err) {
    await recordDelivery(endpointId, event, payload, null, err instanceof Error ? err.message : String(err))

    if (attempt < 3) {
      const backoffMs = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, backoffMs))
      return deliverWebhook(endpointId, url, secret, event, payload, attempt + 1)
    }

    return { success: false, status: null, body: err instanceof Error ? err.message : String(err) }
  }
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
    const supabase = await getPooledRouteClient()
    await supabase.from("webhook_deliveries").insert({
      endpoint_id: endpointId,
      event,
      payload: payload as any,
      response_status: status,
      response_body: body,
    })
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
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

// Process webhook deliveries with bounded concurrency (10 concurrent)
new Worker("webhook-delivery", async (job) => {
  const { endpointId, url, secret, event, payload } = job.data as {
    endpointId: string
    url: string
    secret: string
    event: string
    payload: unknown
  }
  return deliverWebhook(endpointId, url, secret, event, payload)
}, {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
  concurrency: 10,
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
    const supabase = await getPooledRouteClient()
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

    // Queue deliveries with bounded concurrency via BullMQ
    for (const ep of matching) {
      await webhookQueue.add("deliver", {
        endpointId: ep.id,
        url: ep.url,
        secret: ep.secret,
        event,
        payload,
      })
    }
  } catch {
    // best-effort
  }
}
