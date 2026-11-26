"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
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
  const { toast } = useToast()
  const [editorContent, setEditorContent] = useState(content)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [formatting, setFormatting] = useState({ bold: false, italic: false, underline: false })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setEditorContent(content)
  }, [content])

  useEffect(() => {
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrf_token))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (editorContent !== content) {
      setDirty(true)
    }
  }, [editorContent, content])

  const performSave = async (): Promise<void> => {
    if (!documentId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ content: editorContent }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Save failed: ${res.status}`)
      }
      const data = await res.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setLastSaved(new Date().toISOString())
      setDirty(false)
    } catch (e: unknown) {
      console.error("Save failed", e)
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
    await performSave()
  }

  useEffect(() => {
    if (!dirty || !documentId) return
    autosaveTimer.current = setTimeout(() => {
      performSave()
    }, 2000)
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
      }
    }
  }, [dirty, documentId, editorContent])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value)
    onChange?.(e.target.value)
    detectFormatting(e.target.value)
  }

  const detectFormatting = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const textBefore = text.slice(0, start)
    setFormatting({
      bold: (textBefore.match(/\*\*/g) || []).length % 2 === 1,
      italic: (textBefore.match(/\*/g) || []).length % 2 === 1,
      underline: (textBefore.match(/__/g) || []).length % 2 === 1,
    })
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
      <div
        role="toolbar"
        aria-label="Editor formatting toolbar"
        className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-background/50 z-10"
      >
        <button
          onClick={() => wrapSelection("**", "**")}
          className={`p-1.5 rounded transition-colors ${formatting.bold ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          aria-label="Bold"
          title="Bold"
          aria-pressed={formatting.bold}
        >
          <Bold className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => wrapSelection("*")}
          className={`p-1.5 rounded transition-colors ${formatting.italic ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          aria-label="Italic"
          title="Italic"
          aria-pressed={formatting.italic}
        >
          <Italic className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => wrapSelection("__", "__")}
          className={`p-1.5 rounded transition-colors ${formatting.underline ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          aria-label="Underline"
          title="Underline"
          aria-pressed={formatting.underline}
        >
          <Underline className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={() => insertAtCursor("\n- ")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          aria-label="Unordered list"
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => insertAtCursor("\n1. ")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          aria-label="Ordered list"
        >
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={() => {
            const url = window.prompt("Enter image URL")
            if (url) insertAtCursor(`![Image](${url})`)
          }}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          aria-label="Insert image"
          title="Image"
        >
          <Image className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => {
            const text = window.prompt("Enter link text")
            const url = window.prompt("Enter URL")
            if (text && url) insertAtCursor(`[${text}](${url})`)
          }}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          aria-label="Insert link"
          title="Link"
        >
          <Link className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="ml-auto" />
        <span
          id="editor-char-count"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          {editorContent.length} chars
        </span>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto p-4">
        <label
          id="editor-textarea-label"
          htmlFor="editor-textarea"
          className="sr-only"
        >
          Document content
        </label>
        <textarea
          id="editor-textarea"
          ref={textareaRef}
          value={editorContent}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full h-full bg-background text-foreground border-none outline-none resize-none font-sans text-sm leading-relaxed"
          spellCheck={true}
          aria-describedby="editor-char-count"
        />
      </div>

      {!readOnly && (
        <div className="px-4 py-2 border-t bg-background/50 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Markdown supported</span>
            {dirty && (
              <span className="flex items-center gap-1 text-warning-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-warning-foreground animate-pulse" aria-hidden="true" />
                Unsaved changes
              </span>
            )}
            {lastSaved && (
              <span className="flex items-center gap-1">
                Last saved {new Date(lastSaved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={saving || !dirty}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Save className="h-3 w-3 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
