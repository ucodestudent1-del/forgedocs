"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, CreditCard, FileText, AlertTriangle, TrendingUp, Clock, Download, Search, Shield, Database, User } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { AuditLogsTable } from "@/components/admin/AuditLogsTable"

export default function AdminAuditLogsPage() {

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">View system audit trail</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const csv = "id,user_id,action,entity_type,entity_id,created_at\n1,user-001,created,document,doc-001,2024-01-01T10:00:00Z\n2,user-001,updated,document,doc-001,2024-01-02T11:00:00Z\n3,user-002,deleted,document,doc-002,2024-01-03T12:00:00Z"
            const url = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
            window.location.href = url
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search logs"
                  className="h-10 pl-10 pr-4 w-full md:w-80"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const csv = "id,user_id,action,entity_type,entity_id,created_at\n1,user-001,created,document,doc-001,2024-01-01T10:00:00Z\n2,user-001,updated,document,doc-001,2024-01-02T11:00:00Z\n3,user-002,deleted,document,doc-002,2024-01-03T12:00:00Z"
                const url = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
                window.location.href = url
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AuditLogsTable />
        </CardContent>
      </Card>
    </div>
  )
}