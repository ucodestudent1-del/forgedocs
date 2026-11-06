"use client"

import * as React from "react"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Save, Undo, Redo, Bold, Italic, Underline, List, ListOrdered, Image, Link, Maximize, MoreHorizontal } from "lucide-react"

export default function EditorPage() {
  const [documentId, setDocumentId] = React.useState<string | null>(null)
  const [content, setContent] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
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
      setContent(data.document?.content || null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center">Loading…</div>

  return (
    <div className="flex h-screen bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/50 z-10">
        <Button variant="outline" size="icon" onClick={() => {}}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => {}}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => {}}>
          <Underline className="h-4 w-4" />
        </Button>
        <div className="h-4 w-px bg-border mx-2" />
        <Button variant="outline" size="icon" onClick={() => {}}>
          <List className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => {}}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="h-4 w-px bg-border mx-2" />
        <Button variant="outline" size="icon" onClick={() => {}}>
          <Image className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => {}}>
          <Link className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="icon" disabled={saving} onClick={() => {}}>
          {saving ? <Save className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => {}}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => {}}>
          <Redo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => {}}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{documentId ? "Document Editor" : "New Document"}</CardTitle>
              <CardDescription>{documentId ? "Edit your document" : "Select a document to start editing"} </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px] flex flex-col">
              {documentId ? (
                <RichTextEditor documentId={documentId} initialContent={content} onChange={setContent} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileText className="h-16 w-16 mb-2 opacity-50" />
                  <p>No document selected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
