"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

let authHandlers: Array<(authenticated: boolean) => void> = []

export function onAuthChange(handler: (authenticated: boolean) => void) {
  authHandlers.push(handler)
  return () => {
    authHandlers = authHandlers.filter((h) => h !== handler)
  }
}

function notifyAuthChange(authenticated: boolean) {
  authHandlers.forEach((h) => h(authenticated))
}

async function handleUnauthorized() {
  notifyAuthChange(false)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("forge:unauthorized"))
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const isFormData = init?.body instanceof FormData
  const headers: HeadersInit = isFormData
    ? {}
    : { "Content-Type": "application/json", ...(init?.headers || {}) }

  const res = await fetch(input, {
    ...init,
    credentials: "include",
    headers,
  })

  if (res.status === 401) {
    await handleUnauthorized()
  }

  return res
}

export function useAuth() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useAuthState()

  return { authenticated, router }
}

function useAuthState() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthChange(setAuthenticated)
    return unsubscribe
  }, [])

  return [authenticated, setAuthenticated] as [boolean | null, (v: boolean) => void]
}
