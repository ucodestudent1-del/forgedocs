"use client"

import * as React from "react"

export interface SupabaseClient {
  from: (table: string) => any
  auth: {
    getUser: () => Promise<{ data: { user: any } }>
  }
  storage: {
    from: (bucket: string) => any
  }
}

export function useSupabaseClient(): SupabaseClient {
  return {
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
    },
    storage: {
      from: () => ({}),
    },
  }
}
