"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Lock, Eye, EyeOff } from "lucide-react"
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
import { validatePassword } from "@/lib/password"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    setPasswordError(null)
    setConfirmError(null)

    if (!email || !password || !confirmPassword) {
      if (!email) setEmailError("Email is required")
      if (!password) setPasswordError("Password is required")
      if (!confirmPassword) setConfirmError("Confirm your password")
      toast({ title: "Please fill in all fields", variant: "destructive" })
      return
    }
    if (!emailRegex.test(email)) {
      setEmailError("Enter a valid email address")
      toast({ title: "Invalid email format", variant: "destructive" })
      return
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match")
      toast({ title: "Passwords do not match", variant: "destructive" })
      return
    }
    const { valid, errors } = validatePassword(password)
    if (!valid) {
      setPasswordError(errors[0] || "Password does not meet security requirements")
      toast({ title: "Invalid password", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: email.split("@")[0] },
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/verify-email`,
        },
      })

      if (error) {
        const msg = error.message || String(error)
        if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("user already exists")) {
          setEmailError("An account with this email already exists")
          toast({ title: "Account already exists", variant: "destructive" })
        } else {
          toast({ title: msg || "Signup failed. Please try again.", variant: "destructive" })
        }
        return
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account, then sign in.",
        variant: "success",
      })
      await router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed. Please try again."
      toast({ title: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContainer>
      <AuthCard>
        <AuthHeader
          title="Create your account"
          description="Get started for free. No credit card required."
        />
        <form onSubmit={handleSignup} className="space-y-4">
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
            autoComplete="new-password"
          />
          <AuthPasswordInput
            id="confirmPassword"
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            showPassword={showPassword}
            toggleShowPassword={() => setShowPassword(!showPassword)}
            error={confirmError}
            required
            autoComplete="new-password"
          />
          <AuthButton type="submit" loading={loading} disabled={loading}>
            <Lock className="h-4 w-4 mr-2" />
            Create account
          </AuthButton>
        </form>
        <AuthFooter>
          <p className="text-xs text-muted-foreground leading-relaxed">
            By creating an account, you agree to our{" "}
            <AuthLink href="/terms">Terms of Service</AuthLink>{" "}
            and{" "}
            <AuthLink href="/privacy">Privacy Policy</AuthLink>.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <AuthLink href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>Sign in</AuthLink>
          </p>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  )
}
