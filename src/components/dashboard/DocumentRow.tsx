"use client"

import React from "react"
import { File, FileText, FileSpreadsheet, Star, Archive, Eye, Edit, Download } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
  }
  formatFileSize: (bytes: number) => string
}

export const DocumentRow = React.memo(function DocumentRow({ doc, formatFileSize }: DocumentRowProps) {
  const Icon = DOC_TYPE_ICONS[doc.mime_type?.split("/").pop() || "txt"] || FileText

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
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/api/documents/${doc.id}/export`}>
            <Download className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
})

DocumentRow.displayName = "DocumentRow"
