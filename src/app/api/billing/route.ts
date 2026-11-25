export const dynamic = "force-dynamic"

import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { stripeCircuitBreaker } from "@/lib/circuit-breaker"
import { isAllowedPriceId } from "@/lib/billing/prices"

export const GET = withErrorBoundary(async () => {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ subscription })
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  // Check if customer already exists in Stripe
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  const body = await req.json()
  const { priceId, trialDays } = body

  // Never trust client-provided pricing: validate against server-controlled prices.
  if (!priceId || typeof priceId !== "string" || !isAllowedPriceId(priceId)) {
    throw createAppError("Invalid or unsupported price", 400, "INVALID_PRICE")
  }

  // Create Stripe checkout session
  const session = await stripeCircuitBreaker.execute(async () => {
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    const sessionParams: any = {
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
        metadata: {
          userId: user.id,
        },
      }

      // Add trial period if specified (max 30 days for Stripe)
      if (trialDays && trialDays > 0 && trialDays <= 30) {
        sessionParams.subscription_data = {
          trial_period_days: trialDays,
        }
      }

      // Reuse existing customer if available
      if (subscription?.stripe_customer_id) {
        sessionParams.customer = subscription.stripe_customer_id
      }

      return stripe.checkout.sessions.create(sessionParams)
    })

  return NextResponse.json({ checkoutUrl: session.url })
})
