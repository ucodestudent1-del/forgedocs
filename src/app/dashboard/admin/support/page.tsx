import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Mail, Clock, AlertTriangle, CheckCircle2, Search, Filter, Download, Ticket } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { getPooledRouteClient } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

interface SupportTicket {
  id: string
  email: string
  full_name: string | null
  company: string | null
  subject: string | null
  message: string | null
  status: string
  source: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

async function fetchSupportTickets(search: string, statusFilter: string): Promise<SupportTicket[]> {
  const supabase = await getPooledRouteClient()

  let query = supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(`email.ilike.%${search}%,subject.ilike.%${search}%,message.ilike.%${search}%`)
  }

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch support tickets:", error)
    return []
  }

  return (data || []) as SupportTicket[]
}

export default async function AdminSupportPage() {
  const headersList = await headers()
  const referer = headersList.get("referer") || ""
  const redirectUrl = referer ? new URL(referer).pathname + new URL(referer).search : "/dashboard"

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin"].includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-4">403</h1>
          <p className="mt-4 text-lg text-muted-foreground mb-8">
            Access Denied — Admin privileges required.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Link className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              <Ticket className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Link>
        </div>
      </div>
    )
  }

  // Read search and status from URL (server components can't use useSearchParams directly
  // without Suspense, so we read from headers or default)
  const search = ""
  const statusFilter = "all"

  const tickets = await fetchSupportTickets(search, statusFilter)

  const openCount = tickets.filter((t) => t.status === "open").length
  const pendingCount = tickets.filter((t) => t.status === "pending").length
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length
  const closedCount = tickets.filter((t) => t.status === "closed").length

  function getStatusBadge(status: string) {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>
      case "pending":
        return <Badge variant="warning">Pending</Badge>
      case "resolved":
        return <Badge variant="default">Resolved</Badge>
      case "closed":
        return <Badge variant="secondary">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Management</h1>
          <p className="text-muted-foreground">View and manage support tickets</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const csv = [
                "id,email,full_name,subject,status,source,created_at",
                ...tickets.map(
                  (t) =>
                    `${t.id},${t.email},${t.full_name ?? ""},${t.subject ?? ""},${t.status},${t.source ?? ""},${t.created_at}`
                ),
              ].join("\n")
              const url = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
              window.location.href = url
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Open" value={openCount} icon={AlertTriangle} color="red" />
        <StatCard title="Pending" value={pendingCount} icon={Clock} color="amber" />
        <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle2} color="green" />
        <StatCard title="Closed" value={closedCount} icon={Ticket} color="gray" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tickets..."
                  className="h-10 pl-10 pr-4 w-full md:w-80"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="px-3 py-2 border rounded-md text-sm"
                defaultValue={statusFilter}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No support tickets found</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between py-3 px-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Ticket className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{ticket.subject || "No subject"}</p>
                      <p className="text-xs text-muted-foreground truncate">{ticket.email}</p>
                      {ticket.company && (
                        <p className="text-xs text-muted-foreground truncate">{ticket.company}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {getStatusBadge(ticket.status)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy")}
                    </span>
                    <Link href={`/admin/support/${ticket.id}`} className="text-primary hover:underline text-sm">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ElementType
  color: string
}) {
  const colors: Record<string, string> = {
    red: "bg-destructive/10 text-destructive",
    amber: "bg-warning/10 text-warning",
    green: "bg-success/10 text-success",
    gray: "bg-muted/10 text-muted-foreground",
  }
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${colors[color] || colors.gray}`} />
      </CardContent>
    </Card>
  )
}
