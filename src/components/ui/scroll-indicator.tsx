"use client"

import { useState, useEffect } from "react"

interface ScrollIndicatorProps {
  position?: "top" | "bottom" | "right"
  className?: string
}

export function ScrollIndicator({ position = "top", className }: ScrollIndicatorProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const winScroll =
        document.body.scrollTop || document.documentElement.scrollTop
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight
      setProgress((winScroll / height) * 100)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () =>
      window.removeEventListener("scroll", onScroll)
  }, [])

  const trackClass =
    position === "right"
      ? "fixed right-0 top-0 h-full w-1"
      : "fixed top-0 left-0 w-full h-1"

  const barClass = "h-full bg-primary transition-all duration-100 origin-left"

  return (
    <div className={`${trackClass} ${className ?? ""}`}>
      <div className={`${barClass} w-[${progress}%]`} />
    </div>
  )
}