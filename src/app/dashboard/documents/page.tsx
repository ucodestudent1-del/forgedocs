"use client"

import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, File, FileSpreadsheet, Search, Plus, Trash2, FolderOpen, Download, Share2, Archive, MoreHorizontal, Check } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  async function fetchDocuments() {
    try {
      const params = new URLSearchParams({ search, limit: "50" })
      const res = await apiFetch(`/api/documents?${params}`)
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

  const selectAll = React.useCallback(() => {
    setSelectedIds(filtered.map(d => d.id))
  }, [filtered])

  const clearSelection = React.useCallback(() => {
    setSelectedIds([])
  }, [])

  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(id => id !== id) : [...prev, id])
  }, [])

  const handleBulkAction = async (action: string, extraData?: any) => {
    if (selectedIds.length === 0) return
    setBulkActionLoading(action)
    try {
      const res = await apiFetch("/api/documents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds, ...extraData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Bulk action failed")
      
      toast({ 
        title: `${action} completed`, 
        description: `${data.summary.succeeded}/${data.summary.total} succeeded`,
        variant: data.summary.failed === 0 ? "default" : "destructive"
      })
      
      if (action === "delete") {
        setDocuments(prev => prev.filter(d => !selectedIds.includes(d.id)))
      }
      clearSelection()
    } catch (e) {
      toast({ title: "Bulk action failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
    } finally {
      setBulkActionLoading(null)
    }
  }

  const handleCreateDocument = () => {
    toast({ title: "Creating document...", variant: "info" })
    window.location.href = "/dashboard/document-generator"
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

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary rounded-lg mb-4 animate-slide-down">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-primary-foreground">
              {selectedIds.length} document{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
                <DropdownMenuItem onClick={() => handleBulkAction("delete")} disabled={bulkActionLoading !== null}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("archive")} disabled={bulkActionLoading !== null}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("unarchive")} disabled={bulkActionLoading !== null}>
                  <Archive className="h-4 w-4 mr-2" />
                  Unarchive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction("export")} disabled={bulkActionLoading !== null}>
                  <Download className="h-4 w-4 mr-2" />
                  Export (ZIP)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("share")} disabled={bulkActionLoading !== null}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction("move")} disabled={bulkActionLoading !== null}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Move to folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearSelection} className="text-muted-foreground">
                  <Check className="h-4 w-4 mr-2" />
                  Clear selection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button variant="ghost" size="sm" onClick={clearSelection} disabled={bulkActionLoading !== null}>
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-hidden overflow-y-auto rounded-md border">
        <div className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="grid grid-cols-12">
              <div className="col-span-1">
                <Checkbox
                  checked={selectedIds.length === filtered.length && filtered.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < filtered.length}
                  onCheckedChange={selectedIds.length === filtered.length ? clearSelection : selectAll}
                  disabled={loading}
                />
              </div>
              <div className="col-span-5">Title</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1">Status</div>
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
                className={cn(
                  "grid grid-cols-12 items-center px-4 py-3 hover:bg-accent/50 transition-colors group min-w-[600px]",
                  selectedIds.includes(doc.id) && "bg-primary/5 ring-1 ring-primary"
                )}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target instanceof HTMLInputElement || target.closest("a, button, label")) return
                  window.location.href = `/editor?id=${doc.id}`
                }}
              >
                <div className="col-span-1 flex items-center justify-center">
                  <Checkbox
                    checked={selectedIds.includes(doc.id)}
                    onCheckedChange={(checked) => toggleSelect(doc.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="col-span-5">
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
