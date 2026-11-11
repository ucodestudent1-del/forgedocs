"use client"

import * as React from "react"
import { ToastProvider, Toast as ToastComponent } from "@/components/ui/toast"
import { useToast as useRealToast } from "@/components/ui/toast"

export interface ToastProps {
  title: string
  description?: string
  variant?: "default" | "destructive" | "success" | "info"
}

export function useToast() {
  const { toast, dismiss, toasts } = useRealToast()
  return { toast, dismiss, toasts }
}

export function Toast({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

export { ToastComponent as ToastElement }
