"use client"

import * as React from "react"

export interface ToastProps {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastProps) => {
      console.log("Toast:", { title, description, variant })
    },
  }
}
