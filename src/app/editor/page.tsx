"use client"

import * as React from "react"
import { SimpleEditor } from "@/components/editor/simple-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Save, Undo, Redo, Plus } from "lucide-react"

export default function EditorPage() {
  const [documentId, setDocumentId] = React.useState<string | null>(null)
  const [content, setContent] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

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
      setContent(data.document?.content || "")
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center">Loading…</div>

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{documentId ? "Document Editor" : "New Document"}</CardTitle>
              <CardDescription>
                {documentId ? "Edit your document" : "Select a document to start editing"}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[600px] flex flex-col">
              {documentId ? (
                <SimpleEditor documentId={documentId} content={content} onChange={setContent} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                  <FileText className="h-16 w-16 mb-2 opacity-50" />
                  <p>No document selected</p>
                  <Button onClick={() => {}} disabled>
                    Create Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
