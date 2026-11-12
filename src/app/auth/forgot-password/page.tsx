"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const router = useRouter()

  React.useEffect(() => {
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrf_token))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to send reset email")
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError("Failed to send reset email. Please try again.")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>If an account exists, you'll receive a password reset link</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">We've sent a password reset link to your email.</p>
            <p className="text-sm text-muted-foreground mt-2">The link expires in 1 hour.</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <a href="/auth/login" className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors">
              Back to Sign In
            </a>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot password?</CardTitle>
          <CardDescription>Enter your email to receive a reset link</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                className="w-full"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Send reset link"}
            </Button>
          </form>
        </CardContent>
<CardFooter className="flex flex-col gap-4">
            <a href="/auth/login" className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors">
              Back to Sign In
            </a>
          </CardFooter>
      </Card>
    </div>
  )
}