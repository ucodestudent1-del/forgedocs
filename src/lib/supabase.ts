import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"
import { isGuestMode, getGuestUserId } from "@/lib/guest-session"

let routeClientCache: any = null

// Mock query builder that chains all Supabase query methods
function createMockQueryBuilder() {
  const chain: Record<string, any> = {}
  const methods = ["select", "insert", "update", "delete", "upsert", "order", "range", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "contains", "contained_by", "range_filter", "match", "not", "or", "filter", "limit", "offset", "single", "maybeSingle", "abortSignal", "select", "insert", "update", "delete", "upsert", "rpc", "returns"]
  for (const method of methods) {
    chain[method] = (..._args: any[]) => createMockQueryBuilder()
  }
  chain.then = async () => ({ data: null, error: { message: "Build mode - no DB" } })
  return chain
}

function createMockClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithOAuth: async () => ({ data: { url: "" }, error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
      signUp: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
      updateUser: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
      resend: async () => ({ error: { message: "Build mode" } }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
      verifyOtp: async () => ({ data: { user: null }, error: null }),
    },
    from: () => createMockQueryBuilder(),
    rpc: async () => ({ data: null, error: { message: "Build mode - no DB" } }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: "Build mode" } }),
        download: async () => ({ data: null, error: { message: "Build mode" } }),
        remove: async () => ({ data: null, error: { message: "Build mode" } }),
        createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  }
}

export async function createRouteClient() {
  if (routeClientCache) return routeClientCache

  // Return mock client during build only when explicitly opted in
  if (typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build") {
    if (process.env.NEXT_PUBLIC_BUILD_MOCK !== "true") {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
        routeClientCache = createMockClient()
        return routeClientCache
      }
    }
    routeClientCache = createMockClient()
    return routeClientCache
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return null if env vars are missing instead of throwing — prevents SSR crashes
  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    return null
  }

  let client = createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies()
          return cookieStore.getAll()
        },
        async setAll(cookiesToSet) {
          try {
            const cookieStore = await cookies()
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `set` method was called from a Server Component.
          }
        },
      },
    },
  )

  // In guest mode, inject a guest user so unauthenticated requests can access
  // core document/conversion APIs without a Supabase Auth session. Database
  // integrity is preserved: RLS still scopes queries by the guest user_id.
  if (isGuestMode()) {
    const realGetUser = client.auth.getUser.bind(client.auth)
    ;(client.auth as any).getUser = async () => {
      try {
        const { data, error } = await realGetUser()
        if ((!data || !data.user) && !error) {
          return { data: { user: { id: getGuestUserId(), email: null } }, error: null }
        }
        return { data, error }
      } catch {
        // Supabase auth unreachable — fall back to guest user
        return {
          data: { user: { id: getGuestUserId(), email: null } },
          error: null,
        }
      }
    }
  }

  routeClientCache = client
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
