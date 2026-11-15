"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EmptyStateProps {
  title: string
  description?: string
  action?: { label: string; href: string }
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8", className)}>
      {icon && (
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted/50 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-md">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

EmptyState.displayName = "EmptyState"
