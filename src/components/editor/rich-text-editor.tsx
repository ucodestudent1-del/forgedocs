"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Table from "@tiptap/extension-table"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import { useSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"

interface RichTextEditorProps {
  documentId: string | null
  initialContent?: any
  onChange?: (content: any) => void
  readOnly?: boolean
  height?: string
}

export function RichTextEditor({
  documentId,
  initialContent,
  onChange,
  readOnly = false,
  height = "auto",
}: RichTextEditorProps) {
  const [content, setContent] = useState<any>(initialContent || null)
  const [isReady, setIsReady] = useState(false)
  const { toast } = useToast()
  const supabase = useSupabaseClient()
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  const editor = useEditor(
    [
      StarterKit,
      Image.extend({
        addAttributes() {
          return {
            src: {
              default: null,
              renderHTML: (attributes) => ({
                src: attributes.src,
              }),
            },
          }
        },
      }),
      Table,
      Placeholder,
      Link,
    ],
    {
      element: document.createElement("div"),
      content: initialContent || null,
      editable: !readOnly,
      onUpdate: ({ editor }) => {
        const newContent = editor.getJSON()
        setContent(newContent)
        onChange?.(newContent)
      },
      onFocus: () => setIsReady(true),
      extensions: [],
    },
    [readOnly, initialContent]
  )

  // Autosave with debounce
  useEffect(() => {
    if (!editor || !documentId || !content) return

    if (saveTimeout.current) clearTimeout(saveTimeout.current)

    saveTimeout.current = setTimeout(async () => {
      try {
        await fetch(`/api/documents/${documentId}/content`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })
      } catch (err) {
        toast({
          title: "Save failed",
          description: "Unable to autosave your document",
          variant: "destructive",
        })
      }
    }, 2000)

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [editor, documentId, content, toast])

  if (!editor || !isReady) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading editor…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]" style={{ height }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-background/50 z-10">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Bold"
        >
          <b>B</b>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Italic"
        >
          <i>I</i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Underline"
        >
          <u>U</u>
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="p-1.5 rounded hover:bg-muted transition-colors"
        >
          <span>‣</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="p-1.5 rounded hover:bg-muted transition-colors"
        >
          <span>1.</span>
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={() => {
            const url = window.prompt("Enter URL")
            if (url) editor.chain().focus().setLink({ url }).run()
          }}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Link"
        >
          🔗
        </button>
        <button
          onClick={() => {
            const src = window.prompt("Enter image URL")
            if (src) editor.chain().focus().setImage({ src }).run()
          }}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Image"
        >
          🖼️
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Code block"
        >
          Code
        </button>
        <div className="ml-auto" />
        <span className="text-xs text-muted-foreground">
          Autosaving…
        </span>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="min-h-[calc(100vh-200px)] p-6" />
      </div>

      {!readOnly && (
        <div className="px-3 py-2 border-t bg-background/50 text-xs text-muted-foreground">
          Press Ctrl/Cmd + Enter to save · Autosave enabled
        </div>
      )}
    </div>
  )
}
