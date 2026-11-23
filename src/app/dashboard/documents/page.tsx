"use client"

import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, File, FileSpreadsheet, Search, Plus, Trash2, FolderOpen, Download, Share2, Archive, MoreHorizontal, Check, List, Grid, Archive as ArchiveIcon, Star } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { DocumentRow } from "@/components/dashboard/DocumentRow"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [showArchived, setShowArchived] = useState(false)
  const { toast } = useToast()

  async function fetchDocuments() {
    try {
      const params = new URLSearchParams({ 
        search, 
        limit: "50",
        archived: showArchived ? "true" : "false",
      })
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
  }, [search, showArchived])

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

  const toggleArchive = () => {
    setShowArchived(!showArchived)
    setSelectedIds([])
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={showArchived ? "Archived Documents" : "Documents"}
        description={showArchived ? "Your archived documents" : "All your documents"}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleArchive} className={showArchived ? "bg-primary/10 text-primary" : ""}>
              {showArchived ? <ArchiveIcon className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>
            <Button className="flex items-center gap-2" onClick={handleCreateDocument}>
              <Plus className="h-4 w-4" />
              New Document
            </Button>
          </div>
        }
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

      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant={viewMode === "list" ? "outline" : "ghost"}
          size="icon"
          className="h-9 w-9"
          onClick={() => setViewMode("list")}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "grid" ? "outline" : "ghost"}
          size="icon"
          className="h-9 w-9"
          onClick={() => setViewMode("grid")}
          aria-label="Grid view"
        >
          <Grid className="h-4 w-4" />
        </Button>
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
                  Export
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
        {viewMode === "list" ? (
          <div className="list-view-container">
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
                <div className="col-span-1">Version</div>
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
                  <p>{showArchived ? "No archived documents found" : "No documents found"}</p>
                  {!showArchived && (
                    <Button
                      className="mt-4"
                      onClick={handleCreateDocument}
                    >
                      Create Document
                    </Button>
                  )}
                </div>
              ) : (
                filtered.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    formatFileSize={(bytes: number) => {
                      if (bytes === 0) return "0 B"
                      if (bytes < 1024) return `${bytes} B`
                      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
                      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    }}
                    onDocumentChange={fetchDocuments}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="grid-view-container">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {loading ? (
                <div className="col-span-4 p-6 animate-pulse rounded-lg bg-card">
                  <div className="h-48 bg-muted rounded mb-4" />
                  <div className="h-4 bg-muted w-3/4 rounded mb-2" />
                  <div className="h-3 bg-muted w-1/2 rounded" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="col-span-4 p-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{showArchived ? "No archived documents found" : "No documents found"}</p>
                  {!showArchived && (
                    <Button
                      className="mt-4"
                      onClick={handleCreateDocument}
                    >
                      Create Document
                    </Button>
                  )}
                </div>
              ) : (
                filtered.map((doc) => (
                  <div
                    key={doc.id}
                    className={cn(
                      "group relative flex flex-col h-64 rounded-lg border border-input hover:border-primary/50 transition-colors cursor-pointer",
                      selectedIds.includes(doc.id) && "ring-1 ring-primary bg-primary/5"
                    )}
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target instanceof HTMLInputElement || target.closest("button, label")) return
                      window.location.href = `/editor?id=${doc.id}`
                    }}
                  >
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(doc.id)}
                        onCheckedChange={(checked) => toggleSelect(doc.id)}
                      />
                    </div>
                    <div className="h-32 rounded-t-lg bg-muted flex items-center justify-center mb-3">
                      <DocIcon mime={doc.mime_type} className="h-12 w-12" />
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{doc.title}</span>
                        {doc.is_pinned && <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                        {doc.is_archived && <ArchiveIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{doc.mime_type?.split("/").pop()?.toUpperCase() || "DOC"}</span>
                        <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2 border-t">
                        <Badge variant="secondary" className="text-[10px]">{doc.version}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild onClick={(e) => { e.stopPropagation(); window.location.href = `/api/documents/${doc.id}/export` }}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DocIcon({ mime, className }: { mime: string; className?: string }) {
  const ext = mime?.split("/").pop() || "txt"
  const Icons: Record<string, React.ElementType> = {
    pdf: File,
    docx: File,
    xlsx: FileSpreadsheet,
    txt: FileText,
  }
  const Icon = Icons[ext] || FileText
  return <Icon className={cn("h-5 w-5", className)} />
}
