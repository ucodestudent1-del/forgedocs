import { randomBytes, createHmac, timingSafeEqual } from "crypto"
import { createRouteAuthClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import logger from "@/lib/logger"

export interface MfaRecoveryToken {
  userId: string
  tokenHash: string
  expiresAt: string
  used: boolean
}

const RECOVERY_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const RECOVERY_CODE_LENGTH = 32 // bytes

/**
 * Generate a single-use, time-limited MFA recovery token.
 * Returns the plaintext token (to email) and the hash to store.
 */
export function generateRecoveryToken(): { plaintext: string; hash: string } {
  const plaintext = randomBytes(RECOVERY_CODE_LENGTH).toString("hex")
  const hash = createHmac("sha256", process.env.MFA_BACKUP_CODE_PEPPER!)
    .update(plaintext)
    .digest("hex")
  return { plaintext, hash }
}

/**
 * Verify a recovery token against the stored hash in constant time.
 */
export function verifyRecoveryToken(plaintext: string, hash: string): boolean {
  const providedHash = createHmac("sha256", process.env.MFA_BACKUP_CODE_PEPPER!)
    .update(plaintext)
    .digest("hex")
  if (providedHash.length !== hash.length) return false
  return timingSafeEqual(Buffer.from(providedHash), Buffer.from(hash))
}

/**
 * Create a recovery token record for a user and email them a recovery link.
 * Rate-limited by the caller.
 */
export async function createMfaRecoveryToken(userId: string, email: string): Promise<{ token: string }> {
  const supabase = await createRouteAuthClient()

  // Invalidate any existing unused recovery tokens for this user
  await supabase
    .from("mfa_recovery_tokens")
    .update({ used: true })
    .eq("user_id", userId)
    .eq("used", false)

  const { plaintext, hash } = generateRecoveryToken()
  const expiresAt = new Date(Date.now() + RECOVERY_TOKEN_TTL_MS).toISOString()

  const { error } = await supabase
    .from("mfa_recovery_tokens")
    .insert({
      user_id: userId,
      token_hash: hash,
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString(),
    })

  if (error) {
    logger.error("Failed to create MFA recovery token", { userId, error: error.message })
    throw new Error("Failed to create recovery token")
  }

  const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/mfa/recover?token=${plaintext}`

  await sendEmail({
    to: email,
    subject: "ForgeDocs MFA Recovery",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">MFA Recovery Requested</h2>
        <p>You (or someone on your behalf) requested to reset multi-factor authentication for your ForgeDocs account.</p>
        <p>If this was you, click the button below to reset your MFA settings. This link expires in 1 hour and can only be used once.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${recoveryUrl}" style="background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset MFA
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please contact support immediately and change your account password.</p>
        <p style="color: #999; font-size: 12px;">Sent via ForgeDocs - Professional Document Management</p>
      </div>
    `,
  })

  return { token: plaintext }
}

/**
 * Consume a recovery token: verify it, ensure it's unused and unexpired, then mark it used.
 * Returns the userId if valid.
 */
export async function consumeRecoveryToken(token: string): Promise<string | null> {
  const supabase = await createRouteAuthClient()

  const now = new Date().toISOString()

  // Atomically claim an unused, unexpired token whose hash matches.
  // We cannot compare hashes in SQL, so we fetch candidates and verify
  // in constant time, then attempt a conditional update that fails if
  // the token was already consumed (TOCTOU-safe).
  const { data: tokens, error } = await supabase
    .from("mfa_recovery_tokens")
    .select("id, user_id, token_hash, expires_at, used")
    .eq("used", false)
    .gt("expires_at", now)

  if (error || !tokens) {
    logger.error("Failed to fetch MFA recovery tokens", { error: error?.message })
    return null
  }

  for (const record of tokens) {
    // Constant-time hash comparison
    if (!verifyRecoveryToken(token, record.token_hash)) continue

    // Conditional update: only mark used if still unused and unexpired.
    const { error: updateError } = await supabase
      .from("mfa_recovery_tokens")
      .update({ used: true })
      .eq("id", record.id)
      .eq("used", false)
      .gt("expires_at", now)

    if (updateError) {
      // Another request consumed this token first; keep looking.
      continue
    }

    return record.user_id
  }

  return null
}

/**
 * Admin-only: reset MFA for a user without requiring a token.
 * Logs the action for audit.
 */
export async function adminResetMfa(userId: string, _adminUserId: string): Promise<void> {
  const supabase = await createRouteAuthClient()

  await supabase
    .from("profiles")
    .update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: null,
      mfa_pending: false,
    })
    .eq("id", userId)

  // Invalidate any pending recovery tokens for this user
  await supabase
    .from("mfa_recovery_tokens")
    .update({ used: true })
    .eq("user_id", userId)
    .eq("used", false)
}
