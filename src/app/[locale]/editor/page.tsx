"use client"

import { useState, useEffect } from "react"
import { RichEditor } from "@/components/editor/RichEditor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Download, Share2, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ScrollIndicator } from "@/components/ui/scroll-indicator"

export default function EditorPage() {
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [initialContent, setInitialContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
    const id = params.get("id")
    if (id) {
      setDocumentId(id)
      loadDocument(id)
    } else {
      setLoading(false)
    }
  }, [])

  async function loadDocument(id: string) {
    try {
      const res = await fetch(`/api/documents/${id}`)
      const data = await res.json()
      if (data.document) {
        setInitialContent(data.document.content || "")
        // If content is JSON (Lexical format), convert to HTML
        if (typeof data.document.content === "object") {
          setInitialContent(convertLexicalToHtml(data.document.content))
        }
      }
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to load document", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(htmlContent: string) {
    if (!documentId) return
    setSaving(true)
    try {
      // Get CSRF token
      const csrfRes = await fetch("/api/csrf")
      const csrfData = await csrfRes.json()

      const res = await fetch(`/api/documents/${documentId}/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrfData.csrf_token ? { "X-CSRF-Token": csrfData.csrf_token } : {}),
        },
        body: JSON.stringify({ content: htmlContent }),
      })

      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Document saved", variant: "success" })
    } catch (e) {
      console.error("Save failed:", e)
      toast({ title: "Failed to save document", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleExport(format: "pdf" | "docx" | "html" | "md") {
    if (!documentId) return

    try {
      const res = await fetch(`/api/documents/${documentId}/export?format=${format}`)
      const data = await res.json()
      if (data.download_url) {
        window.location.href = data.download_url
      } else if (data.content) {
        // Fallback: download content directly
        const blob = new Blob([data.content], { type: getMimeType(format) })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `document.${format}`
        a.click()
        URL.revokeObjectURL(url)
      }
      toast({ title: `Exported as ${format.toUpperCase()}`, variant: "success" })
    } catch (e) {
      console.error("Export failed:", e)
      toast({ title: "Export failed", variant: "destructive" })
    }
  }

  function getMimeType(format: string) {
    const types: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      html: "text/html",
      md: "text/markdown",
    }
    return types[format] || "text/plain"
  }

  function convertLexicalToHtml(lexicalContent: any): string {
    if (!lexicalContent || !lexicalContent.children) return ""

    function convertNode(node: any): string {
      switch (node.type) {
        case "paragraph":
          if (!node.children || node.children.length === 0) return "<p><br></p>"
          return `<p>${node.children.map(convertNode).join("")}</p>`
        case "text":
          let text = node.text || ""
          if (node.bold) text = `<strong>${text}</strong>`
          if (node.italic) text = `<em>${text}</em>`
          if (node.underline) text = `<u>${text}</u>`
          if (node.strikethrough) text = `<s>${text}</s>`
          if (node.code) text = `<code>${text}</code>`
          if (node.link) text = `<a href="${node.link.url}" target="_blank" rel="noopener noreferrer">${text}</a>`
          return text
        case "heading":
          const tag = `h${node.tag || 1}`
          return `<${tag}>${node.children?.map(convertNode).join("") || ""}</${tag}>`
        case "blockquote":
          return `<blockquote>${node.children?.map(convertNode).join("") || ""}</blockquote>`
        case "list":
          const listTag = node.listType === "number" ? "ol" : "ul"
          return `<${listTag}>${node.children?.map(convertNode).join("") || ""}</${listTag}>`
        case "listitem":
          return `<li>${node.children?.map(convertNode).join("") || ""}</li>`
        case "code":
          return `<pre><code>${node.children?.map(convertNode).join("") || ""}</code></pre>`
        case "link":
          return `<a href="${node.url}" target="_blank" rel="noopener noreferrer">${node.children?.map(convertNode).join("") || ""}</a>`
        case "image":
          return `<img src="${node.src}" alt="${node.alt || ""}" style="max-width:100%;height:auto;">`
        default:
          return node.children?.map(convertNode).join("") || ""
      }
    }

    return lexicalContent.children.map(convertNode).join("")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-auto relative">
        <ScrollIndicator position="right" className="opacity-50" />
        {documentId ? (
          <RichEditor
            documentId={documentId}
            initialContent={initialContent}
            onSave={handleSave}
            onExport={handleExport}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-screen text-muted-foreground">
            <FileText className="h-16 w-16 mb-4 opacity-50" />
            <h2 className="text-xl font-medium mb-2">No Document Selected</h2>
            <p className="mb-4">Select a document from the dashboard or create a new one.</p>
            <div className="flex gap-3">
              <Button asChild>
                <a href="/dashboard">
                  <FileText className="h-4 w-4 mr-2" />
                  Browse Documents
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/document-generator">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Document
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}