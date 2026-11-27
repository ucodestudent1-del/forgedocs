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
  channel: (name: string, options?: any) => any
  removeChannel: (channel: any) => void
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
    const missing = !url || !key
      ? "NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      : "placeholder values"
    throw new Error(
      `[supabase-browser] Missing or invalid Supabase credentials: ${missing}. ` +
      "Set real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables. " +
      "Without them, signInWithPassword sends no apikey and Supabase returns 400 'No API key found in request'."
    )
  }

  return createBrowserClient<Database>(url, key) as unknown as BrowserSupabaseClient
}
