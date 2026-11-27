"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Mail, Lock, AlertTriangle, Eye, EyeOff, Shield } from "lucide-react"
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
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaLoading, setMfaLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { refreshProfile } = useAuth()
  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const loading = mfaLoading

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleGoogle = async () => {
    window.location.href = "/api/auth/google"
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

    try {
      setMfaLoading(true)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const message = data?.error || "Login failed. Please try again."
        const code = data?.code
        const isUnconfirmed =
          message.toLowerCase().includes("email not confirmed") ||
          message.toLowerCase().includes("confirm") ||
          code === "EMAIL_NOT_CONFIRMED"
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
                  const resendRes = await fetch("/api/auth/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  })
                  if (!resendRes.ok) {
                    const resErr = await resendRes.json()
                    toast({ title: resErr?.error || "Failed to resend verification", variant: "destructive" })
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
        if (data?.mfa_required) {
          setMfaRequired(true)
          setMfaLoading(false)
          toast({ title: "MFA verification required", description: "Enter the code from your authenticator app.", variant: "default" })
          return
        }
        setEmailError("Invalid email or password")
        setPasswordError("Invalid email or password")
        toast({ title: message, variant: "destructive" })
        return
      }

      await refreshProfile()
      await router.push(redirectTo)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again."
      toast({ title: message, variant: "destructive" })
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaCode || mfaCode.length !== 6) {
      toast({ title: "Enter a valid 6-digit code", variant: "destructive" })
      return
    }

    setMfaLoading(true)
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: mfaCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: data?.error || "Invalid MFA code", variant: "destructive" })
        return
      }

      await refreshProfile()
      await router.push(redirectTo)
      router.refresh()
    } catch {
      toast({ title: "MFA verification failed. Please try again.", variant: "destructive" })
    } finally {
      setMfaLoading(false)
    }
  }

  return (
    <AuthContainer>
      <AuthCard>
        <AuthHeader
          title="Welcome back"
          description="Sign in to continue to your account."
        />
        {mfaRequired ? (
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div className="text-center mb-4">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium">Enter MFA Code</h3>
              <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
            </div>
            <AuthInput
              id="mfaCode"
              label="Authentication Code"
              type="text"
              placeholder="123456"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
              autoComplete="one-time-code"
              maxLength={6}
              inputMode="numeric"
            />
            <AuthButton type="submit" loading={mfaLoading} disabled={mfaLoading} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Verify
            </AuthButton>
            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setMfaRequired(false)}
                className="text-primary hover:text-primary/90 transition-colors underline-offset-4 hover:underline"
              >
                Back to sign in
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <AuthGoogleButton onClick={handleGoogle} loading={mfaLoading} />
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
            <AuthButton type="submit" loading={mfaLoading} disabled={mfaLoading}>
              <Mail className="h-4 w-4 mr-2" />
              Sign in
            </AuthButton>
          </form>
        )}
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
