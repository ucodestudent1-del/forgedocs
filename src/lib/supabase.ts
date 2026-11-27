import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"
import { getGuestUserId } from "@/lib/guest-session"
import { createMockSupabaseClient } from "@/lib/supabase-mock"
import logger from "@/lib/logger"

function injectGuestUser(client: any): any {
  const realGetUser = client.auth.getUser.bind(client.auth)
  ;(client.auth as any).getUser = async () => {
    const provideGuest = async () => ({
      data: { user: { id: await getGuestUserId(), email: null } },
      error: null,
    })
    try {
      const { data, error } = await realGetUser()
      if ((!data || !data.user) && !error) {
        return provideGuest()
      }
      return { data, error }
    } catch {
      return provideGuest()
    }
  }
  return client
}

export async function createRouteClient() {
  const isBuild = typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build"

  if (isBuild) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const useMock =
      process.env.NEXT_PUBLIC_BUILD_MOCK === "true" ||
      !url ||
      !key ||
      url.includes("placeholder") ||
      key.includes("placeholder")

    if (useMock) {
      return createMockSupabaseClient()
    }

    return createServerClient<Database>(
      url,
      key,
      {
        cookies: {
          async getAll() {
            return []
          },
          async setAll() {
            // No-op during build
          },
        },
      },
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    // Fail safe: return mock client rather than a real client with empty
    // credentials that could allow unauthenticated access or silent failures.
    return createMockSupabaseClient()
  }

  const client = createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies()
          return cookieStore.getAll()
        },
        async setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            const cookieStore = await cookies()
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
                sameSite: options.sameSite ?? "strict",
              })
            )
          } catch (err) {
            logger.error("[SUPABASE SERVER] setAll cookie failed", { error: err instanceof Error ? err.message : String(err) })
          }
        },
      },
    },
  )

  // Only inject guest user when explicitly enabled via env var
  if (process.env.NEXT_PUBLIC_GUEST_MODE === "true") {
    return injectGuestUser(client)
  }

  return client
}

export async function getRouteClient() {
  return createRouteClient()
}

export async function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || url.includes("placeholder") || serviceKey.includes("placeholder")) {
    throw new Error(
      "Missing or invalid Supabase service role environment variables. Set SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return createServerClient<Database>(url, serviceKey, {
    cookies: {
      getAll() {
        return []
      },
    },
  })
}

/**
 * Shared pooled Supabase server client.
 * Reuses a single client instance across requests within the same serverless invocation
 * to reduce connection churn. For multi-replica deployments, pair with PgBouncer
 * (Supabase pooled connection string) via DATABASE_POOL_URL.
 */
let pooledServerClient: ReturnType<typeof createServerClient<Database>> | null = null

export async function getPooledRouteClient() {
  if (pooledServerClient) return pooledServerClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    return createMockSupabaseClient()
  }

  pooledServerClient = createServerClient<Database>(url, key, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies()
        return cookieStore.getAll()
      },
        async setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
        try {
          const cookieStore = await cookies()
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
              sameSite: options.sameSite ?? "strict",
            })
          )
        } catch (err) {
          logger.error("[SUPABASE POOLED] setAll cookie failed", { error: err instanceof Error ? err.message : String(err) })
        }
      },
    },
  })

  return pooledServerClient
}
