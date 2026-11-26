import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import { createMockSupabaseClient } from "@/lib/supabase-mock"

// BrowserSupabaseClient is intentionally permissive so client components can
// call Supabase auth methods with their natural argument shapes. The real
// createBrowserClient is used at runtime; the mock is only used during builds.
export type BrowserSupabaseClient = {
  from: (table: string) => any
  auth: {
    getUser: (..._args: any[]) => Promise<{ data: { user: any }; error: any }>
    getSession: (..._args: any[]) => Promise<{ data: { session: any }; error: any }>
    signInWithPassword: (..._args: any[]) => Promise<any>
    signUp: (..._args: any[]) => Promise<any>
    updateUser: (..._args: any[]) => Promise<any>
    deleteUser: (..._args: any[]) => Promise<any>
    resetPasswordForEmail: (..._args: any[]) => Promise<any>
    verifyOtp: (..._args: any[]) => Promise<any>
    resend: (..._args: any[]) => Promise<any>
    signOut: (..._args: any[]) => Promise<any>
  }
  storage: {
    from: (bucket: string) => any
  }
  rpc: (..._args: any[]) => Promise<any>
}

export function createBrowserSupabaseClient(): BrowserSupabaseClient {
  // Return mock during build
  if (typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build") {
    return createMockSupabaseClient() as unknown as BrowserSupabaseClient
  }

  // NEXT_PUBLIC_* values are baked into the client bundle at build time.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    // Fail safe: return mock client rather than throwing an uncaught error
    // that breaks the login/verify flows when credentials are unavailable.
    return createMockSupabaseClient() as unknown as BrowserSupabaseClient
  }

  return createBrowserClient<Database>(url, key) as unknown as BrowserSupabaseClient
}
