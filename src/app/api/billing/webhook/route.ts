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

  // Idempotency: if the event was already fully processed, acknowledge and skip.
  const { data: existingEvent } = await (supabase as any)
    .from("webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .single()

  if (existingEvent) {
    logger.info(`Duplicate webhook event ignored: ${eventId}`)
    return NextResponse.json({ received: true })
  }

  // Dispatch to the appropriate handler. The event is recorded as processed ONLY
  // after the handler succeeds, so a crash before handling does not lose the event:
  // Stripe will retry and we will re-run the handler (handlers are idempotent).
  const handler = WEBHOOK_HANDLERS[event.type]
  if (handler) {
    try {
      await handler(event, supabase, stripe)
    } catch (err) {
      // Do NOT record the event so Stripe retries it. Handlers are written to be
      // safe to re-run (upserts / status checks), so retries do not double-apply.
      logger.error(`Webhook handler error for ${event.type}`, {
        error: err instanceof Error ? err.message : String(err),
        eventId,
      })
      return NextResponse.json({ error: "Handler failed" }, { status: 500 })
    }
  }

  // Record successful processing. ON CONFLICT handles the rare concurrent-retry race:
  // if another retry already inserted, treat it as already processed.
  const { error: insertError } = await (supabase as any)
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })
    .select("id")

  if (insertError) {
    if (insertError.code === "23505") {
      logger.info(`Duplicate webhook event ignored (race): ${eventId}`)
      return NextResponse.json({ received: true })
    }
    throw createAppError(insertError.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ received: true })
}
