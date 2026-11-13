import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const isBuildTime = typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build"

function createMockClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithOAuth: async () => ({ data: { url: "" }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ single: async () => ({ data: null, error: { message: "Build mode - no DB" } }) }),
      insert: () => ({ single: async () => ({ data: null, error: { message: "Build mode - no DB" } }) }),
      update: () => ({ single: async () => ({ data: null, error: { message: "Build mode - no DB" } }) }),
      delete: () => ({ single: async () => ({ data: null, error: { message: "Build mode - no DB" } }) }),
      rpc: () => ({ single: async () => ({ data: null, error: { message: "Build mode - no DB" } }) }),
    }),
    rpc: async () => ({ data: null, error: { message: "Build mode - no DB" } }),
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
        getAll() {
          const cookieStore = await cookies()
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
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
