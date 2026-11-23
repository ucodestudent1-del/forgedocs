"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  File,
  FileText,
  FileSpreadsheet,
  Star,
  Archive,
  Eye,
  Edit,
  Download,
  Copy,
  Trash2,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"
import { RenameDialog } from "@/components/documents/RenameDialog"

const DOC_TYPE_ICONS: Record<string, React.ElementType> = {
  pdf: File,
  docx: File,
  xlsx: FileSpreadsheet,
  pptx: File,
  txt: FileText,
}

interface DocumentRowProps {
  doc: {
    id: string
    title: string
    mime_type: string
    file_size: number
    updated_at: string
    is_pinned: boolean
    is_archived: boolean
    parent_id?: string | null
  }
  formatFileSize: (bytes: number) => string
  onDocumentChange?: () => void
}

export const DocumentRow = React.memo(function DocumentRow({
  doc,
  formatFileSize,
  onDocumentChange,
}: DocumentRowProps) {
  const Icon = DOC_TYPE_ICONS[doc.mime_type?.split("/").pop() || "txt"] || FileText
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const { toast } = useToast()

  async function handleDelete() {
    if (!confirm(`Delete "${doc.title}"?`)) return

    try {
      const res = await apiFetch(`/api/documents/${doc.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Delete failed")
      }
      toast({ title: "Document deleted", variant: "success" })
      onDocumentChange?.()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Delete failed", variant: "destructive" })
    }
  }

  async function handleDuplicate() {
    try {
      const res = await apiFetch(`/api/documents/${doc.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Duplicate failed")
      }
      toast({ title: "Document duplicated", variant: "success" })
      onDocumentChange?.()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Duplicate failed", variant: "destructive" })
    }
  }

  async function handleArchive() {
    try {
      const res = await apiFetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !doc.is_archived }),
      })
      if (!res.ok) throw new Error("Archive toggle failed")
      toast({ title: doc.is_archived ? "Document unarchived" : "Document archived", variant: "success" })
      onDocumentChange?.()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Archive toggle failed", variant: "destructive" })
    }
  }

  const triggerButton = (
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
  )

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group">
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{doc.title}</span>
          {doc.is_pinned && <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
          {doc.is_archived && <Archive className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          Updated {new Date(doc.updated_at).toLocaleDateString()} · {formatFileSize(doc.file_size)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/reader/${doc.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/editor?id=${doc.id}`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleArchive}
              className={doc.is_archived ? "text-green-600" : "text-destructive"}
            >
              {doc.is_archived ? (
                <Archive className="h-4 w-4 mr-2" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              {doc.is_archived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/api/documents/${doc.id}/export`}>
            <Download className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {showRenameDialog && (
        <RenameDialog
          documentId={doc.id}
          currentTitle={doc.title}
          onRename={onDocumentChange}
          onClose={() => setShowRenameDialog(false)}
        />
      )}
    </div>
  )
})

DocumentRow.displayName = "DocumentRow"
