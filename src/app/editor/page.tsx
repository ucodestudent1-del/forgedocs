"use client"

import { useState, useEffect } from "react"
import { SimpleEditor } from "@/components/editor/simple-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Download, Share2 } from "lucide-react"

export default function EditorPage() {
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

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
      setContent(data.document?.content || "")
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!documentId) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/export`)
      const data = await res.json()
      if (data.download_url) {
        window.location.href = data.download_url
      }
    } catch (e) {
      console.error("Download failed:", e)
    } finally {
      setDownloading(false)
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
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm font-medium">{documentId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleDownload}
                        disabled={downloading}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {downloading ? "Downloading…" : "Download"}
                      </Button>
                      <Button
                        onClick={() => {
                          const url = new URL(window.location.href)
                          url.searchParams.set("id", "")
                          window.location.href = url.toString()
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Share2 className="h-4 w-4" />
                        New Document
                      </Button>
                    </div>
                  </div>
                  <SimpleEditor documentId={documentId as string} content={content} onChange={setContent} />
                </div>
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