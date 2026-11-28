import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto"
import { getPooledRouteClient } from "@/lib/supabase"
import { checkRateLimit } from "@/lib/rate-limiter"

export const API_KEY_PREFIX = "sk_live"
export const API_KEY_LENGTH = 32 // random bytes

export function generateApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const randomPart = randomBytes(API_KEY_LENGTH).toString("hex")
  const rawKey = `${API_KEY_PREFIX}_${randomPart}`
  const keyPrefix = rawKey.slice(0, 11) // sk_live_xxxx
  const keyHash = createHash("sha256").update(rawKey).digest("hex")
  return { rawKey, keyPrefix, keyHash }
}

export function hashApiKey(rawKey: string): string {
  const pepper = process.env.API_KEY_PEPPER
  if (!pepper) {
    throw new Error("API_KEY_PEPPER is not configured")
  }
  return createHmac("sha256", pepper).update(rawKey).digest("hex")
}

export function compareApiKey(rawKey: string, hash: string): boolean {
  const providedHash = hashApiKey(rawKey)
  if (providedHash.length !== hash.length) return false
  return timingSafeEqual(Buffer.from(providedHash), Buffer.from(hash))
}

export interface ApiKeyRow {
  id: string
  user_id: string
  name: string
  key_prefix: string
  key_hash: string
  permissions: Record<string, unknown>
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const supabase = await getPooledRouteClient()
  const { data } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, permissions, last_used_at, expires_at, revoked_at, created_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
  return (data ?? []) as ApiKeyRow[]
}

export async function createApiKey(
  userId: string,
  name: string,
  permissions: Record<string, unknown> = {},
  expiresAt: string | null = null
): Promise<{ rawKey: string; key: ApiKeyRow } | { error: string }> {
  const supabase = await getPooledRouteClient()
  const { rawKey, keyPrefix, keyHash } = generateApiKey()

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      permissions,
      expires_at: expiresAt,
    })
    .select("id, name, key_prefix, permissions, last_used_at, expires_at, revoked_at, created_at")
    .single()

  if (error) {
    return { error: error.message }
  }

  return { rawKey, key: data as ApiKeyRow }
}

export async function revokeApiKey(userId: string, keyId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await getPooledRouteClient()
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId)
    .is("revoked_at", null)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function validateApiKey(rawKey: string): Promise<{ userId: string; key: ApiKeyRow } | null> {
  // Always hash and compare in constant time — no early return on prefix check
  // to prevent timing-based key format enumeration attacks.
  const keyHash = hashApiKey(rawKey)

  const supabase = await getPooledRouteClient()

  // Look up by key_hash directly (O(1)) instead of iterating all keys sharing
  // a plaintext prefix. This eliminates prefix-enumeration brute-force.
  const { data } = await supabase
    .from("api_keys")
    .select("id, user_id, name, key_hash, key_prefix, permissions, expires_at, revoked_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single()

  const key = (data ?? null) as ApiKeyRow | null

  if (!key) {
    return null
  }

  // Check expiry
  const isExpired = key.expires_at && new Date(key.expires_at) < new Date()
  if (isExpired) {
    return null
  }

  // Constant-time comparison as defense in depth
  if (!compareApiKey(rawKey, key.key_hash)) {
    return null
  }

  // Update last_used_at (non-blocking) for the matched key only
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)

  return { userId: key.user_id, key }
}

export interface ApiKeyPermissionCheck {
  allowed: boolean
  required: string[]
  missing: string[]
}

/**
 * Checks whether the API key's permissions grant all required permissions.
 * Permissions use resource:action format (e.g., "documents:read", "conversion:write").
 * A wildcard permission (e.g., "documents:*") grants all actions on a resource.
 * An empty permissions object means no access (fail closed).
 */
export function checkApiKeyPermissions(
  keyPermissions: Record<string, unknown>,
  required: string[]
): ApiKeyPermissionCheck {
  const missing: string[] = []

  for (const perm of required) {
    const [resource, action] = perm.split(":")

    // Exact match
    if (keyPermissions[perm] === true) continue

    // Wildcard resource:* grants all actions on that resource
    if (keyPermissions[`${resource}:*`] === true) continue

    missing.push(perm)
  }

  return {
    allowed: missing.length === 0,
    required,
    missing,
  }
}

export function requiresApiKeyPermission(pathname: string): string[] | null {
  // Map API path patterns to required permissions
  const permissionMap: Record<string, string[] | null> = {
    // Documents (read)
    "/api/documents": ["documents:read"],
    "/api/documents/": ["documents:read"],
    "/api/files": ["documents:read"],
    "/api/files/": ["documents:read"],
    "/api/templates": ["documents:read"],
    "/api/templates/": ["documents:read"],

    // Document mutations (write)
    "/api/document-generator": ["documents:write"],
    "/api/document-generator/": ["documents:write"],

    // Conversion (read + write)
    "/api/conversion": ["conversion:read", "conversion:write"],
    "/api/conversion/": ["conversion:read", "conversion:write"],
    "/api/conversion/batch": ["conversion:read", "conversion:write"],
    "/api/conversion/batch/": ["conversion:read", "conversion:write"],

    // OCR (read + write)
    "/api/ocr": ["conversion:read", "conversion:write"],
    "/api/ocr/": ["conversion:read", "conversion:write"],

    // PDF tools (read + write)
    "/api/pdf-tools": ["conversion:read", "conversion:write"],
    "/api/pdf-tools/": ["conversion:read", "conversion:write"],

    // Billing (read-only for API keys by default)
    "/api/billing": ["billing:read"],
    "/api/billing/": ["billing:read"],
    "/api/usage": ["billing:read"],
    "/api/usage/": ["billing:read"],

    // Activity / audit (read)
    "/api/activity": ["audit:read"],
    "/api/activity/": ["audit:read"],
    "/api/audit": ["audit:read"],
    "/api/audit/": ["audit:read"],

    // Storage (read + write)
    "/api/storage": ["documents:read", "documents:write"],
    "/api/storage/": ["documents:read", "documents:write"],

    // E-signatures (read + write)
    "/api/e-signatures": ["documents:read", "documents:write"],
    "/api/e-signatures/": ["documents:read", "documents:write"],

    // AI (read + write)
    "/api/ai": ["ai:read", "ai:write"],
    "/api/ai/": ["ai:read", "ai:write"],

    // Admin (requires admin role + admin:* permission)
    "/api/admin": ["admin:*"],
    "/api/admin/": ["admin:*"],

    // Auth routes are NOT accessible via API key - return null to skip permission check entirely
    // This means API keys cannot access auth routes
    "/api/auth": null,
    "/api/auth/": null,
    "/api/auth/saml": null,
    "/api/auth/saml/": null,

    // Custom domains are session-based
    "/api/custom-domains": null,
    "/api/custom-domains/": null,

    // Webhooks are session-based
    "/api/webhooks": null,
    "/api/webhooks/": null,

    // Integrations are session-based
    "/api/integrations": null,
    "/api/integrations/": null,

    // MFA is session-based
    "/api/auth/mfa": null,
    "/api/auth/mfa/": null,

    // Onboarding is session-based
    "/api/onboarding": null,
    "/api/onboarding/": null,

    // CSRF token is session-based
    "/api/csrf": null,
    "/api/csrf/": null,

    // Health is public (no permission required)
    "/api/health": [],
    "/api/health/": [],
  }

  // Pre-sorted permission patterns (longest first) for longest-prefix matching.
  // Built once at module load to avoid re-sorting on every request.
  const SORTED_PERMISSION_PATTERNS: Array<[string, string[] | null]> = Object.entries(
    permissionMap,
  ).sort((a, b) => b[0].length - a[0].length)

  // Find the most specific match (longest prefix). Patterns are pre-sorted longest first.
  for (const [pattern, perms] of SORTED_PERMISSION_PATTERNS) {
    if (pathname.startsWith(pattern)) {
      return perms
    }
  }

  // No specific rule — deny access by default (fail closed for new endpoints).
  // Returning a permission that no key can possess ensures new endpoints
  // are inaccessible via API key until explicitly allowed.
  return ["unknown:endpoint"]
}

// Read user context from API key header (set by middleware) or Supabase session
export async function getApiUserId(req: Request): Promise<string | null> {
  // API key auth: middleware sets x-api-user-id header
  const apiUserId = req.headers.get("x-api-user-id")
  if (apiUserId) {
    return apiUserId
  }

  // Session auth: fall back to Supabase
  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
