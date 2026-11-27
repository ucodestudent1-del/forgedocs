"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { validatePassword } from "@/lib/password"
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react"
import {
  AuthContainer,
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthPasswordInput,
  AuthButton,
  AuthLink,
  AuthOutlineButton,
} from "@/components/auth/AuthLayout"

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash")
    const type = searchParams.get("type")
    if (tokenHash && type === "recovery") {
      setTokenValid(true)
      setTokenError(null)
    } else {
      setTokenValid(false)
      setTokenError("Invalid or expired reset link. Please request a new one.")
    }
  }, [searchParams])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenValid) {
      toast({ title: tokenError || "Invalid or expired reset link. Please request a new one.", variant: "destructive" })
      return
    }
    if (!password || !confirmPassword) {
      toast({ title: "Please fill in all fields", variant: "destructive" })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" })
      return
    }
    const { valid, errors } = validatePassword(password)
    if (!valid) {
      toast({ title: errors[0] || "Password does not meet security requirements", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        toast({ title: error.message, variant: "destructive" })
        return
      }
      toast({ title: "Password reset successfully", variant: "success" })
      router.push("/login")
      router.refresh()
    } catch {
      toast({ title: "Password reset failed. Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContainer>
      <AuthCard>
        <AuthHeader title="Reset your password" description="Create a new password for your account" />
        <form onSubmit={handleReset} className="space-y-4">
          {tokenError && (
            <p className="text-xs text-destructive" role="alert">{tokenError}</p>
          )}
          <AuthPasswordInput
            id="password"
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPassword={showPassword}
            toggleShowPassword={() => setShowPassword(!showPassword)}
            required
            autoComplete="new-password"
          />
          <AuthPasswordInput
            id="confirmPassword"
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            showPassword={showPassword}
            toggleShowPassword={() => setShowPassword(!showPassword)}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            Must be 8+ characters with uppercase, lowercase, number, and special character
          </p>
          <AuthButton type="submit" loading={loading} disabled={loading || !tokenValid}>
            <Lock className="h-4 w-4 mr-2" />
            Reset password
          </AuthButton>
        </form>
        <AuthFooter>
          <AuthOutlineButton href="/login" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </AuthOutlineButton>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  )
}
