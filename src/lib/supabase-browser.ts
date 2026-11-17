import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import type { SupabaseClient } from "@/lib/supabase-client"

export function createBrowserSupabaseClient(): SupabaseClient {
  // Return mock during build
  if (typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build") {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOAuth: async () => ({ data: { url: "" }, error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
        signUp: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
        updateUser: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
        resetPasswordForEmail: async () => ({ data: null, error: null }),
        resend: async () => ({ data: null, error: null }),
        verifyOtp: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ single: async () => ({ data: null, error: { message: "Build mode" } }) }),
      }),
      storage: {
        from: () => ({}),
      },
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
        signInWithPassword: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
        signUp: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
        updateUser: async () => ({ data: { user: null }, error: { message: "Build mode" } }),
        resetPasswordForEmail: async () => ({ data: null, error: null }),
        resend: async () => ({ data: null, error: null }),
        verifyOtp: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ single: async () => ({ data: null, error: { message: "Invalid config" } }) }),
      }),
      storage: {
        from: () => ({}),
      },
    }
  }

  return createBrowserClient<Database>(url, key)
}