function getTrustedProxyIps(): string[] {
  return (process.env.TRUSTED_PROXY_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean)
}

function isTrustedProxy(ip: string | null): boolean {
  if (!ip) return false
  return getTrustedProxyIps().includes(ip)
}

export function getClientIdentifier(request: Request): string {
  // Prefer API key ID for per-key rate limiting (most granular, validated server-side)
  const apiKeyId = request.headers.get("x-api-key-id")
  if (apiKeyId) {
    return `apikey:${apiKeyId}`
  }

  // Fall back to authenticated user context (set by middleware for API keys via x-api-user-id)
  const apiUserId = request.headers.get("x-api-user-id")
  if (apiUserId) {
    return `user:${apiUserId}`
  }

  // Fall back to IP for session-based and unauthenticated clients.
  // X-Forwarded-For / X-Real-IP are client-supplied and easily spoofed; only trust them
  // when the immediate peer is a configured trusted proxy. Otherwise fall back to
  // "unknown" so spoofed headers cannot be used to evade rate limiting or lockout.
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  // Immediate peer address (rightmost entry of XFF, or the X-Real-IP header value)
  const peerIp = forwarded ? forwarded.split(",").pop()?.trim() : realIp ? realIp.trim() : null

  if (peerIp && isTrustedProxy(peerIp)) {
    // The client address is the leftmost XFF entry, or X-Real-IP when XFF is absent
    const clientIp = forwarded ? forwarded.split(",")[0]?.trim() : realIp?.trim()
    return `ip:${clientIp || "unknown"}`
  }

  return `ip:unknown`
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const peerIp = forwarded ? forwarded.split(",").pop()?.trim() : realIp ? realIp.trim() : null

  if (peerIp && isTrustedProxy(peerIp)) {
    return forwarded ? forwarded.split(",")[0]?.trim() || null : realIp?.trim() || null
  }

  // Do not return a spoofable header value as the client IP
  return null
}
