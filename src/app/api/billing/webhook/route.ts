import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

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
    // Stripe not installed — return placeholder for development
    return NextResponse.json({ received: true }, { status: 200 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any
    const userId = session.metadata?.userId

    if (userId) {
      await (supabase as any).from("subscriptions").upsert({
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
          current_period_end: new Date(
            invoice.period_end * 1000
          ).toISOString(),
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

  return NextResponse.json({ received: true })
}
