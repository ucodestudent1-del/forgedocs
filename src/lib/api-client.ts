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

// Request deduplication cache - prevents duplicate concurrent requests
const pendingRequests = new Map<string, Promise<Response>>()
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds
const MAX_CACHE_SIZE = 500

function evictExpired() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      cache.delete(key)
    }
  }
  // Enforce max size by removing oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE)
    for (const [key] of toRemove) {
      cache.delete(key)
    }
  }
}

function getCacheKey(input: RequestInfo | URL, init?: RequestInit): string {
  const method = init?.method || "GET"
  const body = init?.body ? JSON.stringify(init.body) : ""
  return `${method}:${input}:${body}`
}

function getCached(key: string): any | null {
  evictExpired()
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  cache.delete(key)
  return null
}

function setCached(key: string, data: any): void {
  evictExpired()
  cache.set(key, { data, timestamp: Date.now() })
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

export async function fetchJson(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  // Deduplicate GET requests
  const isGet = !init || init.method === "GET" || init.method === undefined
  const cacheKey = isGet ? getCacheKey(input, init) : null

  if (cacheKey && cache.has(cacheKey)) {
    const cached = getCached(cacheKey)
    if (cached !== null) {
      return { ok: true, status: 200, data: cached, error: undefined }
    }
  }

  // Deduplicate in-flight requests
  if (cacheKey && pendingRequests.has(cacheKey)) {
    const res = await pendingRequests.get(cacheKey)!
    let data: any = null
    try { data = await res.json() } catch {}
    return { ok: res.ok, status: res.status, data, error: res.ok ? undefined : `HTTP ${res.status}` }
  }

  try {
    const res = await apiFetch(input, init)
    let data: any = null
    try {
      data = await res.json()
    } catch {
      data = null
    }

    // Cache successful GET responses
    if (cacheKey && res.ok) {
      const promise = Promise.resolve(res)
      pendingRequests.set(cacheKey, promise)
      setCached(cacheKey, data)
      // Remove from pending after resolution
      promise.finally(() => pendingRequests.delete(cacheKey))
    }

    return { ok: res.ok, status: res.status, data, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (err) {
    await handleUnauthorized()
    return { ok: false, status: 0, data: null, error: err instanceof Error ? err.message : "Request failed" }
  }
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
