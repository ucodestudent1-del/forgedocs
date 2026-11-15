"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { CheckCircle2, AlertTriangle, Mail, ArrowLeft } from "lucide-react"

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const token_hash = searchParams.get("token_hash")
    const type = searchParams.get("type")
    if (token_hash && type) {
      verifyEmail(token_hash, type)
    } else {
      setError("Invalid verification link")
      setLoading(false)
    }
  }, [searchParams])

  const verifyEmail = async (tokenHash: string, type: string) => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setVerified(true)
      setLoading(false)
      toast({ title: "Email verified successfully", variant: "success" })
    } catch {
      setError("Verification failed. Please try again.")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <CardTitle>Verifying your email...</CardTitle>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        {verified ? (
          <>
            <CardHeader>
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
              <CardTitle>Email verified</CardTitle>
              <CardDescription>Your email address has been verified successfully.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/auth/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Sign in
                </Link>
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader>
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Verification failed</CardTitle>
              <CardDescription>{error || "Unable to verify your email address."}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/auth/login">
                  <Mail className="h-4 w-4 mr-2" />
                  Request new verification
                </Link>
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}