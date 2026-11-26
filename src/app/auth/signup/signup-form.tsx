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
import { validatePassword } from "@/lib/validation"
import { Mail, Lock, AlertTriangle, Eye, EyeOff } from "lucide-react"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const redirectTo = searchParams.get("redirect") || "/dashboard"

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !confirmPassword) {
      toast({ title: "Please fill in all fields", variant: "destructive" })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" })
      return
    }
    const { valid, errors } = validatePassword(password)
    if (!valid) {
      toast({ title: errors[0], variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: email.split("@")[0] } },
      })
      if (error) {
        toast({ title: error.message, variant: "destructive" })
        return
      }
      toast({ title: "Account created successfully! Please check your email to verify your account, then sign in.", variant: "success" })
      await router.push(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`)
      router.refresh()
    } catch {
      toast({ title: "Signup failed. Please try again.", variant: "destructive" })
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
            <CardTitle className="text-2xl">Create your ForgeDocs account</CardTitle>
          </div>
          <CardDescription>Join thousands of teams streamlining their document workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
              />
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
                  autoComplete="new-password"
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
              <p className="text-xs text-muted-foreground">
                Must be 8+ characters with uppercase, lowercase, number, and special character
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full"
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Mail className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Create account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/login">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Already have an account? Sign in
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}