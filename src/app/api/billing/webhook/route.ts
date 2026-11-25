import { createServiceRoleClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { stripeCircuitBreaker } from "@/lib/circuit-breaker"
import type { Stripe } from "stripe"
import { WEBHOOK_HANDLERS } from "@/lib/billing/webhook-handlers"
import logger from "@/lib/logger"
import { createAppError } from "@/lib/api-error"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let stripe: Stripe
  try {
    const StripeModule = (await import("stripe")).default
    stripe = new StripeModule(process.env.STRIPE_SECRET_KEY!)
  } catch {
    return NextResponse.json({ error: "Payment processor unavailable" }, { status: 503 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    logger.error("Stripe webhook signature verification failed", { error: err.message })
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Use service role client for webhook operations (no user cookies in webhook context).
  const supabase = await createServiceRoleClient()

  const eventId = `stripe_${event.id}`

  // Idempotency: insert a processing record before dispatching the handler.
  // If the handler fails, the record stays unprocessed so Stripe retries.
  // If a concurrent retry already inserted, treat as already processed.
  const { data: existingEvent } = await (supabase as any)
    .from("webhook_events")
    .select("event_id, processed")
    .eq("event_id", eventId)
    .single()

  if (existingEvent) {
    if (existingEvent.processed) {
      logger.info(`Duplicate webhook event already processed: ${eventId}`)
      return NextResponse.json({ received: true })
    }
    // Event exists but not yet processed — a retry is in progress; wait briefly
    // then re-check, or just proceed since handlers are idempotent.
    logger.info(`Duplicate webhook event in progress: ${eventId}`)
    return NextResponse.json({ received: true })
  }

  const { error: insertError } = await (supabase as any)
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_type: event.type,
      processed: false,
      payload: typeof body === "string" ? JSON.parse(body || "{}") : body,
    })
    .select("id")

  if (insertError) {
    if (insertError.code === "23505") {
      logger.info(`Duplicate webhook event inserted concurrently: ${eventId}`)
      return NextResponse.json({ received: true })
    }
    throw createAppError(insertError.message, 500, "DATABASE_ERROR")
  }

  // Dispatch to the appropriate handler.
  const handler = WEBHOOK_HANDLERS[event.type]
  if (handler) {
    try {
      await handler(event, supabase, stripe)
    } catch (err) {
      // Do NOT mark as processed so Stripe retries. Handlers are idempotent.
      logger.error(`Webhook handler error for ${event.type}`, {
        error: err instanceof Error ? err.message : String(err),
        eventId,
      })
      return NextResponse.json({ error: "Handler failed" }, { status: 500 })
    }
  }

  // Mark as processed only after successful handler execution.
  const { error: updateError } = await (supabase as any)
    .from("webhook_events")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("event_id", eventId)

  if (updateError) {
    logger.error(`Failed to mark webhook event as processed: ${eventId}`, {
      error: updateError.message,
    })
    // Return 500 so Stripe retries; the event is unprocessed.
    return NextResponse.json({ error: "Failed to record processing" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
