"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { useState } from "react"
import { ChevronLeft } from "lucide-react"

export default function AdminInviteUserPage() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const { toast } = useToast()

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setInviting(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "invite-" + crypto.randomUUID(), full_name: email }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: err.error || "Failed to invite user", variant: "destructive" })
        return
      }
      toast({ title: "User invited successfully", variant: "success" })
      setEmail("")
    } catch {
      toast({ title: "Failed to invite user", variant: "destructive" })
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Link href="/admin/users">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Users
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite User</h1>
          <p className="text-muted-foreground">Invite a new user to your workspace</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite User</CardTitle>
          <CardDescription>Enter the email address of the user you want to invite.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={inviting || !email} className="w-full">
              {inviting ? "Inviting..." : "Invite User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
