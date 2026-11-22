"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { verifyToken } from "@/lib/mfa"
import { Shield, AlertTriangle, ArrowLeft, Mail } from "lucide-react"

export default function MfaVerifyPage() {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleVerify = async () => {
    if (!token) {
      toast({ title: "Please enter the 6-digit code", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.user_metadata?.mfa_secret) {
        toast({ title: "2FA not configured. Please set up 2FA first.", variant: "destructive" })
        return
      }
      const valid = verifyToken(user.user_metadata.mfa_secret, token)
      if (!valid) {
        toast({ title: "Invalid code. Please try again.", variant: "destructive" })
        return
      }
      toast({ title: "2FA verification successful", variant: "success" })
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast({ title: "Verification failed. Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle>Verify Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
            <Button onClick={handleVerify} disabled={loading || token.length !== 6} className="w-full">
              {loading ? <Mail className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Verify
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard/settings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}