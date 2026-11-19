"use client"

import { useEffect, useCallback } from "react"

interface HotkeyOptions {
  preventDefault?: boolean
  stopPropagation?: boolean
  target?: HTMLElement | Document
}

export function useHotkey(
  keys: string[],
  callback: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {}
) {
  const { preventDefault = true, stopPropagation = false, target = document } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const activeElement = document.activeElement
      const isInputFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.tagName === "SELECT" ||
        (activeElement as HTMLElement)?.isContentEditable === true

      if (isInputFocused) return

      const pressedKeys = []
      if (event.metaKey || event.ctrlKey) pressedKeys.push("mod")
      if (event.shiftKey) pressedKeys.push("shift")
      if (event.altKey) pressedKeys.push("alt")
      if (event.key.length === 1) {
        pressedKeys.push(event.key.toLowerCase())
      } else {
        pressedKeys.push(event.key.toLowerCase())
      }

      const pressed = pressedKeys.join("+")
      const matched = keys.some((key) => key.toLowerCase() === pressed)

      if (matched) {
        if (preventDefault) event.preventDefault()
        if (stopPropagation) event.stopPropagation()
        callback(event)
      }
    },
    [keys, callback, preventDefault, stopPropagation]
  )

  useEffect(() => {
    const handler = (e: Event) => handleKeyDown(e as KeyboardEvent)
    target.addEventListener("keydown", handler)
    return () => target.removeEventListener("keydown", handler)
  }, [handleKeyDown, target])
}

// Convenience hook for common shortcuts
export function useGlobalHotkeys(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const activeElement = document.activeElement
      const isInputFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.tagName === "SELECT" ||
        (activeElement as HTMLElement)?.isContentEditable === true

      if (isInputFocused) return

      const pressedKeys = []
      if (event.metaKey || event.ctrlKey) pressedKeys.push("mod")
      if (event.shiftKey) pressedKeys.push("shift")
      if (event.altKey) pressedKeys.push("alt")
      if (event.key.length === 1) {
        pressedKeys.push(event.key.toLowerCase())
      } else {
        pressedKeys.push(event.key.toLowerCase())
      }

      const pressed = pressedKeys.join("+")
      const handler = shortcuts[pressed.toLowerCase()]
      if (handler) {
        event.preventDefault()
        handler()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}