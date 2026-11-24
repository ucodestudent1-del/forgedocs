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

  // Use service role client for webhook operations (no user cookies in webhook context)
  const supabase = await createServiceRoleClient()

  const eventId = `stripe_${event.id}`

  // Idempotency: check if event was already processed.
  // Use SELECT first to avoid race conditions, then INSERT with ON CONFLICT fallback.
  const { data: existingEvent } = await (supabase as any)
    .from("webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .single()

  if (existingEvent) {
    // Duplicate event - already processed
    logger.info(`Duplicate webhook event ignored: ${eventId}`)
    return NextResponse.json({ received: true })
  }

  const { error: insertError } = await (supabase as any)
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })
    .select("id")

  if (insertError) {
    // Unique constraint violation - another request inserted first (race condition)
    if (insertError.code === "23505") {
      logger.info(`Duplicate webhook event ignored (race): ${eventId}`)
      return NextResponse.json({ received: true })
    }
    throw createAppError(insertError.message, 500, "DATABASE_ERROR")
  }

  // Dispatch to the appropriate handler only for new events
  const handler = WEBHOOK_HANDLERS[event.type]
  if (handler) {
    try {
      await handler(event, supabase, stripe)
    } catch (err) {
      // Handler failed — remove the idempotency record so Stripe retries the event.
      // Without this, a retry would be blocked by the unique constraint and the
      // event would be permanently lost.
      void (supabase as any)
        .from("webhook_events")
        .delete()
        .eq("event_id", eventId)
      logger.error(`Webhook handler error for ${event.type}`, { error: err instanceof Error ? err.message : String(err), eventId })
      return NextResponse.json({ error: "Handler failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
