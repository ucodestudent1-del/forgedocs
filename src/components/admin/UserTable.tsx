"use client"

import { useState, useEffect } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Badge } from "@/components/ui/badge"
import { Shield, Mail, Edit, Trash2, MoreHorizontal, Users, Search } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Input } from "@/components/ui/input"

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  last_login_at: string | null
  mfa_enabled: boolean
}

export function UserTable() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at, last_login_at, mfa_enabled")
        .order("created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  function getRoleBadge(role: string) {
    if (role === "admin") return <Badge variant="default">Admin</Badge>
    if (role === "user") return <Badge variant="secondary">User</Badge>
    return <Badge variant="outline">Viewer</Badge>
  }

  if (loading) {
    return <div className="text-center py-8"><p className="text-muted-foreground">Loading users...</p></div>
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10 pr-4"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No users found</p>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between py-3 px-4 border rounded-lg bg-card">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {getRoleBadge(user.role)}
                <Badge variant={user.mfa_enabled ? "default" : "secondary"}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.mfa_enabled ? "MFA" : "No MFA"}
                </Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(user.created_at), "MMM d, yyyy")}</span>
                <span className="text-xs text-muted-foreground">
                  {user.last_login_at ? format(new Date(user.last_login_at), "MMM d, yyyy") : "Never"}
                </span>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/users/${user.id}`} className="text-primary hover:underline text-sm">
                    View
                  </Link>
                  <Link href={`/admin/users/${user.id}/edit`} className="text-primary hover:underline text-sm">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}