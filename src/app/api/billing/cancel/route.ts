import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { stripeCircuitBreaker } from "@/lib/circuit-breaker"
import logger from "@/lib/logger"

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { cancel_at_period_end } = body

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  if (!subscription?.stripe_subscription_id) {
    throw createAppError("No active subscription found", 404, "NO_ACTIVE_SUBSCRIPTION")
  }

  if (cancel_at_period_end) {
    await stripeCircuitBreaker.execute(async () => {
      const Stripe = (await import("stripe")).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    })

    // Update local state; if this fails the Stripe webhook (customer.subscription.updated)
    // reconciles the record, so a DB failure must not mask a successful Stripe cancel.
    const { error: dbError } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("id", subscription.id)
    if (dbError) {
      logger.error(`Failed to mark subscription cancel-at-period-end for ${subscription.id}:`, { error: dbError })
    }

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
      cancel_at_period_end: true,
    })
  } else {
    await stripeCircuitBreaker.execute(async () => {
      const Stripe = (await import("stripe")).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
    })

    const { error: dbError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", tier: null, cancel_at_period_end: false })
      .eq("id", subscription.id)
    if (dbError) {
      logger.error(`Failed to mark subscription canceled for ${subscription.id}:`, { error: dbError })
    }

    return NextResponse.json({
      success: true,
      message: "Subscription canceled immediately",
      cancel_at_period_end: false,
    })
  }
})