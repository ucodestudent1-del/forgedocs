"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import type { Database } from "@/types/database"

export type AuthState = "loading" | "authenticated" | "unauthenticated"

export interface AuthContextType {
  state: AuthState
  user: Database["public"]["Tables"]["profiles"]["Row"] | null
  session: any | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

let supabaseClient: ReturnType<typeof createBrowserSupabaseClient> | null = null

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createBrowserSupabaseClient()
  }
  return supabaseClient
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading")
  const [user, setUser] = useState<
    Database["public"]["Tables"]["profiles"]["Row"] | null
  >(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      setUser(null)
      return
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single()
    setUser(profile || null)
  }, [])

  useEffect(() => {
    const supabase = getSupabase()

    let mounted = true

    const initAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        if (initialSession) {
          setSession(initialSession)
          setState("authenticated")
          await refreshProfile()
        } else {
          setSession(null)
          setState("unauthenticated")
          setUser(null)
        }
      } catch {
        setState("unauthenticated")
        setSession(null)
        setUser(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const authListener = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        setSession(session || null)

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) {
            setState("authenticated")
            await refreshProfile()
          }
        } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
          setState("unauthenticated")
          setUser(null)
          setSession(null)
        } else if (event === "PASSWORD_RECOVERY") {
          setState("authenticated")
          await refreshProfile()
        }
      },
    )

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [refreshProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      const supabase = getSupabase()
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoading(false)
        throw error
      }

      if (data?.session) {
        setSession(data.session)
        setState("authenticated")
        await refreshProfile()
      }

      setLoading(false)
    },
    [refreshProfile],
  )

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      setLoading(true)
      const supabase = getSupabase()
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/verify-email`
              : `${process.env.NEXT_PUBLIC_APP_URL}/verify-email`,
        },
      })

      if (error) {
        setLoading(false)
        throw error
      }

      if (data?.session) {
        setSession(data.session)
        setState("authenticated")
        await refreshProfile()
      }

      setLoading(false)
    },
    [refreshProfile],
  )

  const signOut = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) {
      setLoading(false)
      throw error
    }
    setState("unauthenticated")
    setUser(null)
    setSession(null)
    setLoading(false)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true)
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })
    setLoading(false)
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    setLoading(true)
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) throw error
  }, [])

  const value: AuthContextType = {
    state,
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
