"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Shield, AlertCircle, RefreshCw } from "lucide-react"

export default function MfaVerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [showBackupInput, setShowBackupInput] = useState(false)

  useEffect(() => {
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrf_token))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ token: token.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Invalid code. Please try again.")
        setLoading(false)
        return
      }

      const redirectUrl = searchParams.get("redirect") || "/dashboard"
      router.push(redirectUrl)
    } catch {
      setError("Verification failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {useBackupCode ? "Backup code" : "6-digit code"}
              </label>
              <Input
                type="text"
                value={token}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/\s/g, "")
                  if (useBackupCode) {
                    setToken(value.slice(0, 8))
                  } else {
                    setToken(value.slice(0, 6))
                  }
                }}
                placeholder={useBackupCode ? "ABCDEF12" : "000000"}
                maxLength={useBackupCode ? 8 : 6}
                className="w-full text-center text-2xl tracking-widest"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || token.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Verify"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setUseBackupCode(!useBackupCode)
                setShowBackupInput(true)
                setToken("")
              }}
            >
              {useBackupCode ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Use authenticator app instead
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Use backup code
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}