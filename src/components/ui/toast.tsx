"use client"

import * as React from "react"
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id?: string
  title: string
  description?: string
  variant?: "default" | "destructive" | "success" | "info"
  duration?: number
}

interface ToastState {
  toasts: ToastProps[]
}

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

export function useToast() {
  const [state, setState] = React.useState<ToastState>({ toasts: [] })

  const toast = React.useCallback(
    ({ title, description, variant = "default", duration = TOAST_REMOVE_DELAY }: ToastProps) => {
      const id = Math.random().toString(36).substring(2, 9)

      setState((prev) => {
        const newToasts = [...prev.toasts, { id, title, description, variant }]
        if (newToasts.length > TOAST_LIMIT) {
          newToasts.shift()
        }
        return { toasts: newToasts }
      })

      if (duration > 0) {
        setTimeout(() => {
          setState((prev) => ({
            toasts: prev.toasts.filter((t) => t.id !== id),
          }))
        }, duration)
      }

      return id
    },
    []
  )

  const dismiss = React.useCallback((id: string) => {
    setState((prev) => ({
      toasts: prev.toasts.filter((t) => t.id !== id),
    }))
  }, [])

  return { toast, dismiss, toasts: state.toasts }
}

const VariantIcons: Record<NonNullable<ToastProps["variant"]>, React.ElementType> = {
  default: Info,
  destructive: AlertTriangle,
  success: CheckCircle,
  info: Info,
}

const VariantColors: Record<NonNullable<ToastProps["variant"]>, string> = {
  default: "bg-primary text-primary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  success: "bg-success text-success-foreground",
  info: "bg-primary text-primary-foreground",
}

export function Toast({ toast, onDismiss, className }: { toast: ToastProps; onDismiss?: () => void; className?: string }) {
  const { title, description, variant = "default" } = toast
  const Icon = VariantIcons[variant] || VariantIcons.default

  return (
    <div
      className={cn(
        "flex items-start p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-2 duration-300",
        VariantColors[variant],
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div className="ml-3 space-y-1">
        <h4 className="font-medium">{title}</h4>
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="ml-auto flex items-center rounded-md p-1.5 text-current hover:bg-current/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toast, dismiss, toasts } = useToast()

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            toast={t}
            onDismiss={() => dismiss(t.id!)}
          />
        ))}
      </div>
      {children}
    </>
  )
}
