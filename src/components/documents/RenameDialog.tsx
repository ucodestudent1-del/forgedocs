"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/api-client"
import { X } from "lucide-react"

interface RenameDialogProps {
  documentId: string
  currentTitle: string
  onRename?: () => void
  onClose: () => void
}

export function RenameDialog({ documentId, currentTitle, onRename, onClose }: RenameDialogProps) {
  const [title, setTitle] = useState(currentTitle)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Rename failed")
      }
      toast({ title: "Document renamed", variant: "success" })
      onRename?.()
      onClose()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Rename failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Rename Document</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Change the document title</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            placeholder="Document title"
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Renaming..." : "Rename"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
