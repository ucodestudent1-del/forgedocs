// Environment validation - only runs when explicitly called
// This prevents build/runtime failures when env vars aren't set

export function validateEnv() {
  // Skip validation during build/static generation
  if (typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build") {
    return
  }

  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ] as const

  const missing: string[] = []

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Please set these before starting the application."
    )
  }
}
