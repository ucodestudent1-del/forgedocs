import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"
import { getGuestUserId } from "@/lib/guest-session"

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

async function createMockClient() {
  const guestUserId = await getGuestUserId()
  const guestUser = { data: { user: { id: guestUserId, email: null } }, error: null }

  return {
    auth: {
      getUser: async () => guestUser,
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
      return await createMockClient()
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
    return await createMockClient()
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

  // Inject guest user when no Supabase session exists and guest mode is enabled.
  // Each call returns a fresh client — no cross-request caching of cookies or state.
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
