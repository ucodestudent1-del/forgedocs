"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { CollaborativePresence } from "@/components/collaboration/CollaborativePresence"
import {
  FileText,
  Save,
  Download,
  Share2,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Image,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Eraser,
  MoreHorizontal,
  ChevronDown,
  Loader2,
  Check,
  X,
  Eye,
  Pen,
  Trash2,
  Copy,
  Printer,
  Anchor,
  Superscript,
  Subscript,
  Minus,
  Users,
} from "lucide-react"

interface EditorProps {
  documentId?: string
  initialContent?: string
  readOnly?: boolean
  userName?: string | null
  userAvatarUrl?: string | null
  onSave?: (content: string) => Promise<void>
  onExport?: (format: "pdf" | "docx" | "html" | "md") => Promise<void>
}

interface ToolbarItem {
  id: string
  icon: React.ElementType
  title: string
  shortcut?: string
  format?: string
  value?: string
  action?: string
}

interface ToolbarGroup {
  name: string
  items: ToolbarItem[]
}

const TOOLBAR_GROUPS: ToolbarGroup[] = [
  {
    name: "history",
    items: [
      { id: "undo", icon: Undo, title: "Undo (Ctrl+Z)", shortcut: "Ctrl+Z" },
      { id: "redo", icon: Redo, title: "Redo (Ctrl+Y)", shortcut: "Ctrl+Y" },
    ],
  },
  {
    name: "formatting",
    items: [
      { id: "bold", icon: Bold, title: "Bold (Ctrl+B)", shortcut: "Ctrl+B", format: "bold" },
      { id: "italic", icon: Italic, title: "Italic (Ctrl+I)", shortcut: "Ctrl+I", format: "italic" },
      { id: "underline", icon: Underline, title: "Underline (Ctrl+U)", shortcut: "Ctrl+U", format: "underline" },
      { id: "strikethrough", icon: Strikethrough, title: "Strikethrough", format: "strikeThrough" },
      { id: "code", icon: Code, title: "Inline Code", format: "inlineCode" },
    ],
  },
  {
    name: "blocks",
    items: [
      { id: "heading1", icon: Heading1, title: "Heading 1", format: "heading", value: "h1" },
      { id: "heading2", icon: Heading2, title: "Heading 2", format: "heading", value: "h2" },
      { id: "heading3", icon: Heading3, title: "Heading 3", format: "heading", value: "h3" },
      { id: "paragraph", icon: FileText, title: "Paragraph", format: "paragraph" },
      { id: "quote", icon: Quote, title: "Blockquote", format: "blockquote" },
      { id: "codeBlock", icon: Code, title: "Code Block", format: "codeBlock" },
    ],
  },
  {
    name: "lists",
    items: [
      { id: "bulletList", icon: List, title: "Bullet List", format: "bulletList" },
      { id: "orderedList", icon: ListOrdered, title: "Numbered List", format: "orderedList" },
      { id: "todoList", icon: Check, title: "Task List", format: "taskList" },
    ],
  },
  {
    name: "media",
    items: [
      { id: "link", icon: Link, title: "Insert Link (Ctrl+K)", shortcut: "Ctrl+K", action: "link" },
      { id: "image", icon: Image, title: "Insert Image", action: "image" },
      { id: "table", icon: Table, title: "Insert Table", action: "table" },
      { id: "hr", icon: Minus, title: "Horizontal Rule", format: "horizontalRule" },
    ],
  },
  {
    name: "alignment",
    items: [
      { id: "alignLeft", icon: AlignLeft, title: "Align Left", format: "align", value: "left" },
      { id: "alignCenter", icon: AlignCenter, title: "Align Center", format: "align", value: "center" },
      { id: "alignRight", icon: AlignRight, title: "Align Right", format: "align", value: "right" },
      { id: "alignJustify", icon: AlignJustify, title: "Justify", format: "align", value: "justify" },
    ],
  },
  {
    name: "textStyle",
    items: [
      { id: "highlight", icon: Highlighter, title: "Highlight", format: "highlight" },
      { id: "superscript", icon: Superscript, title: "Superscript", format: "superscript" },
      { id: "subscript", icon: Subscript, title: "Subscript", format: "subscript" },
      { id: "clearFormat", icon: Eraser, title: "Clear Formatting", format: "removeFormat" },
    ],
  },
]

export function RichEditor({
  documentId,
  initialContent = "",
  readOnly = false,
  userName,
  userAvatarUrl,
  onSave,
  onExport,
}: EditorProps) {
  const [content, setContent] = useState(initialContent)
  const [title, setTitle] = useState("Untitled Document")
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [imageAlt, setImageAlt] = useState("")
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})
  const editorRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Auto-save functionality
  useEffect(() => {
    if (!documentId || !onSave || readOnly) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (content !== initialContent) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [content, documentId, initialContent, onSave, readOnly])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!documentId || !onSave || readOnly) return

    const interval = setInterval(() => {
      if (content !== initialContent) {
        handleAutoSave()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [content, documentId, initialContent, onSave, readOnly])

  // Update counts
  useEffect(() => {
    const text = editorRef.current?.innerText || ""
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
    setCharCount(text.length)
  }, [content])

  // Update active formats based on selection
  useEffect(() => {
    const updateActiveFormats = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const formats: Record<string, boolean> = {}

      // Check for various formats
      const checkFormat = (tag: string, style?: string, value?: string) => {
        let node = range.commonAncestorContainer
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode!
      while (node && node !== editorRef.current) {
        if (node.nodeName.toLowerCase() === tag) {
          if (!style || (node as HTMLElement).style[style as keyof CSSStyleDeclaration] === value) {
            return true
          }
        }
        node = node.parentNode!
      }
      return false
      }

      formats.bold = checkFormat("strong") || checkFormat("b") || document.queryCommandState("bold")
      formats.italic = checkFormat("em") || checkFormat("i") || document.queryCommandState("italic")
      formats.underline = checkFormat("u") || document.queryCommandState("underline")
      formats.strikethrough = checkFormat("s") || checkFormat("strike") || document.queryCommandState("strikeThrough")
      formats.code = checkFormat("code")
      formats.link = checkFormat("a")

      setActiveFormats(formats)
    }

    document.addEventListener("selectionchange", updateActiveFormats)
    return () => document.removeEventListener("selectionchange", updateActiveFormats)
  }, [])

  const handleAutoSave = async () => {
    if (!documentId || !onSave || saving) return
    setAutoSaving(true)
    try {
      await onSave(getEditorHTML())
      setLastSaved(new Date())
      toast({ title: "Auto-saved", variant: "success" })
    } catch (e) {
      console.error("Auto-save failed:", e)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(getEditorHTML())
      setLastSaved(new Date())
      toast({ title: "Document saved", variant: "success" })
    } catch (e) {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const getEditorHTML = () => {
    return editorRef.current?.innerHTML || ""
  }

  const setEditorHTML = (html: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html
    }
  }

  const executeFormat = (command: string, value?: string) => {
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)

    switch (command) {
      case "bold":
        wrapSelectionWithTag("strong")
        break
      case "italic":
        wrapSelectionWithTag("em")
        break
      case "underline":
        wrapSelectionWithTag("u")
        break
      case "strikeThrough":
        wrapSelectionWithTag("s")
        break
      case "inlineCode":
        wrapSelectionWithTag("code")
        break
      case "heading":
        if (value === "h1" || value === "h2" || value === "h3") {
          setBlockFormat(value)
        }
        break
      case "paragraph":
        setBlockFormat("p")
        break
      case "blockquote":
        setBlockFormat("blockquote")
        break
      case "codeBlock":
        setBlockFormat("pre")
        break
      case "bulletList":
        setListFormat("ul")
        break
      case "orderedList":
        setListFormat("ol")
        break
      case "taskList":
        insertTaskList()
        break
      case "horizontalRule":
        insertHTML("<hr>")
        break
      case "align":
        if (value) setTextAlign(value)
        break
      case "highlight":
        wrapSelectionWithTag("mark")
        break
      case "superscript":
        wrapSelectionWithTag("sup")
        break
      case "subscript":
        wrapSelectionWithTag("sub")
        break
      case "removeFormat":
        removeFormatting()
        break
      case "createLink":
        if (value) {
          createLink(value)
        }
        break
      case "insertHTML":
        if (value) {
          insertHTML(value)
        }
        break
      default:
        document.execCommand(command, false, value)
    }
    updateContent()
  }

  const updateContent = () => {
    setContent(getEditorHTML())
  }

  const wrapSelectionWithTag = (tag: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()

    if (!selectedText) return

    const element = document.createElement(tag)
    element.textContent = selectedText

    range.deleteContents()
    range.insertNode(element)
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const createLink = (url: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString() || url

    const element = document.createElement("a")
    element.href = url
    element.textContent = selectedText

    range.deleteContents()
    range.insertNode(element)
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const removeFormatting = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()

    if (!selectedText) return

    const textNode = document.createTextNode(selectedText)
    range.deleteContents()
    range.insertNode(textNode)
    range.selectNodeContents(textNode)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const setBlockFormat = (tag: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const element = document.createElement(tag)
    element.textContent = range.toString() || ""

    range.deleteContents()
    range.insertNode(element)
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const setListFormat = (tag: "ul" | "ol") => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    const lines = selectedText.split("\n").filter(Boolean)

    const list = document.createElement(tag)
    lines.forEach((line) => {
      const li = document.createElement("li")
      li.textContent = line
      list.appendChild(li)
    })

    range.deleteContents()
    range.insertNode(list)
    range.selectNodeContents(list)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const insertTaskList = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    const lines = selectedText.split("\n").filter(Boolean)

    const ul = document.createElement("ul")
    lines.forEach((line) => {
      const li = document.createElement("li")
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      li.appendChild(checkbox)
      li.appendChild(document.createTextNode(" " + line))
      ul.appendChild(li)
    })

    range.deleteContents()
    range.insertNode(ul)
    range.selectNodeContents(ul)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const setTextAlign = (align: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const element = document.createElement("div")
    element.style.textAlign = align
    element.textContent = range.toString() || ""

    range.deleteContents()
    range.insertNode(element)
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault()
          executeFormat("bold")
          break
        case "i":
          e.preventDefault()
          executeFormat("italic")
          break
        case "u":
          e.preventDefault()
          executeFormat("underline")
          break
        case "k":
          e.preventDefault()
          setShowLinkDialog(true)
          break
        case "s":
          e.preventDefault()
          handleSave()
          break
        case "z":
          if (e.shiftKey) {
            e.preventDefault()
            executeFormat("redo")
          } else {
            e.preventDefault()
            executeFormat("undo")
          }
          break
        case "y":
          e.preventDefault()
          executeFormat("redo")
          break
      }
    }
  }

  const insertLink = () => {
    if (linkUrl) {
      executeFormat("createLink", linkUrl)
      const link = editorRef.current?.querySelector('a[href="' + linkUrl + '"]')
      if (link && linkText) link.textContent = linkText
      setShowLinkDialog(false)
      setLinkUrl("")
      setLinkText("")
    }
  }

  const insertImage = () => {
    if (imageUrl) {
      const img = document.createElement("img")
      img.src = imageUrl
      img.alt = imageAlt || "Inserted image"
      img.style.maxWidth = "100%"
      img.style.height = "auto"
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(img)
        range.collapse(false)
      }
      setShowImageDialog(false)
      setImageUrl("")
      setImageAlt("")
      updateContent()
    }
  }

  const insertTable = (rows = 3, cols = 3) => {
    let html = "<table class='w-full border-collapse m-4'><thead><tr>"
    for (let i = 0; i < cols; i++) html += "<th class='border border-gray-300 p-2 bg-gray-100'>Header</th>"
    html += "</tr></thead><tbody>"
    for (let r = 0; r < rows; r++) {
      html += "<tr>"
      for (let c = 0; c < cols; c++) html += "<td class='border border-gray-300 p-2'>Cell</td>"
      html += "</tr>"
    }
    html += "</tbody></table>"
    insertHTML(html)
  }

  const insertHTML = (html: string) => {
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      const fragment = range.createContextualFragment(html)
      range.insertNode(fragment)
    }
    updateContent()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
    updateContent()
  }

  const handleExport = async (format: "pdf" | "docx" | "html" | "md") => {
    if (onExport) {
      await onExport(format)
    } else if (format === "html" || format === "md") {
      // Fallback: download as HTML or Markdown
      const plainText = content.replace(/<[^>]*>/g, "")
      const fileContent = format === "md" ? plainText : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${content}</body></html>`
      const blob = new Blob([fileContent], { type: format === "md" ? "text/markdown" : "text/html" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/\s+/g, "-")}.${format === "md" ? "md" : "html"}`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      // PDF/DOCX require server-side conversion - redirect to export endpoint
      if (documentId) {
        window.location.href = `/api/documents/${documentId}/export?format=${format}`
      } else {
        toast({ title: "Export not available", variant: "destructive" })
      }
    }
  }

  const formatTitle = (html: string) => html

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Toolbar */}
      <header className="border-b bg-background/50 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center justify-between h-12 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Input
              ref={titleRef}
              id="editor-title-label"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title..."
              className="w-64 bg-transparent border-none focus:ring-0 text-lg font-medium placeholder:text-muted-foreground"
              readOnly={readOnly}
            />
            {documentId && (
              <Badge variant="secondary" className="text-xs">
                {documentId.slice(0, 8)}
              </Badge>
            )}
            {documentId && userName && (
              <CollaborativePresence
                documentId={documentId}
                userName={userName}
                userAvatarUrl={userAvatarUrl}
              />
            )}
          </div>

          <div className="flex items-center gap-1" role="toolbar" aria-label="Document formatting toolbar">
            {TOOLBAR_GROUPS.map((group) => (
              <ToolbarGroup
                key={group.name}
                group={group}
                readOnly={readOnly}
                executeFormat={executeFormat}
                activeFormats={activeFormats}
              />
            ))}

            <Separator className="h-6 mx-2" />

            {/* Link Dialog Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className={activeFormats.link ? "bg-primary/10 text-primary" : ""}
              onClick={() => setShowLinkDialog(true)}
              disabled={readOnly}
              title="Insert Link (Ctrl+K)"
              aria-label="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="More options" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleExport("html")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("md")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("docx")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as DOCX
                </DropdownMenuItem>
                <Separator />
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(content)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy HTML
                </DropdownMenuItem>
                {documentId && (
                  <DropdownMenuItem onClick={() => window.location.href = `/reader/${documentId}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View in Reader
                  </DropdownMenuItem>
                )}
                <Separator />
                <DropdownMenuItem className="text-destructive" onClick={() => {
                  if (confirm("Clear all content?")) {
                    setEditorHTML("")
                    updateContent()
                  }
                }}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Content
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
            <span>{wordCount} words · {charCount} characters</span>
            <span className="flex items-center gap-1">
              {autoSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              {lastSaved ? (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  Last saved {lastSaved.toLocaleTimeString()}
                </>
              ) : (
                <span>Not saved</span>
              )}
            </span>
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            <Button
              onClick={handleSave}
              disabled={saving || autoSaving || readOnly}
              size="sm"
              className="ml-auto"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      {/* Editor Area */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={updateContent}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="prose prose-lg max-w-none min-h-[500px] p-6 bg-white rounded-lg shadow-sm border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            spellCheck={true}
            data-placeholder={readOnly ? "" : "Start writing..."}
            role="textbox"
            aria-multiline="true"
            aria-label="Document content"
            suppressHydrationWarning
          />

          {/* Live region for screen reader announcements */}
          <div
            id="editor-content-live"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {content.length > 0 ? `${wordCount} words, ${charCount} characters` : "Empty document"}
            {Object.entries(activeFormats).some(([, active]) => active) ? ` · Active formats: ${Object.entries(activeFormats).filter(([, active]) => active).map(([format]) => format).join(", ")}` : ""}
          </div>

          {/* Link Dialog */}
          {showLinkDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowLinkDialog(false)}>
              <div className="bg-card rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
                <div className="space-y-3">
                  <Input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Link text (optional)"
                  />
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setShowLinkDialog(false); setLinkUrl(""); setLinkText("") }}>
                    Cancel
                  </Button>
                  <Button onClick={insertLink} disabled={!linkUrl}>
                    Insert
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Image Dialog */}
          {showImageDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImageDialog(false)}>
              <div className="bg-card rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
                <div className="space-y-3">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.png"
                    autoFocus
                  />
                  <Input
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="Alt text (optional)"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setShowImageDialog(false); setImageUrl(""); setImageAlt("") }}>
                    Cancel
                  </Button>
                  <Button onClick={insertImage} disabled={!imageUrl}>
                    Insert
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ToolbarGroup({
  group,
  readOnly,
  executeFormat,
  activeFormats,
}: {
  group: ToolbarGroup
  readOnly: boolean
  executeFormat: (command: string, value?: string) => void
  activeFormats: Record<string, boolean>
}) {
  return (
    <div className="flex items-center gap-1">
      {group.items.map((item) => {
        const isActive = group.name === "formatting" || group.name === "blocks" || group.name === "alignment" || group.name === "textStyle"
          ? activeFormats[item.id] === true
          : false
        return (
          <Button
            key={item.id}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (item.action === "link") {
                // Handled by parent
              } else if (item.action === "image") {
                // Handled by parent
              } else if (item.action === "table") {
                executeFormat("insertHTML", "<table><tr><td>Cell</td></tr></table>")
              } else if (item.format) {
                if (item.value) {
                  executeFormat(item.format, item.value)
                } else {
                  executeFormat(item.format)
                }
              }
            }}
            disabled={readOnly}
            title={item.title + (item.shortcut ? ` (${item.shortcut})` : "")}
            aria-label={item.title}
            aria-pressed={isActive || undefined}
            tabIndex={0}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        )
      })}
      {group.name !== "textStyle" && <Separator className="h-6 mx-1" aria-hidden="true" />}
    </div>
  )
}