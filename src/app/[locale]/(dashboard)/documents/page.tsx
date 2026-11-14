"use client"

import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, File, FileSpreadsheet, Search, Plus } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  async function fetchDocuments() {
    try {
      const params = new URLSearchParams({ search, limit: "50" })
      const res = await fetch(`/api/documents?${params}`)
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to load documents", variant: "destructive" })
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

  const handleCreateDocument = () => {
    toast({ title: "Creating document...", variant: "info" })
    window.location.href = "/document-generator"
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Documents"
        description="All your documents"
        action={<Button className="flex items-center gap-2" onClick={handleCreateDocument}>
          <Plus className="h-4 w-4" />
          New Document
        </Button>}
      />

      <div className="relative">
        <label htmlFor="document-search" className="sr-only">Search documents</label>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="document-search"
          type="search"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-96"
        />
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="grid grid-cols-12">
              <div className="col-span-6">Title</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Action</div>
            </div>
        </div>
        <div className="divide-y overflow-x-auto">
          {loading ? (
            <div className="p-6 animate-pulse rounded-lg bg-card min-w-[600px]">
              <div className="h-4 bg-muted w-1/3 rounded mb-2" />
              <div className="h-4 bg-muted w-1/4 rounded mb-2" />
              <div className="h-4 bg-muted w-1/6 rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground min-w-[600px]">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No documents found</p>
              <Button
                className="mt-4"
                onClick={handleCreateDocument}
              >
                Create Document
              </Button>
            </div>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc.id}
                className="grid grid-cols-12 items-center px-4 py-3 hover:bg-accent/50 transition-colors group cursor-pointer min-w-[600px]"
                onClick={() => {
                  window.location.href = `/editor?id=${doc.id}`
                }}
              >
                <div className="col-span-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <DocIcon mime={doc.mime_type} />
                    </div>
                    <span className="font-medium truncate">{doc.title}</span>
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
                <div className="col-span-1">
                  <a
                    href={`/reader/${doc.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary hover:underline flex items-center gap-1 w-auto inline-block px-3 py-1.5 border border-input rounded-md hover:bg-accent transition-colors"
                  >
                    Read
                  </a>
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
