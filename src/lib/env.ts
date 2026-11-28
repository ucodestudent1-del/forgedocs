import { getSecret } from "@/lib/secrets-manager"

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "REDIS_URL",
  "MFA_SECRET_ENCRYPTION_KEY",
  "MFA_BACKUP_CODE_PEPPER",
  "API_KEY_PEPPER",
] as const

const optionalEnvVars = [
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_DSN",
] as const

const isBuildTime = typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build"

let envCache: Record<string, string> | null = null

export async function validateEnv(): Promise<void> {
  if (isBuildTime) return

  const missing: string[] = []

  for (const key of requiredEnvVars) {
    const value = await getSecret(key)
    if (!value) {
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

export async function getEnv(
  key: typeof requiredEnvVars[number] | typeof optionalEnvVars[number]
): Promise<string | undefined> {
  if (optionalEnvVars.includes(key as typeof optionalEnvVars[number])) {
    return process.env[key]
  }
  const value = await getSecret(key)
  return value || undefined
}

export async function getRequiredEnv(key: typeof requiredEnvVars[number]): Promise<string> {
  if (isBuildTime) {
    const value = process.env[key]
    return value || ""
  }
  const value = await getSecret(key)
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export async function loadEnv(): Promise<Record<string, string>> {
  if (envCache) return envCache

  const cache: Record<string, string> = {}

  for (const key of requiredEnvVars) {
    const value = await getSecret(key)
    if (value) cache[key] = value
  }

  for (const key of optionalEnvVars) {
    const value = process.env[key]
    if (value) cache[key] = value
  }

  envCache = cache
  return cache
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  RESEND_API_KEY: "",
  REDIS_URL: "",
  MFA_SECRET_ENCRYPTION_KEY: "",
  SENTRY_ORG: undefined as string | undefined,
  SENTRY_PROJECT: undefined as string | undefined,
  SENTRY_DSN: undefined as string | undefined,
}
