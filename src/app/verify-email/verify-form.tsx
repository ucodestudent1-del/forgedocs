"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { CheckCircle2, AlertTriangle, Mail, ArrowLeft, RotateCw } from "lucide-react"
import {
  AuthContainer,
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthButton,
  AuthLink,
  AuthOutlineButton,
} from "@/components/auth/AuthLayout"

export default function VerifyEmailForm() {
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const nextUrl = searchParams.get("next") || "/dashboard"

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash")
    const type = searchParams.get("type")
    const emailParam = searchParams.get("email")
    if (emailParam) setEmail(emailParam)

    if (tokenHash && type) {
      verifyEmail(tokenHash, type)
    } else {
      setLoading(false)
      if (!tokenHash && !type) {
        // Page loaded directly without a token — informational state
        setError(null)
      }
    }
  }, [searchParams])

  const verifyEmail = async (tokenHash: string, type: string) => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) {
        console.error("[AUTH VERIFY] verifyOtp failed", { error: error.message })
        setError(error.message)
        setLoading(false)
        return
      }
      const { data: sessionData } = await supabase.auth.getSession()
      console.log("[AUTH VERIFY] verifyOtp succeeded", { hasSession: Boolean(sessionData?.session) })
      setVerified(true)
      setLoading(false)
      toast({ title: "Email verified successfully", variant: "success" })
      await router.push(callbackUrl)
      router.refresh()
    } catch {
      setError("Verification failed. Please try again.")
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setResendLoading(true)
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
      toast({ title: "Verification email sent", description: "Check your inbox to confirm your account.", variant: "success" })
    } catch {
      toast({ title: "Failed to resend verification. Please try again.", variant: "destructive" })
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <AuthContainer>
      <AuthCard className="text-center">
        <AuthHeader
          title="Check your inbox"
          description={`A verification email has been sent to ${email || "your email address"}. Open it and click the verification link to continue.`}
        />
        {loading ? (
          <>
            <RotateCw className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Verifying your email...</p>
          </>
        ) : verified ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground mb-2">Email verified</p>
            <p className="text-xs text-muted-foreground mb-6">Your account is now active.</p>
            <AuthButton asChild className="w-full">
              <Link href={callbackUrl}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue to dashboard
              </Link>
            </AuthButton>
          </>
        ) : (
          <>
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground mb-2">Verification failed</p>
            <p className="text-xs text-muted-foreground mb-6">{error || "Unable to verify your email address."}</p>
            <AuthButton
              onClick={handleResend}
              loading={resendLoading}
              disabled={resendLoading || !email}
              className="w-full mb-4"
            >
              <Mail className="h-4 w-4 mr-2" />
              Resend verification email
            </AuthButton>
            <AuthOutlineButton href={`/login?next=${encodeURIComponent(nextUrl)}`} className="w-full mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to sign in
            </AuthOutlineButton>
            <AuthLink href={`/signup?next=${encodeURIComponent(nextUrl)}`}>
              <ArrowLeft className="h-4 w-4 mr-2 rotate-180" />
              Change email address
            </AuthLink>
          </>
        )}
        <AuthFooter>
          <AuthOutlineButton href="/login" className="w-full">
            Back to sign in
          </AuthOutlineButton>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  )
}
