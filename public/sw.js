const CACHE_NAME = "forgedocs-v1"
const OFFLINE_URL = "/offline"
const DOCUMENT_CACHE = "forgedocs-documents-v1"

// Assets to cache on install for offline shell
const SHELL_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/favicon.svg",
]

// Install event — cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS)
    }),
  )
  self.skipWaiting()
})

// Activate event — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DOCUMENT_CACHE)
          .map((name) => caches.delete(name)),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event — serve from cache, fall back to network, then offline page
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") return

  // Skip API requests — don't cache API calls
  if (url.pathname.startsWith("/api/")) return

  // Skip Supabase and other external requests
  if (!url.origin.startsWith(self.location.origin)) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached
      }
      return fetch(request)
        .then((response) => {
          // Cache successful GET responses for shell assets
          if (response.ok && SHELL_ASSETS.includes(url.pathname)) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }
          return response
        })
        .catch(() => {
          // Offline fallback for HTML navigations
          if (request.destination === "document" || request.mode === "navigate") {
            return caches.match(OFFLINE_URL)
          }
          return new Response("Offline", { status: 503, statusText: "Offline" })
        })
    }),
  )
})

// Message event — skip waiting and claim clients
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting()
  }
})
