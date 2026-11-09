const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const

const optionalEnvVars = [
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_DSN",
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

export function getEnv(key: typeof requiredEnvVars[number] | typeof optionalEnvVars[number]): string | undefined {
  return process.env[key]
}

export function getRequiredEnv(key: typeof requiredEnvVars[number]): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  STRIPE_SECRET_KEY: getRequiredEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: getRequiredEnv("STRIPE_WEBHOOK_SECRET"),
  SENTRY_ORG: getEnv("SENTRY_ORG"),
  SENTRY_PROJECT: getEnv("SENTRY_PROJECT"),
  SENTRY_DSN: getEnv("SENTRY_DSN"),
}
