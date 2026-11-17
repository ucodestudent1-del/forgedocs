"use client"

import * as React from "react"

export interface SupabaseClient {
  from: (table: string) => any
  auth: {
    getUser: () => Promise<{ data: { user: any } }>
    getSession: () => Promise<{ data: { session: any } }>
    updateUser: (attrs: any) => Promise<{ data: any; error: any }>
    deleteUser?: () => Promise<{ data: any; error: any }>
    resetPasswordForEmail: (email: string, opts?: any) => Promise<{ data: any; error: any }>
    signInWithPassword: (credentials: any) => Promise<{ data: any; error: any }>
    signUp: (credentials: any) => Promise<{ data: any; error: any }>
    verifyOtp: (params: any) => Promise<{ data: any; error: any }>
    signInWithOAuth: (options: any) => Promise<{ data: any; error: any }>
    resend: (type: any, opts?: any) => Promise<{ data: any; error: any }>
    signOut: () => Promise<{ error: any }>
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
      getSession: () => Promise.resolve({ data: { session: null } }),
      updateUser: () => Promise.resolve({ data: null, error: null }),
      deleteUser: () => Promise.resolve({ data: null, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      verifyOtp: () => Promise.resolve({ data: null, error: null }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
      resend: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    storage: {
      from: () => ({}),
    },
  }
}
