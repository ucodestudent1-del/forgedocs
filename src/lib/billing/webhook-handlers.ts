import type { Stripe } from "stripe"
import { createServiceRoleClient } from "@/lib/supabase"
import { stripeCircuitBreaker } from "@/lib/circuit-breaker"
import { sendEmail } from "@/lib/email"
import {
  getPaymentFailedHtml,
  getTrialEndingHtml,
  getSubscriptionCanceledHtml,
} from "@/lib/emailTemplates"

type SupabaseServiceRole = any

export type WebhookEventHandler = (
  event: Stripe.Event,
  supabase: SupabaseServiceRole,
  stripe?: Stripe
) => Promise<void>

/**
 * Handle checkout.session.completed - creates subscription from checkout session
 */
export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  supabase: SupabaseServiceRole,
  stripe?: Stripe
): Promise<void> {
  if (!stripe) return
  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.metadata?.userId

  if (!userId) return

  // Determine tier from line items price
  let tier: string | null = null
  try {
    const lineItems = await stripeCircuitBreaker.execute(() =>
      stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })
    )
    const priceId = lineItems.data[0]?.price?.id || ""
    if (priceId.includes("professional")) tier = "professional"
    else if (priceId.includes("business")) tier = "business"
  } catch {
    // tier remains null if lookup fails
  }

  const { error } = await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: session.subscription as string,
    status: "active",
    tier,
    current_period_start: new Date(session.created * 1000).toISOString(),
    current_period_end: new Date(
      session.created * 1000 + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  })

  if (error) {
    console.error("Failed to upsert subscription:", error)
  }
}

/**
 * Handle invoice.payment_succeeded - mark subscription active
 */
export async function handleInvoicePaymentSucceeded(
  event: Stripe.Event,
  supabase: SupabaseServiceRole
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription as string

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .single()

  if (sub) {
    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: new Date(invoice.period_end * 1000).toISOString(),
      })
      .eq("id", sub.id)
  }
}

/**
 * Handle invoice.payment_failed - dunning management
 */
export async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  supabase: SupabaseServiceRole
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription as string

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .single()

  if (sub) {
    await supabase
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

/**
 * Handle customer.subscription.trial_will_end - trial ending notification
 */
export async function handleTrialWillEnd(
  event: Stripe.Event,
  supabase: SupabaseServiceRole
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription

  const { data: sub } = await supabase
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

    if (profile?.email && subscription.trial_end) {
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

/**
 * Handle checkout.session.expired - abandoned checkout logging
 */
export async function handleCheckoutSessionExpired(
  event: Stripe.Event,
  supabase: SupabaseServiceRole
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.metadata?.userId

  if (userId) {
    console.log(`Checkout session expired for user ${userId}`)
  }
}

/**
 * Handle customer.subscription.deleted - cancel subscription
 */
export async function handleSubscriptionDeleted(
  event: Stripe.Event,
  supabase: SupabaseServiceRole
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription

  await supabase
    .from("subscriptions")
    .update({ status: "canceled", tier: null })
    .eq("stripe_subscription_id", subscription.id)

  const { data: sub } = await supabase
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

/**
 * Handle customer.subscription.updated - tier changes, downgrades, upgrades
 */
export async function handleSubscriptionUpdated(
  event: Stripe.Event,
  supabase: SupabaseServiceRole
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscription.id)
    .single()

  if (sub) {
    // Determine tier from price ID
    const priceId = subscription.items.data[0]?.price?.id
    let tier: string | null = null
    if (priceId) {
      if (priceId.includes("professional")) tier = "professional"
      else if (priceId.includes("business")) tier = "business"
    }

    await supabase
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

/**
 * Map of Stripe event types to their handlers.
 */
export const WEBHOOK_HANDLERS: Record<string, WebhookEventHandler> = {
  "checkout.session.completed": handleCheckoutSessionCompleted,
  "invoice.payment_succeeded": handleInvoicePaymentSucceeded,
  "invoice.payment_failed": handleInvoicePaymentFailed,
  "customer.subscription.trial_will_end": handleTrialWillEnd,
  "checkout.session.expired": handleCheckoutSessionExpired,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  "customer.subscription.updated": handleSubscriptionUpdated,
}
