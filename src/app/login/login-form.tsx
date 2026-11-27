"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Mail, Lock, AlertTriangle, Eye, EyeOff } from "lucide-react"
import {
  AuthContainer,
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthDivider,
  AuthGoogleButton,
  AuthInput,
  AuthPasswordInput,
  AuthButton,
  AuthLink,
  AuthOutlineButton,
} from "@/components/auth/AuthLayout"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const redirectTo = searchParams.get("redirect") || "/dashboard"

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleGoogle = async () => {
    setLoading(true)
    try {
      window.location.href = "/api/auth/google"
    } catch {
      toast({ title: "Google sign-in failed. Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    setPasswordError(null)

    if (!email || !password) {
      if (!email) setEmailError("Email is required")
      if (!password) setPasswordError("Password is required")
      toast({ title: "Please fill in all fields", variant: "destructive" })
      return
    }
    if (!emailRegex.test(email)) {
      setEmailError("Enter a valid email address")
      toast({ title: "Invalid email format", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      console.log("[AUTH LOGIN CLIENT] signInWithPassword result", { error: error?.message, hasSession: Boolean(data?.session), email })

      if (error) {
        const msg = error.message || error.msg || String(error)
        const code = (error as any)?.code || (error as any)?.error_code
        const isUnconfirmed =
          msg.toLowerCase().includes("email not confirmed") ||
          msg.toLowerCase().includes("confirm") ||
          code === "email_not_confirmed"
        if (isUnconfirmed) {
          setEmailError("Please verify your email before signing in.")
          setPasswordError("Please verify your email before signing in.")
          toast({
            title: "Please verify your email before signing in.",
            description: "Check your inbox, or request a new verification code.",
            variant: "destructive",
            action: {
              label: "Resend verification",
              onClick: async () => {
                try {
                  const res = await fetch("/api/auth/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  })
                  if (!res.ok) {
                    const err = await res.json()
                    toast({ title: err?.error || "Failed to resend verification", variant: "destructive" })
                    return
                  }
                  toast({
                    title: "Verification email sent",
                    description: "Check your inbox to confirm your account, then sign in.",
                    variant: "default",
                  })
                } catch {
                  toast({ title: "Failed to resend verification. Please try again.", variant: "destructive" })
                }
              },
            },
          })
          return
        }
        setEmailError("Invalid email or password")
        setPasswordError("Invalid email or password")
        toast({ title: "Invalid email or password", variant: "destructive" })
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      await router.push(redirectTo)
      router.refresh()
      if (!sessionData?.session) {
        toast({ title: "Sign in succeeded but no session was established. Please try again.", variant: "destructive" })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again."
      toast({ title: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContainer>
      <AuthCard>
        <AuthHeader
          title="Welcome back"
          description="Sign in to continue to your account."
        />
        <form onSubmit={handleLogin} className="space-y-4">
          <AuthGoogleButton onClick={handleGoogle} loading={loading} />
          <AuthDivider label="OR" />
          <AuthInput
            id="email"
            label="Email address"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            required
            autoComplete="email"
          />
          <AuthPasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPassword={showPassword}
            toggleShowPassword={() => setShowPassword(!showPassword)}
            error={passwordError}
            required
            autoComplete="current-password"
          />
          <AuthButton type="submit" loading={loading} disabled={loading}>
            <Mail className="h-4 w-4 mr-2" />
            Sign in
          </AuthButton>
        </form>
        <AuthFooter>
          <p className="text-sm text-muted-foreground">
            <AuthLink href="/forgot-password">Forgot password?</AuthLink>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <AuthLink href="/signup">Create an account</AuthLink>
          </p>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  )
}
