"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { generateSecret, generateQrCode, getTotpUri, verifyToken, generateBackupCodes } from "@/lib/mfa"
import { Shield, AlertTriangle, CheckCircle2, Mail, QrCode, Key } from "lucide-react"

interface BackupCode {
  code: string
  used: boolean
}

export default function MfaSetupPage() {
  const [step, setStep] = useState<"enable" | "verify" | "backup">("enable")
  const [secret, setSecret] = useState("")
  const [qrCode, setQrCode] = useState("")
  const [token, setToken] = useState("")
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setEmail(user.email || "")
    } catch {
      // ignore
    }
  }

  const handleEnable = async () => {
    setLoading(true)
    try {
      const mfaSecret = generateSecret()
      const uri = getTotpUri(mfaSecret, email || "user@example.com")
      const qr = await generateQrCode(uri)
      const codes = generateBackupCodes()
      setSecret(mfaSecret)
      setQrCode(qr)
      setBackupCodes(codes.map((code) => ({ code, used: false })))
      setStep("verify")
    } catch {
      toast({ title: "Failed to setup 2FA", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!token) {
      toast({ title: "Please enter the 6-digit code", variant: "destructive" })
      return
    }
    const valid = verifyToken(secret, token)
    if (!valid) {
      toast({ title: "Invalid code. Please try again.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.updateUser({
        data: { mfa_enabled: true, mfa_secret: secret },
      })
      if (error) {
        toast({ title: error.message, variant: "destructive" })
        return
      }
      setStep("backup")
      toast({ title: "Two-factor authentication enabled", variant: "success" })
    } catch {
      toast({ title: "Failed to enable 2FA", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDone = () => {
    router.push("/dashboard/settings")
    router.refresh()
  }

  if (step === "enable") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <CardTitle>Enable Two-Factor Authentication</CardTitle>
            </div>
            <CardDescription>Scan the QR code with your authenticator app to add ForgeDocs to your 2FA app.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleEnable} disabled={loading} className="w-full">
              {loading ? <Mail className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Setup 2FA
            </Button>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link href="/settings">
                <Mail className="h-4 w-4 mr-2" />
                Back to Settings
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verify your authenticator app</CardTitle>
            <CardDescription>Enter the 6-digit code from your authenticator app to verify 2FA is working.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-muted rounded-xl flex items-center justify-center mb-4">
                <img src={qrCode} alt="QR Code for 2FA setup" className="w-full h-full" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Or enter this setup key manually:</p>
                <Input
                  type="text"
                  value={secret}
                  readOnly
                  className="w-full text-center font-mono text-xs bg-background border-0 focus:ring-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">6-Digit Code</Label>
              <Input
                id="token"
                type="text"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full text-center text-lg font-mono"
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button onClick={handleVerify} disabled={loading || token.length !== 6} className="w-full">
              {loading ? <Mail className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Verify & Enable
            </Button>
            <Button variant="outline" onClick={() => setStep("enable")} className="w-full">
              Go back
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // backup step
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <CardTitle>2FA enabled</CardTitle>
          </div>
          <CardDescription>Save your backup codes. You can use them to access your account if you lose your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <div key={i} className="p-2 bg-muted rounded-lg text-center text-xs font-mono text-foreground break-all">
                {code.code}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Download, print, or copy these codes somewhere safe. Each code can only be used once.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleDone} className="w-full">
            <Key className="h-4 w-4 mr-2" />
            I've saved my codes
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}