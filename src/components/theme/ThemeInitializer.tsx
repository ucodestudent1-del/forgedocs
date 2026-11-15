"use client"

import { useEffect } from "react"

export function ThemeInitializer() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme")
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      let shouldBeDark = false
      if (stored === "dark") shouldBeDark = true
      else if (stored === "light") shouldBeDark = false
      else if (stored === "system" || stored === null) shouldBeDark = prefersDark
      document.documentElement.classList.toggle("dark", shouldBeDark)
    } catch (e) {
      // localStorage may be unavailable in private browsing
    }
  }, [])
  return null
}
