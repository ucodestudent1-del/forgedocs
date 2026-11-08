import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {}

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

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy")
  const status = allHealthy ? "healthy" : "degraded"

  return NextResponse.json(
    { status, checks, timestamp: new Date().toISOString() },
    { status: allHealthy ? 200 : 503 }
  )
}
