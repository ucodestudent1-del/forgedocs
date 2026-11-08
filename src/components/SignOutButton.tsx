"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    try {
      await fetch("/api/auth/login", { method: "DELETE" })
    } catch {
      // ignore
    }
    router.push("/auth/login")
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  )
}
