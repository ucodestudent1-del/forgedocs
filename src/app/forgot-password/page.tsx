"use client"

import { useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Mail, ArrowLeft } from "lucide-react"
import {
  AuthContainer,
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthInput,
  AuthButton,
  AuthLink,
  AuthOutlineButton,
} from "@/components/auth/AuthLayout"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email) {
      toast({ title: "Please enter your email address", variant: "destructive" })
      return
    }
    if (!emailRegex.test(email)) {
      setError("Enter a valid email address")
      toast({ title: "Invalid email format", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      })
      if (supabaseError) {
        setError(supabaseError.message)
        toast({ title: "Failed to send reset email. Please try again.", variant: "destructive" })
        return
      }
      setSent(true)
    } catch {
      toast({ title: "Failed to send reset email. Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthContainer>
        <AuthCard className="text-center">
          <AuthHeader title="Check your email" description="We've sent a password reset link to your email address. Follow the instructions in the email to reset your password." />
          <AuthFooter>
            <AuthOutlineButton href="/login" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in
            </AuthOutlineButton>
          </AuthFooter>
        </AuthCard>
      </AuthContainer>
    )
  }

  return (
    <AuthContainer>
      <AuthCard>
        <AuthHeader title="Forgot your password?" description="Enter your email and we'll send you a link to reset your password." />
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <AuthInput
            id="email"
            label="Email address"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <AuthButton type="submit" loading={loading} disabled={loading}>
            <Mail className="h-4 w-4 mr-2" />
            Send reset link
          </AuthButton>
        </form>
        <AuthFooter>
          <AuthOutlineButton href="/login" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </AuthOutlineButton>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  )
}
