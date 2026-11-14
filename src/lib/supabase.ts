import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const isBuildTime = typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build"

// Mock query builder that chains all Supabase query methods
function createMockQueryBuilder() {
  const chain: any = {}
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
  // Return mock client during build
  if (typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build") {
    return createMockClient()
  }

  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return mock if env vars are placeholder/missing
  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    return createMockClient()
  }

  return createServerClient(
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
}

export async function getRouteClient() {
  return createRouteClient()
}

export async function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return createMockClient()
  }

  return createServerClient(url, serviceKey, {
    cookies: {
      getAll() {
        return []
      },
    },
  })
}
