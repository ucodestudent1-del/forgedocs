import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { getRedisClient } from "@/lib/cache"
import Stripe from "stripe"
import { getAllCircuitStates } from "@/lib/circuit-breaker"

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string; [key: string]: any }> = {}

  // ---- Database (Supabase) check ----
  const dbStart = Date.now()
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return []
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
    if (!redis) {
      checks.redis = { status: "unhealthy", error: "Redis not configured" }
    } else {
      if (redis.status === "wait") {
        await redis.connect()
      }
      await redis.ping()
      const redisLatency = Date.now() - redisStart
      checks.redis = { status: "healthy", latency: redisLatency }
    }
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
      const stripe = new Stripe(stripeSecretKey)
      await stripe.balance.retrieve()
      const stripeLatency = Date.now() - stripeStart
      checks.stripe = { status: "healthy", latency: stripeLatency }
    }
  } catch (err) {
    const stripeLatency = Date.now() - stripeStart
    checks.stripe = { status: "unhealthy", latency: stripeLatency, error: String(err) }
  }

  // ---- Worker check ----
  const workerStart = Date.now()
  try {
    const workerHealthUrl = process.env.WORKER_HEALTH_URL
    if (!workerHealthUrl) {
      checks.worker = { status: "unhealthy", error: "Worker health URL not configured" }
    } else {
      const workerRes = await fetch(workerHealthUrl, { signal: AbortSignal.timeout(5000) })
      const workerLatency = Date.now() - workerStart
      if (workerRes.ok) {
        const workerData = await workerRes.json()
        checks.worker = {
          status: workerData.status === "healthy" ? "healthy" : "unhealthy",
          latency: workerLatency,
          isLeader: workerData.isLeader,
          activeJobs: workerData.activeJobs,
          failedJobs: workerData.failedJobs,
        }
      } else {
        checks.worker = { status: "unhealthy", latency: workerLatency, error: `HTTP ${workerRes.status}` }
      }
    }
  } catch (err) {
    const workerLatency = Date.now() - workerStart
    checks.worker = { status: "unhealthy", latency: workerLatency, error: String(err) }
  }

  // ---- Circuit breaker status ----
  let circuitBreakersHealthy = true
  const circuitStates = getAllCircuitStates()
  const circuitBreakers: Record<string, { state: string; failures: number }> = {}
  for (const [name, state] of Object.entries(circuitStates)) {
    circuitBreakers[name] = {
      state: state.state,
      failures: state.failures,
    }
    if (state.state === "open") {
      circuitBreakersHealthy = false
    }
  }
  checks.circuit_breakers = {
    status: circuitBreakersHealthy ? "healthy" : "degraded",
    breakers: circuitBreakers,
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy")
  const status = allHealthy ? "healthy" : "degraded"
  const httpStatus = allHealthy ? 200 : 503

  return NextResponse.json(
    { status, checks, timestamp: new Date().toISOString() },
    { status: httpStatus }
  )
}
