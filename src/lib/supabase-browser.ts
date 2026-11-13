import { createBrowserClient } from "@supabase/ssr"

export function createBrowserSupabaseClient() {
  // Return mock during build
  if (typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build") {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOAuth: async () => ({ data: { url: "" }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ single: async () => ({ data: null, error: { message: "Build mode" } }) }),
      }),
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return mock if env vars are placeholder
  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOAuth: async () => ({ data: { url: "" }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ single: async () => ({ data: null, error: { message: "Invalid config" } }) }),
      }),
    }
  }

  return createBrowserClient(url, key)
}