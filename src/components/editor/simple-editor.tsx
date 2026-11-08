"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Save, Undo, Redo, Bold, Italic, Underline, List, ListOrdered, Image, Link, Maximize, MoreHorizontal } from "lucide-react"

interface SimpleEditorProps {
  documentId: string
  content?: string
  onChange?: (content: string) => void
  readOnly?: boolean
  placeholder?: string
}

export function SimpleEditor({
  documentId,
  content = "",
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
}: SimpleEditorProps) {
  const [editorContent, setEditorContent] = useState(content)
  const [saving, setSaving] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditorContent(content)
  }, [content])

  useEffect(() => {
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrf_token))
      .catch(() => {})
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value)
    onChange?.(e.target.value)
  }

  const handleSave = async () => {
    if (!documentId) return
    setSaving(true)
    try {
      await fetch(`/api/documents/${documentId}/content`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ content: editorContent }),
      })
    } catch (e) {
      console.error("Save failed", e)
    } finally {
      setSaving(false)
    }
  }

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = editorContent.slice(0, start) + text + editorContent.slice(end)
    setEditorContent(newValue)
    onChange?.(newValue)
    textarea.selectionStart = start + text.length
    textarea.selectionEnd = start + text.length
  }

  const wrapSelection = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = editorContent.slice(start, end)
    const newValue = editorContent.slice(0, start) + prefix + selected + suffix + editorContent.slice(end)
    setEditorContent(newValue)
    onChange?.(newValue)
    textarea.selectionStart = start + prefix.length
    textarea.selectionEnd = start + prefix.length + selected.length
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-background/50 z-10">
        <button
          onClick={() => wrapSelection("**", "**")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => wrapSelection("*")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => wrapSelection("__", "__")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={() => insertAtCursor("\n- ")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertAtCursor("\n1. ")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={() => {
            const url = window.prompt("Enter image URL")
            if (url) insertAtCursor(`![Image](${url})`)
          }}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Image"
        >
          <Image className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const text = window.prompt("Link text")
            const url = window.prompt("URL")
            if (text && url) insertAtCursor(`[${text}](${url})`)
          }}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Link"
        >
          <Link className="h-4 w-4" />
        </button>
        <div className="ml-auto" />
        <span className="text-xs text-muted-foreground">
          {editorContent.length} chars
        </span>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto p-4">
        <textarea
          ref={textareaRef}
          value={editorContent}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full h-full bg-background text-foreground border-none outline-none resize-none font-sans text-sm leading-relaxed"
          spellCheck={true}
        />
      </div>

      {!readOnly && (
        <div className="px-4 py-2 border-t bg-background/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>Markdown supported</span>
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? <Save className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />} Save
          </Button>
        </div>
      )}
    </div>
  )
}
