import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sendEmail } from "@/lib/email"
import { getPaymentFailedHtml, getTrialEndingHtml, getSubscriptionCanceledHtml } from "@/lib/emailTemplates"

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
  const supabase = await createRouteClient()

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

  // Handle invoice.payment_failed - DUNNING MANAGEMENT
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any
    const subscriptionId = invoice.subscription

    const { data: sub } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId)
      .single()

    if (sub) {
      // Update subscription status to past_due
      await (supabase as any)
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("id", sub.id)

      // Get user email for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", sub.user_id)
        .single()

      if (profile?.email) {
        const retryDate = new Date()
        retryDate.setDate(retryDate.getDate() + 3) // Stripe retries in 3 days

        await sendEmail({
          to: profile.email,
          subject: "Action required: Payment failed for your ForgeDocs subscription",
          html: getPaymentFailedHtml(
            profile.full_name || "User",
            `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
            retryDate.toLocaleDateString()
          ),
        })
      }
    }
  }

  // Handle customer.subscription.trial_will_end - TRIAL ENDING NOTIFICATION
  if (event.type === "customer.subscription.trial_will_end") {
    const subscription = event.data.object as any

    const { data: sub } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscription.id)
      .single()

    if (sub) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", sub.user_id)
        .single()

      if (profile?.email) {
        const trialEndDate = new Date(subscription.trial_end * 1000)

        await sendEmail({
          to: profile.email,
          subject: "Your ForgeDocs trial is ending soon",
          html: getTrialEndingHtml(
            profile.full_name || "User",
            trialEndDate.toLocaleDateString(),
            `${process.env.NEXT_PUBLIC_APP_URL}/billing`
          ),
        })
      }
    }
  }

  // Handle checkout.session.expired - ABANDONED CHECKOUT
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as any
    const userId = session.metadata?.userId

    if (userId) {
      // Optionally log abandoned checkout for analytics
      console.log(`Checkout session expired for user ${userId}`)
    }
  }

  // Handle customer.subscription.deleted
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any

    const { data: sub } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscription.id)
      .single()

    await (supabase as any)
      .from("subscriptions")
      .update({ status: "canceled", tier: "free" })
      .eq("stripe_subscription_id", subscription.id)

    if (sub) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", sub.user_id)
        .single()

      if (profile?.email) {
        const endDate = new Date(subscription.current_period_end * 1000)

        await sendEmail({
          to: profile.email,
          subject: "Your ForgeDocs subscription has been canceled",
          html: getSubscriptionCanceledHtml(
            profile.full_name || "User",
            endDate.toLocaleDateString(),
            `${process.env.NEXT_PUBLIC_APP_URL}/billing`
          ),
        })
      }
    }
  }

  // Handle subscription updated (downgrades, upgrades, proration, etc.)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as any

    const { data: sub } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscription.id)
      .single()

    if (sub) {
      // Determine tier from price ID
      const priceId = subscription.items.data[0]?.price?.id
      let tier = "free"
      if (priceId) {
        // Map price IDs to tiers - in production, store this mapping in DB
        if (priceId.includes("pro")) tier = "pro"
        else if (priceId.includes("business")) tier = "business"
        else if (priceId.includes("enterprise")) tier = "enterprise"
      }

      await (supabase as any)
        .from("subscriptions")
        .update({
          status: subscription.status,
          tier,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("id", sub.id)
    }
  }

  return NextResponse.json({ received: true })
}