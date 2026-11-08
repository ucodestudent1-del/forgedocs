import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getRedisClient } from "@/lib/cache"
import Stripe from "stripe"

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {}

  // ---- Database (Supabase) check ----
  const dbStart = Date.now()
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      },
    )
    const { error } = await supabase.from("documents").select("id").limit(1)
    const dbLatency = Date.now() - dbStart
    checks.database = error
      ? { status: "unhealthy", latency: dbLatency, error: error.message }
      : { status: "healthy", latency: dbLatency }
  } catch (err) {
    const dbLatency = Date.now() - dbStart
    checks.database = { status: "unhealthy", latency: dbLatency, error: String(err) }
  }

  // ---- Redis check ----
  const redisStart = Date.now()
  try {
    const redis = getRedisClient()
    await redis.connect()
    await redis.ping()
    const redisLatency = Date.now() - redisStart
    checks.redis = { status: "healthy", latency: redisLatency }
  } catch (err) {
    const redisLatency = Date.now() - redisStart
    checks.redis = { status: "unhealthy", latency: redisLatency, error: String(err) }
  }

  // ---- Stripe check ----
  const stripeStart = Date.now()
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey || stripeSecretKey.startsWith("sk_test_placeholder")) {
      checks.stripe = { status: "unhealthy", error: "Stripe secret key not configured" }
    } else {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-12-18.acacia" })
      await stripe.balance.retrieve()
      const stripeLatency = Date.now() - stripeStart
      checks.stripe = { status: "healthy", latency: stripeLatency }
    }
  } catch (err) {
    const stripeLatency = Date.now() - stripeStart
    checks.stripe = { status: "unhealthy", latency: stripeLatency, error: String(err) }
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy")
  const status = allHealthy ? "healthy" : "degraded"

  return NextResponse.json(
    { status, checks, timestamp: new Date().toISOString() },
    { status: allHealthy ? 200 : 503 }
  )
}
