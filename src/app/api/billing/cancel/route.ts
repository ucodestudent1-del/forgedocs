import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rateLimitError = await authRateLimit(req)
    if (rateLimitError) return rateLimitError

    await validateCSRF(req)

    const supabase = await createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    if (cancel_at_period_end) {
      // Cancel at period end - subscription remains active until period ends
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      })

      await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true })
        .eq("id", subscription.id)

      return NextResponse.json({
        success: true,
        message: "Subscription will be canceled at the end of the billing period",
        cancel_at_period_end: true,
      })
    } else {
      // Immediate cancellation
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id)

      await supabase
        .from("subscriptions")
        .update({ status: "canceled", tier: "free", cancel_at_period_end: false })
        .eq("id", subscription.id)

      return NextResponse.json({
        success: true,
        message: "Subscription canceled immediately",
        cancel_at_period_end: false,
      })
    }
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    console.error("Subscription cancellation error:", error)
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
  }
}