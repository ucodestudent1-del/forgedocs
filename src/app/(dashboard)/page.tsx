"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  File,
  FileSpreadsheet,
  Clock,
  User,
  Lock,
  Plus,
} from "lucide-react"

const DOC_TYPE_ICONS: Record<string, React.ElementType> = {
  pdf: File,
  docx: File,
  xlsx: FileSpreadsheet,
  pptx: File,
  txt: FileText,
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/documents?limit=10")
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Manage your documents and templates</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Documents" value={documents.length} icon={FileText} change="+12%" />
        <StatCard title="Templates" value={0} icon={File} change="0%" />
        <StatCard title="Storage Used" value="0 MB" icon={File} change="0%" />
        <StatCard title="Pending Jobs" value={0} icon={Clock} change="0%" />
      </div>

      {/* Recent documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 animate-pulse rounded-lg bg-card p-6">
            <div className="h-4 bg-muted w-3/4 rounded mb-4" />
            <div className="h-4 bg-muted w-1/2 rounded" />
          </div>
        ) : documents.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <h3 className="font-medium">No documents yet</h3>
            <p>Create your first document to get started.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, change }: { title: string; value: string | number; icon: React.ElementType; change: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{change} from last month</p>
      </CardContent>
    </Card>
  )
}

function DocCard({ doc }: { doc: any }) {
  const Icon = DOC_TYPE_ICONS[doc.mime_type?.split("/").pop() || "txt"] || FileText
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{doc.title}</h3>
            <p className="text-xs text-muted-foreground">{doc.description || "No description"}</p>
          </div>
        </div>
        <Badge variant="outline">{doc.version}</Badge>
      </CardHeader>
      <CardFooter className="pt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>You</span>
          </div>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(doc.updated_at).toLocaleDateString()}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
