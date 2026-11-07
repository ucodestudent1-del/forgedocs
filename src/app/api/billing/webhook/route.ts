import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let stripe
  try {
    const Stripe = (await import("stripe")).default
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  } catch {
    return NextResponse.json({ error: "Payment processor unavailable" }, { status: 503 })
  }

  let event
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

  // Use service role client for webhook operations
  const cookieStore = await cookies()
  const supabase = createRouteClient()

  // Idempotency check
  const eventId = `stripe_${event.id}`
  const { data: existingEvent } = await (supabase as any)
    .from("webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .single()

  if (existingEvent) {
    console.log(`Duplicate webhook event ignored: ${eventId}`)
    return NextResponse.json({ received: true })
  }

  // Record webhook event for idempotency
  await (supabase as any).from("webhook_events").insert({
    event_id: `stripe_${event.id}`,
    event_type: event.type,
    processed_at: new Date().toISOString(),
  })

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any
    const userId = session.metadata?.userId

    if (userId) {
      const { error } = await (supabase as any).from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: "active",
        tier: "pro",
        current_period_start: new Date(session.created * 1000).toISOString(),
        current_period_end: new Date(
          session.created * 1000 + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })

      if (error) {
        console.error("Failed to upsert subscription:", error)
      }
    }
  }

  // Handle invoice.payment_succeeded
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as any
    const subscriptionId = invoice.subscription

    const { data: sub } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId)
      .single()

    if (sub) {
      await (supabase as any)
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: new Date(invoice.period_end * 1000).toISOString(),
        })
        .eq("id", sub.id)
    }
  }

  // Handle customer.subscription.deleted
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any
    await (supabase as any)
      .from("subscriptions")
      .update({ status: "canceled", tier: "free" })
      .eq("stripe_subscription_id", subscription.id)
  }

  // Handle subscription updated (downgrades, etc.)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as any
    await (supabase as any)
      .from("subscriptions")
      .update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)
  }

  return NextResponse.json({ received: true })
}