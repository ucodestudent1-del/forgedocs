"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface Props {
  children?: React.ReactNode
  className?: string
}

export function Sheet({ className, children }: Props) {
  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col", className)}>
      {children}
    </div>
  )
}

export function SheetContent({ className, children }: Props) {
  return (
    <div className={cn("flex-1 bg-background border border-b", className)}>
      {children}
    </div>
  )
}

export function SheetHeader({ className, children }: Props) {
  return (
    <div className={cn("flex flex-col space-y-1.5 px-6 pt-6", className)}>
      {children}
    </div>
  )
}

export function SheetTitle({ className, children }: Props) {
  return (
    <h2 className={cn("text-xl font-semibold leading-none tracking-tight", className)}>
      {children}
    </h2>
  )
}

export function SheetTrigger({ className, children }: Props) {
  return (
    <button className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", className)}>
      {children}
    </button>
  )
}

export function SheetSeparator({ className }: Props) {
  return (
    <div className={cn("h-[1px] w-full bg-border flex-1 shrink-0", className)} />
  )
}

export function SheetBody({ className, children }: Props) {
  return (
    <div className={cn("p-6", className)}>{children}</div>
  )
}

export function SheetFooter({ className, children }: Props) {
  return (
    <div className={cn("p-4 border-t bg-border/50", className)}>{children}</div>
  )
}
