"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Shield, ArrowLeft, Lock } from "lucide-react"

export default function MfaDisablePage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [disabling, setDisabling] = useState(false)
  const { toast } = useToast()

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setDisabling(true)
    try {
      // Fetch CSRF token
      const csrfRes = await fetch("/api/csrf")
      const csrfData = await csrfRes.json()

      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfData.csrf_token ? { "X-CSRF-Token": csrfData.csrf_token } : {}),
        },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: err.error || "Failed to disable 2FA", variant: "destructive" })
        return
      }
      toast({ title: "Two-factor authentication disabled", variant: "success" })
      router.push("/settings")
    } catch {
      toast({ title: "Failed to disable 2FA", variant: "destructive" })
    } finally {
      setDisabling(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <Link href="/settings">
        <Button variant="outline" size="sm" className="flex items-center gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Disable Two-Factor Authentication</CardTitle>
              <CardDescription>Enter your 6-digit authentication code to disable 2FA.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDisable} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Authentication Code</Label>
              <Input
                id="token"
                type="text"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full"
                autoFocus
                required
              />
            </div>
            <Button type="submit" disabled={disabling || token.length !== 6} className="w-full">
              {disabling ? "Disabling..." : <><Lock className="h-4 w-4 mr-2" /> Disable 2FA</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}