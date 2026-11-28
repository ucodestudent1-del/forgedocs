import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"
import { createMockSupabaseClient } from "@/lib/supabase-mock"
import logger from "@/lib/logger"

const PLACEHOLDER_PATTERNS = [
  "placeholder",
  "your-",
  "example",
  "changeme",
  "replace-me",
  "dummy",
  "test",
]

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true
  const lower = value.toLowerCase()
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p) || lower === p)
}

function buildCookieOptions() {
  return {
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
    sameSite: "strict" as const,
  }
}

async function getCookieStore() {
  const cookieStore = await cookies()
  return cookieStore
}

function createClientWithCookies(
  url: string,
  key: string,
  opts: { isBuild?: boolean; guestMode?: boolean } = {},
) {  const { isBuild = false, guestMode = false } = opts

  const client = createServerClient<Database>(url, key, {
    cookies: {
      async getAll() {
        if (isBuild) return []
        const cookieStore = await getCookieStore()
        return cookieStore.getAll()
      },
      async setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
        if (isBuild) return
        try {
          const cookieStore = await getCookieStore()
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...buildCookieOptions(),
              ...options,
              sameSite: options.sameSite ?? "strict",
            })
          )
        } catch (err) {
          logger.error("[SUPABASE SERVER] setAll cookie failed", {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      },
    },
  })

  if (guestMode) {
    const realGetUser = client.auth.getUser.bind(client.auth)
    ;(client.auth as any).getUser = async () => {
      const provideGuest = async () => ({
        data: { user: { id: process.env.GUEST_USER_ID, email: null } },
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
  }

  return client
}

export async function createRouteClient() {
  const isBuild =
    typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build"

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (isBuild || !url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    return createMockSupabaseClient()
  }

  return createClientWithCookies(url, key, {
    isBuild,
    guestMode: process.env.NEXT_PUBLIC_GUEST_MODE === "true",
  })
}

export async function getRouteClient() {
  return createRouteClient()
}

/**
 * Per-request authenticated client. Each call returns a fresh client bound to the
 * current request's cookies. Use this for any route that reads/writes user data
 * or relies on auth.getUser(). Do NOT cache across requests.
 */
export async function createRouteAuthClient() {
  return createRouteClient()
}

/**
 * Service role client. Bypasses RLS. Use only in admin/webhook/export paths that
 * run server-side and never expose the key to the browser.
 */
export async function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (isPlaceholder(url) || isPlaceholder(serviceKey)) {
    throw new Error(
      "Missing or invalid Supabase service role environment variables. Set SUPABASE_SERVICE_ROLE_KEY.",
    )
  }

  return createServerClient<Database>(url!, serviceKey!, {
    cookies: {
      getAll() {
        return []
      },
    },
  })
}

/**
 * Read-only client with no cookie handling. Safe for public data that does not
 * depend on per-request auth cookies. Use for middleware and public reads only.
 * NOT safe for per-user authenticated operations.
 */
export async function createReadOnlyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    return createMockSupabaseClient()
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // No-op - read-only client doesn't set cookies
      },
    },
  })
}

/**
 * @deprecated Use createRouteAuthClient() instead.
 * Kept for backward compatibility with existing code.
 */
export async function getPooledRouteClient() {
  return createRouteAuthClient()
}
