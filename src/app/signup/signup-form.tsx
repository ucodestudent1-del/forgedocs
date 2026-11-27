"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
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
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fullNameError, setFullNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { signUp, loading: authLoading } = useAuth()
  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const loading = authLoading

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleGoogle = async () => {
    window.location.href = "/api/auth/google"
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setFullNameError(null)
    setEmailError(null)
    setPasswordError(null)
    setConfirmError(null)

    if (!fullName || !email || !password || !confirmPassword) {
      if (!fullName) setFullNameError("Full name is required")
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

    try {
      const callbackUrl = `${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/verify-email?callbackUrl=${encodeURIComponent(redirectTo)}`
      await signUp(email, password, fullName.trim(), callbackUrl)

      const { data: sessionData } = await (await import("@/lib/supabase-browser")).createBrowserSupabaseClient().auth.getSession()

      if (sessionData?.session) {
        toast({
          title: "Account created!",
          description: "You are now signed in.",
          variant: "success",
        })
        await router.push(redirectTo)
        router.refresh()
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
      if (message.toLowerCase().includes("already registered") || message.toLowerCase().includes("user already exists")) {
        setEmailError("An account with this email already exists")
        toast({ title: "Account already exists", variant: "destructive" })
      } else {
        toast({ title: message, variant: "destructive" })
      }
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
            id="fullName"
            label="Full name"
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={fullNameError}
            required
            autoComplete="name"
          />
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
