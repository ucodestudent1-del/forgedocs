import { createHash, randomBytes, timingSafeEqual } from "crypto"
import { getRouteClient } from "@/lib/supabase"

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
  return createHash("sha256").update(rawKey).digest("hex")
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
  const supabase = await getRouteClient()
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
  const supabase = await getRouteClient()
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
  const supabase = await getRouteClient()
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
  if (!rawKey.startsWith(`${API_KEY_PREFIX}_`)) return null

  const keyHash = hashApiKey(rawKey)
  const keyPrefix = rawKey.slice(0, 11)

  const supabase = await getRouteClient()
  const { data } = await supabase
    .from("api_keys")
    .select("id, user_id, name, key_hash, key_prefix, permissions, expires_at, revoked_at")
    .eq("key_prefix", keyPrefix)
    .is("revoked_at", null)
    .maybeSingle()

  if (!data) return null

  const key = data as ApiKeyRow

  // Check expiry
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return null
  }

  // Constant-time comparison
  if (!compareApiKey(rawKey, key.key_hash)) return null

  // Update last_used_at (non-blocking)
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)

  return { userId: key.user_id, key }
}

// Read user context from API key header (set by middleware) or Supabase session
export async function getApiUserId(req: Request): Promise<string | null> {
  // API key auth: middleware sets x-api-user-id header
  const apiUserId = req.headers.get("x-api-user-id")
  if (apiUserId) {
    return apiUserId
  }

  // Session auth: fall back to Supabase
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
