"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, File, FileSpreadsheet, Search, Plus } from "lucide-react"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  async function fetchDocuments() {
    try {
      const params = new URLSearchParams({ search, limit: "50" })
      const res = await fetch(`/api/documents?${params}`)
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchDocuments()
  }, [search])

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">All your documents</p>
        </div>
        <Button className="flex items-center gap-2" disabled>
          <Plus className="h-4 w-4" />
          New Document
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-96"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="grid grid-cols-12">
            <div className="col-span-6">Title</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-1">Status</div>
          </div>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-6 animate-pulse rounded-lg bg-card">
              <div className="h-4 bg-muted w-1/3 rounded mb-2" />
              <div className="h-4 bg-muted w-1/4 rounded mb-2" />
              <div className="h-4 bg-muted w-1/6 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No documents found</p>
            </div>
          ) : (
            filtered.map((doc) => (
              <div key={doc.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-accent/50 transition-colors group cursor-pointer" onClick={() => {
                window.location.href = `/editor?id=${doc.id}`
              }}>
                <div className="col-span-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <DocIcon mime={doc.mime_type} />
                    </div>
                    <span className="font-medium">{doc.title}</span>
                  </div>
                </div>
                <div className="col-span-3">
                  <Badge variant="outline">{doc.mime_type?.split("/").pop()?.toUpperCase() || "DOC"}</Badge>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {new Date(doc.updated_at).toLocaleDateString()}
                </div>
                <div className="col-span-1 text-sm">
                  <Badge variant="secondary">{doc.version}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function DocIcon({ mime }: { mime: string }) {
  const ext = mime?.split("/").pop() || "txt"
  const Icons: Record<string, React.ElementType> = {
    pdf: File,
    docx: File,
    xlsx: FileSpreadsheet,
    txt: FileText,
  }
  const Icon = Icons[ext] || FileText
  return <Icon className="h-5 w-5" />
}
