"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import * as Y from "yjs"

interface YjsProviderProps {
  documentId: string
  userName: string
  userColor: string
  onUpdate: (content: string) => void
  value: string
}

export function YjsProvider({
  documentId,
  userName,
  userColor,
  onUpdate,
  value,
}: YjsProviderProps) {
  const [connected, setConnected] = useState(false)
  const docRef = useRef<Y.Doc | null>(null)
  const textRef = useRef<Y.Text | null>(null)

  useEffect(() => {
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText("content")
    docRef.current = ydoc
    textRef.current = ytext
    setConnected(true)

    ytext.observe((event: Y.YTextEvent) => {
      const content = ytext.toString()
      onUpdate(content)
    })

    // Initialize content from prop
    if (ytext.toString() !== value) {
      ytext.insert(0, value)
    }

    return () => {
      ydoc.destroy()
    }
  }, [documentId, onUpdate, value])

  const applyUpdate = useCallback((update: Uint8Array) => {
    if (docRef.current) {
      Y.applyUpdate(docRef.current, update)
    }
  }, [])

  const sendUpdate = useCallback(() => {
    if (textRef.current) {
      const content = textRef.current.toString()
      if (content !== value) {
        textRef.current.delete(0, textRef.current.length)
        textRef.current.insert(0, value)
      }
    }
  }, [value])

  useEffect(() => {
    sendUpdate()
  }, [sendUpdate, value])

  return null
}

export { Y }