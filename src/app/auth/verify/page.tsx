"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verifying your email...")

  useEffect(() => {
    async function verifyEmail() {
      const token = searchParams.get("token")
      const type = searchParams.get("type")

      if (!token || type !== "signup") {
        setStatus("error")
        setMessage("Invalid verification link")
        return
      }

      try {
        const supabase = createBrowserSupabaseClient()
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "signup",
        })

        if (error) {
          setStatus("error")
          setMessage(error.message)
        } else {
          setStatus("success")
          setMessage("Email verified successfully! Redirecting to login...")
          setTimeout(() => router.push("/auth/login?verified=true"), 3000)
        }
      } catch {
        setStatus("error")
        setMessage("Verification failed. Please try again.")
      }
    }

    verifyEmail()
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center ${
            status === "success" ? "bg-green-100 text-green-600" : status === "error" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
          }`}>
            {status === "success" && <CheckCircle className="h-6 w-6" />}
            {status === "error" && <AlertCircle className="h-6 w-6" />}
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin" />}
          </div>
          <CardTitle className="text-xl">Email Verification</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === "error" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  )
}