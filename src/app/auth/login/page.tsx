"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Lock, Chrome } from "lucide-react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const router = useRouter()

  // Fetch CSRF token on mount
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
    const password = formData.get("password") as string

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed")
        setLoading(false)
        return
      }

      router.push("/dashboard")
    } catch {
      setError("Login failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Access your documents and templates</CardDescription>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                className="w-full"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => window.location.href = "/api/auth/google"}
            disabled={loading}
          >
            <Chrome className="h-4 w-4" />
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <a href="/auth/signup" className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors">
            Create an account
          </a>
          <a href="/auth/forgot-password" className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors">
            Forgot password?
          </a>
        </CardFooter>
      </Card>
    </div>
  )
}
