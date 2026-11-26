"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Mail, Lock, AlertTriangle, Eye, EyeOff } from "lucide-react"

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError("Enter a valid email address")
      toast({ title: "Invalid email format", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      console.log("[SUPABASE SIGNIN DEBUG]", { error, data: data?.session ? "session-present" : "no-session", email })
      if (error) {
        const msg = error.message || error.msg || String(error)
        const code = (error as any)?.code || (error as any)?.error_code
        const status = (error as any)?.status
        const isUnconfirmed =
          msg.toLowerCase().includes("email not confirmed") ||
          msg.toLowerCase().includes("confirm") ||
          code === "email_not_confirmed"
        if (isUnconfirmed) {
          toast({
            title: "Please verify your email before signing in.",
            description:
              "Check your inbox, or request a new verification code.",
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
        const isInvalid =
          msg.toLowerCase().includes("invalid login") ||
          msg.toLowerCase().includes("credentials") ||
          code === "INVALID_LOGIN"
        if (isInvalid) {
          setEmailError("Invalid email or password")
          setPasswordError("Invalid email or password")
          toast({ title: "Invalid email or password", variant: "destructive" })
          return
        }
        console.error("[SUPABASE SIGNIN ERROR]", { status, code, message: msg, email })
        toast({ title: msg || "Sign-in failed. Please try again.", variant: "destructive" })
        return
      }
      const { data: sessionData } = await supabase.auth.getSession()
      toast({
        title: `Sign-in ${sessionData.session ? "OK (session set)" : "NO SESSION"} → ${redirectTo}`,
        variant: sessionData.session ? "default" : "destructive",
      })
      await router.push(redirectTo)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again."
      toast({ title: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <CardTitle className="text-2xl">Sign in to ForgeDocs</CardTitle>
          </div>
          <CardDescription>Enter your email and password to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                autoComplete="email"
                aria-invalid={emailError ? true : false}
                aria-describedby={emailError ? "email-error" : undefined}
              />
              {emailError && (
                <p id="email-error" className="text-xs text-destructive" role="alert">
                  {emailError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                  autoComplete="current-password"
                  aria-invalid={passwordError ? true : false}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-xs text-destructive" role="alert">
                  {passwordError}
                </p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Mail className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/forgot-password">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Forgot password?
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/signup">
              <Lock className="h-4 w-4 mr-2" />
              Create an account
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}