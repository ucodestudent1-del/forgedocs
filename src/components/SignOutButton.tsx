"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { useToast } from "@/components/ui/use-toast"

export function SignOutButton() {
  const router = useRouter()
  const { toast } = useToast()

  async function handleSignOut() {
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast({ title: error.message, variant: "destructive" })
        return
      }
    } catch {
      // Ignore unexpected errors — still clear local state and redirect
    }
    router.push("/login")
    router.refresh()
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
