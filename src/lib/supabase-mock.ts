import type { Database } from "@/types/database"

/**
 * Shared mock Supabase client factory used during builds and when
 * Supabase credentials are unavailable. Consolidates the previously
 * duplicated mock logic that lived in both supabase.ts and
 * supabase-browser.ts.
 */

// Mock query builder that chains all Supabase query methods
export function createMockQueryBuilder() {
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "order",
    "range",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "is",
    "in",
    "contains",
    "contained_by",
    "range_filter",
    "match",
    "not",
    "or",
    "filter",
    "limit",
    "offset",
    "single",
    "maybeSingle",
    "abortSignal",
    "rpc",
    "returns",
  ]

  const buildChain = (): Record<string, any> => {
    const chain: Record<string, any> = {}
    for (const method of methods) {
      chain[method] = (..._args: any[]) => buildChain()
    }
    chain.then = async () => ({ data: null, error: { message: "Build mode - no DB" } })
    return chain
  }

  return buildChain()
}

export function createMockAuth() {
  return {
    getUser: async (..._args: any[]) => ({ data: { user: null as any }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithOAuth: async (..._args: any[]) => ({ data: { url: "" }, error: null }),
    signInWithPassword: async (..._args: any[]) => ({ data: { user: null as any }, error: { message: "Build mode" } }),
    signUp: async (..._args: any[]) => ({ data: { user: null as any }, error: { message: "Build mode" } }),
    updateUser: async (..._args: any[]) => ({ data: { user: null as any }, error: { message: "Build mode" } }),
    resend: async (..._args: any[]) => ({ error: { message: "Build mode" } }),
    signOut: async () => ({ error: null }),
    deleteUser: async () => ({ error: null }),
    resetPasswordForEmail: async (..._args: any[]) => ({ error: null }),
    verifyOtp: async (..._args: any[]) => ({ data: { user: null as any }, error: null }),
  }
}

export function createMockStorage() {
  return {
    from: () => ({
      upload: async () => ({ data: null, error: { message: "Build mode" } }),
      download: async () => ({ data: null, error: { message: "Build mode" } }),
      remove: async () => ({ data: null, error: { message: "Build mode" } }),
      createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  }
}

export interface MockSupabaseClient {
  auth: ReturnType<typeof createMockAuth>
  from: () => ReturnType<typeof createMockQueryBuilder>
  rpc: () => Promise<{ data: null; error: { message: string } }>
  storage: ReturnType<typeof createMockStorage>
}

export function createMockSupabaseClient(guestUserId?: string): MockSupabaseClient {
  const guestUser = guestUserId
    ? ({ data: { user: { id: guestUserId, email: null } as any }, error: null } as const)
    : ({ data: { user: null as any }, error: null } as const)

  return {
    auth: {
      ...createMockAuth(),
      getUser: async () => guestUser,
    },
    from: () => createMockQueryBuilder(),
    rpc: async () => ({ data: null, error: { message: "Build mode - no DB" } }),
    storage: createMockStorage(),
  }
}
