const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const

export function validateEnv() {
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

export function getEnv(key: typeof requiredEnvVars[number]): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  STRIPE_SECRET_KEY: getEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET"),
}
