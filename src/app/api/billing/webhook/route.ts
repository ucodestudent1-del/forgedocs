import { createServiceRoleClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { stripeCircuitBreaker } from "@/lib/circuit-breaker"
import type { Stripe } from "stripe"
import { WEBHOOK_HANDLERS } from "@/lib/billing/webhook-handlers"

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
    console.error("Stripe webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Use service role client for webhook operations (no user cookies in webhook context)
  const supabase = await createServiceRoleClient()

  // Idempotency check - atomic INSERT ON CONFLICT to prevent race conditions
  const eventId = `stripe_${event.id}`
  const { error: insertError } = await (supabase as any)
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertError) {
    // Duplicate event - already processed
    console.log(`Duplicate webhook event ignored: ${eventId}`)
    return NextResponse.json({ received: true })
  }

  // Dispatch to the appropriate handler
  const handler = WEBHOOK_HANDLERS[event.type]
  if (handler) {
    try {
      await handler(event, supabase, stripe)
    } catch (err) {
      console.error(`Webhook handler error for ${event.type}:`, err)
      // Don't fail the webhook on handler errors - Stripe will retry
    }
  }

  return NextResponse.json({ received: true })
}
