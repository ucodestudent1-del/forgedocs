export function getClientIdentifier(request: Request): string {
  // Prefer API key ID for per-key rate limiting (most granular)
  const apiKeyId = request.headers.get("x-api-key-id")
  if (apiKeyId) {
    return `apikey:${apiKeyId}`
  }

  // Fall back to authenticated user context (set by middleware for API keys via x-api-user-id)
  const apiUserId = request.headers.get("x-api-user-id")
  if (apiUserId) {
    return `user:${apiUserId}`
  }

  // Fall back to IP for session-based and unauthenticated clients
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")
  return `ip:${forwarded || realIp || "unknown"}`
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null
  }
  const realIp = request.headers.get("x-real-ip")
  return realIp ?? null
}
