"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  variant?: "text" | "circle" | "block" | "button"
}

export function Skeleton({
  className,
  width,
  height,
  variant = "text",
}: SkeletonProps) {
  const baseStyles = "animate-pulse rounded-md bg-muted"

  const variantStyles: Record<string, string> = {
    text: "h-4 w-full",
    circle: "h-16 w-16 rounded-full",
    block: "h-full w-full",
    button: "h-9 w-24",
  }

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{ width: typeof width === "number" ? `${width}px` : width, height }}
    />
  )
}

Skeleton.displayName = "Skeleton"
