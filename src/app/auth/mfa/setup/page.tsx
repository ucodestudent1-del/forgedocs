"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle, Loader2, Shield, Copy, AlertTriangle } from "lucide-react"

export default function MfaSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<"setup" | "verify" | "complete">("setup")
  const [secret, setSecret] = useState<string>("")
  const [qrCode, setQrCode] = useState<string>("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [token, setToken] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false)

  useEffect(() => {
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrf_token))
      .catch(() => {})

    initializeMfa()
  }, [])

  async function initializeMfa() {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/mfa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === "MFA already enabled") {
          router.push("/dashboard?mfa=enabled")
          return
        }
        setError(data.error || "Failed to initialize MFA")
        setLoading(false)
        return
      }

      setSecret(data.secret)
      setQrCode(data.qr_code)
      setBackupCodes(data.backup_codes)
      setStep("verify")
    } catch {
      setError("Failed to initialize MFA. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (token.length !== 6) {
      setError("Please enter the 6-digit code from your authenticator app")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ token, secret }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Invalid code. Please try again.")
        setLoading(false)
        return
      }

      setStep("complete")
    } catch {
      setError("Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function copyBackupCodes() {
    const codesText = backupCodes.join("\n")
    await navigator.clipboard.writeText(codesText)
    setCopiedCodes(true)
    setTimeout(() => setCopiedCodes(false), 2000)
  }

  if (loading && step === "setup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "complete") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">MFA Enabled Successfully</CardTitle>
            <CardDescription>Your account is now protected with two-factor authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Important:</strong> Save your backup codes in a secure location.
                They can be used to access your account if you lose your authenticator device.
              </p>
            </div>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Set up Two-Factor Authentication</CardTitle>
          <CardDescription>
            {step === "setup"
              ? "Initializing MFA setup..."
              : "Scan the QR code with your authenticator app, then enter the 6-digit code"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {step === "verify" && (
            <>
              <div className="text-center">
                <img src={qrCode} alt="MFA QR Code" className="mx-auto mb-4 border rounded-lg p-2 bg-white" />
                <p className="text-sm text-muted-foreground">
                  Can't scan? Enter this secret manually:
                </p>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{secret}</code>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">6-digit code</label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full text-center text-2xl tracking-widest"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              <Button className="w-full" onClick={handleVerify} disabled={loading || token.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Verify & Enable"}
              </Button>

              <div className="border-t pt-6">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Backup Codes
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Save these codes in a secure place. Each code can be used once if you lose access to your authenticator.
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto p-3 bg-muted rounded-lg font-mono text-xs">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{i + 1}.</span>
                      <code>{code}</code>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={copyBackupCodes}>
                  {copiedCodes ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Codes
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}