"use client"

import { useState, useEffect } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Calendar, ExternalLink, Search, DollarSign, XCircle, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface SubscriptionRow {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
  tier: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export function SubscriptionTable() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  async function fetchSubscriptions() {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSubscriptions(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = subscriptions.filter((s) => {
    const matchesSearch = s.user_id.toLowerCase().includes(search.toLowerCase())
    const matchesTier = tierFilter === "all" || s.tier === tierFilter
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesSearch && matchesTier && matchesStatus
  })

  function getTierBadge(tier: string) {
    if (tier === "free") return <Badge variant="secondary">{tier.toUpperCase()}</Badge>
    if (tier === "pro") return <Badge variant="default">{tier.toUpperCase()}</Badge>
    return <Badge variant="outline">{tier.toUpperCase()}</Badge>
  }

  function getStatusBadge(status: string) {
    if (status === "active") return <Badge variant="default">{status}</Badge>
    if (status === "past_due") return <Badge variant="destructive">{status.replace("_", " ")}</Badge>
    if (status === "trialing") return <Badge variant="outline">{status}</Badge>
    return <Badge variant="secondary">{status}</Badge>
  }

  if (loading) {
    return <div className="text-center py-8"><p className="text-muted-foreground">Loading subscriptions...</p></div>
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search subscriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10 pr-4 w-full border rounded-md px-3"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="trialing">Trialing</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No subscriptions found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between py-3 px-4 border rounded-lg bg-card">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{sub.tier.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground truncate">User: {sub.user_id.slice(0, 8)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {getTierBadge(sub.tier)}
                {getStatusBadge(sub.status)}
                <span className="text-xs text-muted-foreground">
                  {sub.current_period_start ? format(new Date(sub.current_period_start), "MMM d, yyyy") : "N/A"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {sub.current_period_end ? format(new Date(sub.current_period_end), "MMM d, yyyy") : "N/A"}
                </span>
                <Badge variant={sub.cancel_at_period_end ? "destructive" : "secondary"}>
                  {sub.cancel_at_period_end ? "Auto-Cancel" : "Renews"}
                </Badge>
                <span className="font-mono text-xs">{sub.stripe_subscription_id || "N/A"}</span>
                <div className="flex items-center gap-2">
                  <Link href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Stripe
                  </Link>
                  <Link href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Customer
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